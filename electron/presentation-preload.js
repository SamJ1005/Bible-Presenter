// electron/presentation-preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("presentationAPI", {
  close: () => ipcRenderer.send("close-presentation"),
  nextVerse: () => ipcRenderer.send("presentation-next-verse"),
  previousVerse: () => ipcRenderer.send("presentation-prev-verse"),
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
});