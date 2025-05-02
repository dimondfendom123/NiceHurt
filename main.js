const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const { startup } = require("./src/injector/InjectorController");
const { Settings } = require("./src/SettingsController");
const Updater = require("./src/Auto-Updater");
const { post } = require("axios");

require("./src/console/Controller");

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
  return post("http://localhost:9292/roblox-console", {
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
  splashWindow.loadFile("src/screens/Bootscreen.html");

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
  mainWindow.loadFile("src/screens/Mainscreen.html");

  mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
  mainWindow.setContentProtection(settings.screenShareProtect);
  splashWindow.setAlwaysOnTop(settings.alwaysOnTop);
  splashWindow.setContentProtection(settings.screenShareProtect);

  require("./src/ipc/ipcScripts")(ipcMain, mainWindow, sendToConsole);
  require("./src/ipc/ipcSettings")(ipcMain, mainWindow, state);
  require("./src/ipc/ipcExecutor")(ipcMain, mainWindow, sendToConsole, state);
  require("./src/ipc/ipcWindow")(app, ipcMain, mainWindow);

  if (!settings.skipWhitelistAsk) {
    const choice = dialog.showMessageBoxSync(splashWindow, {
      type: "info",
      buttons: ["Yes", "No"],
      defaultId: 0,
      cancelId: 1,
      title: "Windows Defender",
      message: `Do you want to whitelist the NiceHurt folder for Windows Defender? \nThis will help prevent any false positives.`,
    });
    settings.skipWhitelistAsk = true;
    settings.whitelistFolder = choice === 0;
    Settings.saveSettings(settings);
  }

  if (settings.whitelistFolder) {
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
  } else {
    console.log("User chose not to whitelist.");
  }

  splashWindow.webContents.send("update-status", {
    progress: 0,
    message: "Checking for updates...",
  });

  await Updater.checkForUpdates(splashWindow);

  splashWindow.webContents.send("update-status", {
    progress: 20,
    message: "Checking for SirHurt updates...",
  });

  await Updater.checkForUpdatesSirhurt(splashWindow);

  setTimeout(() => {
    splashWindow.close();
    mainWindow.show();
  }, 2000);
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
        sendToConsole("Roblox player closed!");
      }
    } else if (
      state.autoInject &&
      !state.isInjection &&
      !state.autoIsInjection
    ) {
      state.autoIsInjection = true;
      mainWindow?.webContents?.send("update-status", { message: "waiting" });

      Status = await startup();
      console.log("Injection status:", Status);

      if (Status === 1) {
        mainWindow?.webContents?.send("update-status", { message: "success" });
        state.isInjection = true;
      } else if (Status === -1) {
        mainWindow?.webContents?.send("update-status", { message: "red" });
      }

      state.autoIsInjection = false;
    }
  } catch (err) {
    console.error("Error checking Roblox player:", err);
  }
}

setInterval(monitorRobloxPlayer, 5000);

app.whenReady().then(() => {
  createWindows();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
