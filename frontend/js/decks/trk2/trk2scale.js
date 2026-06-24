// Lógica de escala da Track 2

function getTrack2ScaleFromTags(tags) {
  if (!tags) return null;

  const possibleKey =
    tags.TKEY ||
    tags.key ||
    tags.KEY ||
    tags['initialkey'] ||
    tags['INITIALKEY'];

  if (!possibleKey) return null;
  return String(possibleKey).trim();
}

async function detectAndShowTrack2Scale(file, scaleText, loadId) {
  if (!scaleText) return;
  scaleText.textContent = '...';

  try {
    const scale = await window.electronAPI.analyzeScaleLocal(file.path);

    if (loadId !== trk2LoadId) return;
    if (!trk2HasLoadedTrack) return;

    scaleText.textContent = scale || '--';
  } catch (error) {
    console.log('Erro ao detetar escala:', error);
    if (loadId !== trk2LoadId) return;
    scaleText.textContent = '--';
  }
}