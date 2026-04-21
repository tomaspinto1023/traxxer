//Este ficheiro é responsável por gerir funções de utilização dentro do deck uma vez que a musica estiver carregada!
//Passar lógicas de ações que estão erradamente no uploadtracks.js!

//Variáveis 
let trk1WaveSurfer = null; //A onda não existe até o mp3 ser recebido e processado
let trk1CurrentObjectUrl = null; //A capa não existe até o mp3 ser carregado
let trk1CuePoint = 0; // O cue começa por definição no inicio da musica
let trk1HasLoadedTrack = false; // Só fica true quando há uma música realmente carregada
let trk1JogVisualRotation = 0;
let trk1JogAnimationFrame = null;
const TRK1_SCRATCH_SECONDS_PER_DEGREE = 0.0030;
const TRK1_JOG_SENSITIVITY_PLAYING = 0.010;
const TRK1_JOG_SENSITIVITY_PAUSED = 0.006;
const TRK1_MAX_JOG_RATE_OFFSET = 0.22;


let trk1JogData = { // Dados relativos ao jogwheel
  isActive: false,
  mode: null, // 'scratch' | 'jog'
  pointerId: null,
  lastAngle: 0,
  lastMoveTime: 0,
  wasPlayingBeforeScratch: false,
  scratchResumeTimeout: null,
  jogResetTimeout: null
};

function createTrack1WaveSurfer() { //Função que cria o onda de som com as customizações definidas cá dentro
  trk1WaveSurfer = WaveSurfer.create({
    container: '#trk1-waveform',
    waveColor: '#dbdbdb',
    progressColor: '#a12fb0',
    cursorColor: '#ffffff',
    height: 27.4,
    barWidth: 2,
    barGap: 1,
  });

  return trk1WaveSurfer;
}

function getTrack1WaveSurfer() { //Função que retorna o onda de som
  return trk1WaveSurfer;
}

function loadTrack1File(file, elements) { //Função que carrega a musica
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

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

function ejectTrack1(elements, jogWheel) { //Função que limpa o deck quando a música é ejetada
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

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

  musicName.textContent = '';
  channelName.textContent = '';

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = '';
  cover.style.backgroundPosition = '';
  cover.style.backgroundRepeat = '';

  setPlayPauseVisual(false, playIcon, pauseIcon);
  stopTrack1JogWheelSync();
  trk1JogVisualRotation = 0;
  resetTrack1JogWheel(jogWheel);
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

function handleCueTrack1(playIcon, pauseIcon) { //Função que pega o cue point da musica
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

function removeMp3Extension(filename) { //Função que remove o ".mp3" do nome da musica, para facilitar a leitura e o resultado final
  return filename.replace(/\.mp3$/i, '');
}

function setPlayPauseVisual(isPlaying, playIcon, pauseIcon) { //Função que altera o icone de play e pause tendo em conta as condições
  if (!playIcon || !pauseIcon) return;

  playIcon.style.display = isPlaying ? 'none' : 'inline-block';
  pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
}

function setupTrack1JogWheel(jogWheel) { //Função que configura a roda de jogos
  if (!jogWheel) return;

  jogWheel.addEventListener('pointerdown', (event) => {
    if (!trk1WaveSurfer) return;
    if (!trk1WaveSurfer.getDuration()) return;

    event.preventDefault();

    const mode = getTrack1JogMode(jogWheel, event);

    trk1JogData.isActive = true;
    trk1JogData.mode = mode;
    trk1JogData.pointerId = event.pointerId;
    trk1JogData.lastAngle = getTrack1PointerAngle(jogWheel, event);
    trk1JogData.lastMoveTime = performance.now();
    trk1JogData.wasPlayingBeforeScratch = mode === 'scratch' ? trk1WaveSurfer.isPlaying() : false;
    
    if (!trk1WaveSurfer) return;
    if (!trk1HasLoadedTrack) return;
    if (!trk1WaveSurfer.getDuration()) return;

    if (trk1JogData.scratchResumeTimeout) {
      clearTimeout(trk1JogData.scratchResumeTimeout);
      trk1JogData.scratchResumeTimeout = null;
    }

    if (trk1JogData.jogResetTimeout) {
      clearTimeout(trk1JogData.jogResetTimeout);
      trk1JogData.jogResetTimeout = null;
    }

    if (mode === 'scratch') {
      jogWheel.classList.add('is-scratching');

      if (trk1WaveSurfer.isPlaying()) {
        trk1WaveSurfer.pause();
      }
    } else {
      jogWheel.classList.add('is-jogging');
    }

    jogWheel.setPointerCapture(event.pointerId);
  });

  jogWheel.addEventListener('pointermove', (event) => {
    if (!trk1JogData.isActive) return;
    if (event.pointerId !== trk1JogData.pointerId) return;
    if (!trk1WaveSurfer) return;
    if (!trk1WaveSurfer.getDuration()) return;

    event.preventDefault();

    const currentAngle = getTrack1PointerAngle(jogWheel, event);
    const angleDelta = normalizeTrack1AngleDelta(currentAngle - trk1JogData.lastAngle);
    const now = performance.now();
    const timeDeltaMs = Math.max(now - trk1JogData.lastMoveTime, 1);

    trk1JogData.lastAngle = currentAngle;
    trk1JogData.lastMoveTime = now;

    if (trk1JogData.mode === 'scratch') {
    applyTrack1Scratch(angleDelta);
    setTrack1JogWheelRotation(jogWheel, trk1JogVisualRotation + angleDelta);
    return;
  }
    applyTrack1Jog(angleDelta, timeDeltaMs);
  });

  function endInteraction(event) {
    if (!trk1JogData.isActive) return;
    if (event.pointerId !== trk1JogData.pointerId) return;

    event.preventDefault();

    if (trk1JogData.mode === 'scratch') {
      jogWheel.classList.remove('is-scratching');

      if (trk1JogData.wasPlayingBeforeScratch) {
        trk1JogData.scratchResumeTimeout = setTimeout(() => {
          if (trk1WaveSurfer && !trk1WaveSurfer.isPlaying()) {
            trk1WaveSurfer.play();
          }
        }, 25);
      }
    }

    if (trk1JogData.mode === 'jog') {
      jogWheel.classList.remove('is-jogging');
      resetTrack1JogPlaybackRate();
    }

    trk1JogData.isActive = false;
    trk1JogData.mode = null;
    trk1JogData.pointerId = null;
  }

  jogWheel.addEventListener('pointerup', endInteraction);
  jogWheel.addEventListener('pointercancel', endInteraction);
  jogWheel.addEventListener('lostpointercapture', (event) => {
    if (!trk1JogData.isActive) return;
    if (event.pointerId !== trk1JogData.pointerId) return;

    jogWheel.classList.remove('is-scratching', 'is-jogging');
    resetTrack1JogPlaybackRate();

    trk1JogData.isActive = false;
    trk1JogData.mode = null;
    trk1JogData.pointerId = null;
  });
}

function getTrack1JogMode(jogWheel, event) {
  const rect = jogWheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const outerRadius = rect.width / 2;
  const scratchRadius = outerRadius * 0.73;

  return distance <= scratchRadius ? 'scratch' : 'jog';
}

function getTrack1PointerAngle(jogWheel, event) {
  const rect = jogWheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;

  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function normalizeTrack1AngleDelta(delta) {
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

function applyTrack1Scratch(angleDelta) {
  if (!trk1WaveSurfer) return;

  const duration = trk1WaveSurfer.getDuration();
  const currentTime = trk1WaveSurfer.getCurrentTime();
  const timeOffset = angleDelta * TRK1_SCRATCH_SECONDS_PER_DEGREE;

  let newTime = currentTime + timeOffset;

  if (newTime < 0) newTime = 0;
  if (newTime > duration) newTime = duration;

  trk1WaveSurfer.setTime(newTime);
}

function applyTrack1Jog(angleDelta, timeDeltaMs) {
  if (!trk1WaveSurfer) return;

  const isPlaying = trk1WaveSurfer.isPlaying();

  if (!isPlaying) {
    const duration = trk1WaveSurfer.getDuration();
    const currentTime = trk1WaveSurfer.getCurrentTime();
    const timeOffset = angleDelta * TRK1_JOG_SENSITIVITY_PAUSED;

    let newTime = currentTime + timeOffset;

    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;

    trk1WaveSurfer.setTime(newTime);
    return;
  }

  const angularSpeed = angleDelta / timeDeltaMs;
  let rateOffset = angularSpeed * 4.2;

  if (rateOffset > TRK1_MAX_JOG_RATE_OFFSET) rateOffset = TRK1_MAX_JOG_RATE_OFFSET;
  if (rateOffset < -TRK1_MAX_JOG_RATE_OFFSET) rateOffset = -TRK1_MAX_JOG_RATE_OFFSET;

  const media = trk1WaveSurfer.getMediaElement?.();

  if (!media) return;

  media.playbackRate = 1 + rateOffset;

  if (trk1JogData.jogResetTimeout) {
    clearTimeout(trk1JogData.jogResetTimeout);
  }

  trk1JogData.jogResetTimeout = setTimeout(() => {
    resetTrack1JogPlaybackRate();
  }, 45);
}

function resetTrack1JogPlaybackRate() {
  if (!trk1WaveSurfer) return;

  const media = trk1WaveSurfer.getMediaElement?.();
  if (!media) return;

  media.playbackRate = 1;
}

function setTrack1JogWheelRotation(jogWheel, angle) {
  const label = jogWheel.querySelector('.jog-wheel-label');
  if (!label) return;

  trk1JogVisualRotation = angle % 360;
  if (trk1JogVisualRotation < 0) trk1JogVisualRotation += 360;

  label.style.transform = `rotate(${trk1JogVisualRotation}deg)`;
}

function updateTrack1JogWheelFromAudio(jogWheel) {
  if (!jogWheel || !trk1WaveSurfer || !trk1HasLoadedTrack) return;

  const duration = trk1WaveSurfer.getDuration();
  if (!duration) return;

  const currentTime = trk1WaveSurfer.getCurrentTime();

  // velocidade visual do disco
  const degreesPerSecond = 180;

  const exactRotation = currentTime * degreesPerSecond;
  setTrack1JogWheelRotation(jogWheel, exactRotation);
}

function startTrack1JogWheelSync(jogWheel) {
  stopTrack1JogWheelSync();
  trk1LastFrameTime = performance.now();

  function animate(now) {
    if (!trk1WaveSurfer || !trk1HasLoadedTrack || !trk1WaveSurfer.isPlaying()) {
      trk1JogAnimationFrame = null;
      return;
    }

    updateTrack1JogWheelFromAudio(jogWheel);
    trk1LastFrameTime = now;
    trk1JogAnimationFrame = requestAnimationFrame(animate);
  }

  trk1JogAnimationFrame = requestAnimationFrame(animate);
}

function stopTrack1JogWheelSync() {
  if (trk1JogAnimationFrame) {
    cancelAnimationFrame(trk1JogAnimationFrame);
    trk1JogAnimationFrame = null;
  }
}

function rotateTrack1WheelVisual(jogWheel, angle) {
  const label = jogWheel.querySelector('.jog-wheel-label');
  if (!label) return;

  trk1JogVisualRotation = angle;
  label.style.transform = `rotate(${trk1JogVisualRotation}deg)`;
}

function resetTrack1JogWheel(jogWheel) {
  if (!jogWheel) return;

  jogWheel.classList.remove('is-scratching', 'is-jogging');

  setTrack1JogWheelRotation(jogWheel, 0);

  if (trk1JogData.scratchResumeTimeout) {
    clearTimeout(trk1JogData.scratchResumeTimeout);
    trk1JogData.scratchResumeTimeout = null;
  }

  if (trk1JogData.jogResetTimeout) {
    clearTimeout(trk1JogData.jogResetTimeout);
    trk1JogData.jogResetTimeout = null;
  }

  trk1JogData.isActive = false;
  trk1JogData.mode = null;
  trk1JogData.pointerId = null;

  resetTrack1JogPlaybackRate();
  trk1JogVisualRotation = 0;
}