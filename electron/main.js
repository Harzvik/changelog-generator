import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { scanJarDir } from '../src/scan.js';
import { parseEntries } from '../src/parse.js';
import { diffEntries } from '../src/diff.js';
import { toMarkdown, toText } from '../src/format.js';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      // Use a CommonJS preload script to ensure the context bridge works reliably
      preload: path.join(process.cwd(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Mod Diff',
  });

  mainWindow.loadFile(path.join(process.cwd(), 'public', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // Build application menu with a custom View menu (includes Dark Mode) and a Debug menu
  const template = [
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'Ctrl+Shift+D',
          click: () => {
            if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('toggle-dark');
          },
        },
      ],
    },
    { role: 'windowMenu' },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Toggle parsing details',
          accelerator: 'Ctrl+D',
          click: () => {
            if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('toggle-details');
          },
        },
      ],
    },
    { role: 'help' },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('choose-dir', async (_evt, _args) => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('run-diff', async (_evt, { oldDir, newDir }) => {
  if (!oldDir || !newDir) throw new Error('Both directories must be selected');
  const oldFiles = await scanJarDir(oldDir);
  const newFiles = await scanJarDir(newDir);
  const oldEntries = parseEntries(oldFiles);
  const newEntries = parseEntries(newFiles);
  const diff = diffEntries(oldEntries, newEntries);
  const markdown = toMarkdown(diff);
  const text = toText(diff);
  // Return structured entries so renderer can show parsing details
  return { diff, markdown, text, oldEntries, newEntries };
});

ipcMain.handle('save-text', async (_evt, { defaultPath, content }) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Save changelog',
    defaultPath: defaultPath || 'mod-changelog.txt',
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, content, 'utf8');
  return res.filePath;
});
