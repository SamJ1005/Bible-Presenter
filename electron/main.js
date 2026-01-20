// electron/main.js
const { app, BrowserWindow, ipcMain, screen, Menu } = require("electron");
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

  // Calculate 50% of screen dimensions for minimum size constraint
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  mainWin = new BrowserWindow({
    width: 1300,
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
    // Close presentation window when main window closes
    if (presentationWin && !presentationWin.isDestroyed()) {
      presentationWin.close();
    }
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
    webSecurity: false,
  });

  presentationWin.setIcon(iconPath);

  presentationWin.loadFile(
    path.join(__dirname, "presentation.html")
  );
  
  // Reset file tracker since we're loading presentation.html
  currentPresentationFile = "presentation.html";
  console.log('[MAIN] Created presentation window, loaded:', currentPresentationFile);

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
    console.log('[MAIN] Presentation window closed');
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

// Track which file is currently loaded
let currentPresentationFile = "presentation.html";

function loadPresentationFile(filename) {
  if (!presentationWin || presentationWin.isDestroyed()) {
    console.log('[MAIN] Cannot load file - window destroyed');
    return;
  }
  if (currentPresentationFile === filename) {
    console.log('[MAIN] File already loaded:', filename);
    return; // Already loaded
  }

  console.log('[MAIN] Switching from', currentPresentationFile, 'to', filename);
  currentPresentationFile = filename;
  presentationWin.loadFile(path.join(__dirname, filename));
}

ipcMain.on("send-presentation", (_, payload) => {
  console.log('[MAIN] Received presentation payload:', JSON.stringify(payload, null, 2));
  currentPresentationPayload = payload;

  const targetFile = (payload && payload.viewMode === "prelist") 
    ? "presentation_prelist.html" 
    : "presentation.html";

  if (!presentationWin || presentationWin.isDestroyed()) {
    createPresentationWindow(); // Will load default "presentation.html" initially
    // We need to override if target is prelist
    if (targetFile !== "presentation.html") {
        currentPresentationFile = "presentation.html"; // reset default
    }
  } 
  
  // Ensure window exists
  if (!presentationWin || presentationWin.isDestroyed()) return;

  if (currentPresentationFile !== targetFile) {
     loadPresentationFile(targetFile);
     // loadFile is async-ish, need to wait for dom-ready again
     presentationWin.webContents.once("dom-ready", () => {
        setTimeout(() => {
          presentationWin.webContents.send("display-verse", payload);
        }, 100);
     });
     return;
  }

  // Same file, standard send
  if (presentationWin.webContents.isLoading()) {
      presentationWin.webContents.once("dom-ready", () => {
        setTimeout(() => {
          presentationWin.webContents.send("display-verse", payload);
        }, 100);
      });
  } else {
      presentationWin.webContents.send("display-verse", payload);
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
  // Create custom menu
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { 
          role: 'zoomIn',
          accelerator: 'CommandOrControl+='
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

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
