// Lógica de tempo da Track 2

function formatTrack1Time(seconds) {
  const totalSeconds = Math.max(0, seconds);

  const minutes = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const deciseconds = Math.floor((totalSeconds % 1) * 10);

  const paddedSecs = String(secs).padStart(2, '0');

  return `${minutes}:${paddedSecs}:${deciseconds}`;
}

function updateTrack1TimeDisplays(elapsedEl, remainingEl) {
  if (!trk1WaveSurfer || !trk1HasLoadedTrack) {
    if (elapsedEl) elapsedEl.textContent = '';
    if (remainingEl) remainingEl.textContent = '';
    return;
  }

  const current = trk1WaveSurfer.getCurrentTime();
  const duration = trk1WaveSurfer.getDuration();

  if (!duration) {
    if (elapsedEl) elapsedEl.textContent = '';
    if (remainingEl) remainingEl.textContent = '';
    return;
  }

  const remaining = duration - current;

  if (elapsedEl) {
    elapsedEl.textContent = formatTrack1Time(current);
  }

  if (remainingEl) {
    remainingEl.textContent = formatTrack1Time(remaining);
  }
}

function showTrack1TimeIndicators() {
  const elapsedIndicator = document.getElementById('trk1-music-elapsed-indicator');
  const remainingIndicator = document.getElementById('trk1-music-remaining-indicator');

  if (elapsedIndicator) elapsedIndicator.textContent = 'DECORRIDO';
  if (remainingIndicator) remainingIndicator.textContent = 'RESTANTE';
}

function clearTrack1TimeDisplay() {
  const elapsedIndicator = document.getElementById('trk1-music-elapsed-indicator');
  const remainingIndicator = document.getElementById('trk1-music-remaining-indicator');
  const elapsedTime = document.getElementById('trk1-music-elapsed-time');
  const remainingTime = document.getElementById('trk1-music-remaining-time');

  if (elapsedIndicator) elapsedIndicator.textContent = '';
  if (remainingIndicator) remainingIndicator.textContent = '';
  if (elapsedTime) elapsedTime.textContent = '';
  if (remainingTime) remainingTime.textContent = '';
}