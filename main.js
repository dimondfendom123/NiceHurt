const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const { InjectorController } = require("./src/injector/InjectorController");
const { Settings } = require("./src/SettingsController");
const Updater = require("./src/Auto-Updater");
const axios = require("axios");
const unzipper = require("unzipper");

require("./src/console/Controller");

const sirhurtZipURL =
  "https://sirhurt.net/asshurt/update/v5/ProtectFile.php?customversion=LIVE&file=sirhurt.zip";
const versionURL =
  "https://sirhurt.net/asshurt/update/v5/fetch_version.php?customversion=LIVE";

const sirHurtPath = path.join(process.env.APPDATA, "NiceHurt");

let mainWindow;
let splashWindow;

let Status;
const settings = Settings.loadSettings();
const state = {
  autoInject: settings.autoInject,
  isInjection: false,
  autoIsInjection: false,
};

function sendToConsole(message) {
  return axios.post("http://localhost:9292/roblox-console", {
    content: `[NiceHurt]: ${message}`,
  });
}

async function createWindows() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: false,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, "src/screens/assets/NiceHurt-Logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "src/screens/preloads/bootstrap.js"),
      contextIsolation: true,
    },
  });
  splashWindow.loadFile("src/screens/splash.html");

  mainWindow = new BrowserWindow({
    width: 750,
    height: 600,
    icon: path.join(__dirname, "src/screens/assets/NiceHurt-Logo.png"),
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "src/screens/preloads/renderer.js"),
      nodeIntegration: true,
    },
  });
  mainWindow.loadFile("src/screens/index.html");

  mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
  mainWindow.setContentProtection(settings.screenShareProtect);
  splashWindow.setAlwaysOnTop(settings.alwaysOnTop);
  splashWindow.setContentProtection(settings.screenShareProtect);

  require("./src/ipc/ipcScripts")(ipcMain, mainWindow, sendToConsole);
  require("./src/ipc/ipcSettings")(ipcMain, mainWindow, state);
  require("./src/ipc/ipcExecutor")(ipcMain, mainWindow, sendToConsole, state);
  require("./src/ipc/ipcWindow")(ipcMain, mainWindow);

  updateSplash(0, "Checking for updates...");

  await Updater.checkForUpdates(splashWindow);

  updateSplash(20, "Checking for SirHurt updates...");

  try {
    await checkSirHurtVersion();
  } catch (err) {
    console.error("SirHurt check failed:", err);
    updateSplash(0, "Failed to check SirHurt version.");
  }
}

function reverseString(s) {
  return s.split("").reverse().join("");
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return Buffer.from(bytes);
}

async function downloadAndUnpackZip() {
  const res = await fetch(sirhurtZipURL);
  const text = await res.text();

  const reversedHex = reverseString(text.trim());
  const zipBuffer = hexToBuffer(reversedHex);

  const zipPath = path.join(sirHurtPath, "sirhurt.zip");
  fs.writeFileSync(zipPath, zipBuffer);

  await fs.promises.mkdir(sirHurtPath, { recursive: true });
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: sirHurtPath }))
    .promise();

  fs.unlinkSync(zipPath);
}

async function downloadDLL() {
  const res = await fetch(versionURL);
  const dllURL = (await res.text()).trim();

  if (!dllURL.startsWith("http")) {
    throw new Error("Invalid DLL URL received!");
  }

  const dllPath = path.join(sirHurtPath, "sirhurt.dll");
  const file = fs.createWriteStream(dllPath);

  return new Promise((resolve, reject) => {
    https
      .get(dllURL, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", reject);
  });
}

async function checkSirHurtVersion() {
  try {
    const response = await axios.get(
      "https://sirhurt.net/status/fetch.php?exploit=SirHurt%20V5"
    );
    const versionData = response.data[0]["SirHurt V5"];

    const remoteVersion = versionData.exploit_version;
    const updated = versionData.updated;

    const localVersionPath = path.join(sirHurtPath, "version");
    let localVersion = "unknown";
    if (fs.existsSync(localVersionPath)) {
      localVersion = fs.readFileSync(localVersionPath, "utf-8").trim();
    }

    const dllPath = path.join(sirHurtPath, "sirhurt.dll");
    const exePath = path.join(sirHurtPath, "sirhurt.exe");

    const dllExists = fs.existsSync(dllPath);
    const exeExists = fs.existsSync(exePath);

    const needsUpdate =
      !dllExists || !exeExists || localVersion !== remoteVersion || !updated;

    if (needsUpdate) {
      console.log(
        `[NiceHurt] Update required. Local: ${localVersion}, Remote: ${remoteVersion}`
      );
      updateSplash(0, "New version or missing files. Downloading...");
      await startBootstrapProcess();

      fs.writeFileSync(localVersionPath, remoteVersion);
    } else {
      console.log(`[NiceHurt] Version OK. All files present.`);
      updateSplash(
        100,
        "All files present and up to date! Starting NiceHurt..."
      );
      setTimeout(() => {
        splashWindow.close();
        mainWindow.show();
      }, 2000);
    }
  } catch (err) {
    console.error("Version check failed:", err);
    updateSplash(0, "Failed to check version.");
  }
}

async function startBootstrapProcess() {
  updateSplash(0, "Downloading files...");

  await downloadAndUnpackZip();

  updateSplash(40, "Unpacking files...");

  await downloadDLL();

  updateSplash(75, "DLL downloaded.");

  updateSplash(100, "Starting NiceHurt...");

  setTimeout(() => {
    splashWindow.close();
    mainWindow.show();
  }, 2000);
}

function updateSplash(progress, message) {
  if (splashWindow && splashWindow.webContents) {
    splashWindow.webContents.send("update-status", { progress, message });
  }
}

async function isRobloxPlayerRunning() {
  return new Promise((resolve, reject) => {
    exec("tasklist", (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stdout.toLowerCase().includes("robloxplayerbeta.exe")) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

async function monitorRobloxPlayer() {
  try {
    const running = await isRobloxPlayerRunning();

    if (!running) {
      if (mainWindow?.webContents && state.isInjection) {
        mainWindow.webContents.send("update-status", { message: "red" });
        state.isInjection = false;
        await axios.post("http://localhost:9292/roblox-console", {
          content: "[NiceHurt]: Roblox player closed!",
        });
      }
    } else if (
      state.autoInject &&
      !state.isInjection &&
      !state.autoIsInjection
    ) {
      state.autoIsInjection = true;
      mainWindow?.webContents?.send("update-status", { message: "waiting" });

      Status = await InjectorController.startup();
      console.log("Injection status:", Status);

      if (Status === 1) {
        mainWindow?.webContents?.send("update-status", { message: "success" });
        state.isInjection = true;
      } else if (Status === -1) {
        mainWindow?.webContents?.send("update-status", { message: "red" });
      } else if (Status === -5) {
        mainWindow?.webContents?.send("update-status", {
          message: "error-code-5",
        });
      }

      state.autoIsInjection = false;
    }
  } catch (err) {
    console.error("Error checking Roblox player:", err);
  }
}

setInterval(monitorRobloxPlayer, 5000);

// Whitelist NiceHurt folder for Windows Defender
// This is required to prevent the DLL and EXE from being removed

const whitelistCommand = `powershell -Command "Add-MpPreference -ExclusionPath '${path.join(
  process.env.APPDATA,
  "NiceHurt"
)}'"`;

exec(whitelistCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`PowerShell-Error: ${stderr}`);
    return;
  }
});

app.whenReady().then(() => {
  createWindows();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
