const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const { InjectorController } = require("../injector/InjectorController");
const { ipcMain } = require("electron");

let disable = false;

ipcMain.handle("get-console-pause-state", () => disable);
ipcMain.on("set-console-pause-state", (_, state) => {
  console.log("Console pause state changed:", state);
  disable = state;
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

app.post("/roblox-console", (req, res) => {
  const { content } = req.body;
  if (disable) {
    return;
  }

  if (content) {
    io.emit("console-update", content);
    res.json({ status: "success" });
  } else {
    res.status(400).json({ status: "error", message: "No content provided" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

let lastSessionId = null;
const WAIT_AFTER_EXECUTE = 3000;
let isExecuting = false;

app.post("/roblox-session", async (req, res) => {
  const { session, time, jobId, placeId } = req.body;
  if (!session) return res.status(400).json({ error: "No session ID" });

  if (!isExecuting && session !== lastSessionId) {
    isExecuting = true;
    lastSessionId = session;

    io.emit(
      "console-update",
      `[NiceHurt]: Game change detected! placeId=${placeId}`
    );
    console.log(
      `[NiceHurt]: Game change detected! placeId=${placeId}, jobId=${jobId}`
    );

    await triggerExecute();
    await new Promise((r) => setTimeout(r, WAIT_AFTER_EXECUTE));

    isExecuting = false;
  }

  res.json({ status: "ok" });
});

async function triggerExecute() {
  try {
    const luaPath = path.join(__dirname, "/Roblox-Console.lua");
    const content = await fs.promises.readFile(luaPath, "utf-8");
    const result = await InjectorController.execution(content);
    io.emit(
      "console-update",
      result === 1
        ? "[NiceHurt]: Console logger started."
        : "[NiceHurt]: Console logger failed."
    );
    console.log(
      result === 1
        ? "[NiceHurt]: Execute successfully."
        : "[NiceHurt]: Execute failed."
    );
  } catch (e) {
    console.error("Error during Execute:", e);
  }
}

io.on("connection", (socket) => {
  console.log("A client connected");
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

server.listen(9292, () => {
  console.log("Console Controller backend running on port 9292");
});
