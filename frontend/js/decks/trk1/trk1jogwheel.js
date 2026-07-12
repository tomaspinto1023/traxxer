// Jog wheel da trk 1

// Audio do scratch

// ============================================================
// Scratch Sound Engine — Track 1
// ============================================================
// O som do scratch usa um pequeno excerto da PRÓPRIA faixa carregada
// (centrado na posição atual de reprodução), não um som genérico.

let trk1ScratchAudioCtx = null;
let trk1ScratchGain = null;

// Excertos (janela) da faixa atual usados como base do scratch
let trk1ScratchWindowBuffer = null;
let trk1ScratchWindowBufferReversed = null;

// Dois sources separados: um para frente, outro para trás
let trk1ScratchSourceFwd = null; // playbackRate positivo
let trk1ScratchSourceRev = null; // toca o excerto ao contrário
let trk1ScratchCurrentDirection = 0; // 1 = frente, -1 = trás, 0 = parado

const TRK1_SCRATCH_WINDOW_SECONDS = 1.2;

function initTrack1ScratchSound() {
  trk1ScratchAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

  trk1ScratchGain = trk1ScratchAudioCtx.createGain();
  trk1ScratchGain.gain.value = 0;
  trk1ScratchGain.connect(trk1ScratchAudioCtx.destination);
}

// Extrai (e inverte) um pequeno excerto da faixa carregada, centrado na
// posição atual do wavesurfer, para servir de base ao som do scratch.
function buildTrack1ScratchWindow() {
  trk1ScratchWindowBuffer = null;
  trk1ScratchWindowBufferReversed = null;

  if (!trk1ScratchAudioCtx || !trk1TrackAudioBuffer || !trk1WaveSurfer) return;

  const original = trk1TrackAudioBuffer;
  const currentTime = trk1WaveSurfer.getCurrentTime();

  const windowStart = Math.max(0, currentTime - TRK1_SCRATCH_WINDOW_SECONDS / 2);
  const windowEnd = Math.min(original.duration, windowStart + TRK1_SCRATCH_WINDOW_SECONDS);
  const startSample = Math.floor(windowStart * original.sampleRate);
  const endSample = Math.floor(windowEnd * original.sampleRate);
  const length = Math.max(1, endSample - startSample);

  const windowBuffer = trk1ScratchAudioCtx.createBuffer(
    original.numberOfChannels,
    length,
    original.sampleRate
  );

  const reversedBuffer = trk1ScratchAudioCtx.createBuffer(
    original.numberOfChannels,
    length,
    original.sampleRate
  );

  for (let ch = 0; ch < original.numberOfChannels; ch++) {
    const originalData = original.getChannelData(ch);
    const windowData = windowBuffer.getChannelData(ch);
    const reversedData = reversedBuffer.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      const sample = originalData[startSample + i] || 0;
      windowData[i] = sample;
      reversedData[length - 1 - i] = sample;
    }
  }

  trk1ScratchWindowBuffer = windowBuffer;
  trk1ScratchWindowBufferReversed = reversedBuffer;
}

function createScratchSource(reversed) {
  if (!trk1ScratchAudioCtx) return null;

  const buffer = reversed ? trk1ScratchWindowBufferReversed : trk1ScratchWindowBuffer;
  if (!buffer) return null;

  const source = trk1ScratchAudioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(trk1ScratchGain);
  return source;
}

function startTrack1ScratchSound() {
  if (!trk1ScratchAudioCtx) return;
  if (trk1ScratchAudioCtx.state === 'suspended') trk1ScratchAudioCtx.resume();

  buildTrack1ScratchWindow();
  if (!trk1ScratchWindowBuffer) return;

  // Cria ambos os sources prontos, com gain 0
  // Só o ativo terá rate > 0; o outro fica em idle
  if (!trk1ScratchSourceFwd) {
    trk1ScratchSourceFwd = createScratchSource(false);
    trk1ScratchSourceFwd?.start();
  }

  if (!trk1ScratchSourceRev) {
    trk1ScratchSourceRev = createScratchSource(true);
    trk1ScratchSourceRev?.start();
  }
}

function stopTrack1ScratchSound() {
  if (!trk1ScratchGain) return;

  trk1ScratchGain.gain.setTargetAtTime(0, trk1ScratchAudioCtx.currentTime, 0.04);

  setTimeout(() => {
    if (trk1ScratchSourceFwd) {
      trk1ScratchSourceFwd.stop();
      trk1ScratchSourceFwd.disconnect();
      trk1ScratchSourceFwd = null;
    }
    if (trk1ScratchSourceRev) {
      trk1ScratchSourceRev.stop();
      trk1ScratchSourceRev.disconnect();
      trk1ScratchSourceRev = null;
    }
    trk1ScratchCurrentDirection = 0;
  }, 150);
}

function updateTrack1ScratchSound(angleDelta, timeDeltaMs) {
  if (!trk1ScratchGain) return;
  if (!trk1ScratchSourceFwd || !trk1ScratchSourceRev) return;

  const speed = Math.abs(angleDelta) / Math.max(timeDeltaMs, 1);
  const direction = angleDelta >= 0 ? 1 : -1;
  const rate = Math.min(Math.max(speed * 6, 0.3), 4.0);

  // Volume proporcional à velocidade
  const targetGain = Math.min(speed * 18, 0.9);
  trk1ScratchGain.gain.setTargetAtTime(targetGain, trk1ScratchAudioCtx.currentTime, 0.02);

  if (direction === 1) {
    // Frente: ativa o source normal, silencia o invertido
    trk1ScratchSourceFwd.playbackRate.value = rate;
    trk1ScratchSourceRev.playbackRate.value = 0.001; // não pode ser 0
  } else {
    // Trás: ativa o source invertido, silencia o normal
    trk1ScratchSourceFwd.playbackRate.value = 0.001;
    trk1ScratchSourceRev.playbackRate.value = rate;
  }

  trk1ScratchCurrentDirection = direction;
}

initTrack1ScratchSound();

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
      trk1IsScratchingJog = true; // ← ativa flag antes de pausar
      jogWheel.classList.add('is-scratching');
      startTrack1ScratchSound();

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
      applyTrack1Scratch(angleDelta, timeDeltaMs);
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
      trk1IsScratchingJog = false; // ← desativa flag antes de retomar
      jogWheel.classList.remove('is-scratching');
      stopTrack1ScratchSound();

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
    trk1IsScratchingJog = false; // ← desativa flag se pointer for perdido
    stopTrack1ScratchSound();
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
  const scratchStart = performance.now();

  if (!trk1WaveSurfer) return;
  if (!trk1HasLoadedTrack) return;

  updateTrack1ScratchSound(angleDelta, timeDeltaMs);

  const duration = trk1WaveSurfer.getDuration();
  const currentTime = trk1WaveSurfer.getCurrentTime();
  const timeOffset = angleDelta * TRK1_SCRATCH_SECONDS_PER_DEGREE;

  let newTime = currentTime + timeOffset;

  if (newTime < 0) newTime = 0;
  if (newTime > duration) newTime = duration;

  trk1WaveSurfer.setTime(newTime);

  const scratchEnd = performance.now(); // ← ADICIONA AQUI
  console.log(`[TESTE] Resposta do scratch: ${(scratchEnd - scratchStart).toFixed(2)}ms`);

  const elapsedTimeText = document.getElementById('trk1-music-elapsed-time');
  const remainingTimeText = document.getElementById('trk1-music-remaining-time');
  updateTrack1TimeDisplays(elapsedTimeText, remainingTimeText);
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

    // ← atualiza os displays durante jog com música pausada
    const elapsedTimeText = document.getElementById('trk1-music-elapsed-time');
    const remainingTimeText = document.getElementById('trk1-music-remaining-time');
    updateTrack1TimeDisplays(elapsedTimeText, remainingTimeText);
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

  stopTrack1ScratchSound();
  resetTrack1JogPlaybackRate();
  trk1JogVisualRotation = 0;
}