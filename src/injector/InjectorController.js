const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");
const { shell } = require("electron");

class InjectorController {
  static injected = false;
  static loopStarted = false;

  static async autoexec() {
    try {
      const autoexecPath = path.join(
        process.env.APPDATA,
        "NiceHurt",
        "Autoexec"
      );
      const files = await fs.promises.readdir(autoexecPath);

      for (const file of files) {
        if (
          file.endsWith(".lua") ||
          file.endsWith(".txt") ||
          file.endsWith(".luau")
        ) {
          const content = await fs.promises.readFile(
            path.join(autoexecPath, file),
            "utf-8"
          );
          if ((await this.execution(content)) === -1)
            throw new Error("Execution failed");
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      return 1;
    } catch {
      return -1;
    }
  }

  static async startup() {
    if (this.injected) return 1;
    this.injected = true;
    try {
      const status = this.injection();
      console.log("Startup Injection status:", status);

      if (status === 1 && !this.loopStarted) {
        this.loopStarted = true;
        this.loopExecution();
        axios.post("http://localhost:9292/roblox-console", {
          content: "[NiceHurt]: Injection successful!",
        });
      }
      return status;
    } catch {
      return -1;
    }
  }

  static async loopExecution() {
    if (this.loopStarted && this._intervalId) return;

    const luaFilePath = path.join(__dirname, "../console/Roblox-Console.lua");
    this._intervalId = setInterval(async () => {
      try {
        const luaContent = await fs.promises.readFile(luaFilePath, "utf-8");
        await this.execution(luaContent);
      } catch (error) {
        console.error("Error to retry execute the script:", error);
      }
    }, 10000);
  }

  static injection() {
    const exeDir = path.join(process.env.APPDATA, "NiceHurt");
    const exePath = path.join(exeDir, "sirhurt.exe");

    const cmd = `powershell -Command "Start-Process -FilePath \\"${exePath}\\" -Verb runAs -WorkingDirectory \\"${exeDir}\\""`;

    exec(cmd, (error) => {
      if (error) {
        axios.post("http://localhost:9292/roblox-console", {
          content: "[NiceHurt]: Error while injecting! \n" + error,
        });
        return -1;
      }
    });
    return 1;
  }

  static async execution(text) {
    try {
      const sirhurtDatPath = path.join(
        process.env.APPDATA,
        "sirhurt",
        "sirhui",
        "sirhurt.dat"
      );
      await fs.promises.mkdir(path.dirname(sirhurtDatPath), {
        recursive: true,
      });
      await fs.promises.writeFile(sirhurtDatPath, text);
      return 1;
    } catch {
      return -1;
    }
  }

  static async openLogsFolder() {
    try {
      const logsPath = path.join(process.env.APPDATA, "sirhurt", "sirhui");
      exec(`explorer.exe "${logsPath}"`);
      return 1;
    } catch {
      return -1;
    }
  }

  static async openAutoexecFolder() {
    try {
      const scriptDir = path.join(process.env.APPDATA, "NiceHurt", "Autoexec");
      if (fs.existsSync(scriptDir)) {
        shell.openPath(scriptDir);
      } else {
        fs.mkdirSync(scriptDir, { recursive: true });
        shell.openPath(scriptDir);
      }
      return 1;
    } catch {
      return -1;
    }
  }

  static async killRobloxPlayerBeta() {
    try {
      axios.post("http://localhost:9292/roblox-console", {
        content: "[NiceHurt]: Killing Roblox Client!",
      });
      exec("taskkill /IM RobloxPlayerBeta.exe /F");
      return 1;
    } catch {
      return -1;
    }
  }

  static async cleanRobloxPlayerBeta() {
    try {
      const commands = [
        "del /Q %systemdrive%\\Users\\%username%\\AppData\\LocalLow\\rbxcsettings.rbx",
        "del /Q %systemdrive%\\Users\\%username%\\AppData\\Local\\Roblox\\GlobalBasicSettings_13.xml",
        "del /S /Q %systemdrive%\\Users\\%username%\\AppData\\Local\\Roblox\\logs\\*",
      ];
      for (const cmd of commands) {
        exec(`cmd.exe /c ${cmd}`);
      }

      axios.post("http://localhost:9292/roblox-console", {
        content: "[NiceHurt]: Cleaning Roblox Client!",
      });
      return 1;
    } catch {
      return -1;
    }
  }
}

module.exports = { InjectorController };
