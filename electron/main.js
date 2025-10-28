import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import { scanJarDir } from '../src/scan.js';
import { parseEntries } from '../src/parse.js';
import { diffEntries } from '../src/diff.js';
import { toMarkdown, toText } from '../src/format.js';

let mainWindow;

// Ensure Windows has an App User Model ID so the taskbar groups and pins use our icon
if (process.platform === 'win32' && typeof app.setAppUserModelId === 'function') {
  // Use a reverse-domain identifier — change if you have a packaged app id
  app.setAppUserModelId('com.harzvik.mod-diff');
}

function createWindow() {
  // choose platform-appropriate icon if available (ICO for Windows, ICNS for macOS, PNG for Linux)
  let iconPath = path.join(process.cwd(), 'public', 'icon.svg');
  try {
    if (process.platform === 'win32') {
      const maybe = path.join(process.cwd(), 'public', 'icons', 'app.ico');
      // prefer generated ICO
      if (fs.existsSync(maybe)) iconPath = maybe;
    } else if (process.platform === 'darwin') {
      const maybe = path.join(process.cwd(), 'public', 'icons', 'app.icns');
      if (fs.existsSync(maybe)) iconPath = maybe;
    } else {
      const maybe = path.join(process.cwd(), 'public', 'icons', 'png', 'icon-512.png');
      if (fs.existsSync(maybe)) iconPath = maybe;
    }
  } catch (e) {
    // fall back to SVG if checks fail
    iconPath = path.join(process.cwd(), 'public', 'icon.svg');
  }

  // Try to use an Electron nativeImage so the icon is recognized by the OS/taskbar
  let iconForWindow = iconPath;
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) iconForWindow = img;
  } catch (e) {
    // keep iconPath as string fallback
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      // Use a CommonJS preload script to ensure the context bridge works reliably
      preload: path.join(process.cwd(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // App icon (platform-specific generated assets preferred).
    icon: iconForWindow,
    title: 'Mod Diff',
  });

  mainWindow.loadFile(path.join(process.cwd(), 'public', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // Build application menu with a custom View menu (includes Theme override) and a Debug menu
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
          label: 'Toggle Theme (dark/light)',
          accelerator: 'Ctrl+Shift+D',
          click: () => {
            // Simple toggle: tell the renderer to toggle theme state.
            if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('toggle-theme');
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
