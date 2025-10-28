const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modDiffAPI', {
  chooseDir: async () => ipcRenderer.invoke('choose-dir'),
  runDiff: async (oldDir, newDir) => ipcRenderer.invoke('run-diff', { oldDir, newDir }),
  saveText: async (content, defaultPath) => ipcRenderer.invoke('save-text', { content, defaultPath }),
  onToggleDetails: (cb) => {
    ipcRenderer.on('toggle-details', (_e, arg) => cb(arg));
  },
  onToggleDark: (cb) => {
    ipcRenderer.on('toggle-dark', (_e, arg) => cb(arg));
  },
});
