const fs = require("fs");
const path = require("path");
const { shell } = require("electron");

module.exports = (ipcMain, mainWindow, sendToConsole) => {
  const scriptDir = path.join(process.env.APPDATA, "NiceHurt", "scripts");

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
      return files.filter((file) =>
        [".txt", ".lua", ".luau"].includes(path.extname(file).toLowerCase())
      );
    } catch (error) {
      sendToConsole("Error reading script folder:", error.message);
      console.error("Error reading script folder:", error);
      return [];
    }
  });

  ipcMain.handle("load-script", async (event, fileName) => {
    try {
      const filePath = path.join(scriptDir, fileName);
      if (fs.existsSync(filePath)) {
        sendToConsole(`${fileName} loaded!`);
        return fs.readFileSync(filePath, "utf8");
      }
      return "";
    } catch (error) {
      sendToConsole("Error loading script:", error.message);
      console.error("Error loading script:", error);
      return "";
    }
  });

  ipcMain.handle("delete-script", async (event, fileName) => {
    try {
      const filePath = path.join(scriptDir, fileName);
      fs.unlinkSync(filePath);
      sendToConsole(`${fileName} deleted!`);
      return "File deleted successfully";
    } catch (error) {
      console.error("Error deleting script:", error);
      return "Error deleting file: " + error.message;
    }
  });

  ipcMain.handle("open-scripts-folder", async () => {
    await shell.openPath(scriptDir);
    return "Opened scripts folder";
  });
};
