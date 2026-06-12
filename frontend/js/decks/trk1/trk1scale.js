// Lógica de escala da Track 1

function getTrack1ScaleFromTags(tags) {
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

async function detectAndShowTrack1Scale(file, scaleText, loadId) {
  if (!scaleText) return;
  scaleText.textContent = '...';

  try {
    const scale = await window.electronAPI.analyzeScaleLocal(file.path);

    if (loadId !== trk1LoadId) return;
    if (!trk1HasLoadedTrack) return;

    scaleText.textContent = scale || '--';
  } catch (error) {
    console.log('Erro ao detetar escala:', error);
    if (loadId !== trk1LoadId) return;
    scaleText.textContent = '--';
  }
}