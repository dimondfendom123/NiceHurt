const fs = require("fs").promises;
const { Worker } = require("worker_threads");
const path = require("path");
const { exec, execSync } = require("child_process");

class InjectorController {
  static async autoexec() {
    try {
      const autoexecPath = path.join(process.env.APPDATA, "NiceHurt", "Autoexec");
      const files = await fs.readdir(autoexecPath);

      for (const file of files) {
        if (file.endsWith(".lua")) {
          const content = await fs.readFile(
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
    try {
      const status = this.injection();
      if (status === 1) {
        setTimeout(() => {
          this.execution(
            `repeat task.wait() until game:IsLoaded()
                        game:GetService("StarterGui"):SetCore("SendNotification", {
                            Title = "NiceHurt",
                            Text = "Injected successful, powered by Sirhurt",
                            Icon = "https://sirhurt.net/assets/img/sirhurtlogo.png"
                        })`
          );
        }, 10000);
      }
      console.log("Injection status:", status);
      return status;
    } catch {
      return -1;
    }
  }

  static injection() {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, "injectionWorker.js");
      const worker = new Worker(workerPath);

      worker.on("message", (result) => {
        console.log("Worker message:", result);
        resolve(result);
      });

      worker.on("error", (error) => {
        console.error("Worker error:", error);
        reject(-1);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
          reject(-1);
        }
      });
    });
  }

  static async execution(text) {
    try {
      const sirhurtDatPath = path.join(
        process.env.APPDATA,
        "sirhurt",
        "sirhui",
        "sirhurt.dat"
      );
      await fs.mkdir(path.dirname(sirhurtDatPath), { recursive: true });
      await fs.writeFile(sirhurtDatPath, text);
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
      const autoexecPath = path.join(process.env.APPDATA, "GNHub", "Autoexec");
      exec(`explorer.exe "${autoexecPath}"`);
      return 1;
    } catch {
      return -1;
    }
  }

  static async killRobloxPlayerBeta() {
    try {
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
      return 1;
    } catch {
      return -1;
    }
  }

  static async logError(message) {
    const logPath = path.join(process.env.APPDATA, "GNHub", "error.log");
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    await fs.appendFile(logPath, logMessage);
  }
}

class KsfService {
  static ksfMappings = {
    "Test1()": 'print("GNHUB TEST")',
  };

  static ksfConverter(ksf) {
    return ksf.replace(/ksf\.(Test1\(\))/g, (match, key) => {
      return this.ksfMappings[key] || match;
    });
  }
}

module.exports = { InjectorController, KsfService };
