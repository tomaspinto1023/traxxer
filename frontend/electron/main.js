//Ficheiro principal do Electron -> responsável por inicializar e correr aplicação

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');

require('electron-reload')(path.join(__dirname, '..'), {
  electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron.cmd')
});

let win;
let backendProcess = null;

// ── Spotify OAuth (Client Credentials) ───────────────────────

const SPOTIFY_CLIENT_ID = 'O_TEU_CLIENT_ID';
const SPOTIFY_CLIENT_SECRET = 'O_TEU_CLIENT_SECRET';
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await res.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return spotifyToken;
}

// ── Window ────────────────────────────────────────────────────

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

// ── Backend C++ ───────────────────────────────────────────────

function startBackend() {
  const backendExePath = path.join(
    __dirname, '..', '..', 'backend', 'bin', 'TraxxerBackend.exe'
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
    console.error('[C++ backend error]', data.toString().trim());
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

// ── IPC handlers ──────────────────────────────────────────────

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

ipcMain.handle('get-spotify-scale', async (_, artist, title) => {
  try {
    const token = await getSpotifyToken();
    const query = encodeURIComponent(`${artist} ${title}`);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    const trackId = searchData.tracks?.items?.[0]?.id;

    if (!trackId) return null;

    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const features = await featuresRes.json();

    if (features.key === -1) return null;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const key = noteNames[features.key];
    const scale = features.mode === 1 ? 'Major' : 'Minor';

    return `${key} ${scale}`;
  } catch (err) {
    console.error('Spotify scale error:', err);
    return null;
  }
});

ipcMain.handle('analyze-scale-local', async (_, arrayBuffer) => {
  const tmpPath = path.join(os.tmpdir(), `traxxer_tmp_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));

    const analyzerExePath = path.join(
      __dirname, '..', '..', 'backend', 'bin', 'TraxxerBackend.exe'
    );

    return await new Promise((resolve) => {
      execFile(analyzerExePath, ['--scale', tmpPath], (error, stdout) => {
        if (error) {
          console.error('Analyzer error:', error);
          resolve(null);
          return;
        }
        resolve(stdout.trim() || null);
      });
    });
  } catch (err) {
    console.error('analyze-scale-local error:', err);
    return null;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});