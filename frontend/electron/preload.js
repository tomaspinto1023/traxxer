const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLayoutChange: (callback) => {
    const subscription = (_, state) => callback(state);
    ipcRenderer.on('layout-change', subscription);
    return () => ipcRenderer.removeListener('layout-change', subscription);
  },

  sendToBackend: (message) => {
    ipcRenderer.send('send-to-backend', message);
  },

  onBackendMessage: (callback) => {
    const subscription = (_, message) => callback(message);
    ipcRenderer.on('backend-message', subscription);
    return () => ipcRenderer.removeListener('backend-message', subscription);
  },

  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFolder: (folderPath) => ipcRenderer.invoke('read-folder', folderPath),
  readFileAsBuffer: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),
});