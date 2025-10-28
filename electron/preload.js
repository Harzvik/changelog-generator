import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('modDiffAPI', {
  chooseDir: async () => ipcRenderer.invoke('choose-dir'),
  runDiff: async (oldDir, newDir) => ipcRenderer.invoke('run-diff', { oldDir, newDir }),
  saveText: async (content, defaultPath) => ipcRenderer.invoke('save-text', { content, defaultPath }),
});
