const THEME_STORAGE_KEY = 'factufacil-theme';

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme') || 'light';
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('theme-dark', isDark);
}

document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
});

