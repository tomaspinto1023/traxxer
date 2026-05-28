async function loadPartials() {
  const includes = document.querySelectorAll('[data-include]');

  for (const element of includes) {
    const file = element.getAttribute('data-include');

    try {
      const response = await fetch(file);

      if (!response.ok) {
        throw new Error(`Não foi possível carregar: ${file}`);
      }

      const html = await response.text();
      element.outerHTML = html;

    } catch (error) {
      console.error(error);
    }
  }

  await loadScriptOnce('../js/decks/trk1/trk1state.js');
  await loadScriptOnce('../js/decks/trk1/trk1jogwheel.js');
  await loadScriptOnce('../js/decks/trk1/trk1bpm.js');
  await loadScriptOnce('../js/decks/trk1/trk1time.js');
  await loadScriptOnce('../js/decks/trk1/trk1load.js');
  await loadScriptOnce('../js/decks/trk1/trk1init.js');
  await loadScriptOnce('../js/library/library.js');

  document.dispatchEvent(new Event('traxxer:partials-loaded'));
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const scriptId = `script-${src.replace(/[^a-zA-Z0-9]/g, '-')}`;

    if (document.getElementById(scriptId)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = src;

    script.onload = resolve;

    script.onerror = () => {
      reject(new Error(`Erro ao carregar script: ${src}`));
    };

    document.body.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', loadPartials);