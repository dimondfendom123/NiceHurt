const fs = require("fs");
const path = require("path");
const https = require("https");
const unzipper = require("unzipper");
const axios = require("axios");
const { exec } = require("child_process");
const { app, dialog, BrowserWindow } = require("electron");
const API_URL = `https://api.github.com/repos/nici002018/NiceHurt/releases/latest`;

let splashWindowReinstall = null;
class Updater {
  static async checkForUpdates(splashWindow) {
    try {
      const fetch = (await import("node-fetch")).default;
      const res = await fetch(API_URL, {
        headers: { "User-Agent": "NiceHurt-Updater" },
      });
      if (!res.ok) throw new Error(res.statusText);

      const release = await res.json();
      const latestVersion = release.tag_name.replace(/^v/, "");
      const currentVersion = app.getVersion();
      if (latestVersion <= currentVersion) return;

      const asset = release.assets.find((a) => a.name.endsWith(".exe"));
      if (!asset) return;

      const choice = dialog.showMessageBoxSync(splashWindow, {
        type: "info",
        buttons: ["Update Now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "New Version is available!",
        message: `A new version (${latestVersion}) is available! Do you want to update now?`,
      });
      if (choice === 0) {
        console.log("link: " + asset.browser_download_url);
        await Updater.downloadAndInstall(
          asset.browser_download_url,
          splashWindow
        );
      } else {
        console.log("User chose to update later.");
        return;
      }
    } catch (err) {
      console.error("Auto-update error:", err);
    }
  }

  static downloadAndInstall(url, splashWindow) {
    return new Promise((resolve, reject) => {
      const tmpFile = path.join(
        app.getPath("appData"),
        "NiceHurt",
        "tmp",
        path.basename(url)
      );
      fs.mkdirSync(path.dirname(tmpFile), { recursive: true });

      const fileStream = fs.createWriteStream(tmpFile);

      function request(downloadUrl) {
        const options = {
          headers: {
            "User-Agent": "NiceHurt-Updater",
            Accept: "application/octet-stream",
          },
        };

        https
          .get(downloadUrl, options, (res) => {
            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              return request(res.headers.location);
            }

            if (res.statusCode !== 200) {
              return reject(
                new Error(`Download failed with status ${res.statusCode}`)
              );
            }

            const total = parseInt(res.headers["content-length"], 10) || 0;
            let downloaded = 0;

            res.on("data", (chunk) => {
              downloaded += chunk.length;
              const percent = total
                ? Math.round((downloaded / total) * 100)
                : null;
              splashWindow?.webContents?.send("update-status", {
                progress: percent,
                message: "Downloading update",
              });
            });

            fileStream.on("finish", () => {
              fileStream.close(() => {
                splashWindow?.webContents?.send("update-status", {
                  progress: 100,
                  message: "Installing update",
                });

                const cmd = `powershell -Command "Start-Process -FilePath \\"${tmpFile}\\""`;
                exec(cmd, (error) => {
                  if (error) return reject(error);
                  app.quit();
                  resolve();
                });
              });
            });

            res.pipe(fileStream);
          })
          .on("error", (err) => {
            fileStream.close();
            fs.unlink(tmpFile, () => reject(err));
          });
      }

      request(url);
    });
  }

  static reverseString(s) {
    return s.split("").reverse().join("");
  }
  static hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return Buffer.from(bytes);
  }

  static async downloadAndUnpackZip(url, targetDir) {
    const res = await fetch(url);
    const hexText = (await res.text()).trim();
    const zipBuf = this.hexToBuffer(this.reverseString(hexText));
    await fs.promises.mkdir(targetDir, { recursive: true });
    const zipPath = path.join(targetDir, "sirhurt.zip");
    fs.writeFileSync(zipPath, zipBuf);
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetDir }))
      .promise();
    fs.unlinkSync(zipPath);
  }

  static downloadDLL(versionUrl, targetDir) {
    return new Promise(async (resolve, reject) => {
      const res = await fetch(versionUrl);
      const dllUrl = (await res.text()).trim();
      if (!dllUrl.startsWith("http")) return reject("Invalid DLL URL");
      const dllPath = path.join(targetDir, "sirhurt.dll");
      const file = fs.createWriteStream(dllPath);
      https
        .get(dllUrl, (resp) => {
          resp.pipe(file);
          file.on("finish", () => file.close(resolve));
        })
        .on("error", reject);
    });
  }

  static async checkForUpdatesSirhurt(splashWindow) {
    const sirHurtPath = path.join(app.getPath("appData"), "NiceHurt");
    const statusURL =
      "https://sirhurt.net/status/fetch.php?exploit=SirHurt%20V5";
    const zipURL =
      "https://sirhurt.net/asshurt/update/v5/ProtectFile.php?customversion=LIVE&file=sirhurt.zip";
    const dllURL =
      "https://sirhurt.net/asshurt/update/v5/fetch_version.php?customversion=LIVE";

    splashWindow.webContents.send("update-status", {
      progress: 20,
      message: "Checking SirHurt updates",
    });
    try {
      const { data } = await axios.get(statusURL);
      const info = data[0]["SirHurt V5"];
      const remoteVersion = info.exploit_version;
      const updated = info.updated;
      const verFile = path.join(sirHurtPath, "version");
      let localVersion = fs.existsSync(verFile)
        ? fs.readFileSync(verFile, "utf-8").trim()
        : "unknown";
      const missing =
        !fs.existsSync(path.join(sirHurtPath, "sirhurt.dll")) ||
        !fs.existsSync(path.join(sirHurtPath, "sirhurt.exe"));
      const needsUpdate = missing || localVersion !== remoteVersion || !updated;

      if (!updated) {
        splashWindow.webContents.send("update-status", {
          progress: 0,
          message: "SirHurt is not updated for the latest Roblox Version.",
        });
        return;
      }

      if (needsUpdate) {
        splashWindow.webContents.send("update-status", {
          progress: 0,
          message: "Downloading SirHurt",
        });
        await this.downloadAndUnpackZip(zipURL, sirHurtPath);

        splashWindow.webContents.send("update-status", {
          progress: 75,
          message: "Downloading DLL",
        });
        await this.downloadDLL(dllURL, sirHurtPath);

        fs.writeFileSync(verFile, remoteVersion);
      }

      splashWindow.webContents.send("update-status", {
        progress: 100,
        message: "SirHurt up to date.",
      });
    } catch (err) {
      console.error("SirHurt updater error:", err);
      splashWindow.webContents.send("update-status", {
        progress: 0,
        message: "SirHurt update failed.",
      });
    }
  }

  static async forceReinstallSirHurt() {
    try {
      const sirHurtPath = path.join(app.getPath("appData"), "NiceHurt");
      fs.mkdirSync(sirHurtPath, { recursive: true });

      const filesToRemove = [
        "sirhurt.exe",
        "sirhurt.dll",
        "version",
        "sirhurt.zip",
      ];
      filesToRemove.forEach((file) => {
        const filePath = path.join(sirHurtPath, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      const splashWindowReinstall = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        resizable: false,
        icon: path.join(__dirname, "screens/assets/NiceHurt-Logo.png"),
        webPreferences: {
          preload: path.join(__dirname, "screens/preloads/bootstrap.js"),
          contextIsolation: true,
        },
      });
      splashWindowReinstall.loadFile("src/screens/Bootscreen.html");

      splashWindowReinstall.webContents.send("update-status", {
        progress: 0,
        message: "Reinstalling SirHurt",
      });

      await this.checkForUpdatesSirhurt(splashWindowReinstall);

      const verFile = path.join(sirHurtPath, "version");
      const remoteVersion = fs.existsSync(verFile)
        ? fs.readFileSync(verFile, "utf-8").trim()
        : null;

      splashWindowReinstall.webContents.send("update-status", {
        progress: 100,
        message: "SirHurt reinstalled successfully",
      });
      splashWindowReinstall.close();

      return {
        success: true,
        message: "SirHurt reinstalled successfully",
        version: remoteVersion,
      };
    } catch (error) {
      console.error("Force reinstall failed:", error);
      return {
        success: false,
        message: error.message || "Failed to reinstall SirHurt",
        error: error,
      };
    }
  }
}
module.exports = Updater;
