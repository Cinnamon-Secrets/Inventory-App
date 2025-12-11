const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDataStore } = require('./services/database');

let dataStore;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

function registerDataHandlers() {
  ipcMain.handle('data:load', () => {
    if (!dataStore) return null;
    return dataStore.getSnapshot();
  });

  ipcMain.handle('data:save', (event, snapshot) => {
    if (!dataStore) throw new Error('Data store not initialized');
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Invalid snapshot payload');
    }
    dataStore.saveSnapshot(snapshot, { note: 'renderer-save' });
    return { success: true };
  });

  ipcMain.handle('data:list-archives', (event, limit = 50) => {
    if (!dataStore) return [];
    const numericLimit = Number.isFinite(limit) ? limit : parseInt(limit, 10);
    const safeLimit = Math.min(Math.max(numericLimit || 20, 1), 200);
    return dataStore.listArchives(safeLimit);
  });

  ipcMain.handle('data:restore-archive', (event, archiveId) => {
    if (!dataStore) throw new Error('Data store not initialized');
    if (typeof archiveId === 'undefined' || archiveId === null) {
      throw new Error('Archive id is required');
    }
    return dataStore.restoreArchive(archiveId);
  });
}

app.whenReady().then(() => {
  const userDataDir = app.getPath('userData');
  const dbPath = path.join(userDataDir, 'cinnamon-secrets.db');
  const backupDir = path.join(userDataDir, 'backups');
  dataStore = initDataStore({ dbPath, backupDir });
  registerDataHandlers();

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
