const fs = require("fs");
const { app } = require("electron");
const path = require("path");
const SETTINGS_PATH = path.join(
  app.getPath("appData"),
  "NiceHurt",
  "settings.json"
);

const { toggleRPC } = require("./DiscordRPC");

class Settings {
  static loadSettings() {
    try {
      if (!fs.existsSync(SETTINGS_PATH)) {
        const defaultSettings = {
          alwaysOnTop: false,
          autoInject: false,
          screenShareProtect: false,
          consolePause: false,
          skipWhitelistAsk: false,
          whitelistFolder: false,
          DiscordRPC: true,
        };
        this.saveSettings(defaultSettings);
        return defaultSettings;
      }

      const fileContent = fs.readFileSync(SETTINGS_PATH, "utf-8");
      const settings = JSON.parse(fileContent);

      this.updateRPC(settings.DiscordRPC);
      return settings;
    } catch (error) {
      console.error("Error loading settings:", error);
      throw error;
    }
  }

  static saveSettings(settings) {
    try {
      this.updateRPC(settings.DiscordRPC);
      console.log("Saving settings:", settings.DiscordRPC);
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  }

  static updateRPC(enabled) {
    try {
      toggleRPC(enabled);
    } catch (error) {
      console.error("Error updating RPC:", error);
    }
  }
}

module.exports = { Settings };
