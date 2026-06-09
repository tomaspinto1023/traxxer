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

    scaleText.textContent = scale || '--';
  } catch (error) {
    console.log('Erro ao detetar escala:', error);
    if (loadId !== trk1LoadId) return;
    scaleText.textContent = '--';
  }
}

async function detectTrack1ScaleFromAudio(file) {
  const arrayBuffer = await file.arrayBuffer();

  const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close();

  const sampleRate = audioBuffer.sampleRate;
  const duration = Math.min(audioBuffer.duration, 60);
  const totalSamples = Math.floor(duration * sampleRate);

  // OfflineAudioContext para processar sem bloquear
  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // AnalyserNode para obter FFT
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 32768;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);

  source.start(0);

  const chroma = new Array(12).fill(0);
  const freqBinCount = analyser.frequencyBinCount;
  const freqData = new Float32Array(freqBinCount);

  // Processa em janelas de 2 segundos
  const windowDuration = 2;
  let currentTime = 0;

  offlineCtx.suspend(windowDuration).then(async function process() {
    analyser.getFloatFrequencyData(freqData);

    const nyquist = sampleRate / 2;
    for (let bin = 0; bin < freqBinCount; bin++) {
      const freq = bin * nyquist / freqBinCount;
      if (freq < 27.5 || freq > 2093) continue;

      const magnitude = Math.pow(10, freqData[bin] / 20);
      const midi = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pitchClass] += magnitude * magnitude;
    }

    currentTime += windowDuration;
    if (currentTime < duration) {
      offlineCtx.resume().then(() => {
        offlineCtx.suspend(currentTime + windowDuration).then(process);
      });
    } else {
      offlineCtx.resume();
    }
  });

  await offlineCtx.startRendering();

  const max = Math.max(...chroma);
  if (max > 0) chroma.forEach((_, i) => chroma[i] /= max);

  return krumhanslSchmuckler(chroma);
}

function krumhanslSchmuckler(chroma) {
  const majorProfile = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
  const minorProfile = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  let bestScore = -Infinity;
  let bestKey = 'C';
  let bestMode = 'Major';

  for (let i = 0; i < 12; i++) {
    const scoreMajor = pearsonCorrelation(chroma, rotate(majorProfile, i));
    const scoreMinor = pearsonCorrelation(chroma, rotate(minorProfile, i));

    if (scoreMajor > bestScore) { bestScore = scoreMajor; bestKey = noteNames[i]; bestMode = 'Major'; }
    if (scoreMinor > bestScore) { bestScore = scoreMinor; bestKey = noteNames[i]; bestMode = 'Minor'; }
  }

  return `${bestKey} ${bestMode}`;
}

function computeChroma(samples, sampleRate) {
  const chroma = new Array(12).fill(0);
  const blockSize = 4096;
  const A4 = 440;

  for (let start = 0; start < samples.length - blockSize; start += blockSize) {
    const block = samples.slice(start, start + blockSize);

    // FFT simples via energia por bin de frequência
    for (let k = 1; k < blockSize / 2; k++) {
      const freq = k * sampleRate / blockSize;
      if (freq < 27.5 || freq > 4186) continue; // A0 a C8

      // Energia do bin (magnitude ao quadrado simplificado)
      let real = 0, imag = 0;
      for (let n = 0; n < blockSize; n++) {
        const angle = 2 * Math.PI * k * n / blockSize;
        real += block[n] * Math.cos(angle);
        imag -= block[n] * Math.sin(angle);
      }
      const energy = real * real + imag * imag;

      // Mapeia frequência para classe de pitch (0-11)
      const midi = 12 * Math.log2(freq / A4) + 69;
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pitchClass] += energy;
    }
  }

  // Normaliza
  const max = Math.max(...chroma);
  return max > 0 ? chroma.map(v => v / max) : chroma;
}

function rotate(arr, n) {
  return [...arr.slice(n), ...arr.slice(0, n)];
}

function pearsonCorrelation(a, b) {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return num / Math.sqrt(denomA * denomB);
}