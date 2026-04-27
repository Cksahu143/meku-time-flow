const { app, BrowserWindow, Menu, dialog, shell, session } = require('electron');
const path = require('path');
const https = require('https');

const APP_VERSION = app.getVersion();
const isDev = !app.isPackaged;

const UPDATE_MANIFEST_URL = 'https://cksahu143.github.io/edas-home/updates/latest.json';

app.setAppUserModelId('com.edas.app');

let mainWindow;

// ─── UPDATE CHECKER ───────────────────────────────────────────────────────────

function isNewerVersion(latest, current) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj, lMin, lPat] = parse(latest);
  const [cMaj, cMin, cPat] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

function checkForUpdates(silent = false) {
  const req = https.get(UPDATE_MANIFEST_URL, { timeout: 8000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const manifest = JSON.parse(data);
        const latestVersion = manifest.version;

        if (isNewerVersion(latestVersion, APP_VERSION)) {
          const platform = process.platform;
          const downloadUrl =
            platform === 'darwin' ? manifest.mac?.url :
            platform === 'win32'  ? manifest.win?.url :
                                    manifest.linux?.url;

          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `EDAS v${latestVersion} is available`,
            detail: `You are on v${APP_VERSION}.\n\n${manifest.releaseNotes || 'A new version is ready to download.'}`,
            buttons: ['Download Update', 'Release Notes', 'Later'],
            defaultId: 0,
            cancelId: 2,
          }).then(({ response }) => {
            if (response === 0 && downloadUrl) {
              shell.openExternal(downloadUrl);
            } else if (response === 1) {
              shell.openExternal(
                manifest.releasePageUrl || 'https://cksahu143.github.io/edas-home'
              );
            }
          });

        } else if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: "You're up to date",
            message: `EDAS v${APP_VERSION} is the latest version.`,
            buttons: ['OK'],
          });
        }

      } catch {
        if (!silent) showUpdateError();
      }
    });
  });

  req.on('error', () => { if (!silent) showUpdateError(); });
  req.on('timeout', () => { req.destroy(); });
}

function showUpdateError() {
  dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Update Check Failed',
    message: 'Could not reach the update server.',
    detail: 'Check your internet connection or visit the website manually.',
    buttons: ['Visit Website', 'OK'],
    defaultId: 1,
  }).then(({ response }) => {
    if (response === 0) shell.openExternal('https://cksahu143.github.io/edas-home');
  });
}

// ─── MENU ─────────────────────────────────────────────────────────────────────

function createAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(false),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' },
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          click: () => { mainWindow.webContents.send('menu:new-task'); }
        },
        {
          label: 'Open...',
          click: () => { mainWindow.webContents.send('menu:open'); }
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit', label: isMac ? 'Close Window' : 'Quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        {
          label: "Today's Flow",
          click: () => { mainWindow.webContents.send('menu:view-today'); }
        },
        {
          label: 'All Tasks',
          click: () => { mainWindow.webContents.send('menu:view-all-tasks'); }
        },
      ]
    },
    {
      label: 'Tasks',
      submenu: [
        {
          label: 'Complete Task',
          click: () => { mainWindow.webContents.send('menu:complete-task'); }
        },
        {
          label: 'Delete Task',
          click: () => { mainWindow.webContents.send('menu:delete-task'); }
        }
      ]
    },
    ...(isMac ? [{
      label: 'Window',
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' }
      ]
    }] : []),
    // Help menu — shows on Windows/Linux since they don't have the app name menu
    ...(!isMac ? [{
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(false),
        },
        { type: 'separator' },
        {
          label: 'Visit EDAS Website',
          click: () => shell.openExternal('https://cksahu143.github.io/edas-home'),
        },
      ]
    }] : []),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── WINDOW ───────────────────────────────────────────────────────────────────

function createWindow() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'mediaKeySystem', 'geolocation', 'notifications'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ['media', 'mediaKeySystem', 'geolocation', 'notifications'];
    return allowed.includes(permission);
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'EDAS',
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  createAppMenu();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Silent background update check 5 seconds after launch
    // Won't bother the user if already on latest
    setTimeout(() => checkForUpdates(true), 5000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:' || parsed.hostname === 'localhost') return;
    if (url.includes('accounts.google.com') || url.includes('oauth') || url.includes('supabase')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
