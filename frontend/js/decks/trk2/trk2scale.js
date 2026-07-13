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

// Converte a escala para o formato curto de 2 caracteres exibido na UI:
// nota + "m" (menor) ou nota + "M" (maior). Ex.: "D Minor" -> "Dm", "D Major" -> "DM"
function formatTrack2ScaleShort(raw) {
  if (!raw) return raw;
  const str = String(raw).trim();
  if (!str || str === '--' || str === '...') return str;

  // Formato devolvido pelo TraxxerKeyAnalyzer: "D Minor" / "D# Major"
  const fullMatch = str.match(/^([A-Ga-g])([#b]?)\s+(major|minor)$/i);
  if (fullMatch) {
    const note = fullMatch[1].toUpperCase() + (fullMatch[2] || '');
    const isMinor = fullMatch[3].toLowerCase() === 'minor';
    return note + (isMinor ? 'm' : 'M');
  }

  // Formato já abreviado vindo de tags ID3 (ex.: "Dm", "D#", "A")
  const shortMatch = str.match(/^([A-Ga-g])([#b]?)(m)?$/);
  if (shortMatch) {
    const note = shortMatch[1].toUpperCase() + (shortMatch[2] || '');
    const isMinor = shortMatch[3] === 'm';
    return note + (isMinor ? 'm' : 'M');
  }

  // Formato desconhecido (ex.: notação Camelot) — mostra tal como veio
  return str;
}

async function detectAndShowTrack2Scale(file, scaleText, loadId) {
  if (!scaleText) return;
  scaleText.textContent = '...';

  try {
    const filePath = file.traxxerRealPath || window.electronAPI.getPathForFile(file);
    const scale = await window.electronAPI.analyzeScaleLocal(filePath);

    if (loadId !== trk2LoadId) return;
    if (!trk2HasLoadedTrack) return;

    scaleText.textContent = formatTrack2ScaleShort(scale) || '--';
  } catch (error) {
    console.log('Erro ao detetar escala:', error);
    if (loadId !== trk2LoadId) return;
    scaleText.textContent = '--';
  }
}