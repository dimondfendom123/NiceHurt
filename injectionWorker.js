const { parentPort } = require("worker_threads");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function logError(message) {
  const logPath = path.join(process.env.APPDATA, "NiceHurt", "error.log");
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
}

(async () => {
  try {
    const sirhurtExePath = path.join(
      process.env.APPDATA,
      "NiceHurt",
      "sirhurt.exe"
    );
    
    console.log("Starting process with:", sirhurtExePath);

    if (!fs.existsSync(sirhurtExePath)) {
      const errorMsg = "sirhurt.exe not found";
      logError(errorMsg);
      parentPort.postMessage(-1);
      throw new Error(errorMsg);
    }

    const SirHurtCMD = spawn(sirhurtExePath, [], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      windowsHide: true,
      shell: true,
    });

    let outputData = "";
    let errorData = "";

    SirHurtCMD.stdout.on("data", (data) => {
      outputData += data.toString();
      console.log("OUTPUT:", data.toString());
    });

    SirHurtCMD.stderr.on("data", (data) => {
      errorData += data.toString();
      console.error("ERROR:", data.toString());
    });

    SirHurtCMD.on("exit", async (code) => {
      console.log("Process exit code:", code);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (
        errorData.includes("Error Code 5") ||
        outputData.includes("Error Code 5")
      ) {
        const errorMsg = "Injection failed: Error Code 5 detected.";
        logError(errorMsg);
        parentPort.postMessage(-5);
      } else if (errorData.includes("error") || outputData.includes("error")) {
        const errorMsg = `Injection failed: Process exited with code ${code}`;
        logError(errorMsg);
        parentPort.postMessage(-1);
      } else {
        parentPort.postMessage(1);
      }
    });

    SirHurtCMD.on("error", (error) => {
      const errorMsg = `Injection process error: ${error.message}`;
      logError(errorMsg);
      parentPort.postMessage(-1);
    });
  } catch (error) {
    const errorMsg = `Injection failed: ${error.message}`;
    logError(errorMsg);
    parentPort.postMessage(-1);
  }
})();
