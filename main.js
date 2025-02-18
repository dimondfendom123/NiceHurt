const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
//const { autoUpdater } = require("electron-updater");
const { InjectorController } = require("./InjectorController");
const axios = require("axios");

require("./console/Controller");

let mainWindow;
let splashWindow;
let Status;
let isInjection = false;

function createWindows() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, "screens/assets/NiceHurt-Logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "screens/preloads/bootstrap.js"),
      contextIsolation: true,
    },
  });
  splashWindow.loadFile("screens/splash.html");

  mainWindow = new BrowserWindow({
    width: 750,
    height: 600,
    icon: path.join(__dirname, "screens/assets/NiceHurt-Logo.png"),
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "screens/preloads/renderer.js"),
      nodeIntegration: true,
    },
  });
  mainWindow.loadFile("screens/index.html");

  /*  Removed because it makes errors and the injection doesn't work
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("checking-for-update", () => {
    updateSplash(20, "Checking for updates...");
  });

  autoUpdater.on("update-available", () => {
    updateSplash(40, "Update available. Downloading...");
  });

  autoUpdater.on("update-not-available", () => {
    updateSplash(100, "No updates available.");
    setTimeout(() => {
      splashWindow.close();
      mainWindow.show();
    }, 2000);
  });

  autoUpdater.on("error", (err) => {
    updateSplash(100, "Update failed! Check your connection.");
    console.error("Error:", err.message);
    setTimeout(() => splashWindow.close(), 3000);
  });

  autoUpdater.on("update-downloaded", () => {
    updateSplash(80, "Update downloaded. Installing...");
    autoUpdater.quitAndInstall();
  });
*/
  startBootstrapProcess();
}

function startBootstrapProcess() {
  const sirHurtPath = path.join(process.env.APPDATA, "NiceHurt");
  updateSplash(0, "Cleaning up old files...");

  deleteFiles(sirHurtPath);
  updateSplash(5, "Cleanup complete.");

  https
    .get("https://sirhurt.net/asshurt/update/v5/fetch_version.php", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (data.includes("Failed")) {
          updateSplash(100, "No update available.");
          setTimeout(() => {
            splashWindow.close();
            mainWindow.show();
          }, 2000);
          return;
        }

        updateSplash(20, "Downloading update...");
        downloadFileWithProgress(
          data,
          path.join(sirHurtPath, "SirHurt.new"),
          (progress) =>
            updateSplash(20 + progress * 0.4, `Downloading: ${progress}%`),
          () => {
            downloadFileWithProgress(
              "https://sirhurt.net/asshurt/update/v5/sirhurt.exe",
              path.join(sirHurtPath, "sirhurt.exe"),
              (progress) =>
                updateSplash(
                  60 + progress * 0.3,
                  `Downloading EXE: ${progress}%`
                ),
              () => {
                fs.renameSync(
                  path.join(sirHurtPath, "SirHurt.new"),
                  path.join(sirHurtPath, "sirhurt.dll")
                );
                updateSplash(100, "Completed. Starting SirHurt...");

                setTimeout(() => {
                  splashWindow.close();
                  mainWindow.show();
                }, 2000);
              }
            );
          }
        );
      });
    })
    .on("error", (err) => {
      updateSplash(100, "Update failed! Check your connection.");
      console.error("Update Error:", err.message);
      setTimeout(() => splashWindow.close(), 3000);
    });
}

function updateSplash(progress, message) {
  if (splashWindow && splashWindow.webContents) {
    splashWindow.webContents.send("update-status", { progress, message });
  }
}

function downloadFileWithProgress(url, dest, onProgress, callback) {
  const file = fs.createWriteStream(dest);
  https
    .get(url, (response) => {
      const totalSize = parseInt(response.headers["content-length"], 10);
      let downloadedSize = 0;

      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        onProgress(Math.floor((downloadedSize / totalSize) * 100));
      });

      response.pipe(file);
      file.on("finish", () => {
        file.close(callback);
      });
    })
    .on("error", (err) => {
      fs.unlink(dest, () => {});
      updateSplash(100, `Download error: ${err.message}`);
      console.error("Download Error:", err.message);
    });
}

const scriptDir = path.join(process.env.APPDATA, "Nicehurt", "scripts");

if (!fs.existsSync(scriptDir)) {
  fs.mkdirSync(scriptDir, { recursive: true });
}

fs.watch(scriptDir, (eventType, filename) => {
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if ([".txt", ".lua", ".luau"].includes(ext)) {
      mainWindow.webContents.send("update-scripts");
    }
  }
});

ipcMain.handle("list-scripts", async () => {
  try {
    const files = fs.readdirSync(scriptDir);
    return files.filter((file) => {
      const ext = require("path").extname(file).toLowerCase();
      return [".txt", ".lua", ".luau"].includes(ext);
    });
  } catch (error) {
    console.error("Error reading script folder:", error);
    return [];
  }
});

ipcMain.handle("load-script", async (event, fileName) => {
  try {
    const filePath = require("path").join(scriptDir, fileName);
    if (fs.existsSync(filePath)) {
      axios.post("http://localhost:9292/roblox-console", {
        content: `[NiceHurt]: ${fileName} loaded`,
      });
      return fs.readFileSync(filePath, "utf8");
    }
    return "";
  } catch (error) {
    console.error("Error loading script:", error);
    return "";
  }
});

ipcMain.handle("delete-script", async (event, fileName) => {
  const filePath = path.join(scriptDir, fileName);
  try {
    fs.unlinkSync(filePath);
    axios.post("http://localhost:9292/roblox-console", {
      content: `[NiceHurt]: ${fileName} deleted!`,
    });
    return "File deleted successfully";
  } catch (error) {
    console.error("Error deleting script:", error);
    return "Error deleting file: " + error.message;
  }
});

ipcMain.handle("open-scripts-folder", async () => {
  const { shell } = require("electron");
  await shell.openPath(scriptDir);
  return "Opened scripts folder";
});

ipcMain.handle("dll-method", async (event, method, arg = "") => {
  try {
    if (!method) {
      return "Method is required";
    }

    switch (method.toLowerCase()) {
      case "injection":
        if (isInjection) return "Injection already Injected";
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send("update-status", {
            message: "waiting",
          });
        }
        Status = await InjectorController.startup();

        console.log("Injection status:", Status);

        if (Status === 1) {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("update-status", {
              message: "success",
            });
            isInjection = true;
          }
        } else if (Status === -1) {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("update-status", { message: "error" });
          }
        } else if (Status === -5) {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("update-status", {
              message: "error-code-5",
            });
          }
        }
        return "Injection started";
      case "autoexec":
        InjectorController.autoexec();
        return "Autoexec executed";
      case "execution":
        console.log("Executing script:", arg);
        InjectorController.execution(arg);
        return "script executed";
      case "open-logs":
        return InjectorController.openLogsFolder();
      case "openautoexecfolder":
        return InjectorController.openAutoexecFolder();
      case "killrobloxplayerbeta":
        return InjectorController.killRobloxPlayerBeta();
      case "cleanrobloxplayerbeta":
        return InjectorController.cleanRobloxPlayerBeta();
      case "save-lua": {
        const { dialog } = require("electron");
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(
          mainWindow,
          {
            title: "Save Lua Script",
            defaultPath: "script.lua",
            filters: [{ name: "Lua Files", extensions: ["lua"] }],
          }
        );
        if (canceled) {
          return "Save canceled";
        }
        fs.writeFileSync(savePath, arg);
        axios.post("http://localhost:9292/roblox-console", {
          content: `[NiceHurt]: ${savePath} saved!`,
        });
        return "File saved";
      }
      case "open-lua": {
        const { dialog } = require("electron");
        const { canceled, filePaths } = await dialog.showOpenDialog(
          mainWindow,
          {
            title: "Open Script",
            filters: [
              { name: "Script Files", extensions: ["txt", "lua", "luau"] },
            ],
            properties: ["openFile"],
          }
        );
        if (canceled || filePaths.length === 0) {
          return "";
        }
        const fileContent = fs.readFileSync(filePaths[0], "utf8");
        axios.post("http://localhost:9292/roblox-console", {
          content: `[NiceHurt]: ${filePaths[0]} opened!`,
        });
        return fileContent;
      }
      default:
        return `Invalid method: ${method}`;
    }
  } catch (error) {
    console.error("Error executing DLL method:", error.message);
    return `Error executing DLL method: ${error.message}`;
  }
});

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
    if (!running && isInjection) {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("update-status", { message: "red" });
        isInjection = false;
        axios.post("http://localhost:9292/roblox-console", {
          content: "[NiceHurt]: Roblox player closed!",
        });
      }
    }
  } catch (err) {
    console.error("Error checking Roblox player:", err);
  }
}

setInterval(monitorRobloxPlayer, 5000);

function deleteFiles(dir) {
  ["SirHurt.new", "SirHurt V5.exe", "sirhurt.dll"].forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

ipcMain.on("window-minimize", () => {
  mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on("window-close", () => {
  mainWindow.close();
});

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
