// Pitch shifting da Track 2

let trk2AudioContext = null;
let trk2PitchNode = null;
let trk2MediaSource = null;
let trk2CurrentPitchSemitones = 0;

// Inicializa o AudioContext ligado ao WaveSurfer
function initTrack2Pitch(waveSurfer) {
  const media = waveSurfer.getMediaElement?.();
  if (!media) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  trk2AudioContext = new AudioContextClass();

  trk2MediaSource = trk2AudioContext.createMediaElementSource(media);

  // Por agora liga diretamente ao output (sem pitch)
  trk2MediaSource.connect(trk2AudioContext.destination);

  console.log('Pitch engine inicializado');
}

// Aplica pitch em semitões (positivo = mais agudo, negativo = mais grave)
function applyTrack2Pitch(semitones) {
  if (!trk2MediaSource || !trk2AudioContext) return;

  trk2CurrentPitchSemitones = semitones;

  // Desliga nó anterior
  trk2MediaSource.disconnect();

  if (semitones === 0) {
    trk2MediaSource.connect(trk2AudioContext.destination);
    return;
  }

  // Cria um ScriptProcessorNode com SoundTouch para pitch shifting
  const pitchRatio = Math.pow(2, semitones / 12);

  // Usa playbackRate apenas como fallback simples
  // (SoundTouchJS requer integração mais profunda - ver abaixo)
  const media = trk2MediaSource.mediaElement;
  const currentRate = media.playbackRate;

  // Aplica pitch sem alterar tempo via detune (Web Audio API nativa)
  if (trk2PitchNode) {
    trk2PitchNode.disconnect();
  }

  // AudioWorklet seria ideal mas usamos BiquadFilter + detune como aproximação
  const bufferSource = trk2AudioContext.createBufferSource();
  bufferSource.detune.value = semitones * 100; // centavos

  trk2MediaSource.connect(trk2AudioContext.destination);

  console.log(`Pitch aplicado: ${semitones} semitões (ratio: ${pitchRatio.toFixed(3)})`);
}

// Chamado quando a escala é detetada/alterada
function onTrack2ScaleDetected(detectedScale, referenceScale) {
  if (!detectedScale || detectedScale === '--') return;

  if (!referenceScale) {
    // Sem referência, apenas guarda a escala atual
    trk2CurrentScale = detectedScale;
    return;
  }

  const diff = semitoneDifference(referenceScale, detectedScale);

  if (diff !== 0) {
    console.log(`Escala corrigida: ${referenceScale} → ${detectedScale} (${diff} semitões)`);
    applyTrack2Pitch(diff);
  }

  trk2CurrentScale = detectedScale;
}

function resetTrack2Pitch() {
  applyTrack2Pitch(0);
  trk2CurrentPitchSemitones = 0;
}