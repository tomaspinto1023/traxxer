// Ficheiro JavaScript com a lógica de descarregamento de faixas 
// Se começar a adicionar coisas a mais, pensar em como dividir o ficheiro em vários ficheiros menores

window.addEventListener('DOMContentLoaded', () => {
  const testButton = document.getElementById('test-backend-btn');
  const responseText = document.getElementById('backend-response');

  const dropZone = document.getElementById('trk1-drop-zone');
  const cover = document.getElementById('trk1-cover');
  const musicName = document.getElementById('trk1-track-title');
  const channelName = document.getElementById('trk1-track-artist');
  const waveformContainer = document.getElementById('trk1-waveform');
  const playPauseBtn = document.getElementById('trk1-play-pause-btn'); //Ligações a elementos de track 1
  const ejectBtn = document.getElementById('trk1-eject-btn');
  const playIcon = playPauseBtn?.querySelector('.bi-play-fill');
  const pauseIcon = playPauseBtn?.querySelector('.bi-pause-fill');
  const stopBtn = document.getElementById('trk1-stop-btn');
  const cueBtn = document.getElementById('trk1-cue-btn');
  const jogWheel = document.getElementById('trk1-jog-wheel');

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

  if (!dropZone || !cover || !musicName || !channelName || !waveformContainer || !playPauseBtn || !stopBtn || !ejectBtn || !cueBtn || !jogWheel) {
    console.warn('Elementos do deck 1 não encontrados. A lógica de upload da faixa não foi inicializada.');
    return;
  }

  const waveSurfer = createTrack1WaveSurfer();
  setupTrack1JogWheel(jogWheel);

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
    if (!waveSurfer) return;
    if (!waveSurfer.getDuration()) return;

    waveSurfer.playPause();
  });

  stopBtn.addEventListener('click', () => {
    stopTrack1(playIcon, pauseIcon);
  });

  cueBtn.addEventListener('click', () => {
    handleCueTrack1(playIcon, pauseIcon);
  });
  
  ejectBtn.addEventListener('click', () => {
    ejectTrack1({
      cover,
      musicName,
      channelName,
      playIcon,
      pauseIcon
    }, jogWheel);
  });

  waveSurfer.on('play', () => {
    setPlayPauseVisual(true, playIcon, pauseIcon);
    jogWheel.classList.add('is-playing');
  });

  waveSurfer.on('pause', () => {
    setPlayPauseVisual(false, playIcon, pauseIcon);
    jogWheel.classList.remove('is-playing');
  });

  waveSurfer.on('finish', () => {
    setPlayPauseVisual(false, playIcon, pauseIcon);
    jogWheel.classList.remove('is-playing');
  });
});