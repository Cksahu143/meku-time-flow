const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');

const APP_VERSION = app.getVersion();
const GITHUB_OWNER = 'Cksahu143';
const GITHUB_REPO = 'meku-time-flow';

let mainWindow;

function getIndexPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist', 'index.html');
  }
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'EDAS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(getIndexPath());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
