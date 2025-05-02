const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFile } = require("child_process");
const { app, dialog } = require("electron");
const API_URL = `https://api.github.com/repos/nici002018/NiceHurt/releases/latest`;

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
      const tmpFile = path.join(app.getPath("temp"), path.basename(url));
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

            const total = parseInt(res.headers["content-length"], 10) || 0;
            let downloaded = 0;
            res.on("data", (chunk) => {
              downloaded += chunk.length;
              const percent = total
                ? Math.round((downloaded / total) * 100)
                : null;
              splashWindow.webContents.send("update-status", {
                progress: percent,
                message: "Downloading update...",
              });
            });

            res.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close(() => {
                execFile(tmpFile, (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  splashWindow.webContents.send("update-status", {
                    progress: 100,
                    message: "Installing update...",
                  });

                  resolve();
                });
              });
            });
          })
          .on("error", (err) => {
            fileStream.close();
            reject(err);
          });
      }

      request(url);
    });
  }
}

module.exports = Updater;
