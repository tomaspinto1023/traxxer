// Inicialização da Track 2 e ligação ao backend

document.addEventListener('traxxer:partials-loaded', () => {
  initTrack2();
});

function initTrack2() {
  const elements = getTrack2Elements();

  console.log('dropZone:', elements.dropZone);
  console.log('cover:', elements.cover);
  console.log('musicName:', elements.musicName);
  console.log('channelName:', elements.channelName);
  console.log('waveformContainer:', elements.waveformContainer);
  console.log('playPauseBtn:', elements.playPauseBtn);

  if (!areTrack2ElementsValid(elements)) {
    console.warn('Elementos do deck 2 não encontrados.');
    return;
  }

  createTrack2WaveSurfer(elements.playIcon, elements.pauseIcon);

  trk2WaveSurfer.once('ready', () => {
    initTrack2Pitch(trk2WaveSurfer);
  });

  setupTrack2JogWheel(elements.jogWheel);
  setPlayPauseVisual(false, elements.playIcon, elements.pauseIcon);
  setupTrack2DropZone(elements);
  setupTrack2TransportControls(elements);
  setupTrack2WaveSurferEvents(elements);

  if (typeof setupTrack2EffectSlotN1 === 'function') {
    setupTrack2EffectSlotN1();
  }
}

function getTrack2Elements() {
  const playPauseBtn = document.getElementById('trk2-play-pause-btn');

  return {
    dropZone: document.getElementById('trk2-drop-zone'),
    cover: document.getElementById('trk2-cover'),
    musicName: document.getElementById('trk2-track-title'),
    channelName: document.getElementById('trk2-track-artist'),
    waveformContainer: document.getElementById('trk2-waveform'),
    playPauseBtn,
    ejectBtn: document.getElementById('trk2-eject-btn'),
    playIcon: playPauseBtn?.querySelector('.bi-play-fill'),
    pauseIcon: playPauseBtn?.querySelector('.bi-pause-fill'),
    stopBtn: document.getElementById('trk2-stop-btn'),
    cueBtn: document.getElementById('trk2-cue-btn'),
    jogWheel: document.getElementById('trk2-jog-wheel'),
    bpmText: document.getElementById('trk2-bpm'),
    scaleText: document.getElementById('trk2-scale-itself'),
    elapsedTimeText: document.getElementById('trk2-music-elapsed-time'),
    remainingTimeText: document.getElementById('trk2-music-remaining-time')
  };
}

function areTrack2ElementsValid(elements) {
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

function setupTrack2WaveSurferEvents(elements) {
  const { elapsedTimeText, remainingTimeText, jogWheel } = elements;

  trk2WaveSurfer.on('audioprocess', () => {
    updateTrack2TimeDisplays(elapsedTimeText, remainingTimeText);
  });

  trk2WaveSurfer.on('seek', () => {
    updateTrack2TimeDisplays(elapsedTimeText, remainingTimeText);
  });

  trk2WaveSurfer.on('play', () => {
    startTrack2JogWheelSync(jogWheel);
  });

  trk2WaveSurfer.on('pause', () => {
    stopTrack2JogWheelSync();
    updateTrack2JogWheelFromAudio(jogWheel);
  });
}