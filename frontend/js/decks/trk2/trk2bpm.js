// Lógica de BPM da Track 2

function getTrack2BpmFromTags(tags) {
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

async function detectAndShowTrack2Bpm(file, bpmText, loadId) {
  if (!bpmText) return;

  bpmText.textContent = '...';

  try {
    const bpm = await detectTrack2BpmFromAudio(file);

    if (loadId !== trk2LoadId) return;
    if (!trk2HasLoadedTrack) return;

    if (bpm) {
      bpmText.textContent = formatTrack2Bpm(bpm);
      updateTrack2BpmPosition(bpmText, bpm);
    } else {
      bpmText.textContent = '--';
      bpmText.style.right = '540px';
    }
  } catch (error) {
    console.log('Erro ao detetar BPM:', error);

    if (loadId !== trk2LoadId) return;

    bpmText.textContent = '--';
    bpmText.style.right = '540px';
  }
}

async function detectTrack2BpmFromAudio(file) {
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const peaks = getTrack2EnergyPeaks(channelData, sampleRate);
  const tempoCandidates = getTrack2TempoCandidates(peaks);

  await audioContext.close();

  if (!tempoCandidates.length) return null;

  tempoCandidates.sort((a, b) => b.score - a.score);

  return normalizeTrack2Bpm(tempoCandidates[0].tempo);
}

function getTrack2EnergyPeaks(channelData, sampleRate) {
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

function getTrack2TempoCandidates(peaks) {
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

function normalizeTrack2Bpm(bpm) {
  if (!bpm) return null;

  let normalizedBpm = bpm;

  while (normalizedBpm < 70) normalizedBpm *= 2;
  while (normalizedBpm > 180) normalizedBpm /= 2;

  return Math.round(normalizedBpm);
}

function formatTrack2Bpm(bpm) {
  const bpmNumber = Number(bpm);

  if (Number.isNaN(bpmNumber)) return '--';

  return bpmNumber.toFixed(2);
}

function updateTrack2BpmPosition(bpmText, bpmValue) {
  if (!bpmText) return;

  const bpmNumber = Number(bpmValue);

  if (Number.isNaN(bpmNumber)) return;

  if (bpmNumber < 100) {
    bpmText.style.right = '556px';
  } else {
    bpmText.style.right = '540px';
  }
}