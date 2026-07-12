// Estado global da Trk 2

let trk2WaveSurfer = null;
let trk2CurrentObjectUrl = null;
let trk2CuePoint = 0;
let trk2HasLoadedTrack = false;
let trk2IsScratchingJog = false;

// Áudio da própria faixa carregada, usado para o som do scratch da jog wheel
let trk2TrackAudioBuffer = null;

let trk2JogVisualRotation = 0;
let trk2JogAnimationFrame = null;
let trk2LoadId = 0;

const TRK2_SCRATCH_SECONDS_PER_DEGREE = 0.0037; // 45 RPM (1.33s/volta) — igual à trk1
const TRK2_JOG_SENSITIVITY_PLAYING = 0.010;
const TRK2_JOG_SENSITIVITY_PAUSED = 0.006;
const TRK2_MAX_JOG_RATE_OFFSET = 0.22;

let trk2JogData = {
  isActive: false,
  mode: null, // 'scratch' | 'jog'
  pointerId: null,
  lastAngle: 0,
  lastMoveTime: 0,
  wasPlayingBeforeScratch: false,
  scratchResumeTimeout: null,
  jogResetTimeout: null
};