const { contextBridge, ipcRenderer } = require("electron");

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
    getEditorContentFromIframe();
  });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    setEditorContentFromIframe("");
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
    console.log("Editor Content: ", editorContent);

    callDll("execution", editorContent);
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
});
