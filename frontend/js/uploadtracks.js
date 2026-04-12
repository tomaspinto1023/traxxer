// Ficheiro JavaScript com a lógica de descarregamento de faixas 
// Se começar a adicionar coisas a mais, pensar em como dividir o ficheiro em vários ficheiros menores

let trk1WaveSurfer = null;
let trk1CurrentObjectUrl = null;

window.addEventListener('DOMContentLoaded', () => {
  const testButton = document.getElementById('test-backend-btn');
  const responseText = document.getElementById('backend-response');

  const dropZone = document.getElementById('trk1-drop-zone');
  const cover = document.getElementById('trk1-cover');
  const musicName = document.getElementById('trk1-track-title');
  const channelName = document.getElementById('trk1-track-artist');
  const waveformContainer = document.getElementById('trk1-waveform');
  const playPauseBtn = document.getElementById('trk1-play-pause-btn');
  const ejectBtn = document.getElementById('trk1-eject-btn');

  const playIcon = playPauseBtn?.querySelector('.bi-play-fill');
  const pauseIcon = playPauseBtn?.querySelector('.bi-pause-fill');
  const ejectIcon = ejectBtn?.querySelector('.bi bi-eject-fill');

  if (testButton) {
    testButton.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.sendToBackend('ping');
      }
    });
  }

  if (window.electronAPI) {
    window.electronAPI.onBackendMessage((message) => {
      console.log('Resposta do backend:', message);

      if (responseText) {
        responseText.textContent = message;
      }
    });
  }

  console.log('dropZone:', dropZone);
  console.log('cover:', cover);
  console.log('musicName:', musicName);
  console.log('channelName:', channelName);
  console.log('waveformContainer:', waveformContainer);
  console.log('playPauseBtn:', playPauseBtn);

  if (!dropZone || !cover || !musicName || !channelName || !waveformContainer || !playPauseBtn || !ejectBtn) {
    console.warn('Elementos do deck 1 não encontrados. A lógica de upload da faixa não foi inicializada.');
    return;
  }

  trk1WaveSurfer = WaveSurfer.create({
    container: '#trk1-waveform',
    waveColor: '#dbdbdb',
    progressColor: '#a12fb0',
    cursorColor: '#ffffff',
    height: 27.4,
    barWidth: 2,
    barGap: 1,
    responsive: true
  });

  setPlayPauseVisual(false, playIcon, pauseIcon);

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      alert('Por enquanto, só ficheiros MP3.');
      return;
    }

    loadTrack1File(file, {
      cover,
      musicName,
      channelName,
      playIcon,
      pauseIcon
    });
  });

  playPauseBtn.addEventListener('click', () => {
    if (!trk1WaveSurfer) return;
    if (!trk1WaveSurfer.getDuration()) return;

    trk1WaveSurfer.playPause();
  });

  ejectBtn.addEventListener('click', () => {
    ejectTrack1({
      cover,
      musicName,
      channelName,
      playIcon,
      pauseIcon
    });
  });

  trk1WaveSurfer.on('play', () => {
    setPlayPauseVisual(true, playIcon, pauseIcon);
  });

  trk1WaveSurfer.on('pause', () => {
    setPlayPauseVisual(false, playIcon, pauseIcon);
  });

  trk1WaveSurfer.on('finish', () => {
    setPlayPauseVisual(false, playIcon, pauseIcon);
  });
});

function loadTrack1File(file, elements) {
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  trk1CurrentObjectUrl = URL.createObjectURL(file);
  trk1WaveSurfer.load(trk1CurrentObjectUrl);

  musicName.textContent = removeMp3Extension(file.name);
  channelName.textContent = 'Artista desconhecido';

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = 'cover';
  cover.style.backgroundPosition = 'center';
  cover.style.backgroundRepeat = 'no-repeat';

  setPlayPauseVisual(false, playIcon, pauseIcon);

  window.jsmediatags.read(file, {
    onSuccess: (tag) => {
      const tags = tag.tags;

      if (tags.title) {
        musicName.textContent = tags.title;
      }

      if (tags.artist) {
        channelName.textContent = tags.artist;
      }

      if (tags.picture) {
        const { data, format } = tags.picture;
        let binaryString = '';

        for (let i = 0; i < data.length; i++) {
          binaryString += String.fromCharCode(data[i]);
        }

        const base64String = window.btoa(binaryString);
        const imageUrl = `data:${format};base64,${base64String}`;

        cover.style.backgroundImage = `url("${imageUrl}")`;
      }
    },
    onError: (error) => {
      console.log('Erro ao ler metadata da faixa:', error);
    }
  });
}

function ejectTrack1(elements) {
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

  if (trk1WaveSurfer) {
    trk1WaveSurfer.stop();
    trk1WaveSurfer.empty();
  }

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  musicName.textContent = '';
  channelName.textContent = '';

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = '';
  cover.style.backgroundPosition = '';
  cover.style.backgroundRepeat = '';

  setPlayPauseVisual(false, playIcon, pauseIcon);
}

function removeMp3Extension(filename) {
  return filename.replace(/\.mp3$/i, '');
}

function setPlayPauseVisual(isPlaying, playIcon, pauseIcon) {
  if (!playIcon || !pauseIcon) return;

  playIcon.style.display = isPlaying ? 'none' : 'inline-block';
  pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
}