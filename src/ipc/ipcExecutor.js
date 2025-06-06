const fs = require("fs");
const path = require("path");
const { dialog } = require("electron");
const { InjectorController } = require("../injector/InjectorController");
const { exec } = require("child_process");
const { ipcMain, shell } = require("electron");

const defaultFolder = path.join(process.env.APPDATA, "NiceHurt", "scripts");

ipcMain.handle("openAutoEXEFolder", () => {
  InjectorController.openAutoexecFolder();
});

ipcMain.handle("openScriptsFolder", () => {
  const scriptDir = path.join(process.env.APPDATA, "NiceHurt", "scripts");
  if (fs.existsSync(scriptDir)) {
    shell.openPath(scriptDir);
  } else {
    fs.mkdirSync(scriptDir, { recursive: true });
    shell.openPath(scriptDir);
  }
});

module.exports = (ipcMain, mainWindow, sendToConsole, state) => {
  const sendStatus = (message) => {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send("update-status", { message });
    }
  };

  ipcMain.handle("dll-method", async (event, method, arg = "") => {
    if (!method) return "Method is required";

    try {
      switch (method.toLowerCase()) {
        case "injection":
          if (state.isInjection) {
            await sendToConsole("Is already injected!");
            return "Injection already started";
          }

          sendStatus("waiting");
          const status = await InjectorController.startup();
          console.log("Injection status:", status);

          switch (status) {
            case 1:
              sendStatus("success");
              state.isInjection = true;
              break;
            case -1:
              sendStatus("error");
              break;
          }
          return "Injection started";

        case "autoexec":
          InjectorController.autoexec();
          return "Autoexec executed";

        case "execution":
          await sendToConsole("Executing script!");
          InjectorController.execution(arg);
          return "Script executed";

        case "open-logs":
          return InjectorController.openLogsFolder();

        case "openautoexecfolder":
          return InjectorController.openAutoexecFolder();

        case "killrobloxplayerbeta":
          return InjectorController.killRobloxPlayerBeta();

        case "cleanrobloxplayerbeta":
          return InjectorController.cleanRobloxPlayerBeta();

        case "save-lua": {
          const { canceled, filePath: savePath } = await dialog.showSaveDialog(
            mainWindow,
            {
              title: "Save Lua Script",
              defaultPath: path.join(defaultFolder, "script.lua"),
              filters: [{ name: "Lua Files", extensions: ["lua"] }],
            }
          );
          if (canceled) return "Save canceled";

          fs.writeFileSync(savePath, arg);
          await sendToConsole(`${savePath} saved!`);
          return "File saved";
        }

        case "open-lua": {
          const { canceled, filePaths } = await dialog.showOpenDialog(
            mainWindow,
            {
              title: "Open Script",
              defaultPath: defaultFolder,
              filters: [
                { name: "Script Files", extensions: ["txt", "lua", "luau"] },
              ],
              properties: ["openFile"],
            }
          );
          if (canceled || filePaths.length === 0) return "";

          const fileContent = fs.readFileSync(filePaths[0], "utf8");
          await sendToConsole(`${filePaths[0]} opened!`);
          return fileContent;
        }

        default:
          return `Invalid method: ${method}`;
      }
    } catch (error) {
      console.error("Error executing DLL method:", error);
      return `Error executing DLL method: ${error.message}`;
    }
  });

  async function isRobloxPlayerRunning() {
    return new Promise((resolve, reject) => {
      exec("tasklist", (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        resolve(stdout.toLowerCase().includes("robloxplayerbeta.exe"));
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
          InjectorController.injected = false;
          sendToConsole("Roblox player closed!");
        }
      } else if (
        state.autoInject &&
        !state.isInjection &&
        !state.autoIsInjection
      ) {
        state.autoIsInjection = true;
        mainWindow?.webContents?.send("update-status", { message: "waiting" });

        const Status = await InjectorController.startup();
        console.log("Injection status:", Status);

        if (Status === 1) {
          mainWindow?.webContents?.send("update-status", {
            message: "success",
          });
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
};
