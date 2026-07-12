// Lógica da titlebar personalizada: tamanho da janela, minimizar/fechar, relógio,
// e a escala responsiva do conteúdo (waveforms + decks + middle-deck + biblioteca).

// Escala o conteúdo (desenhado para 1443x810 — tem de bater certo com
// #app-scale-wrapper em window.css) para preencher a janela atual por completo,
// seja qual for o tamanho (small/medium/large), em vez de deixar elementos
// sobrepostos ou espaço vazio.
const APP_DESIGN_WIDTH = 1443;
const APP_DESIGN_HEIGHT = 810;

function updateAppScale() {
  const wrapper = document.getElementById('app-scale-wrapper');
  if (!wrapper) return;

  // innerHeight completo: os 32-34px da titlebar já estão reservados nas
  // próprias coordenadas dos elementos do design (ex: top:34px), não é
  // preciso (nem correto) descontá-los aqui outra vez.
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;

  // Escala X e Y em separado (não um único fator) — é isto que garante que
  // o conteúdo preenche a janela por completo em qualquer proporção, em vez
  // de sobrar espaço vazio numa das direções ("letterboxing").
  const scaleX = availableWidth / APP_DESIGN_WIDTH;
  const scaleY = availableHeight / APP_DESIGN_HEIGHT;

  // Um transform ativo (mesmo com fator 1) é o que faz o wrapper servir de
  // referência (0,0) fixa para os filhos position:fixed lá dentro (ex:
  // #library, que usa width:100% relativo ao wrapper, não à janela real).
  wrapper.style.transform = `scale(${scaleX}, ${scaleY})`;
}

window.addEventListener('resize', updateAppScale);

// Lógica JavaScript da janela personalizada
document.addEventListener('traxxer:partials-loaded', () => {

  updateAppScale();

  if (window.electronAPI?.onLayoutChange) {
    window.electronAPI.onLayoutChange(() => updateAppScale());
  }

  const sizeOrder = ['medium', 'large', 'small'];
  const sizeIcons = { small: '⊡', medium: '⊟', large: '⊞' };

  window.electronAPI.getWindowSize().then(size => {
    currentSize = size;
    document.getElementById('btn-cycle-size').textContent = sizeIcons[size];
  });

  let currentSize = 'medium';
  document.getElementById('btn-cycle-size').addEventListener('click', () => {
    const nextIndex = (sizeOrder.indexOf(currentSize) + 1) % sizeOrder.length;
    currentSize = sizeOrder[nextIndex];
    window.electronAPI.setWindowSize(currentSize);
    document.getElementById('btn-cycle-size').textContent = sizeIcons[currentSize];
  });

  // Tamanho da janela
  window.electronAPI.getWindowSize().then(size => {
    document.querySelector(`[data-size="${size}"]`)?.classList.add('active');
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.size;
      window.electronAPI.setWindowSize(size);
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Minimizar / Fechar
  document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.minimizeWindow());
  document.getElementById('btn-close').addEventListener('click',    () => window.electronAPI.closeWindow());

  // Relógio
  function updateClock() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const el = document.getElementById('tb-clock');
    if (el) el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

});
