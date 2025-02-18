const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const { autoUpdater } = require("electron-updater");
const { InjectorController } = require("./InjectorController");

require("./console/Controller");

let mainWindow;
let splashWindow;
let Status;
let isInjection = false;

function createWindows() {
  autoUpdater.CheckForUpdates();

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
  startBootstrapProcess();
}

function startBootstrapProcess() {
  const sirHurtPath = process.cwd();
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

//Todo: Fixing when roblox close the dot color

ipcMain.handle("dll-method", async (event, method, arg = "") => {
  try {
    if (!method) {
      return "Method is required";
    }

    switch (method.toLowerCase()) {
      case "injection":
        if (isInjection) return "Injection already started";
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

app.whenReady().then(() => {
  createWindows();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
