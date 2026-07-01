const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const { fileURLToPath } = require("url");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let splashWindow = null;
let apiServerProcess = null;
let isQuitting = false;

const API_PORT = 8080;
const API_HOST = "localhost";

function isDev() {
  return !app.isPackaged;
}

function getResourcesPath() {
  return isDev() ? __dirname : process.resourcesPath || __dirname;
}

function getServerPath() {
  return path.join(getResourcesPath(), "server", "dist", "index.mjs");
}

function getFrontendDistPath() {
  return path.join(getResourcesPath(), "frontend");
}

function getServerBasePath() {
  return path.join(getResourcesPath(), "server");
}

function waitForServer() {
  return new Promise((resolve) => {
    const http = require("http");
    const startTime = Date.now();

    function check() {
      const req = http.get(
        `http://${API_HOST}:${API_PORT}/api/health`,
        (res) => {
          resolve(true);
        },
        () => {
          if (Date.now() - startTime > 15000) {
            resolve(false);
            return;
          }
          setTimeout(check, 500);
        }
      );
      req.on("error", () => {
        if (Date.now() - startTime > 15000) {
          resolve(false);
          return;
        }
        setTimeout(check, 500);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (Date.now() - startTime > 15000) {
          resolve(false);
          return;
        }
        setTimeout(check, 500);
      });
    }
    check();
  });
}

function startApiServer() {
  return new Promise((resolve) => {
    const serverPath = getServerPath();
    const frontendDist = getFrontendDistPath();
    const serverBase = getServerBasePath();
    const env = {
      ...process.env,
      PORT: String(API_PORT),
      FRONTEND_DIST: frontendDist,
      NODE_ENV: "production",
    };

    apiServerProcess = spawn("node", ["--enable-source-maps", serverPath], {
      cwd: serverBase,
      env,
      shell: false,
      windowsHide: true,
    });

    apiServerProcess.stdout?.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("Server listening")) {
        resolve(true);
      }
    });

    apiServerProcess.stderr?.on("data", () => {
      // Ignore startup warnings
    });

    apiServerProcess.on("error", () => {
      resolve(false);
    });

    apiServerProcess.on("exit", (code) => {
      if (!isQuitting && code !== 0) {
        console.error(`API server exited with code ${code}`);
      }
    });

    setTimeout(() => resolve(true), 5000);
  });
}

function stopApiServer() {
  if (apiServerProcess) {
    isQuitting = true;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(apiServerProcess.pid), "/f", "/t"]);
    } else {
      apiServerProcess.kill("SIGTERM");
    }
    apiServerProcess = null;
  }
}

function createSplashWindow() {
  const { width: screenWidth, height: screenHeight } = screen
    .getPrimaryDisplay()
    .workAreaSize;
  const splashWidth = 420;
  const splashHeight = 280;

  splashWindow = new BrowserWindow({
    width: splashWidth,
    height: splashHeight,
    x: Math.floor((screenWidth - splashWidth) / 2),
    y: Math.floor((screenHeight - splashHeight) / 2),
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "..", "splash.html"));

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "..", "resources", "icon.ico"),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://${API_HOST}:${API_PORT}`);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      setTimeout(() => {
        splashWindow?.close();
        mainWindow?.show();
      }, 800);
    } else {
      mainWindow?.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-fail-load", (event, code, desc) => {
    console.error("Main window failed to load:", code, desc);
  });
}

async function initializeApp() {
  createSplashWindow();

  const serverReady = await startApiServer();
  if (!serverReady) {
    console.error("Failed to start API server within timeout");
  }

  await new Promise((r) => setTimeout(r, 2000));
  createMainWindow();
}

app.whenReady().then(async () => {
  await initializeApp();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopApiServer();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("before-quit", () => {
  stopApiServer();
  isQuitting = true;
});

ipcMain.handle("app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-port", () => {
  return API_PORT;
});
