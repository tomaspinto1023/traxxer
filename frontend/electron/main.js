const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const { globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

let win;
let backendProcess = null;
let currentSizeName = 'large';

// Em desenvolvimento os binários do backend estão em backend/bin (relativo ao código-fonte).
// Já empacotada (electron-builder), ficam em resources/backend/bin (fora do app.asar,
// porque um .exe dentro do asar não pode ser executado diretamente pelo Windows).
const backendBinPath = app.isPackaged
  ? path.join(process.resourcesPath, 'backend', 'bin')
  : path.join(__dirname, '..', '..', 'backend', 'bin');

// ── Aplica o tamanho à janela ─────────────────────────────────

function applyWindowSize(sizeName, animated = true) {
  currentSizeName = sizeName;

  if (win.isFullScreen()) {
    win.setFullScreen(false);
  }
  if (win.isMaximized()) {
    win.unmaximize();
  }

  if (sizeName === 'large') {
    win.setMovable(true);
    win.setResizable(true);
    win.setMaximizable(true);
    setTimeout(() => {
      win.setFullScreen(true);
      win.webContents.send('layout-change', 'large');
    }, 150);

  } else if (sizeName === 'medium') {
    const applyMedium = () => {
      win.setMovable(false);
      win.setResizable(false);
      win.setMaximizable(false);
      win.setHasShadow(false);
      const { workArea} = screen.getPrimaryDisplay();
      win.setBounds({
        x: workArea.x,
        y: workArea.y,
        width: workArea.width,
        height: workArea.height
      }, false);
      win.webContents.send('layout-change', 'medium');
    };

    if (win.isFullScreen()) {
      win.once('leave-full-screen', applyMedium);
    } else {
      applyMedium();
    }

  } else if (sizeName === 'small') {
    const w = 1280, h = 780;
    const applySmall = () => {
      win.setMovable(true);
      win.setResizable(true);
      win.setMaximizable(true);
      win.setSize(w, h, false);
      win.center();
      win.setResizable(false);
      win.setMaximizable(false);
      win.webContents.send('layout-change', 'small');
    };

    if (win.isFullScreen()) {
      win.once('leave-full-screen', applySmall);
    } else {
      applySmall();
    }
  }
}

// ── Window ────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width: 1441,
    height: 901,
    resizable: false,
    maximizable: false,
    frame: false,
    hasShadow: false,
    roundedCorners: false,        
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'assets', 'icon', 'icon.ico')
  });

  win.loadFile(path.join(__dirname, '..', 'html', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    applyWindowSize('large', false);
  });

  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_, __, callback) => callback(true));
}

// ── Backend C++ ───────────────────────────────────────────────

function startBackend() {
  const backendExePath = path.join(backendBinPath, 'TraxxerBackend.exe');

  backendProcess = spawn(backendExePath, [], { stdio: ['pipe', 'pipe', 'pipe'], detached: false });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log('[C++ backend]', output);
    if (win) win.webContents.send('backend-message', output);
  });

  backendProcess.stderr.on('data', (data) => console.error('[C++ backend error]', data.toString().trim()));
  backendProcess.on('close', (code) => console.log(`Backend exited with code ${code}`));
  backendProcess.on('error', (err) => console.error('Failed to start backend:', err));

  ipcMain.on('send-to-backend', (_, message) => {
    if (backendProcess?.stdin.writable) backendProcess.stdin.write(message + '\n');
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.stdin.write('exit\n');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── IPC handlers ──────────────────────────────────────────────

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('analyze-scale-local', async (_, filePath) => {
  const analyzerExePath = path.join(backendBinPath, 'TraxxerKeyAnalyzer.exe');
  console.log('[KeyAnalyzer] a correr:', analyzerExePath, '| ficheiro:', filePath);
  return await new Promise((resolve) => {
    execFile(analyzerExePath, [filePath], (error, stdout, stderr) => {
      if (error) console.log('[KeyAnalyzer] ERRO:', error);
      if (stderr) console.log('[KeyAnalyzer] stderr:', stderr);
      console.log('[KeyAnalyzer] stdout:', JSON.stringify(stdout));
      resolve(error ? null : stdout.trim() || null);
    });
  });
});

ipcMain.handle('read-folder', async (_, folderPath) => {
  const extensions = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a'];
  return fs.readdirSync(folderPath)
    .filter(f => extensions.includes(path.extname(f).toLowerCase()))
    .map(f => ({ name: path.basename(f, path.extname(f)), ext: path.extname(f), fullPath: path.join(folderPath, f) }));
});

ipcMain.on('set-window-size', (_, sizeName) => applyWindowSize(sizeName));
ipcMain.handle('get-window-size', () => currentSizeName);
ipcMain.on('minimize-window', () => win.minimize());
ipcMain.on('close-window', () => win.close());

// ── App lifecycle ─────────────────────────────────────────────

app.whenReady().then(() => {
  startBackend();
  createWindow();

  globalShortcut.register('F11', () => {
    if (!win) return;
    applyWindowSize(win.isFullScreen() ? 'medium' : 'large');
  });

  globalShortcut.register('Escape', () => {
    if (win?.isFullScreen()) applyWindowSize('medium');
  });

  if (process.env.NODE_ENV === 'development') {
    const chokidar = require('chokidar');
    chokidar.watch(path.join(__dirname, '..'), {
      ignored: /node_modules/,
      ignoreInitial: true
    }).on('change', (filePath) => {
      if (filePath.endsWith('.js') && filePath.includes('electron')) {
        console.log('Main process changed, restart needed');
      } else {
        console.log('Renderer changed, reloading...');
        if (win) win.webContents.reload();
      }
    });
  }
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});