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
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Usa só os primeiros 30 segundos, com downsampling para velocidade
  const maxSamples = Math.min(channelData.length, sampleRate * 30);
  const hopSize = 512;
  const fftSize = 4096;
  const chroma = new Array(12).fill(0);

  // Janela de Hann pré-calculada
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
  }

  // Processa janelas com hop
  for (let start = 0; start + fftSize < maxSamples; start += hopSize * 8) {
    const windowed = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      windowed[i] = channelData[start + i] * hann[i];
    }

    const spectrum = fft(windowed);

    // Mapeia bins para chroma
    for (let bin = 1; bin < fftSize / 2; bin++) {
      const freq = bin * sampleRate / fftSize;
      if (freq < 27.5 || freq > 2093) continue;

      const magnitude = spectrum[bin];
      if (magnitude < 0.0001) continue;

      const midi = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pitchClass] += magnitude;
    }
  }

  // Normaliza
  const max = Math.max(...chroma);
  if (max > 0) chroma.forEach((_, i) => chroma[i] /= max);

  return krumhanslSchmuckler(chroma);
}

// FFT de Cooley-Tukey iterativa (power-of-2)
function fft(signal) {
  const n = signal.length;
  const real = new Float32Array(signal);
  const imag = new Float32Array(n);

  // Bit-reversal
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
    }
  }

  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wReal = Math.cos(ang);
    const wImag = Math.sin(ang);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let k = 0; k < len / 2; k++) {
        const uReal = real[i + k];
        const uImag = imag[i + k];
        const vReal = real[i + k + len / 2] * curReal - imag[i + k + len / 2] * curImag;
        const vImag = real[i + k + len / 2] * curImag + imag[i + k + len / 2] * curReal;

        real[i + k] = uReal + vReal;
        imag[i + k] = uImag + vImag;
        real[i + k + len / 2] = uReal - vReal;
        imag[i + k + len / 2] = uImag - vImag;

        const nextReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
      }
    }
  }

  // Magnitudes
  const magnitudes = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return magnitudes;
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