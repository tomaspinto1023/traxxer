// Estado global da Trk 1

let trk1WaveSurfer = null;
let trk1CurrentObjectUrl = null;
let trk1CuePoint = 0;
let trk1HasLoadedTrack = false;
let trk1IsScratchingJog = false;

// Áudio da própria faixa carregada, usado para o som do scratch da jog wheel
let trk1TrackAudioBuffer = null;

let trk1JogVisualRotation = 0;
let trk1JogAnimationFrame = null;
let trk1LoadId = 0;

const TRK1_SCRATCH_SECONDS_PER_DEGREE = 0.0037;
const TRK1_JOG_SENSITIVITY_PLAYING = 0.010;
const TRK1_JOG_SENSITIVITY_PAUSED = 0.006;
const TRK1_MAX_JOG_RATE_OFFSET = 0.22;

let trk1JogData = {
  isActive: false,
  mode: null, // 'scratch' | 'jog'
  pointerId: null,
  lastAngle: 0,
  lastMoveTime: 0,
  wasPlayingBeforeScratch: false,
  scratchResumeTimeout: null,
  jogResetTimeout: null
};