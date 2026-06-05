const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const { globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');
const envPath = require('path').join(__dirname, '..', '..', '.env');
const envContent = require('fs').readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});
console.log('Spotify ID:', process.env.SPOTIFY_CLIENT_ID ? 'carregado' : 'VAZIO');
console.log('Spotify Secret:', process.env.SPOTIFY_CLIENT_SECRET ? 'carregado' : 'VAZIO');

//require('electron-reload')(path.join(__dirname, '..', '..'), {
//  electron: path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'electron.cmd'),
//  hardResetMethod: 'exit'
//});

let win;
let backendProcess = null;
let currentSizeName = 'large';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

// ── Aplica o tamanho à janela ─────────────────────────────────

function applyWindowSize(sizeName, animated = true) {
  currentSizeName = sizeName;
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  // Garante que pode redimensionar
  win.setResizable(true);
  win.setMaximizable(true);

  if (win.isFullScreen()) {
    win.setFullScreen(false);
  }
  if (win.isMaximized()) {
    win.unmaximize();
  }

  if (sizeName === 'large') {
    // Fullscreen total
    setTimeout(() => {
      win.setFullScreen(true);
      win.webContents.send('layout-change', 'large');
    }, 150);

  } else if (sizeName === 'medium') {
    // Ocupa o ecrã todo menos a taskbar
    setTimeout(() => {
      win.setSize(screenW, screenH, animated);
      win.setPosition(0, 0);
      win.webContents.send('layout-change', 'medium');
      win.setResizable(false);
      win.setMaximizable(false);
    }, 150);

  } else if (sizeName === 'small') {
    // Tamanho compacto
    const w = 1280, h = 780;
    setTimeout(() => {
      win.setSize(w, h, animated);
      win.center();
      win.webContents.send('layout-change', 'small');
      win.setResizable(false);
      win.setMaximizable(false);
    }, 150);
  }
}

// ── Window ────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    resizable: false,
    maximizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'assets', 'icon', 'icon.ico')
  });

  win.loadFile(path.join(__dirname, '..', 'html', 'index.html'));

  // Entra em fullscreen logo ao abrir
  win.once('ready-to-show', () => {
    win.show();
    applyWindowSize('large', false);
  });

  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_, __, callback) => callback(true));
}

// ── Backend C++ ───────────────────────────────────────────────

function startBackend() {
  const backendExePath = path.join(__dirname, '..', '..', 'backend', 'bin', 'TraxxerBackend.exe');

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

ipcMain.handle('read-folder', async (_, folderPath) => {
  const extensions = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a'];
  return fs.readdirSync(folderPath)
    .filter(f => extensions.includes(path.extname(f).toLowerCase()))
    .map(f => ({ name: path.basename(f, path.extname(f)), ext: path.extname(f), fullPath: path.join(folderPath, f) }));
});

ipcMain.handle('read-file-buffer', async (_, filePath) => fs.readFileSync(filePath));

ipcMain.handle('get-spotify-scale', async (_, artist, title) => {
  try {
    const token = await getSpotifyToken();
    const query = encodeURIComponent(`${artist} ${title}`);
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
    const searchData = await searchRes.json();
    const trackId = searchData.tracks?.items?.[0]?.id;
    if (!trackId) return null;
    const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
    const features = await featuresRes.json();
    if (features.key === -1) return null;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${noteNames[features.key]} ${features.mode === 1 ? 'Major' : 'Minor'}`;
  } catch (err) {
    console.error('Spotify scale error:', err);
    return null;
  }
});

ipcMain.handle('analyze-scale-local', async (_, arrayBuffer) => {
  const tmpPath = path.join(os.tmpdir(), `traxxer_tmp_${Date.now()}.mp3`);
  try {
    fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));
    const analyzerExePath = path.join(__dirname, '..', '..', 'backend', 'bin', 'TraxxerBackend.exe');
    return await new Promise((resolve) => {
      execFile(analyzerExePath, ['--scale', tmpPath], (error, stdout) => {
        resolve(error ? null : stdout.trim() || null);
      });
    });
  } catch (err) {
    console.error('analyze-scale-local error:', err);
    return null;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
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

  // Hot reload só em desenvolvimento
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
