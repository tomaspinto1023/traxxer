const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Correção: Usa o "once" se a resposta só acontecer uma vez, 
  // ou passa o event para o frontend gerir a remoção se for contínuo.
  onLayoutChange: (callback) => {
    const subscription = (_, state) => callback(state);
    ipcRenderer.on('layout-change', subscription);
    
    // Retorna uma função para o frontend poder limpar o listener quando o componente desmontar
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
  readFolder: (folderPath) => ipcRenderer.invoke('read-folder', folderPath) // Vírgula removida aqui porque é o último item
});
