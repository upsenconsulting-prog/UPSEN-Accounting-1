/**
 * Lógica de UI local (tema read-only e logout)
 */
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

function confirmLogout() {
  if (confirm('Cerrar sesion?')) {
    localStorage.removeItem('upsen_current_user');
    window.location.href = '../login.html';
  }
}

// Open modal for viewing budgets
if (document.getElementById('viewBudgetsBtn')) {
  document.getElementById('viewBudgetsBtn').addEventListener('click', () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('budgetsModal')).show();
  });
}

