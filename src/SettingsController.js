const fs = require("fs");
const { app } = require("electron");
const path = require("path");
const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");

class Settings {
  static loadSettings() {
    try {
      if (!fs.existsSync(SETTINGS_PATH)) {
        const defaultSettings = {
          alwaysOnTop: false,
          autoInject: false,
          screenShareProtect: false,
        };
        this.saveSettings(defaultSettings);
        return defaultSettings;
      }
      const data = fs.readFileSync(SETTINGS_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error to Load: ", error);
      throw error;
    }
  }
  
  static saveSettings(settings) {
    try {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error("Error to save: ", error);
      throw error;
    }
  }
}

module.exports = { Settings };