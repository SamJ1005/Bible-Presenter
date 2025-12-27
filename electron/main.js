// electron/main.js
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const iconPath = path.join(__dirname, "assets/favicon.ico");

let mainWin = null;
let presentationWin = null;
let currentPresentationPayload = null;

/* ------------ Main Window ------------ */
app.setAppUserModelId("com.samjack.biblepresenter");
function createMainWindow() {
  if (mainWin) return;

  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  const fs = require("fs");

  if (fs.existsSync(iconPath)) {
    try {
      mainWin.setIcon(iconPath);
    } catch (err) {
      console.error("Icon load failed:", err);
    }
  } else {
    console.error("Icon file not found:", iconPath);
  }

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
  const targetDisplay = displays.find((d) => d.id !== primary.id) || primary;

  console.log("Using display:", targetDisplay.id);
  console.log("Bounds:", targetDisplay.bounds);

  presentationWin = new BrowserWindow({
    title: "Holy Bible Presenter",
    icon: iconPath,
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

  presentationWin.loadFile(path.join(__dirname, "presentation.html"));

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

/* ------------ App Lifecycle ----------------- */
app.whenReady().then(() => {
  createMainWindow();

  // Safe screen usage
  /*----- logDisplays(); -----*/

  screen.on("display-added", (_, display) => {
    console.log("Display added:", display.id);
    /*----- logDisplays(); -----*/
  });

  screen.on("display-removed", (_, display) => {
    console.log("Display removed:", display.id);
    /*----- logDisplays(); -----*/
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
