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
    <span class="lib-col-ext">Formato</span>
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

  row.innerHTML = `
    <span class="lib-col-title"><i class="bi bi-music-note"></i> ${track.name}</span>
    <span class="lib-col-artist">—</span>
    <span class="lib-col-ext">${track.ext.replace('.', '').toUpperCase()}</span>
  `;

  // Drag and drop para os decks
  row.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', track.fullPath);
    e.dataTransfer.setData('track-name', track.name);
    row.classList.add('is-dragging');
  });

  row.addEventListener('dragend', () => {
    row.classList.remove('is-dragging');
  });

  // Highlight ao hover
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

  // Mostra o nome da pasta no botão
  const folderName = folderPath.split(/[\\/]/).pop();
  folderOpenBtn.querySelector('span').textContent = folderName;
  folderOpenBtn.title = folderPath;

  const tracks = await window.electronAPI.readFolder(folderPath);
  renderLibraryTracks(tracks);
});