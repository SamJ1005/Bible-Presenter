// electron/main.js
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let mainWin = null;
let presentationWin = null;
let currentPresentationPayload = null;

/* ------------ Display Logger ------------ */
function logDisplays() {
  const displays = screen.getAllDisplays();

  console.log("========== DISPLAY INFO ==========");
  displays.forEach((d, i) => {
    console.log(`Display ${i}`);
    console.log("  ID:", d.id);
    console.log("  Bounds:", d.bounds);
    console.log("  WorkArea:", d.workArea);
    console.log("  Size:", d.size);
    console.log("  ScaleFactor:", d.scaleFactor);
    console.log("---------------------------------");
  });
  console.log("=================================");
}

/* ------------ Main Window ------------ */
function createMainWindow() {
  if (mainWin) return;

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

  mainWin.on("closed", () => {
    mainWin = null;
  });
}

/* ------------ Presentation Window ------------ */
function createPresentationWindow() {
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  console.log("Display count:", displays.length);

  // Pick non-primary display (projector / second screen)
  const targetDisplay =
    displays.find(d => d.id !== primary.id) || primary;

  console.log("Using display:", targetDisplay.id);
  console.log("Bounds:", targetDisplay.bounds);

  presentationWin = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "presentation-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  presentationWin.loadFile(
    path.join(__dirname, "presentation.html")
  );

  presentationWin.once("ready-to-show", () => {
    presentationWin.show();
    presentationWin.focus();

    // Re-send last verse if exists
    if (currentPresentationPayload) {
      presentationWin.webContents.send(
        "display-verse",
        currentPresentationPayload
      );
    }
  });

  presentationWin.on("closed", () => {
    presentationWin = null;
  });
}

/* ------------ IPC ------------ */
ipcMain.handle("open-blank-presentation", () => {
  createPresentationWindow();
  return true;
});

ipcMain.on("send-presentation", (_, payload) => {
  currentPresentationPayload = payload;

  if (!presentationWin || presentationWin.isDestroyed()) {
    createPresentationWindow();
  } else {
    presentationWin.webContents.send("display-verse", payload);
  }
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

/* ------------ App Lifecycle ------------ */
app.whenReady().then(() => {
  createMainWindow();

  // Safe screen usage
  logDisplays();

  screen.on("display-added", (_, display) => {
    console.log("Display added:", display.id);
    logDisplays();
  });

  screen.on("display-removed", (_, display) => {
    console.log("Display removed:", display.id);
    logDisplays();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
