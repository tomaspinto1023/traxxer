//Código para fazer upload da faixa -> tenho que ter um backend primeiro!

window.addEventListener('DOMContentLoaded', () => {
  const testButton = document.getElementById('test-backend-btn');
  const responseText = document.getElementById('backend-response');

  if (testButton) {
    testButton.addEventListener('click', () => {
      window.electronAPI.sendToBackend('ping');
    });
  }

  if (window.electronAPI) {
    window.electronAPI.onBackendMessage((message) => {
      console.log('Resposta do backend:', message);

      if (responseText) {
        responseText.textContent = message;
      }
    });
  }
});