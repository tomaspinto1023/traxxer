// Lógica de tempo da Track 2

function formatTrack2Time(seconds) {
  const totalSeconds = Math.max(0, seconds);

  const minutes = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const deciseconds = Math.floor((totalSeconds % 1) * 10);

  const paddedSecs = String(secs).padStart(2, '0');

  return `${minutes}:${paddedSecs}:${deciseconds}`;
}

function updateTrack2TimeDisplays(elapsedEl, remainingEl) {
  if (!trk2WaveSurfer || !trk2HasLoadedTrack) {
    if (elapsedEl) elapsedEl.textContent = '';
    if (remainingEl) remainingEl.textContent = '';
    return;
  }

  const current = trk2WaveSurfer.getCurrentTime();
  const duration = trk2WaveSurfer.getDuration();

  if (!duration) {
    if (elapsedEl) elapsedEl.textContent = '';
    if (remainingEl) remainingEl.textContent = '';
    return;
  }

  const remaining = duration - current;

  if (elapsedEl) {
    elapsedEl.textContent = formatTrack2Time(current);
  }

  if (remainingEl) {
    remainingEl.textContent = formatTrack2Time(remaining);
  }
}

function showTrack2TimeIndicators() {
  const elapsedIndicator = document.getElementById('trk2-music-elapsed-indicator');
  const remainingIndicator = document.getElementById('trk2-music-remaining-indicator');

  if (elapsedIndicator) elapsedIndicator.textContent = 'DECORRIDO';
  if (remainingIndicator) remainingIndicator.textContent = 'RESTANTE';
}

function clearTrack2TimeDisplay() {
  const elapsedIndicator = document.getElementById('trk2-music-elapsed-indicator');
  const remainingIndicator = document.getElementById('trk2-music-remaining-indicator');
  const elapsedTime = document.getElementById('trk2-music-elapsed-time');
  const remainingTime = document.getElementById('trk2-music-remaining-time');

  if (elapsedIndicator) elapsedIndicator.textContent = '';
  if (remainingIndicator) remainingIndicator.textContent = '';
  if (elapsedTime) elapsedTime.textContent = '';
  if (remainingTime) remainingTime.textContent = '';
}