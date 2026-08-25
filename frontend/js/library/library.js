// Biblioteca — navegação de pastas + listagem de músicas

const folderOpenBtn = document.getElementById('folder-open-btn');
const baseLibrary = document.getElementById('base-library');

// Cabeçalho da tabela
function createLibraryHeader() {
  const header = document.createElement('div');
  header.id = 'library-header-row';
  header.innerHTML = `
    <span class="lib-col-title">Título</span>
    <span class="lib-col-artist">Artista</span>
    <span class="lib-col-time">Duração</span>
    <span class="lib-col-bpm">Formato</span>
    <span class="lib-col-tone">Tom</span>
  `;
  return header;
}

// Linha de música
function createTrackRow(track) {
  const row = document.createElement('div');
  row.className = 'library-track-row';
  row.draggable = true;
  row.dataset.path = track.fullPath;
  row.dataset.name = track.name;
  row.dataset.artist = track.artist;
  row.dataset.time = track.time;
  row.dataset.bpm = track.bpm;
  row.dataset.tone = track.tone;

  row.innerHTML = `
    <span class="lib-col-title"><i class="bi bi-music-note"></i> ${track.name}</span>
    <span class="lib-col-artist">${track.artist}</span>
    <span class="lib-col-time">${track.time}</span>
    <span class="lib-col-bpm">${track.bpm}</span>
    <span class="lib-col-tone">${track.tone}</span>
  `;

  row.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', track.fullPath);
    e.dataTransfer.setData('track-name', track.name);
    row.classList.add('is-dragging');
  });

  row.addEventListener('dragend', () => {
    row.classList.remove('is-dragging');
  });

  row.addEventListener('click', () => {
    document.querySelectorAll('.library-track-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
  });

  return row;
}

// Renderiza as músicas na base-library
function renderLibraryTracks(tracks) {
  baseLibrary.innerHTML = '';

  if (tracks.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'library-empty';
    empty.textContent = 'Nenhum ficheiro de áudio encontrado nesta pasta.';
    baseLibrary.appendChild(empty);
    return;
  }

  baseLibrary.appendChild(createLibraryHeader());

  const list = document.createElement('div');
  list.id = 'library-track-list';

  tracks.forEach(track => {
    list.appendChild(createTrackRow(track));
  });

  baseLibrary.appendChild(list);
}

// Abre o explorador de ficheiros ao fazer duplo-clique na pasta
folderOpenBtn.addEventListener('dblclick', async () => {
  const folderPath = await window.electronAPI.openFolder();
  if (!folderPath) return;

  const folderName = folderPath.split(/[\\/]/).pop();
  folderOpenBtn.querySelector('span').textContent = folderName;
  folderOpenBtn.title = folderPath;

  const tracks = await window.electronAPI.readFolder(folderPath);
  renderLibraryTracks(tracks);
});

// ── Drop zone do deck 1 ───────────────────────────────────────

const trk1DropZone = document.getElementById('trk1-drop-zone');

trk1DropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  trk1DropZone.classList.add('drag-over');
});

trk1DropZone.addEventListener('dragleave', () => {
  trk1DropZone.classList.remove('drag-over');
});

trk1DropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  trk1DropZone.classList.remove('drag-over');

  // Drop de ficheiro externo (Windows Explorer)
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (!file.name.toLowerCase().match(/\.(mp3|wav|flac|ogg|aac|m4a)$/)) return;
    loadTrack1File(file, getTrack1Elements());
    return;
  }

  // Drop interno da biblioteca
  const filePath = e.dataTransfer.getData('text/plain');
  if (!filePath) return;

  const response = await fetch(`file://${filePath.replace(/\\/g, '/')}`);
  const blob = await response.blob();
  const fileName = filePath.split(/[\\/]/).pop();
  const file = new File([blob], fileName, { type: 'audio/mpeg' });
  // File sintético não tem caminho real reconhecido pelo webUtils.getPathForFile —
  // guardamos o caminho já conhecido para a análise de escala o poder usar.
  file.traxxerRealPath = filePath;

  loadTrack1File(file, getTrack1Elements());
});

// ── Drop zone do deck 2 ───────────────────────────────────────

const trk2DropZone = document.getElementById('trk2-drop-zone');

trk2DropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  trk2DropZone.classList.add('drag-over');
});

trk2DropZone.addEventListener('dragleave', () => {
  trk2DropZone.classList.remove('drag-over');
});

trk2DropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  trk2DropZone.classList.remove('drag-over');

  // Drop de ficheiro externo (Windows Explorer)
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (!file.name.toLowerCase().match(/\.(mp3|wav|flac|ogg|aac|m4a)$/)) return;
    loadTrack2File(file, getTrack2Elements());
    return;
  }

  // Drop interno da biblioteca
  const filePath = e.dataTransfer.getData('text/plain');
  if (!filePath) return;

  const response = await fetch(`file://${filePath.replace(/\\/g, '/')}`);
  const blob = await response.blob();
  const fileName = filePath.split(/[\\/]/).pop();
  const file = new File([blob], fileName, { type: 'audio/mpeg' });
  // File sintético não tem caminho real reconhecido pelo webUtils.getPathForFile —
  // guardamos o caminho já conhecido para a análise de escala o poder usar.
  file.traxxerRealPath = filePath;

  loadTrack2File(file, getTrack2Elements());
});