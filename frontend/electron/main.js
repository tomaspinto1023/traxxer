const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let backendProcess; // Para guardar o processo do backend

function createWindow () {
  const win = new BrowserWindow({
    width: 2880,
    height: 1620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: "frontend/assets/icon/icon.ico"
  });

  win.loadFile('frontend/html/index.html');

  // Abrir DevTools automaticamente para debug
  //win.webContents.openDevTools();

  // --- EVENTOS DE LAYOUT ---
  win.on('maximize', () => {
    win.webContents.send('layout-change', 'maximized');
  });

  win.on('unmaximize', () => {
    win.webContents.send('layout-change', 'normal');
  });

  win.on('enter-full-screen', () => {
    win.webContents.send('layout-change', 'fullscreen');
  });

  win.on('leave-full-screen', () => {
    win.webContents.send('layout-change', 'normal');
  });
}

// Iniciar o backend automaticamente
function startBackend() {
  const backendPath = path.join(__dirname, '..', '..', 'backend', 'TraxxerApi');
  backendProcess = spawn('dotnet', ['run', '--project', path.join(backendPath, 'TraxxerApi.csproj')], {
    cwd: backendPath,
    stdio: 'inherit', // Para ver logs no terminal
    detached: false
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
}

// Parar o backend quando a app fecha
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
  }
}

app.whenReady().then(() => {
  startBackend(); // Iniciar backend primeiro
  setTimeout(createWindow, 3000); // Esperar 3s para o backend iniciar
});

app.on('window-all-closed', () => {
  stopBackend(); // Parar backend
  if (process.platform !== 'darwin') app.quit();
});