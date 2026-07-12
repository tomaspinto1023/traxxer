// Jog wheel da trk 2

// Audio do scratch

// ============================================================
// Scratch Sound Engine — Track 2
// ============================================================
// O som do scratch usa um pequeno excerto da PRÓPRIA faixa carregada
// (centrado na posição atual de reprodução), não um som genérico.

let trk2ScratchAudioCtx = null;
let trk2ScratchGain = null;

// Excertos (janela) da faixa atual usados como base do scratch
let trk2ScratchWindowBuffer = null;
let trk2ScratchWindowBufferReversed = null;

// Dois sources separados: um para frente, outro para trás
let trk2ScratchSourceFwd = null; // playbackRate positivo
let trk2ScratchSourceRev = null; // toca o excerto ao contrário
let trk2ScratchCurrentDirection = 0; // 1 = frente, -1 = trás, 0 = parado

const TRK2_SCRATCH_WINDOW_SECONDS = 1.2;

function initTrack2ScratchSound() {
  trk2ScratchAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

  trk2ScratchGain = trk2ScratchAudioCtx.createGain();
  trk2ScratchGain.gain.value = 0;
  trk2ScratchGain.connect(trk2ScratchAudioCtx.destination);
}

// Extrai (e inverte) um pequeno excerto da faixa carregada, centrado na
// posição atual do wavesurfer, para servir de base ao som do scratch.
function buildTrack2ScratchWindow() {
  trk2ScratchWindowBuffer = null;
  trk2ScratchWindowBufferReversed = null;

  if (!trk2ScratchAudioCtx || !trk2TrackAudioBuffer || !trk2WaveSurfer) return;

  const original = trk2TrackAudioBuffer;
  const currentTime = trk2WaveSurfer.getCurrentTime();

  const windowStart = Math.max(0, currentTime - TRK2_SCRATCH_WINDOW_SECONDS / 2);
  const windowEnd = Math.min(original.duration, windowStart + TRK2_SCRATCH_WINDOW_SECONDS);
  const startSample = Math.floor(windowStart * original.sampleRate);
  const endSample = Math.floor(windowEnd * original.sampleRate);
  const length = Math.max(1, endSample - startSample);

  const windowBuffer = trk2ScratchAudioCtx.createBuffer(
    original.numberOfChannels,
    length,
    original.sampleRate
  );

  const reversedBuffer = trk2ScratchAudioCtx.createBuffer(
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

  trk2ScratchWindowBuffer = windowBuffer;
  trk2ScratchWindowBufferReversed = reversedBuffer;
}

function createTrack2ScratchSource(reversed) {
  if (!trk2ScratchAudioCtx) return null;

  const buffer = reversed ? trk2ScratchWindowBufferReversed : trk2ScratchWindowBuffer;
  if (!buffer) return null;

  const source = trk2ScratchAudioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(trk2ScratchGain);
  return source;
}

function startTrack2ScratchSound() {
  if (!trk2ScratchAudioCtx) return;
  if (trk2ScratchAudioCtx.state === 'suspended') trk2ScratchAudioCtx.resume();

  buildTrack2ScratchWindow();
  if (!trk2ScratchWindowBuffer) return;

  // Cria ambos os sources prontos, com gain 0
  // Só o ativo terá rate > 0; o outro fica em idle
  if (!trk2ScratchSourceFwd) {
    trk2ScratchSourceFwd = createTrack2ScratchSource(false);
    trk2ScratchSourceFwd?.start();
  }

  if (!trk2ScratchSourceRev) {
    trk2ScratchSourceRev = createTrack2ScratchSource(true);
    trk2ScratchSourceRev?.start();
  }
}

function stopTrack2ScratchSound() {
  if (!trk2ScratchGain) return;

  trk2ScratchGain.gain.setTargetAtTime(0, trk2ScratchAudioCtx.currentTime, 0.04);

  setTimeout(() => {
    if (trk2ScratchSourceFwd) {
      trk2ScratchSourceFwd.stop();
      trk2ScratchSourceFwd.disconnect();
      trk2ScratchSourceFwd = null;
    }
    if (trk2ScratchSourceRev) {
      trk2ScratchSourceRev.stop();
      trk2ScratchSourceRev.disconnect();
      trk2ScratchSourceRev = null;
    }
    trk2ScratchCurrentDirection = 0;
  }, 150);
}

function updateTrack2ScratchSound(angleDelta, timeDeltaMs) {
  if (!trk2ScratchGain) return;
  if (!trk2ScratchSourceFwd || !trk2ScratchSourceRev) return;

  const speed = Math.abs(angleDelta) / Math.max(timeDeltaMs, 1);
  const direction = angleDelta >= 0 ? 1 : -1;
  const rate = Math.min(Math.max(speed * 6, 0.3), 4.0);

  // Volume proporcional à velocidade
  const targetGain = Math.min(speed * 18, 0.9);
  trk2ScratchGain.gain.setTargetAtTime(targetGain, trk2ScratchAudioCtx.currentTime, 0.02);

  if (direction === 1) {
    // Frente: ativa o source normal, silencia o invertido
    trk2ScratchSourceFwd.playbackRate.value = rate;
    trk2ScratchSourceRev.playbackRate.value = 0.001; // não pode ser 0
  } else {
    // Trás: ativa o source invertido, silencia o normal
    trk2ScratchSourceFwd.playbackRate.value = 0.001;
    trk2ScratchSourceRev.playbackRate.value = rate;
  }

  trk2ScratchCurrentDirection = direction;
}

// Lógica da jog wheel da Track 2

function setupTrack2JogWheel(jogWheel) {
  if (!jogWheel) return;

  jogWheel.addEventListener('pointerdown', (event) => {
    if (!trk2WaveSurfer) return;
    if (!trk2HasLoadedTrack) return;
    if (!trk2WaveSurfer.getDuration()) return;

    event.preventDefault();

    const mode = getTrack2JogMode(jogWheel, event);

    trk2JogData.isActive = true;
    trk2JogData.mode = mode;
    trk2JogData.pointerId = event.pointerId;
    trk2JogData.lastAngle = getTrack2PointerAngle(jogWheel, event);
    trk2JogData.lastMoveTime = performance.now();
    trk2JogData.wasPlayingBeforeScratch = mode === 'scratch'
      ? trk2WaveSurfer.isPlaying()
      : false;

    if (trk2JogData.scratchResumeTimeout) {
      clearTimeout(trk2JogData.scratchResumeTimeout);
      trk2JogData.scratchResumeTimeout = null;
    }

    if (trk2JogData.jogResetTimeout) {
      clearTimeout(trk2JogData.jogResetTimeout);
      trk2JogData.jogResetTimeout = null;
    }

    if (mode === 'scratch') {
      trk2IsScratchingJog = true; // ← ativa flag antes de pausar
      jogWheel.classList.add('is-scratching');
      startTrack2ScratchSound(); // ← inicia som de scratch

      if (trk2WaveSurfer.isPlaying()) {
        trk2WaveSurfer.pause();
      }
    } else {
      jogWheel.classList.add('is-jogging');
    }

    jogWheel.setPointerCapture(event.pointerId);
  });

  jogWheel.addEventListener('pointermove', (event) => {
    if (!trk2JogData.isActive) return;
    if (event.pointerId !== trk2JogData.pointerId) return;
    if (!trk2WaveSurfer) return;
    if (!trk2HasLoadedTrack) return;
    if (!trk2WaveSurfer.getDuration()) return;

    event.preventDefault();

    const currentAngle = getTrack2PointerAngle(jogWheel, event);
    const angleDelta = normalizeTrack2AngleDelta(currentAngle - trk2JogData.lastAngle);
    const now = performance.now();
    const timeDeltaMs = Math.max(now - trk2JogData.lastMoveTime, 1);

    trk2JogData.lastAngle = currentAngle;
    trk2JogData.lastMoveTime = now;

    if (trk2JogData.mode === 'scratch') {
      applyTrack2Scratch(angleDelta, timeDeltaMs); // passa timeDeltaMs para o som
      setTrack2JogWheelRotation(jogWheel, trk2JogVisualRotation + angleDelta);
      return;
    }

    applyTrack2Jog(angleDelta, timeDeltaMs);
  });

  function endInteraction(event) {
    if (!trk2JogData.isActive) return;
    if (event.pointerId !== trk2JogData.pointerId) return;

    event.preventDefault();

    if (trk2JogData.mode === 'scratch') {
      trk2IsScratchingJog = false; // ← desativa flag antes de retomar
      jogWheel.classList.remove('is-scratching');
      stopTrack2ScratchSound(); // ← para o som de scratch

      if (trk2JogData.wasPlayingBeforeScratch) {
        trk2JogData.scratchResumeTimeout = setTimeout(() => {
          if (trk2WaveSurfer && trk2HasLoadedTrack && !trk2WaveSurfer.isPlaying()) {
            trk2WaveSurfer.play();
          }
        }, 25);
      }
    }

    if (trk2JogData.mode === 'jog') {
      jogWheel.classList.remove('is-jogging');
      resetTrack2JogPlaybackRate();
    }

    trk2JogData.isActive = false;
    trk2JogData.mode = null;
    trk2JogData.pointerId = null;
  }

  jogWheel.addEventListener('pointerup', endInteraction);
  jogWheel.addEventListener('pointercancel', endInteraction);

  jogWheel.addEventListener('lostpointercapture', (event) => {
    if (!trk2JogData.isActive) return;
    if (event.pointerId !== trk2JogData.pointerId) return;

    jogWheel.classList.remove('is-scratching', 'is-jogging');
    trk2IsScratchingJog = false; // ← desativa flag se pointer for perdido
    stopTrack2ScratchSound(); // ← para o som se o pointer for perdido
    resetTrack2JogPlaybackRate();

    trk2JogData.isActive = false;
    trk2JogData.mode = null;
    trk2JogData.pointerId = null;
  });
}

function getTrack2JogMode(jogWheel, event) {
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

function getTrack2PointerAngle(jogWheel, event) {
  const rect = jogWheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;

  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function normalizeTrack2AngleDelta(delta) {
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

function applyTrack2Scratch(angleDelta, timeDeltaMs) {
  if (!trk2WaveSurfer) return;
  if (!trk2HasLoadedTrack) return;

  updateTrack2ScratchSound(angleDelta, timeDeltaMs); // ← atualiza pitch/volume do som

  const duration = trk2WaveSurfer.getDuration();
  const currentTime = trk2WaveSurfer.getCurrentTime();
  const timeOffset = angleDelta * TRK2_SCRATCH_SECONDS_PER_DEGREE;

  let newTime = currentTime + timeOffset;

  if (newTime < 0) newTime = 0;
  if (newTime > duration) newTime = duration;

  trk2WaveSurfer.setTime(newTime);
}

function applyTrack2Jog(angleDelta, timeDeltaMs) {
  if (!trk2WaveSurfer) return;
  if (!trk2HasLoadedTrack) return;

  const isPlaying = trk2WaveSurfer.isPlaying();

  if (!isPlaying) {
    const duration = trk2WaveSurfer.getDuration();
    const currentTime = trk2WaveSurfer.getCurrentTime();
    const timeOffset = angleDelta * TRK2_JOG_SENSITIVITY_PAUSED;

    let newTime = currentTime + timeOffset;

    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;

    trk2WaveSurfer.setTime(newTime);
    return;
  }

  const angularSpeed = angleDelta / timeDeltaMs;
  let rateOffset = angularSpeed * 4.2;

  if (rateOffset > TRK2_MAX_JOG_RATE_OFFSET) rateOffset = TRK2_MAX_JOG_RATE_OFFSET;
  if (rateOffset < -TRK2_MAX_JOG_RATE_OFFSET) rateOffset = -TRK2_MAX_JOG_RATE_OFFSET;

  const media = trk2WaveSurfer.getMediaElement?.();
  if (!media) return;

  media.playbackRate = 1 + rateOffset;

  if (trk2JogData.jogResetTimeout) {
    clearTimeout(trk2JogData.jogResetTimeout);
  }

  trk2JogData.jogResetTimeout = setTimeout(() => {
    resetTrack2JogPlaybackRate();
  }, 45);
}

function resetTrack2JogPlaybackRate() {
  if (!trk2WaveSurfer) return;

  const media = trk2WaveSurfer.getMediaElement?.();
  if (!media) return;

  media.playbackRate = 1;
}

function setTrack2JogWheelRotation(jogWheel, angle) {
  if (!jogWheel) return;

  const label = jogWheel.querySelector('.jog-wheel-label');
  if (!label) return;

  trk2JogVisualRotation = angle % 360;

  if (trk2JogVisualRotation < 0) {
    trk2JogVisualRotation += 360;
  }

  label.style.transform = `rotate(${trk2JogVisualRotation}deg)`;
}

function startTrack2JogWheelSync(jogWheel) {
  stopTrack2JogWheelSync();

  function animate() {
    if (!trk2WaveSurfer || !trk2HasLoadedTrack || !trk2WaveSurfer.isPlaying()) {
      trk2JogAnimationFrame = null;
      return;
    }

    updateTrack2JogWheelFromAudio(jogWheel);
    trk2JogAnimationFrame = requestAnimationFrame(animate);
  }

  trk2JogAnimationFrame = requestAnimationFrame(animate);
}

function stopTrack2JogWheelSync() {
  if (trk2JogAnimationFrame) {
    cancelAnimationFrame(trk2JogAnimationFrame);
    trk2JogAnimationFrame = null;
  }
}

function updateTrack2JogWheelFromAudio(jogWheel) {
  if (!jogWheel || !trk2WaveSurfer || !trk2HasLoadedTrack) return;

  const duration = trk2WaveSurfer.getDuration();
  if (!duration) return;

  const currentTime = trk2WaveSurfer.getCurrentTime();

  const degreesPerSecond = 180;
  const exactRotation = currentTime * degreesPerSecond;

  setTrack2JogWheelRotation(jogWheel, exactRotation);
}

function resetTrack2JogWheel(jogWheel) {
  if (!jogWheel) return;

  jogWheel.classList.remove('is-scratching', 'is-jogging');

  setTrack2JogWheelRotation(jogWheel, 0);

  if (trk2JogData.scratchResumeTimeout) {
    clearTimeout(trk2JogData.scratchResumeTimeout);
    trk2JogData.scratchResumeTimeout = null;
  }

  if (trk2JogData.jogResetTimeout) {
    clearTimeout(trk2JogData.jogResetTimeout);
    trk2JogData.jogResetTimeout = null;
  }

  trk2JogData.isActive = false;
  trk2JogData.mode = null;
  trk2JogData.pointerId = null;

  stopTrack2ScratchSound(); // ← garante que o som para no reset
  resetTrack2JogPlaybackRate();
  trk2JogVisualRotation = 0;
}

initTrack2ScratchSound();