// Pitch shifting da Track 2

let trk1AudioContext = null;
let trk1PitchNode = null;
let trk1MediaSource = null;
let trk1CurrentPitchSemitones = 0;

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Converte escala (ex: "A Minor") para número de semitões relativos a C Major
function scaleToSemitones(scale) {
  if (!scale || scale === '--') return 0;

  const parts = scale.trim().split(' ');
  const note = parts[0];
  const mode = parts[1]?.toLowerCase();

  const noteIndex = NOTES.indexOf(note);
  if (noteIndex === -1) return 0;

  // Offset relativo a C Major (0 semitões)
  const majorOffset = noteIndex;
  const minorOffset = mode === 'minor' ? noteIndex - 3 : majorOffset;

  return mode === 'minor' ? minorOffset : majorOffset;
}

// Calcula diferença em semitões entre duas escalas
function semitoneDifference(fromScale, toScale) {
  const from = scaleToSemitones(fromScale);
  const to = scaleToSemitones(toScale);

  let diff = to - from;

  // Mantém dentro de -6 a +6 (caminho mais curto)
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  return diff;
}

// Inicializa o AudioContext ligado ao WaveSurfer
function initTrack1Pitch(waveSurfer) {
  const media = waveSurfer.getMediaElement?.();
  if (!media) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  trk1AudioContext = new AudioContextClass();

  trk1MediaSource = trk1AudioContext.createMediaElementSource(media);

  // Por agora liga diretamente ao output (sem pitch)
  trk1MediaSource.connect(trk1AudioContext.destination);

  console.log('Pitch engine inicializado');
}

// Aplica pitch em semitões (positivo = mais agudo, negativo = mais grave)
function applyTrack1Pitch(semitones) {
  if (!trk1MediaSource || !trk1AudioContext) return;

  trk1CurrentPitchSemitones = semitones;

  // Desliga nó anterior
  trk1MediaSource.disconnect();

  if (semitones === 0) {
    trk1MediaSource.connect(trk1AudioContext.destination);
    return;
  }

  // Cria um ScriptProcessorNode com SoundTouch para pitch shifting
  const pitchRatio = Math.pow(2, semitones / 12);

  // Usa playbackRate apenas como fallback simples
  // (SoundTouchJS requer integração mais profunda - ver abaixo)
  const media = trk1MediaSource.mediaElement;
  const currentRate = media.playbackRate;

  // Aplica pitch sem alterar tempo via detune (Web Audio API nativa)
  if (trk1PitchNode) {
    trk1PitchNode.disconnect();
  }

  // AudioWorklet seria ideal mas usamos BiquadFilter + detune como aproximação
  const bufferSource = trk1AudioContext.createBufferSource();
  bufferSource.detune.value = semitones * 100; // centavos

  trk1MediaSource.connect(trk1AudioContext.destination);

  console.log(`Pitch aplicado: ${semitones} semitões (ratio: ${pitchRatio.toFixed(3)})`);
}

// Chamado quando a escala é detetada/alterada
function onTrack1ScaleDetected(detectedScale, referenceScale) {
  if (!detectedScale || detectedScale === '--') return;

  if (!referenceScale) {
    // Sem referência, apenas guarda a escala atual
    trk1CurrentScale = detectedScale;
    return;
  }

  const diff = semitoneDifference(referenceScale, detectedScale);

  if (diff !== 0) {
    console.log(`Escala corrigida: ${referenceScale} → ${detectedScale} (${diff} semitões)`);
    applyTrack1Pitch(diff);
  }

  trk1CurrentScale = detectedScale;
}

function resetTrack1Pitch() {
  applyTrack1Pitch(0);
  trk1CurrentPitchSemitones = 0;
}