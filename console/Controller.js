const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

app.post("/roblox-console", (req, res) => {
  const { content } = req.body;

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

io.on("connection", (socket) => {
  console.log("A client connected");
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

server.listen(9292, () => {
  console.log("Console Controller backend running on port 9292");
});
