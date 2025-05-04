const RPC = require("discord-rpc");
const clientId = "1368112898659848302";

let rpc = null;
let isReady = false;
let pendingState = null;

const presenceData = {
  details: "Playing Roblox",
  state: "Playing Roblox with NiceHurt",
  largeImageKey: "nicehurt-logo",
  largeImageText: "NiceHurt - SirHurt",
  buttons: [
    {
      label: "Download NiceHurt",
      url: "https://github.com/nici002018/NiceHurt",
    },
  ],
};

function initRPC() {
  if (rpc) return;
  RPC.register(clientId);
  rpc = new RPC.Client({ transport: "ipc" });
  rpc.on("ready", () => {
    console.log("Discord RPC connected.");
    isReady = true;
    if (pendingState !== null) {
      toggleRPC(pendingState);
      pendingState = null;
    }
  });
  rpc.on("error", (err) => {
    console.error("RPC error:", err);
  });
  rpc.login({ clientId }).catch(console.error);
}

function toggleRPC(enabled) {
  if (!rpc || !isReady) {
    pendingState = enabled;
    return;
  }

  if (enabled) {
    rpc.setActivity(presenceData).catch(console.error);
    console.log("RPC activated.");
  } else {
    rpc.clearActivity().catch(console.error);
    console.log("RPC deactivated.");
  }
}

module.exports = {
  initRPC,
  toggleRPC,
};
