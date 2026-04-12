const { app, BrowserWindow, Menu, dialog, shell, session } = require('electron');
const path = require('path');
const https = require('https');

const APP_VERSION = app.getVersion();
const GITHUB_OWNER = 'Cksahu143';
const GITHUB_REPO = 'meku-time-flow';
const isDev = !app.isPackaged;

app.setAppUserModelId('com.edas.app');

let mainWindow;

function createAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' }
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
          label: 'Today\'s Flow',
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
    }] : [])
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

  createAppMenu(); // <------ NEW LINE -- set before showing app

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept OAuth & other navigation as before...
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

  // ...rest of function is unchanged (loading, error handers, etc.)
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});