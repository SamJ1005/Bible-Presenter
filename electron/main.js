// electron/main.js
const { app, BrowserWindow, ipcMain, screen, Menu, protocol } = require("electron");
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
let lowerThirdWin = null;
let currentPresentationPayload = null;
let preferredDisplayId = 'auto'; // 'auto', 'primary', or specific display ID
let currentPresentationFile = { fullscreen: null, lowerThird: null };

/* ---- App configuration (must be before app.whenReady) ----  */
app.setAppUserModelId("com.scripturescreen.app");
app.commandLine.appendSwitch("disable-gpu-vsync");
app.commandLine.appendSwitch("disable-quic"); // Fix for Firebase Storage net::ERR_QUIC_PROTOCOL_ERROR
app.commandLine.appendSwitch(
  "disable-features",
  "CalculateNativeWinOcclusion"
);

/* ------------ Main Window ------------ */
function createMainWindow() {
  if (mainWin) return;

  const iconPath = getIconPath();

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
      webSecurity: app.isPackaged, // Allow file:// font loads in dev from http:// localhost
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
    // Close presentation windows when main window closes
    if (presentationWin && !presentationWin.isDestroyed()) presentationWin.close();
    if (lowerThirdWin && !lowerThirdWin.isDestroyed()) lowerThirdWin.close();
    mainWin = null;
  });
}

/* ------------ Presentation Window (KIOSK MODE) ------------ */
function createPresentationWindow(type = 'fullscreen', startFile = "presentation.html") {
  const isLowerThird = type === 'lowerThird';
  let win = isLowerThird ? lowerThirdWin : presentationWin;

  if (win && !win.isDestroyed()) {
    win.focus();
    return win;
  }

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  
  let targetDisplay;
  if (preferredDisplayId === 'primary') {
    targetDisplay = primary;
  } else if (preferredDisplayId === 'auto') {
    targetDisplay = displays.find((d) => d.id !== primary.id) || primary;
  } else {
    targetDisplay = displays.find(d => d.id.toString() === preferredDisplayId.toString()) || primary;
  }

  const iconPath = getIconPath();

  win = new BrowserWindow({
    title: isLowerThird ? "Scripture Screen - Lower Third" : "Scripture Screen",
    icon: iconPath,
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    kiosk: true,
    frame: false,
    show: false,
    transparent: true,
    backgroundThrottling: false,
    webPreferences: {
      preload: path.join(__dirname, "presentation-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    webSecurity: false,
  });

  win.setIcon(iconPath);

  if (isLowerThird) {
    lowerThirdWin = win;
    currentPresentationFile.lowerThird = startFile;
  } else {
    presentationWin = win;
    currentPresentationFile.fullscreen = startFile;
  }

  win.loadFile(path.join(__dirname, startFile));
  console.log(`[MAIN] Created ${type} window, loading:`, startFile);

  win.webContents.once("dom-ready", () => {
    if (win && !win.isDestroyed()) win.show();
  });

  win.once("ready-to-show", () => {
    if (win && !win.isDestroyed()) {
      win.show();
      if (!isLowerThird) win.focus();
    }
  });

  win.on("closed", () => {
    if (isLowerThird) lowerThirdWin = null;
    else presentationWin = null;
    console.log(`[MAIN] ${type} window closed`);
  });

  return win;
}

/* ------------ IPC ------------ */
ipcMain.handle("open-blank-presentation", () => {
  currentPresentationPayload = null;
  // Open blank fullscreen
  if (presentationWin && !presentationWin.isDestroyed()) {
    presentationWin.webContents.send("display-verse", null);
  } else {
    createPresentationWindow('fullscreen');
  }
  return true;
});

ipcMain.on("send-presentation", (_, payload) => {
  console.log('[MAIN] Received presentation payload.');
  currentPresentationPayload = payload;

  const targetFile = (payload && payload.viewMode === "prelist")
    ? "presentation_prelist.html"
    : "presentation.html";

  const showFS = payload.showFullscreenWindow !== false;
  const showLT = payload.showLowerThirdWindow === true;

  // Fullscreen
  if (showFS) {
    let fsWin = presentationWin;
    if (!fsWin || fsWin.isDestroyed()) {
      fsWin = createPresentationWindow('fullscreen', targetFile);
    }
    
    if (currentPresentationFile.fullscreen !== targetFile) {
      currentPresentationFile.fullscreen = targetFile;
      fsWin.loadFile(path.join(__dirname, targetFile));
      fsWin.webContents.once("dom-ready", () => {
        setTimeout(() => {
          if (fsWin && !fsWin.isDestroyed()) {
            fsWin.webContents.send("display-verse", { ...payload, presentationLayout: 'fullscreen' });
          }
        }, 100);
      });
    } else {
      if (fsWin.webContents.isLoading()) {
        fsWin.webContents.once("dom-ready", () => {
          setTimeout(() => fsWin.webContents.send("display-verse", { ...payload, presentationLayout: 'fullscreen' }), 100);
        });
      } else {
        fsWin.webContents.send("display-verse", { ...payload, presentationLayout: 'fullscreen' });
      }
    }
  } else {
    if (presentationWin && !presentationWin.isDestroyed()) presentationWin.close();
  }

  // Lower Third
  if (showLT) {
    let ltWin = lowerThirdWin;
    if (!ltWin || ltWin.isDestroyed()) {
      ltWin = createPresentationWindow('lowerThird', targetFile);
    }

    if (currentPresentationFile.lowerThird !== targetFile) {
      currentPresentationFile.lowerThird = targetFile;
      ltWin.loadFile(path.join(__dirname, targetFile));
      ltWin.webContents.once("dom-ready", () => {
        setTimeout(() => {
          if (ltWin && !ltWin.isDestroyed()) {
            ltWin.webContents.send("display-verse", { ...payload, presentationLayout: 'lowerThird' });
          }
        }, 100);
      });
    } else {
      if (ltWin.webContents.isLoading()) {
        ltWin.webContents.once("dom-ready", () => {
          setTimeout(() => ltWin.webContents.send("display-verse", { ...payload, presentationLayout: 'lowerThird' }), 100);
        });
      } else {
        ltWin.webContents.send("display-verse", { ...payload, presentationLayout: 'lowerThird' });
      }
    }
  } else {
    if (lowerThirdWin && !lowerThirdWin.isDestroyed()) lowerThirdWin.close();
  }
});

ipcMain.on("close-presentation", () => {
  if (presentationWin && !presentationWin.isDestroyed()) presentationWin.close();
  if (lowerThirdWin && !lowerThirdWin.isDestroyed()) lowerThirdWin.close();
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

// Save media file to local userData folder and return path
ipcMain.handle("save-media-file", async (_, sourcePath) => {
  try {
    const mediaDir = path.join(app.getPath("userData"), "media");
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const fileName = path.basename(sourcePath);
    const destPath = path.join(mediaDir, fileName);

    // Only copy if it exists and is not already at the destination
    if (fs.existsSync(sourcePath) && sourcePath !== destPath) {
      fs.copyFileSync(sourcePath, destPath);
    }
    
    // Return a URL using our custom protocol
    return `local-media://${fileName}`;
  } catch (err) {
    console.error("Failed to save media file:", err);
    return null;
  }
});

// Download media from a remote URL (like Firebase Storage Download URL) and save to local userData folder
ipcMain.handle("download-media-file", async (_, fileUrl, uniqueId) => {
  try {
    const mediaDir = path.join(app.getPath("userData"), "media");
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    // Determine a filename: Use uniqueId if provided, else extract from URL or use a timestamp
    let fileName;
    if (uniqueId) {
      fileName = `${uniqueId}.jpg`; // typically we are saving jpgs
    } else {
      // Very basic extraction, might not work perfectly with Firebase tokens
      const urlObj = new URL(fileUrl);
      fileName = path.basename(urlObj.pathname);
      if (!fileName || fileName.includes("%")) {
         fileName = `download_${Date.now()}.jpg`;
      }
    }
    
    // Sanitize
    fileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, '_');
    
    const destPath = path.join(mediaDir, fileName);

    // If it already exists, assume it was already successfully downloaded/cached to save bandwidth
    if (fs.existsSync(destPath)) {
       return `local-media://${fileName}`;
    }

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(destPath, buffer);
    
    return `local-media://${fileName}`;
  } catch (err) {
    console.error("Failed to download media file:", err);
    return null;
  }
});

// Expose the electron directory path so the renderer can build file:// URLs for iframe src
ipcMain.handle("get-electron-path", () => __dirname.replace(/\\/g, "/"));

// Read presentation_prelist.html as a string for blob URL generation (WYSIWYG preview)
ipcMain.handle("get-prelist-html", () => {
  try {
    const htmlPath = path.join(__dirname, "presentation_prelist.html");
    let html = fs.readFileSync(htmlPath, "utf-8");
    
    // Inject lower_third.js directly into the HTML for the Prelist blob
    try {
      const ltPath = path.join(__dirname, "lower_third.js");
      const ltScript = fs.readFileSync(ltPath, "utf-8");
      html = html.replace('<script src="lower_third.js"></script>', `<script>\n${ltScript}\n</script>`);
    } catch(e) {
      console.warn("Could not inject lower_third.js", e);
    }
    
    return html;
  } catch (err) {
    console.error("[MAIN] Failed to read presentation_prelist.html:", err);
    return null;
  }
});

ipcMain.handle("get-displays", () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id.toString(),
    label: d.label || (d.id === screen.getPrimaryDisplay().id ? "Primary Display" : "Secondary Display"),
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === screen.getPrimaryDisplay().id
  }));
});

ipcMain.on("set-preferred-display", (_, displayId) => {
  preferredDisplayId = displayId;
  
  // If presentation window is already open, move it immediately
  if (presentationWin && !presentationWin.isDestroyed()) {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    let targetDisplay;
    
    if (displayId === 'primary') {
      targetDisplay = primary;
    } else if (displayId === 'auto') {
      // Prioritize secondary, fallback to primary
      targetDisplay = displays.find(d => d.id !== primary.id) || primary;
    } else {
      // Find specific display by ID
      targetDisplay = displays.find(d => d.id.toString() === displayId.toString()) || primary;
    }
    
    if (targetDisplay) {
      // Ensure we are in kiosk mode if needed, then move
      presentationWin.setKiosk(false); // Temporarily exit kiosk to move smoothly
      presentationWin.setBounds({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height
      });
      presentationWin.setKiosk(true);
    }
  }
});

/* ------------ App Lifecycle ------------ */
app.whenReady().then(() => {
  // Register custom protocol to serve media from userData
  // This allows us to load local files without disabling all web security
  protocol.registerFileProtocol('local-media', (request, callback) => {
    const filePath = request.url.replace('local-media://', '');
    const mediaDir = path.join(app.getPath("userData"), "media");
    // decodeURIComponent handles spaces and special chars in filenames
    const fullPath = path.join(mediaDir, decodeURIComponent(filePath));
    callback({ path: fullPath });
  });

  // Create custom menu
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
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
      label: 'Bible',
      submenu: [
        {
          label: 'Select Version',
          submenu: [
            { label: 'English: NKJV (Default)', type: 'radio', checked: true },
            { label: 'English: KJV', type: 'radio' },
            { label: 'Tamil: BSI', type: 'radio', checked: true }
          ]
        },
        { type: 'separator' },
        {
          label: 'Manage Versions...',
          click: () => {
            // Future implementation for importing/managing JSON/XML/CSV
            console.log('Manage versions clicked');
            if (mainWin) mainWin.webContents.send('open-manage-versions');
          }
        }
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

  screen.on("display-added", () => { });
  screen.on("display-removed", () => { });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
