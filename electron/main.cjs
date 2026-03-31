const { app, BrowserWindow, Menu, dialog, shell, session } = require('electron');
const path = require('path');
const https = require('https');

const APP_VERSION = app.getVersion();
const GITHUB_OWNER = 'Cksahu143';
const GITHUB_REPO = 'meku-time-flow';
const isDev = !app.isPackaged;

// Set Windows taskbar app ID
app.setAppUserModelId('com.edas.app');

let mainWindow;

function createWindow() {
  // Grant microphone permissions automatically
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

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept OAuth navigations — open in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Also intercept will-navigate for OAuth redirects
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    // Allow file:// and localhost navigations (app itself)
    if (parsed.protocol === 'file:' || parsed.hostname === 'localhost') return;
    // OAuth and external URLs → open in default browser
    if (url.includes('accounts.google.com') || url.includes('oauth') || url.includes('supabase')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Load the built app
  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('Failed to load app:', err);
    dialog
      .showMessageBox({
        type: 'error',
        title: 'EDAS — Load Error',
        message: 'The application could not load.',
        detail:
          'The main interface failed to start. This may be caused by a corrupted installation.\n\nPlease try reinstalling EDAS.',
        buttons: ['Quit'],
      })
      .then(() => app.quit());
  });

  // Handle page load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`did-fail-load: ${errorCode} ${errorDescription}`);
    dialog
      .showMessageBox(mainWindow, {
        type: 'error',
        title: 'EDAS — Page Load Error',
        message: 'A page failed to load.',
        detail: `${errorDescription} (code ${errorCode})\n\nWould you like to retry?`,
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          mainWindow.loadFile(indexPath).catch(() => app.quit());
        } else {
          app.quit();
        }
      });
  });

  // Handle renderer crash
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer crashed:', details.reason);
    dialog
      .showMessageBox({
        type: 'error',
        title: 'EDAS — Crashed',
        message: 'The application has crashed.',
        detail: 'Would you like to reload or quit?',
        buttons: ['Reload', 'Quit'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          mainWindow.reload();
        } else {
          app.quit();
        }
      });
  });

  // Handle unresponsive window
  mainWindow.on('unresponsive', () => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'warning',
        title: 'EDAS — Not Responding',
        message: 'The application is not responding.',
        detail: 'Would you like to wait or reload?',
        buttons: ['Wait', 'Reload', 'Quit'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 1) {
          mainWindow.reload();
        } else if (response === 2) {
          app.quit();
        }
      });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkForUpdates(silent = false) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    headers: { 'User-Agent': 'EDAS-Desktop' },
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latestVersion = (release.tag_name || '').replace(/^v/, '');
        if (latestVersion && latestVersion !== APP_VERSION) {
          dialog
            .showMessageBox(mainWindow, {
              type: 'info',
              title: 'Update Available',
              message: `A new version (v${latestVersion}) is available. You are running v${APP_VERSION}.`,
              buttons: ['Download', 'Later'],
              defaultId: 0,
            })
            .then(({ response }) => {
              if (response === 0) {
                shell.openExternal(release.html_url);
              }
            });
        } else if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'No Updates',
            message: `You're running the latest version (v${APP_VERSION}).`,
          });
        }
      } catch {
        // Intentionally silent — JSON parse of GitHub API response failed
        if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Check',
            message: 'Could not check for updates right now.',
          });
        }
      }
    });
  }).on('error', () => {
    // Intentionally silent on network error for silent checks
    if (!silent) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not connect to the update server.',
      });
    }
  });
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About EDAS',
    message: 'EDAS — Educational Dashboard & Assignment System',
    detail:
      'The all-in-one school planner for students.\n\n' +
      'Track assignments, manage schedules, and stay on top of your academic life.\n\n' +
      'Version ' + APP_VERSION + '\n' +
      'Built by Charukrishna Sahu\n\n' +
      'Copyright © 2026 Charukrishna Sahu\n' +
      'All rights reserved.',
    buttons: ['OK'],
  });
}

function navigateTo(view) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(
      `window.__EDAS_NAVIGATE && window.__EDAS_NAVIGATE('${view}')`
    );
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'EDAS',
            submenu: [
              { label: 'About EDAS', click: () => showAboutDialog() },
              { label: 'Check for Updates…', click: () => checkForUpdates(false) },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard', click: () => navigateTo('dashboard'), accelerator: 'CmdOrCtrl+1' },
        { label: 'Timetable', click: () => navigateTo('timetable'), accelerator: 'CmdOrCtrl+2' },
        { label: 'Calendar', click: () => navigateTo('calendar'), accelerator: 'CmdOrCtrl+3' },
        { label: 'To-Do', click: () => navigateTo('todo'), accelerator: 'CmdOrCtrl+4' },
        { label: 'Pomodoro', click: () => navigateTo('pomodoro'), accelerator: 'CmdOrCtrl+5' },
        { label: 'Groups', click: () => navigateTo('groups'), accelerator: 'CmdOrCtrl+6' },
        { label: 'Resources', click: () => navigateTo('resources'), accelerator: 'CmdOrCtrl+7' },
        { label: 'Transcribe', click: () => navigateTo('transcribe'), accelerator: 'CmdOrCtrl+8' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        ...(!isMac
          ? [
              { label: 'About EDAS', click: () => showAboutDialog() },
              { type: 'separator' },
            ]
          : []),
        { label: 'Check for Updates…', click: () => checkForUpdates(false) },
        { type: 'separator' },
        {
          label: 'Report a Bug',
          click: () =>
            shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new`),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // Silent update check on launch
  setTimeout(() => checkForUpdates(true), 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
