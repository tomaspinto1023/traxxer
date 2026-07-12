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
    const filePath = window.electronAPI.getPathForFile(file);
    const scale = await window.electronAPI.analyzeScaleLocal(filePath);

    if (loadId !== trk1LoadId) return;
    if (!trk1HasLoadedTrack) return;

    scaleText.textContent = scale || '--';
  } catch (error) {
    console.log('Erro ao detetar escala:', error);
    if (loadId !== trk1LoadId) return;
    scaleText.textContent = '--';
  }
}