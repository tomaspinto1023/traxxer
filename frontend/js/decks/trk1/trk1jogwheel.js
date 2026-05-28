//Jog wheel da trk 1

// Audio do scratch

let trk1ScratchAudioCtx = null;
let trk1ScratchBufferSource = null;
let trk1ScratchGain = null;
let trk1ScratchAudioBuffer = null; // buffer do MP3 decodificado
let trk1ScratchAudioLoaded = false;

async function initTrack1ScratchSound() {
  trk1ScratchAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

  trk1ScratchGain = trk1ScratchAudioCtx.createGain();
  trk1ScratchGain.gain.value = 0;
  trk1ScratchGain.connect(trk1ScratchAudioCtx.destination);

  try {
    const response = await fetch('../assets/audios/scratch.mp3');
    const arrayBuffer = await response.arrayBuffer();
    trk1ScratchAudioBuffer = await trk1ScratchAudioCtx.decodeAudioData(arrayBuffer);
    trk1ScratchAudioLoaded = true;
  } catch (err) {
    console.warn('Erro ao carregar o áudio do scratch:', err);
  }
}

function startTrack1ScratchSound() {
  if (!trk1ScratchAudioCtx) return;
  if (!trk1ScratchAudioLoaded) return;
  if (trk1ScratchAudioCtx.state === 'suspended') trk1ScratchAudioCtx.resume();
  if (trk1ScratchBufferSource) return;

  trk1ScratchBufferSource = trk1ScratchAudioCtx.createBufferSource();
  trk1ScratchBufferSource.buffer = trk1ScratchAudioBuffer; // usa o MP3 decodificado
  trk1ScratchBufferSource.loop = true;
  trk1ScratchBufferSource.playbackRate.value = 1;
  trk1ScratchBufferSource.connect(trk1ScratchGain);
  trk1ScratchBufferSource.start();
}

function stopTrack1ScratchSound() {
  if (!trk1ScratchBufferSource) return;

  // Fade out rápido para evitar click audível
  trk1ScratchGain.gain.setTargetAtTime(0, trk1ScratchAudioCtx.currentTime, 0.04);

  setTimeout(() => {
    trk1ScratchBufferSource?.stop();
    trk1ScratchBufferSource?.disconnect();
    trk1ScratchBufferSource = null;
  }, 150);
}

function updateTrack1ScratchSound(angleDelta, timeDeltaMs) {
  if (!trk1ScratchBufferSource || !trk1ScratchGain) return;

  const speed = Math.abs(angleDelta) / Math.max(timeDeltaMs, 1);

  // Volume proporcional à velocidade do arrasto
  const targetGain = Math.min(speed * 18, 0.9);
  trk1ScratchGain.gain.setTargetAtTime(targetGain, trk1ScratchAudioCtx.currentTime, 0.02);

  // Pitch: varia com velocidade e direção do arrasto
  const direction = angleDelta >= 0 ? 1 : -1;
  const rate = Math.min(Math.max(speed * 6, 0.3), 4.0);
  trk1ScratchBufferSource.playbackRate.value = rate * direction;
}

// Lógica da jog wheel da Track 1

function setupTrack1JogWheel(jogWheel) {
  if (!jogWheel) return;

  jogWheel.addEventListener('pointerdown', (event) => {
    if (!trk1WaveSurfer) return;
    if (!trk1HasLoadedTrack) return;
    if (!trk1WaveSurfer.getDuration()) return;

    event.preventDefault();

    const mode = getTrack1JogMode(jogWheel, event);

    trk1JogData.isActive = true;
    trk1JogData.mode = mode;
    trk1JogData.pointerId = event.pointerId;
    trk1JogData.lastAngle = getTrack1PointerAngle(jogWheel, event);
    trk1JogData.lastMoveTime = performance.now();
    trk1JogData.wasPlayingBeforeScratch = mode === 'scratch'
      ? trk1WaveSurfer.isPlaying()
      : false;

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
      startTrack1ScratchSound(); // ← inicia som de scratch

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
    if (!trk1HasLoadedTrack) return;
    if (!trk1WaveSurfer.getDuration()) return;

    event.preventDefault();

    const currentAngle = getTrack1PointerAngle(jogWheel, event);
    const angleDelta = normalizeTrack1AngleDelta(currentAngle - trk1JogData.lastAngle);
    const now = performance.now();
    const timeDeltaMs = Math.max(now - trk1JogData.lastMoveTime, 1);

    trk1JogData.lastAngle = currentAngle;
    trk1JogData.lastMoveTime = now;

    if (trk1JogData.mode === 'scratch') {
      applyTrack1Scratch(angleDelta, timeDeltaMs); // passa timeDeltaMs para o som
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
      stopTrack1ScratchSound(); // ← para o som de scratch

      if (trk1JogData.wasPlayingBeforeScratch) {
        trk1JogData.scratchResumeTimeout = setTimeout(() => {
          if (trk1WaveSurfer && trk1HasLoadedTrack && !trk1WaveSurfer.isPlaying()) {
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
    stopTrack1ScratchSound(); // ← para o som se o pointer for perdido
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

function applyTrack1Scratch(angleDelta, timeDeltaMs) {
  if (!trk1WaveSurfer) return;
  if (!trk1HasLoadedTrack) return;

  updateTrack1ScratchSound(angleDelta, timeDeltaMs); // ← atualiza pitch/volume do som

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
  if (!trk1HasLoadedTrack) return;

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
  if (!jogWheel) return;

  const label = jogWheel.querySelector('.jog-wheel-label');
  if (!label) return;

  trk1JogVisualRotation = angle % 360;

  if (trk1JogVisualRotation < 0) {
    trk1JogVisualRotation += 360;
  }

  label.style.transform = `rotate(${trk1JogVisualRotation}deg)`;
}

function startTrack1JogWheelSync(jogWheel) {
  stopTrack1JogWheelSync();

  function animate() {
    if (!trk1WaveSurfer || !trk1HasLoadedTrack || !trk1WaveSurfer.isPlaying()) {
      trk1JogAnimationFrame = null;
      return;
    }

    updateTrack1JogWheelFromAudio(jogWheel);
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

function updateTrack1JogWheelFromAudio(jogWheel) {
  if (!jogWheel || !trk1WaveSurfer || !trk1HasLoadedTrack) return;

  const duration = trk1WaveSurfer.getDuration();
  if (!duration) return;

  const currentTime = trk1WaveSurfer.getCurrentTime();

  const degreesPerSecond = 180;
  const exactRotation = currentTime * degreesPerSecond;

  setTrack1JogWheelRotation(jogWheel, exactRotation);
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

  stopTrack1ScratchSound(); // ← garante que o som para no reset
  resetTrack1JogPlaybackRate();
    trk1JogVisualRotation = 0;
}

initTrack1ScratchSound();