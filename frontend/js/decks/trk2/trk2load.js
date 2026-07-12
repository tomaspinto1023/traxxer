// Lógica de carregamento, waveform, cue, stop e eject da Track 2

function createTrack2WaveSurfer(playIcon, pauseIcon) {
  trk2WaveSurfer = WaveSurfer.create({
    container: '#trk2-waveform',
    waveColor: '#dbdbdb',
    progressColor: '#a12fb0',
    cursorColor: '#ffffff',
    height: 30,
    barWidth: 2,
    barGap: 1,
  });

  trk2WaveSurfer.on('play', () => {
    setPlayPauseVisual(true, playIcon, pauseIcon);
  });

  trk2WaveSurfer.on('pause', () => {
    if (trk2IsScratchingJog) return;
    setPlayPauseVisual(false, playIcon, pauseIcon);
  });

  return trk2WaveSurfer;
}

function getTrack2WaveSurfer() {
  return trk2WaveSurfer;
}

function loadTrack2File(file, elements) {
  const { cover, musicName, channelName, bpmText, scaleText, playIcon, pauseIcon } = elements;

  trk2LoadId++;
  const currentLoadId = trk2LoadId;

  if (trk2CurrentObjectUrl) {
    URL.revokeObjectURL(trk2CurrentObjectUrl);
    trk2CurrentObjectUrl = null;
  }

  trk2CurrentObjectUrl = URL.createObjectURL(file);

  trk2WaveSurfer.load(trk2CurrentObjectUrl);

  trk2CuePoint = 0;
  trk2HasLoadedTrack = true;

  // Decodifica a faixa para memória para servir de base ao som do scratch
  // da jog wheel (em vez de um som genérico)
  trk2TrackAudioBuffer = null;
  file.arrayBuffer().then(async (arrayBuffer) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const decodeCtx = new AudioContextClass();
      const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
      await decodeCtx.close();

      if (currentLoadId !== trk2LoadId) return; // a faixa já mudou entretanto
      trk2TrackAudioBuffer = decoded;
    } catch (error) {
      console.warn('Erro ao preparar áudio da faixa para o scratch:', error);
    }
  });

  musicName.textContent = removeMp3Extension(file.name);
  channelName.textContent = 'Artista desconhecido';

  if (bpmText) {
    bpmText.textContent = '';
    bpmText.style.right = '540px';
  }

  if (scaleText) {
    scaleText.textContent = '';
  }

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = 'cover';
  cover.style.backgroundPosition = 'center';
  cover.style.backgroundRepeat = 'no-repeat';

  setPlayPauseVisual(false, playIcon, pauseIcon);

  window.jsmediatags.read(file, {
    onSuccess: (tag) => {
      const tags = tag.tags;

      console.log('Metadata completa:', tags);

      const artist = tags.artist || '';
      const title = tags.title || file.name;

      const metadataBpm = getTrack2BpmFromTags(tags);

      if (metadataBpm) {
        if (bpmText) {
          bpmText.textContent = formatTrack2Bpm(metadataBpm);
          updateTrack2BpmPosition(bpmText, metadataBpm);
        }
      } else {
        detectAndShowTrack2Bpm(file, bpmText, currentLoadId);
      }

      const metadataScale = getTrack2ScaleFromTags(tags);
      console.log('Scale da tag:', metadataScale);

      if (metadataScale) {
        if (scaleText) scaleText.textContent = metadataScale;
      } else {
        detectAndShowTrack2Scale(file, scaleText, currentLoadId);
      }

      if (tags.title) musicName.textContent = tags.title;
      if (tags.artist) channelName.textContent = tags.artist;

      if (tags.picture) {
        const { data, format } = tags.picture;
        let binaryString = '';

        for (let i = 0; i < data.length; i++) {
          binaryString += String.fromCharCode(data[i]);
        }

        const base64String = window.btoa(binaryString);
        cover.style.backgroundImage = `url("data:${format};base64,${base64String}")`;
      }
    },
    onError: (error) => {
      console.log('Erro ao ler metadata da faixa:', error);
      detectAndShowTrack2Bpm(file, bpmText, currentLoadId);
      detectAndShowTrack2Scale(file, scaleText, currentLoadId, '', file.name);
    }
  });

  trk2WaveSurfer.once('ready', () => {
    if (currentLoadId !== trk2LoadId) return;
    if (!trk2HasLoadedTrack) return;

    const elapsedTimeText = document.getElementById('trk2-music-elapsed-time');
    const remainingTimeText = document.getElementById('trk2-music-remaining-time');

    showTrack2TimeIndicators();

    if (elapsedTimeText) {
      elapsedTimeText.textContent = '0:00:0';
    }

    const duration = trk2WaveSurfer.getDuration();

    if (remainingTimeText) {
      remainingTimeText.textContent = formatTrack2Time(duration);
    }
  });
}

function setupTrack2DropZone(elements) {
  const {
    dropZone,
    cover,
    musicName,
    channelName,
    bpmText,
    scaleText,
    playIcon,
    pauseIcon
  } = elements;

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

    loadTrack2File(file, {
      cover,
      musicName,
      channelName,
      bpmText,
      scaleText,
      playIcon,
      pauseIcon
    });
  });
}

function setupTrack2TransportControls(elements) {
  const {
    playPauseBtn,
    stopBtn,
    cueBtn,
    ejectBtn,
    playIcon,
    pauseIcon,
    jogWheel
  } = elements;

  playPauseBtn.addEventListener('click', () => {
    if (!trk2WaveSurfer) return;
    if (!trk2HasLoadedTrack) return;
    if (!trk2WaveSurfer.getDuration()) return;

    trk2WaveSurfer.playPause();
  });

  stopBtn.addEventListener('click', () => {
    stopTrack2(playIcon, pauseIcon, jogWheel);
  });

  cueBtn.addEventListener('click', () => {
    handleCueTrack2(playIcon, pauseIcon);
  });

  ejectBtn.addEventListener('click', () => {
    const elapsedTimeText = document.getElementById('trk2-music-elapsed-time');
    const remainingTimeText = document.getElementById('trk2-music-remaining-time');

    ejectTrack2({
      ...elements,
      elapsedTimeText,
      remainingTimeText
    }, jogWheel);
  });
}

function ejectTrack2(elements, jogWheel) {
  const {
    cover,
    musicName,
    channelName,
    bpmText,
    scaleText,
    playIcon,
    pauseIcon
  } = elements;

  if (trk2WaveSurfer) {
    resetTrack2JogPlaybackRate();

    const media = trk2WaveSurfer.getMediaElement?.();

    trk2WaveSurfer.stop();
    trk2WaveSurfer.empty();

    if (media) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    }
  }

  if (trk2CurrentObjectUrl) {
    URL.revokeObjectURL(trk2CurrentObjectUrl);
    trk2CurrentObjectUrl = null;
  }

  trk2CuePoint = 0;
  trk2HasLoadedTrack = false;
  trk2LoadId++;
  trk2TrackAudioBuffer = null;

  musicName.textContent = '';
  channelName.textContent = '';

  if (bpmText) {
    bpmText.textContent = '';
  }

  if (scaleText) {
    scaleText.textContent = '';
  }

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = '';
  cover.style.backgroundPosition = '';
  cover.style.backgroundRepeat = '';

  setPlayPauseVisual(false, playIcon, pauseIcon);

  stopTrack2JogWheelSync();

  trk2JogVisualRotation = 0;
  resetTrack2JogWheel(jogWheel);

  resetTrack2EffectSlotN1();

  clearTrack2TimeDisplay();
}

function stopTrack2(playIcon, pauseIcon, jogWheel) {
  if (!trk2WaveSurfer) return;
  if (!trk2HasLoadedTrack) return;
  if (!trk2WaveSurfer.getDuration()) return;

  trk2WaveSurfer.stop();

  stopTrack2JogWheelSync();
  updateTrack2JogWheelFromAudio(jogWheel);
  setPlayPauseVisual(false, playIcon, pauseIcon);
}

function handleCueTrack2(playIcon, pauseIcon) {
  if (!trk2WaveSurfer) return;
  if (!trk2HasLoadedTrack) return;
  if (!trk2WaveSurfer.getDuration()) return;

  if (trk2WaveSurfer.isPlaying()) {
    trk2WaveSurfer.pause();

    const duration = trk2WaveSurfer.getDuration();
    const cueProgress = duration > 0 ? trk2CuePoint / duration : 0;

    trk2WaveSurfer.seekTo(cueProgress);
    setPlayPauseVisual(false, playIcon, pauseIcon);

    return;
  }

  trk2CuePoint = trk2WaveSurfer.getCurrentTime();

  console.log('Novo cue point:', trk2CuePoint);
}

function resetTrack2EffectSlotN1() {
  const effectBox = document.getElementById('trk2-effect-n1');
  const optionsBox = document.getElementById('trk2-effect-n1-options');

  if (typeof trk2SelectedEffectN1 !== 'undefined' && trk2SelectedEffectN1) {
    trk2SelectedEffectN1.disable();
    trk2SelectedEffectN1 = null;
  }

  if (effectBox) effectBox.textContent = '';
  if (optionsBox) optionsBox.style.display = 'none';
}