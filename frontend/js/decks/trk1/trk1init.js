// Inicialização da Track 1 e ligação ao backend

document.addEventListener('traxxer:partials-loaded', () => {
  setupBackendTest();
  initTrack1();
});

function setupBackendTest() {
  const testButton = document.getElementById('test-backend-btn');
  const responseText = document.getElementById('backend-response');

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
}

function initTrack1() {
  const elements = getTrack1Elements();

  console.log('dropZone:', elements.dropZone);
  console.log('cover:', elements.cover);
  console.log('musicName:', elements.musicName);
  console.log('channelName:', elements.channelName);
  console.log('waveformContainer:', elements.waveformContainer);
  console.log('playPauseBtn:', elements.playPauseBtn);

  if (!areTrack1ElementsValid(elements)) {
    console.warn('Elementos do deck 1 não encontrados.');
    return;
  }

  createTrack1WaveSurfer(elements.playIcon, elements.pauseIcon); // ← usa elements diretamente

  setupTrack1JogWheel(elements.jogWheel);
  setPlayPauseVisual(false, elements.playIcon, elements.pauseIcon);
  setupTrack1DropZone(elements);
  setupTrack1TransportControls(elements);
  setupTrack1WaveSurferEvents(elements);

  if (typeof setupTrack1EffectSlotN1 === 'function') {
    setupTrack1EffectSlotN1();
  }
}

function getTrack1Elements() {
  const playPauseBtn = document.getElementById('trk1-play-pause-btn');

  return {
    dropZone: document.getElementById('trk1-drop-zone'),
    cover: document.getElementById('trk1-cover'),
    musicName: document.getElementById('trk1-track-title'),
    channelName: document.getElementById('trk1-track-artist'),
    waveformContainer: document.getElementById('trk1-waveform'),
    playPauseBtn,
    ejectBtn: document.getElementById('trk1-eject-btn'),
    playIcon: playPauseBtn?.querySelector('.bi-play-fill'),
    pauseIcon: playPauseBtn?.querySelector('.bi-pause-fill'),
    stopBtn: document.getElementById('trk1-stop-btn'),
    cueBtn: document.getElementById('trk1-cue-btn'), 
    jogWheel: document.getElementById('trk1-jog-wheel'),
    bpmText: document.getElementById('trk1-bpm'),
    elapsedTimeText: document.getElementById('trk1-music-elapsed-time'),
    remainingTimeText: document.getElementById('trk1-music-remaining-time')
  };
}

function areTrack1ElementsValid(elements) {
  return (
    elements.dropZone &&
    elements.cover &&
    elements.musicName &&
    elements.channelName &&
    elements.waveformContainer &&
    elements.playPauseBtn &&
    elements.stopBtn &&
    elements.ejectBtn &&
    elements.cueBtn &&
    elements.jogWheel
  );
}

function setupTrack1WaveSurferEvents(elements) {
  const { elapsedTimeText, remainingTimeText, jogWheel } = elements;

  trk1WaveSurfer.on('audioprocess', () => {
    updateTrack1TimeDisplays(elapsedTimeText, remainingTimeText);
  });

  trk1WaveSurfer.on('seek', () => {
    updateTrack1TimeDisplays(elapsedTimeText, remainingTimeText);
  });

  trk1WaveSurfer.on('play', () => {
    startTrack1JogWheelSync(jogWheel);
  });

  trk1WaveSurfer.on('pause', () => {
    stopTrack1JogWheelSync();
    updateTrack1JogWheelFromAudio(jogWheel);
  });
}