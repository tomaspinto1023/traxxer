const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLayoutChange: (callback) => {
    const subscription = (_, state) => callback(state);
    ipcRenderer.on('layout-change', subscription);
    return () => ipcRenderer.removeListener('layout-change', subscription);
  },

  setWindowSize: (size) => ipcRenderer.send('set-window-size', size),
  getWindowSize: ()     => ipcRenderer.invoke('get-window-size'),

  sendToBackend: (message) => ipcRenderer.send('send-to-backend', message),

  onBackendMessage: (callback) => {
    const subscription = (_, message) => callback(message);
    ipcRenderer.on('backend-message', subscription);
    return () => ipcRenderer.removeListener('backend-message', subscription);
  },

  openFolder:       ()             => ipcRenderer.invoke('open-folder'),
  readFolder:       (folderPath)   => ipcRenderer.invoke('read-folder', folderPath),
  analyzeScaleLocal: (filePath) => ipcRenderer.invoke('analyze-scale-local', filePath),
  // Desde que o contextIsolation/sandbox está ativo, File.path deixou de vir preenchido nos
  // ficheiros largados na app — é preciso pedir o caminho real ao processo principal.
  getPathForFile:   (file)          => webUtils.getPathForFile(file),
  minimizeWindow:   ()             => ipcRenderer.send('minimize-window'),
  closeWindow:      ()             => ipcRenderer.send('close-window'),
});