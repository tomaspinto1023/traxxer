// Lógica de carregamento, waveform, cue, stop e eject da Track 1

function createTrack1WaveSurfer(playIcon, pauseIcon) {
  trk1WaveSurfer = WaveSurfer.create({
    container: '#trk1-waveform',
    waveColor: '#dbdbdb',
    progressColor: '#a12fb0',
    cursorColor: '#ffffff',
    height: 30,
    barWidth: 2,
    barGap: 1,
  });

  trk1WaveSurfer.on('play', () => {
    setPlayPauseVisual(true, playIcon, pauseIcon);
  });

  trk1WaveSurfer.on('pause', () => {
    if (trk1IsScratchingJog) return; 
    setPlayPauseVisual(false, playIcon, pauseIcon);
  });

  return trk1WaveSurfer;
}

function getTrack1WaveSurfer() {
  return trk1WaveSurfer;
}

function loadTrack1File(file, elements) {
  const { cover, musicName, channelName, bpmText, scaleText, playIcon, pauseIcon } = elements;

  trk1LoadId++;
  const currentLoadId = trk1LoadId;

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  trk1CurrentObjectUrl = URL.createObjectURL(file);

  trk1WaveSurfer.load(trk1CurrentObjectUrl);

  trk1CuePoint = 0;
  trk1HasLoadedTrack = true;

  musicName.textContent = removeMp3Extension(file.name);
  channelName.textContent = 'Artista desconhecido';

  if (bpmText) {
    bpmText.textContent = '';
    bpmText.style.left = '470px';
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

      const metadataBpm = getTrack1BpmFromTags(tags);

      if (metadataBpm) {
        if (bpmText) {
          bpmText.textContent = formatTrack1Bpm(metadataBpm);
          updateTrack1BpmPosition(bpmText, metadataBpm);
        }
      } else {
        detectAndShowTrack1Bpm(file, bpmText, currentLoadId);
      }

      const metadataScale = getTrack1ScaleFromTags(tags);
      console.log('Scale da tag:', metadataScale);

      if (metadataScale) {
        if (scaleText) scaleText.textContent = metadataScale;
      } else {
        detectAndShowTrack1Scale(file, scaleText, currentLoadId);
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
      detectAndShowTrack1Bpm(file, bpmText, currentLoadId);
      detectAndShowTrack1Scale(file, scaleText, currentLoadId, '', file.name);
    }
  });

  trk1WaveSurfer.once('ready', () => {
    if (currentLoadId !== trk1LoadId) return;
    if (!trk1HasLoadedTrack) return;

    const elapsedTimeText = document.getElementById('trk1-music-elapsed-time');
    const remainingTimeText = document.getElementById('trk1-music-remaining-time');

    showTrack1TimeIndicators();

    if (elapsedTimeText) {
        elapsedTimeText.textContent = '0:00:0';
    }

    const duration = trk1WaveSurfer.getDuration();

    if (remainingTimeText) {
        remainingTimeText.textContent = formatTrack1Time(duration);
    }
    });
}

function setupTrack1DropZone(elements) {
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

    loadTrack1File(file, {
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

function setupTrack1TransportControls(elements) {
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
    if (!trk1WaveSurfer) return;
    if (!trk1HasLoadedTrack) return;
    if (!trk1WaveSurfer.getDuration()) return;

    trk1WaveSurfer.playPause();
  });

  stopBtn.addEventListener('click', () => {
    stopTrack1(playIcon, pauseIcon, jogWheel);
  });

  cueBtn.addEventListener('click', () => {
    handleCueTrack1(playIcon, pauseIcon);
  });

  ejectBtn.addEventListener('click', () => {
    const elapsedTimeText = document.getElementById('trk1-music-elapsed-time');
    const remainingTimeText = document.getElementById('trk1-music-remaining-time');

    ejectTrack1({
      ...elements,
      elapsedTimeText,
      remainingTimeText
    }, jogWheel);
  });
}

function ejectTrack1(elements, jogWheel) {
  const {
    cover,
    musicName,
    channelName,
    bpmText,
    scaleText,
    playIcon,
    pauseIcon
  } = elements;

  if (trk1WaveSurfer) {
    resetTrack1JogPlaybackRate();

    const media = trk1WaveSurfer.getMediaElement?.();

    trk1WaveSurfer.stop();
    trk1WaveSurfer.empty();

    if (media) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    }
  }

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  trk1CuePoint = 0;
  trk1HasLoadedTrack = false;
  trk1LoadId++;

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

  stopTrack1JogWheelSync();

  trk1JogVisualRotation = 0;
  resetTrack1JogWheel(jogWheel);

  resetTrack1EffectSlotN1();

  clearTrack1TimeDisplay();
}

function stopTrack1(playIcon, pauseIcon, jogWheel) {
  if (!trk1WaveSurfer) return;
  if (!trk1HasLoadedTrack) return;
  if (!trk1WaveSurfer.getDuration()) return;

  trk1WaveSurfer.stop();

  stopTrack1JogWheelSync();
  updateTrack1JogWheelFromAudio(jogWheel);
  setPlayPauseVisual(false, playIcon, pauseIcon);
}

function handleCueTrack1(playIcon, pauseIcon) {
  if (!trk1WaveSurfer) return;
  if (!trk1HasLoadedTrack) return;
  if (!trk1WaveSurfer.getDuration()) return;

  if (trk1WaveSurfer.isPlaying()) {
    trk1WaveSurfer.pause();

    const duration = trk1WaveSurfer.getDuration();
    const cueProgress = duration > 0 ? trk1CuePoint / duration : 0;

    trk1WaveSurfer.seekTo(cueProgress);
    setPlayPauseVisual(false, playIcon, pauseIcon);

    return;
  }

  trk1CuePoint = trk1WaveSurfer.getCurrentTime();

  console.log('Novo cue point:', trk1CuePoint);
}

function removeMp3Extension(filename) {
  return filename.replace(/\.mp3$/i, '');
}

function setPlayPauseVisual(isPlaying, playIcon, pauseIcon) {
  if (!playIcon || !pauseIcon) return;

  playIcon.style.display = isPlaying ? 'none' : 'inline-block';
  pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
}

function resetTrack1EffectSlotN1() {
  const effectBox = document.getElementById('trk1-effect-n1');
  const optionsBox = document.getElementById('trk1-effect-n1-options');

  if (typeof trk1SelectedEffectN1 !== 'undefined' && trk1SelectedEffectN1) {
    trk1SelectedEffectN1.disable();
    trk1SelectedEffectN1 = null;
  }

  if (effectBox) effectBox.textContent = '';
  if (optionsBox) optionsBox.style.display = 'none';
}