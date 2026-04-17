// CSS per animazione skeleton (da aggiungere al tuo CSS globale)
const skeletonAnimation = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Inietta CSS globalmente (opzionale, se non hai già l'animazione)
if (typeof document !== 'undefined' && !document.getElementById('lazy-image-styles')) {
  const style = document.createElement('style');
  style.id = 'lazy-image-styles';
  style.textContent = skeletonAnimation;
  document.head.appendChild(style);
}
