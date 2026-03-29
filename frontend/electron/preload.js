const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLayoutChange: (callback) => {
    ipcRenderer.on('layout-change', (_, state) => callback(state));
  },

  sendToBackend: (message) => {
    ipcRenderer.send('send-to-backend', message);
  },

  onBackendMessage: (callback) => {
    ipcRenderer.on('backend-message', (_, message) => callback(message));
  }
});