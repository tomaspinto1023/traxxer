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
  if (!bpmText) return;

  bpmText.textContent = '...';

  try {
    const bpm = await detectTrack1BpmFromAudio(file);

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
        candidates.push({
          tempo,
          score: 1
        });
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

//Lógica escalar da track 1
// Lógica de escala da Track 1

function getTrack1ScaleFromTags(tags) {
  if (!tags) return null;

  const possibleKey =
    tags.TKEY ||
    tags.key ||
    tags.KEY ||
    tags['TKEY'] ||
    tags['initialkey'] ||
    tags['INITIALKEY'];

  if (!possibleKey) return null;

  return String(possibleKey).trim();
}

async function detectAndShowTrack1Scale(file, scaleText, loadId) {
  if (!scaleText) return;

  scaleText.textContent = '...';

  try {
    const scale = await detectTrack1ScaleFromAudio(file);

    if (loadId !== trk1LoadId) return;
    if (!trk1HasLoadedTrack) return;

    if (scale) {
      scaleText.textContent = scale;
    } else {
      scaleText.textContent = '--';
    }
  } catch (error) {
    console.log('Erro ao detetar escala:', error);

    if (loadId !== trk1LoadId) return;

    scaleText.textContent = '--';
  }
}

async function detectTrack1ScaleFromAudio(file) {
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const chroma = getTrack1ChromaVector(channelData, sampleRate);
  const key = getTrack1KeyFromChroma(chroma);

  await audioContext.close();

  return key;
}

function getTrack1ChromaVector(channelData, sampleRate) {
  const maxSamples = sampleRate * 30;
  const samples = channelData.slice(0, maxSamples);

  const blockSize = Math.floor(sampleRate * 0.1);
  const chroma = new Array(12).fill(0);

  for (let i = 0; i < samples.length; i += blockSize) {
    const block = samples.slice(i, i + blockSize);
    const fft = getTrack1SimpleFFT(block);

    for (let bin = 1; bin < fft.length; bin++) {
      const frequency = (bin * sampleRate) / (blockSize * 2);

      if (frequency < 60 || frequency > 5000) continue;

      const chromaIndex = getTrack1ChromaIndex(frequency);
      chroma[chromaIndex] += fft[bin];
    }
  }

  const max = Math.max(...chroma);
  if (max > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= max;
  }

  return chroma;
}

function getTrack1SimpleFFT(block) {
  const magnitudes = new Array(Math.floor(block.length / 2)).fill(0);

  for (let bin = 0; bin < magnitudes.length; bin++) {
    let real = 0;
    let imag = 0;

    for (let n = 0; n < block.length; n++) {
      const angle = (2 * Math.PI * bin * n) / block.length;
      real += block[n] * Math.cos(angle);
      imag -= block[n] * Math.sin(angle);
    }

    magnitudes[bin] = Math.sqrt(real * real + imag * imag);
  }

  return magnitudes;
}

function getTrack1ChromaIndex(frequency) {
  const semitones = 12 * Math.log2(frequency / 440) + 69;
  return ((Math.round(semitones) % 12) + 12) % 12;
}

function getTrack1KeyFromChroma(chroma) {
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  let bestScore = -Infinity;
  let bestKey = null;

  for (let root = 0; root < 12; root++) {
    const majorScore = getTrack1ProfileCorrelation(chroma, majorProfile, root);
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = noteNames[root] + ' Major';
    }

    const minorScore = getTrack1ProfileCorrelation(chroma, minorProfile, root);
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = noteNames[root] + ' Minor';
    }
  }

  return bestKey;
}

function getTrack1ProfileCorrelation(chroma, profile, root) {
  let score = 0;

  for (let i = 0; i < 12; i++) {
    score += chroma[i] * profile[(i - root + 12) % 12];
  }

  return score;
}