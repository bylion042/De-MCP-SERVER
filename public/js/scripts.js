// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Add to Home Screen prompt
let deferredPrompt;
const installBtns = document.querySelectorAll('.installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show all install buttons
  installBtns.forEach((btn) => {
    btn.style.display = 'inline-block';

    btn.addEventListener('click', () => {
      btn.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        console.log(`User response to the install prompt: ${choiceResult.outcome}`);
        deferredPrompt = null;
      });
    });
  });
});

