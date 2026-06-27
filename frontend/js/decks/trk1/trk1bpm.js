// Lógica de BPM da Track 1

function getTrack1BpmFromTags(tags) {
  if (!tags) return null;

  const possibleBpm =
    tags.TBPM ||
    tags.bpm ||
    tags.BPM ||
    tags['TBPM'];

  if (!possibleBpm) return null;

  const bpmNumber = parseFloat(String(possibleBpm).replace(',', '.'));

  if (Number.isNaN(bpmNumber)) return null;

  return Math.round(bpmNumber);
}

async function detectAndShowTrack1Bpm(file, bpmText, loadId) {
  const bpmStart = performance.now();

  if (!bpmText) return;
  bpmText.textContent = '...';

  try {
    const bpm = await detectTrack1BpmFromAudio(file);
    const bpmEnd = performance.now(); 
    console.log(`[TESTE] Deteção de BPM: ${(bpmEnd - bpmStart).toFixed(2)}ms`);

    if (loadId !== trk1LoadId) return;
    if (!trk1HasLoadedTrack) return;

    if (bpm) {
      bpmText.textContent = formatTrack1Bpm(bpm);
      updateTrack1BpmPosition(bpmText, bpm);
    } else {
      bpmText.textContent = '--';
      bpmText.style.left = '470px';
    }
  } catch (error) {
    console.log('Erro ao detetar BPM:', error);

    if (loadId !== trk1LoadId) return;

    bpmText.textContent = '--';
    bpmText.style.left = '470px';
  }
}

async function detectTrack1BpmFromAudio(file) {
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const peaks = getTrack1EnergyPeaks(channelData, sampleRate);
  const tempoCandidates = getTrack1TempoCandidates(peaks);

  await audioContext.close();

  if (!tempoCandidates.length) return null;

  tempoCandidates.sort((a, b) => b.score - a.score);

  return normalizeTrack1Bpm(tempoCandidates[0].tempo);
}

function getTrack1EnergyPeaks(channelData, sampleRate) {
  const blockSize = Math.floor(sampleRate * 0.05);
  const energies = [];

  for (let i = 0; i < channelData.length; i += blockSize) {
    let sum = 0;

    for (let j = 0; j < blockSize && i + j < channelData.length; j++) {
      const sample = channelData[i + j];
      sum += sample * sample;
    }

    energies.push({
      time: i / sampleRate,
      energy: sum / blockSize
    });
  }

  const averageEnergy =
    energies.reduce((total, item) => total + item.energy, 0) / energies.length;

  const threshold = averageEnergy * 1.45;
  const peaks = [];

  for (let i = 1; i < energies.length - 1; i++) {
    const previous = energies[i - 1];
    const current = energies[i];
    const next = energies[i + 1];

    const isLocalPeak =
      current.energy > previous.energy &&
      current.energy > next.energy &&
      current.energy > threshold;

    if (!isLocalPeak) continue;

    const lastPeak = peaks[peaks.length - 1];

    if (!lastPeak || current.time - lastPeak.time > 0.25) {
      peaks.push(current);
    }
  }

  return peaks;
}

function getTrack1TempoCandidates(peaks) {
  const candidates = [];

  for (let i = 0; i < peaks.length; i++) {
    for (let j = i + 1; j < peaks.length && j < i + 12; j++) {
      const interval = peaks[j].time - peaks[i].time;

      if (interval <= 0) continue;

      let tempo = 60 / interval;

      while (tempo < 70) tempo *= 2;
      while (tempo > 180) tempo /= 2;

      tempo = Math.round(tempo);

      const existingCandidate = candidates.find(
        candidate => Math.abs(candidate.tempo - tempo) <= 1
      );

      if (existingCandidate) {
        existingCandidate.score++;
      } else {
        candidates.push({ tempo, score: 1 });
      }
    }
  }

  return candidates;
}

function normalizeTrack1Bpm(bpm) {
  if (!bpm) return null;

  let normalizedBpm = bpm;

  while (normalizedBpm < 70) normalizedBpm *= 2;
  while (normalizedBpm > 180) normalizedBpm /= 2;

  return Math.round(normalizedBpm);
}

function formatTrack1Bpm(bpm) {
  const bpmNumber = Number(bpm);

  if (Number.isNaN(bpmNumber)) return '--';

  return bpmNumber.toFixed(2);
}

function updateTrack1BpmPosition(bpmText, bpmValue) {
  if (!bpmText) return;

  const bpmNumber = Number(bpmValue);

  if (Number.isNaN(bpmNumber)) return;

  if (bpmNumber < 100) {
    bpmText.style.left = '486px';
  } else {
    bpmText.style.left = '470px';
  }
}