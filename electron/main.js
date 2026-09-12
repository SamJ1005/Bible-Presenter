// electron/main.js
const { app, BrowserWindow, ipcMain, screen, Menu, protocol, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const { pathToFileURL } = require("url");
const bibleKJV = require("./assets/bible/kjv.json");

// Register custom privileged schemes before app is ready for zero-copy video streaming and byte-range seeking
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true,
    },
  },
  {
    scheme: "local-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

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
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required"); // Allow seamless video playback on presentation displays
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
    title: "Scripture Screen - Control Panel",
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
      webSecurity: false, // Allow local file streaming and custom protocols in control panel
      devTools: !app.isPackaged, // Enable DevTools only during development, disabled in production build
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
    title: isLowerThird ? "Scripture Screen - Lower Third" : "Scripture Screen - Fullscreen Presentation",
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
      devTools: !app.isPackaged,
      webSecurity: false,
    },
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

function sendDisplayVerse(win, payload, presentationLayout) {
  if (!win || win.isDestroyed()) return;
  const primary = screen.getPrimaryDisplay();
  const windowDisplay = screen.getDisplayMatching(win.getBounds());
  const isPrimary = windowDisplay.id === primary.id;
  win.webContents.send("display-verse", {
    ...(payload || {}),
    presentationLayout,
    showExitControl: isPrimary,
    isPrimaryDisplay: isPrimary,
    isSecondaryDisplay: !isPrimary,
  });
}

/* ------------ IPC ------------ */
ipcMain.handle("open-blank-presentation", () => {
  currentPresentationPayload = { isBlank: true };
  if (presentationWin && !presentationWin.isDestroyed()) {
    sendDisplayVerse(presentationWin, { isBlank: true }, 'fullscreen');
  } else {
    const win = createPresentationWindow('fullscreen');
    win.webContents.once("dom-ready", () => {
      setTimeout(() => sendDisplayVerse(win, { isBlank: true }, 'fullscreen'), 100);
    });
  }
  return true;
});

ipcMain.on("send-presentation", (_, payload) => {
  console.log('[MAIN] Received presentation payload.');
  currentPresentationPayload = payload;

  const targetFile = (payload && (payload.viewMode === "prelist" || payload.type === "file" || payload.type === "custom"))
    ? "presentation_prelist.html"
    : "presentation.html";

  const showFS = !payload || payload.isBlank ? true : payload.showFullscreenWindow !== false;
  const showLT = payload && !payload.isBlank && payload.showLowerThirdWindow === true;

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
            sendDisplayVerse(fsWin, payload, 'fullscreen');
          }
        }, 100);
      });
    } else {
      if (fsWin.webContents.isLoading()) {
        fsWin.webContents.once("dom-ready", () => {
          setTimeout(() => sendDisplayVerse(fsWin, payload, 'fullscreen'), 100);
        });
      } else {
        sendDisplayVerse(fsWin, payload, 'fullscreen');
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
            sendDisplayVerse(ltWin, payload, 'lowerThird');
          }
        }, 100);
      });
    } else {
      if (ltWin.webContents.isLoading()) {
        ltWin.webContents.once("dom-ready", () => {
          setTimeout(() => sendDisplayVerse(ltWin, payload, 'lowerThird'), 100);
        });
      } else {
        sendDisplayVerse(ltWin, payload, 'lowerThird');
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

ipcMain.on("control-presentation-video", (event, command) => {
  // If sent from main control window, forward to presentation windows
  if (mainWin && !mainWin.isDestroyed() && event.sender === mainWin.webContents) {
    if (presentationWin && !presentationWin.isDestroyed()) {
      presentationWin.webContents.send("control-video", command);
    }
    if (lowerThirdWin && !lowerThirdWin.isDestroyed()) {
      lowerThirdWin.webContents.send("control-video", command);
    }
  } else {
    // If sent from a presentation window (e.g. primary screen controls), forward to main window
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("control-video", command);
    }
    if (presentationWin && !presentationWin.isDestroyed() && event.sender !== presentationWin.webContents) {
      presentationWin.webContents.send("control-video", command);
    }
    if (lowerThirdWin && !lowerThirdWin.isDestroyed() && event.sender !== lowerThirdWin.webContents) {
      lowerThirdWin.webContents.send("control-video", command);
    }
  }
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
    if (!sourcePath || !fs.existsSync(sourcePath)) return null;

    // For videos or large media (>25MB), DO NOT copy synchronously or duplicate GBs to userData!
    // Return direct file:// protocol URL immediately for instant zero-copy streaming!
    const stats = fs.statSync(sourcePath);
    if (stats.size > 25 * 1024 * 1024 || /\.(mp4|webm|mov|mkv|avi|flv|wmv|m4v|3gp|ts)$/i.test(sourcePath)) {
      return `file:///${sourcePath.replace(/\\/g, "/")}`;
    }

    const mediaDir = path.join(app.getPath("userData"), "media");
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const fileName = path.basename(sourcePath);
    const destPath = path.join(mediaDir, fileName);

    // Only copy if it exists and is not already at the destination
    if (sourcePath !== destPath) {
      await fs.promises.copyFile(sourcePath, destPath);
    }
    
    // Return a URL using our custom protocol
    return `local-media://${fileName}`;
  } catch (err) {
    console.error("Failed to save media file:", err);
    return sourcePath ? `file:///${sourcePath.replace(/\\/g, "/")}` : null;
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

/* ------------ Auto Update Checker (GitHub Releases) ------------ */
const GITHUB_REPO_OWNER = "SamJ1005";
const GITHUB_REPO_NAME = "Bible-Presenter";

function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const parseParts = (v) => v.replace(/^[^\d]*/, "").trim().split(/[-+.]/).map(n => parseInt(n, 10) || 0);
  const l = parseParts(latest);
  const c = parseParts(current);
  const maxLen = Math.max(l.length, c.length);
  for (let i = 0; i < maxLen; i++) {
    const lPart = l[i] || 0;
    const cPart = c[i] || 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}

ipcMain.handle("check-for-updates", async () => {
  try {
    const currentVersion = app.getVersion();
    const fetchFn = typeof fetch === "function" ? fetch : net.fetch;
    const response = await fetchFn(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
      {
        headers: {
          "User-Agent": "Scripture-Screen-App",
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      return { updateAvailable: false, error: `GitHub API status ${response.status}: ${response.statusText}` };
    }

    const release = await response.json();
    const latestTag = release.tag_name || "";
    const updateAvailable = isNewerVersion(latestTag, currentVersion);

    let downloadUrl = release.html_url;
    let exeAsset = null;
    if (Array.isArray(release.assets)) {
      exeAsset = release.assets.find(a => a.name && a.name.toLowerCase().endsWith(".exe"));
      if (exeAsset && exeAsset.browser_download_url) {
        downloadUrl = exeAsset.browser_download_url;
      }
    }

    return {
      updateAvailable,
      currentVersion,
      latestVersion: latestTag.replace(/^[^\d]*/, ""),
      releaseNotes: release.body || "A new update is available with performance improvements and updates.",
      downloadUrl,
      releaseUrl: release.html_url,
      publishedAt: release.published_at,
      assetName: exeAsset ? exeAsset.name : null,
      assetSize: exeAsset ? exeAsset.size : null,
    };
  } catch (err) {
    console.error("[MAIN] Update check error:", err);
    return { updateAvailable: false, error: err.message };
  }
});

ipcMain.handle("open-external-url", async (_, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Helper to parse custom standard scheme URL into a real filesystem path on Windows/Unix
function urlToLocalFilePath(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    let drive = parsed.host;
    let restPath = decodeURIComponent(parsed.pathname);

    let filePath = "";
    if (process.platform === "win32") {
      // Chromium treats "C:" in standard URLs as the host "c"
      if (drive && drive.length === 1 && /^[a-zA-Z]$/.test(drive)) {
        filePath = `${drive.toUpperCase()}:${restPath}`;
      } else if (/^\/?[a-zA-Z]:/.test(restPath)) {
        filePath = restPath.replace(/^\//, "");
      } else {
        filePath = path.join(drive, restPath);
      }
    } else {
      filePath = path.join(drive, restPath);
    }
    return path.normalize(filePath);
  } catch (e) {
    let raw = requestUrl.replace(/^local-file:\/\/\/?/, "");
    return decodeURIComponent(raw);
  }
}

// MIME types map for common media and asset formats
const MEDIA_MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
  ".m4v": "video/mp4",
  ".3gp": "video/3gpp",
  ".ts": "video/mp2t",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// Robust HTTP 206 Partial Content responder for media files supporting timeline scrubber seeking
function serveLocalFileWithRange(realPath, request) {
  try {
    if (!fs.existsSync(realPath)) {
      console.warn("[MAIN] local-file not found:", realPath);
      return new Response("File not found", { status: 404 });
    }

    const stat = fs.statSync(realPath);
    const fileSize = stat.size;
    const ext = path.extname(realPath).toLowerCase();
    const contentType = MEDIA_MIME_TYPES[ext] || "application/octet-stream";
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunksize = end - start + 1;
      const stream = fs.createReadStream(realPath, { start, end });

      return new Response(Readable.toWeb(stream), {
        status: 206,
        statusText: "Partial Content",
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Full file response with Accept-Ranges so Chromium knows seeking is supported
    const stream = fs.createReadStream(realPath);
    return new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[MAIN] serveLocalFileWithRange error:", err);
    return new Response("File error", { status: 500 });
  }
}

/* ------------ App Lifecycle ------------ */
app.whenReady().then(() => {
  // Protocol handlers for streaming local media files with byte-range (HTTP 206) support
  protocol.handle("local-file", (request) => {
    try {
      const realPath = urlToLocalFilePath(request.url);
      return serveLocalFileWithRange(realPath, request);
    } catch (err) {
      console.error("[MAIN] local-file protocol error:", err);
      return new Response("File error", { status: 500 });
    }
  });

  protocol.handle("local-media", (request) => {
    try {
      const parsed = new URL(request.url);
      const fileName = decodeURIComponent(parsed.pathname.replace(/^\//, "") || parsed.host);
      const mediaDir = path.join(app.getPath("userData"), "media");
      const fullPath = path.join(mediaDir, fileName);
      return serveLocalFileWithRange(fullPath, request);
    } catch (err) {
      console.error("[MAIN] local-media protocol error:", err);
      return new Response("File error", { status: 500 });
    }
  });

  const isDev = !app.isPackaged;

  // Create custom menu
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        ...(isDev
          ? [
              { role: 'reload' },
              { role: 'forceReload' },
              { role: 'toggleDevTools' },
              { type: 'separator' },
            ]
          : []),
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
