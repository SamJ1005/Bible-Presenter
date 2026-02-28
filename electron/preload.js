// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openBlankPresentation: () => ipcRenderer.invoke("open-blank-presentation"),
  sendPresentation: (payload) => ipcRenderer.send("send-presentation", payload),
  getPresentationStatus: () => ipcRenderer.invoke("get-presentation-status"),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  setPreferredDisplay: (id) => ipcRenderer.send("set-preferred-display", id),
  saveMediaFile: (path) => ipcRenderer.invoke("save-media-file", path),
});

contextBridge.exposeInMainWorld("api", {
  // Open blank presentation (no payload needed)
  openPresentation: () => ipcRenderer.invoke("open-blank-presentation"),
  // Send presentation with payload
  sendPresentation: (payload) => ipcRenderer.send("send-presentation", payload),
  // Close presentation window
  closePresentation: () => ipcRenderer.send("close-presentation"),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  setPreferredDisplay: (id) => ipcRenderer.send("set-preferred-display", id),
  saveMediaFile: (path) => ipcRenderer.invoke("save-media-file", path),

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
