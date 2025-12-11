// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openBlankPresentation: () => ipcRenderer.invoke("open-blank-presentation"),
  sendPresentation: (payload) => ipcRenderer.send("send-presentation", payload),
  getPresentationStatus: () => ipcRenderer.invoke("get-presentation-status"),
});

contextBridge.exposeInMainWorld("api", {
  // convenience: send a payload directly (same as electron.sendPresentation)
  openPresentation: (payload) => ipcRenderer.send("send-presentation", payload),

  // React can listen for navigation requests coming from presentation window (arrow keys)
  onNavigateNext: (cb) => {
    const listener = () => cb && cb();
    ipcRenderer.on("navigate-next-verse", listener);
    // return cleanup
    return () => ipcRenderer.removeListener("navigate-next-verse", listener);
  },
  onNavigatePrev: (cb) => {
    const listener = () => cb && cb();
    ipcRenderer.on("navigate-prev-verse", listener);
    return () => ipcRenderer.removeListener("navigate-prev-verse", listener);
  },
});
