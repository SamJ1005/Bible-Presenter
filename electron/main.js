// electron/main.js
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let mainWin = null;
let presentationWin = null;
let currentPresentationPayload = null;

/* ------------ Main Window ------------ */
function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWin.loadURL("http://localhost:5173");
  } else {
    mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWin.on("closed", () => (mainWin = null));
}

/* ------------ Presentation Window ------------ */
function createPresentationWindow() {
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.focus();
    return;
  }

  const disp = screen.getPrimaryDisplay();
  presentationWin = new BrowserWindow({
    x: disp.bounds.x,
    y: disp.bounds.y,
    width: disp.bounds.width,
    height: disp.bounds.height,
    fullscreen: true,
    frame: false,
    backgroundColor: "#000",
    webPreferences: {
      preload: path.join(__dirname, "presentation-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  presentationWin.loadFile(path.join(__dirname, "presentation.html"));

  presentationWin.webContents.on("did-finish-load", () => {
    if (currentPresentationPayload) {
      presentationWin.webContents.send("display-verse", currentPresentationPayload);
    }
  });

  presentationWin.on("closed", () => (presentationWin = null));
}

/* ------------ IPC ------------ */
ipcMain.handle("open-blank-presentation", () => {
  createPresentationWindow();
  return true;
});

ipcMain.on("send-presentation", (_, payload) => {
  currentPresentationPayload = payload;

  // Only create window if it does NOT exist
  if (!presentationWin || presentationWin.isDestroyed()) {
    createPresentationWindow();
  }

  presentationWin.webContents.send("display-verse", payload);
});

ipcMain.handle("get-presentation-status", () => {
  return !!(presentationWin && !presentationWin.isDestroyed());
});

ipcMain.on("close-presentation", () => {
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.close();
  }
});

ipcMain.on("presentation-next-verse", () => {
  mainWin?.webContents.send("navigate-next-verse");
});
ipcMain.on("presentation-prev-verse", () => {
  mainWin?.webContents.send("navigate-prev-verse");
});

/* ------------ App lifecycle ------------ */
app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
