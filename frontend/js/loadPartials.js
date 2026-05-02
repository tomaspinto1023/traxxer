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

  await loadScript('../js/trk1player.js');
  await loadScript('../js/uploadtracks.js');

  document.dispatchEvent(new Event('traxxer:partials-loaded'));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', loadPartials);