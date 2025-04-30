const { contextBridge, ipcRenderer } = require("electron");

let isSaveOperation = false;
let isExecution = false;

async function callDll(method, arg = "") {
  try {
    const response = await ipcRenderer.invoke("dll-method", method, arg);
    updateStatusMessage(response);
  } catch (error) {
    updateStatusMessage(`Error: ${error.message}`);
  }
}

function getEditorContentFromIframe() {
  const iframe = document.getElementById("monacoIframe");
  if (iframe) {
    iframe.contentWindow.postMessage({ action: "getEditorContent" }, "*");
  }
}

function setEditorContentFromIframe(text) {
  const iframe = document.getElementById("monacoIframe");
  if (iframe) {
    iframe.contentWindow.postMessage({ action: "setText", text: text }, "*");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnInject")?.addEventListener("click", () => {
    callDll("injection");
  });

  document.getElementById("btnExecute")?.addEventListener("click", () => {
    isExecution = true;
    getEditorContentFromIframe();
  });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    setEditorContentFromIframe("");
  });

  document.getElementById("btnOpen")?.addEventListener("click", async () => {
    const fileContent = await ipcRenderer.invoke("dll-method", "open-lua");
    setEditorContentFromIframe(fileContent);
  });
  document.getElementById("btnSave")?.addEventListener("click", () => {
    isSaveOperation = true;
    getEditorContentFromIframe();
  });

  document.getElementById("btnMinimize").addEventListener("click", () => {
    ipcRenderer.send("window-minimize");
  });

  document.getElementById("btnClose").addEventListener("click", () => {
    ipcRenderer.send("window-close");
  });
});

window.addEventListener("message", (event) => {
  if (event.data.action === "editorContent") {
    const editorContent = event.data.content;
    if (isSaveOperation) {
      callDll("save-lua", editorContent);
      isSaveOperation = false;
    } else if (isExecution) {
      callDll("execution", editorContent);
      isExecution = false;
    }
  }
});

function updateStatusMessage(message) {
  const statusElement = document.getElementById("statusMessage");
  if (statusElement) {
    statusElement.innerText = message;
  }
}

contextBridge.exposeInMainWorld("electron", {
  updateStatus: (callback) =>
    ipcRenderer.on("update-status", (event, data) => callback(data)),
  getScriptList: () => ipcRenderer.invoke("list-scripts"),
  loadScript: (fileName) => ipcRenderer.invoke("load-script", fileName),
  deleteScript: (fileName) => ipcRenderer.invoke("delete-script", fileName),
  openScriptsFolder: () => ipcRenderer.invoke("open-scripts-folder"),
  onScriptsUpdated: (callback) => ipcRenderer.on("update-scripts", callback),
  getSettings: () => ipcRenderer.invoke("load-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
});
