const { parentPort } = require("worker_threads");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function logError(message) {
  const logPath = path.join(process.env.APPDATA, "GNHub", "error.log");
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
}

(async () => {
  try {
    const sirhurtExePath = path.join(__dirname, "sirhurt.exe");
    console.log("start:", sirhurtExePath);

    if (!fs.existsSync(sirhurtExePath)) {
      throw new Error("sirhurt.exe not found");
    }

    const process = spawn(sirhurtExePath, [], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      windowsHide: true,
      shell: true,
    });

    let outputData = "";
    let errorData = "";

    process.stdout.on("data", (data) => {
      outputData += data.toString();
      console.log("OUTPUT:", data.toString());
    });

    process.stderr.on("data", (data) => {
      errorData += data.toString();
      console.error("ERROR:", data.toString());
    });

    process.on("exit", (code) => {
      console.log("process error:", code);

      if (
        errorData.includes("Error Code 5") ||
        outputData.includes("Error Code 5")
      ) {
        logError("Injection failed: Error Code 5 detected.");
        parentPort.postMessage(-5);
      } else if (errorData.includes("error") || outputData.includes("error")) {
        logError(`Injection failed: Process exited with code ${code}`);
        parentPort.postMessage(-1);
      } else {
        parentPort.postMessage(1);
      }
    });

    process.on("error", (error) => {
      logError(`Injection process error: ${error.message}`);
      parentPort.postMessage(-1);
    });
  } catch (error) {
    logError(`Injection failed: ${error.message}`);
    parentPort.postMessage(-1);
  }
})();
