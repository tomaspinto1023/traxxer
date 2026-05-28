//Ficheiro principal do Electron -> responsável por inicializar e correr aplicação

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

require('electron-reload')(path.join(__dirname, '..'), {
  electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron.cmd')
});

let win;
let backendProcess = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      fullscreen: true,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'assets', 'icon', 'icon.ico')
  });

  win.loadFile(path.join(__dirname, '..', 'html', 'index.html'));

  //win.webContents.openDevTools();

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

  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
}

function startBackend() {
  const backendExePath = path.join(
    __dirname,
    '..',
    '..',
    'backend',
    'bin',
    'TraxxerBackend.exe'
  );

  backendProcess = spawn(backendExePath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log('[C++ backend]', output);

    if (win) {
      win.webContents.send('backend-message', output);
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const errorOutput = data.toString().trim();
    console.error('[C++ backend error]', errorOutput);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  ipcMain.on('send-to-backend', (_, message) => {
    if (backendProcess && backendProcess.stdin.writable) {
      backendProcess.stdin.write(message + '\n');
    }
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.stdin.write('exit\n');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── IPC handlers ─────────────────────────────────────────────

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('read-folder', async (_, folderPath) => {
  const extensions = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a'];
  const files = fs.readdirSync(folderPath);
  return files
    .filter(f => extensions.includes(path.extname(f).toLowerCase()))
    .map(f => ({
      name: path.basename(f, path.extname(f)),
      ext: path.extname(f),
      fullPath: path.join(folderPath, f),
    }));
});

ipcMain.handle('read-file-buffer', async (_, filePath) => {
  const buffer = fs.readFileSync(filePath);
  return buffer;
});

// ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});