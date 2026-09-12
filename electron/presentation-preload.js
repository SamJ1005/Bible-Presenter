// electron/presentation-preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("presentationAPI", {
  close: () => ipcRenderer.send("close-presentation"),
  nextVerse: () => ipcRenderer.send("presentation-next-verse"),
  previousVerse: () => ipcRenderer.send("presentation-prev-verse"),
  sendVideoCommand: (cmd) => ipcRenderer.send("control-presentation-video", cmd),
  onVerse: (callback) => {
    const handler = (event, payload) => {
      try {
        callback(payload);
      } catch (e) {
        console.error("presentation onVerse callback error", e);
      }
    };
    ipcRenderer.on("display-verse", handler);
    // return a function to remove the listener if needed
    return () => ipcRenderer.removeListener("display-verse", handler);
  },
  onVideoCommand: (callback) => {
    const handler = (event, command) => {
      try {
        callback(command);
      } catch (e) {
        console.error("presentation onVideoCommand callback error", e);
      }
    };
    ipcRenderer.on("control-video", handler);
    return () => ipcRenderer.removeListener("control-video", handler);
  },
});