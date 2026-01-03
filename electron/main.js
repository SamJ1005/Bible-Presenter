// electron/main.js
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const bibleKJV = require("./assets/bible/kjv.json"); 

// Helper function to get icon path (call after app is ready)
function getIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(process.cwd(), "public", "icon.ico");
}

let mainWin = null;
let presentationWin = null;
let currentPresentationPayload = null;

/* ---- App configuration (must be before app.whenReady) ----  */
app.setAppUserModelId("com.scripturescreen.app");
app.commandLine.appendSwitch("disable-gpu-vsync");
app.commandLine.appendSwitch(
  "disable-features",
  "CalculateNativeWinOcclusion"
);

/* ------------ Main Window ------------ */
function createMainWindow() {
  if (mainWin) return;

  const iconPath = getIconPath();

  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // IMPORTANT: show only when ready
    icon: iconPath,
    backgroundColor: "#ffffff",
    backgroundThrottling: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  }); 

  if (fs.existsSync(iconPath)) {
    mainWin.setIcon(iconPath);
  }

  if (app.isPackaged) {
    mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWin.loadURL("http://localhost:5173");
  }

  mainWin.once("ready-to-show", () => {
    mainWin.show();
  });

  mainWin.on("closed", () => {
    mainWin = null;
  });
}

/* ------------ Presentation Window (KIOSK MODE) ------------ */
function createPresentationWindow() {
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const targetDisplay =
    displays.find((d) => d.id !== primary.id) || primary;

  const iconPath = getIconPath();

  presentationWin = new BrowserWindow({
    title: "Scripture Screen",
    icon: iconPath,
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    kiosk: true,              // ✅ KEY CHANGE
    frame: false,
    show: false,
    backgroundThrottling: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "presentation-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  presentationWin.setIcon(iconPath);

  presentationWin.loadFile(
    path.join(__dirname, "presentation.html")
  );

  // Wait for DOM to be ready before sending messages
  presentationWin.webContents.once("dom-ready", () => {
    if (currentPresentationPayload) {
      // Small delay to ensure event listeners are set up
      setTimeout(() => {
        presentationWin.webContents.send(
          "display-verse",
          currentPresentationPayload
        );
      }, 100);
    }
  });

  presentationWin.once("ready-to-show", () => {
    presentationWin.show();
    presentationWin.focus();
  });

  presentationWin.on("closed", () => {
    presentationWin = null;
  });
}

/* ------------ IPC ------------ */
ipcMain.handle("open-blank-presentation", () => {
  // Always allow opening blank presentation, even if window exists
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.focus();
    // Clear current payload to show blank
    currentPresentationPayload = null;
    // Send blank/null payload to actually clear the screen
    presentationWin.webContents.send("display-verse", null);
  } else {
    // Clear the payload so the new window opens blank
    currentPresentationPayload = null;
    createPresentationWindow();
  }
  return true;
});

ipcMain.on("send-presentation", (_, payload) => {
  currentPresentationPayload = payload;

  if (!presentationWin || presentationWin.isDestroyed()) {
    createPresentationWindow();
  } else {
    // Check if window is ready before sending
    if (presentationWin.webContents.isLoading()) {
      // Wait for DOM to be ready
      presentationWin.webContents.once("dom-ready", () => {
        setTimeout(() => {
          presentationWin.webContents.send("display-verse", payload);
        }, 100);
      });
    } else {
      // Window is already loaded, send immediately
      presentationWin.webContents.send("display-verse", payload);
    }
  }
});

ipcMain.on("close-presentation", () => {
  presentationWin?.close();
});

ipcMain.on("presentation-next-verse", () => {
  mainWin?.webContents.send("navigate-next-verse");
});

ipcMain.on("presentation-prev-verse", () => {
  mainWin?.webContents.send("navigate-prev-verse");
});
ipcMain.handle("get-verse", (_, ref) => {
  try {
    return (
      bibleKJV?.[ref.book]?.[ref.chapter]?.[ref.verse] || null
    );
  } catch {
    return null;
  }
});

/* ------------ App Lifecycle ------------ */
app.whenReady().then(() => {
  createMainWindow();

  screen.on("display-added", () => {});
  screen.on("display-removed", () => {});
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
