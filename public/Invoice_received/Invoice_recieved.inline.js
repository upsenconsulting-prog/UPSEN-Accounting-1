// --- THEME LOGIC (read-only, controlled from settings page) ---
const THEME_STORAGE_KEY = 'factufacil-theme';

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme') || 'light';
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('theme-dark', isDark);
  return isDark;
}

function updateChartColors(isDark) {
  if (typeof Chart === 'undefined') return;

  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E6EAF0';

  Chart.defaults.color = textColor;
  if (Chart.defaults.scale) {
      Chart.defaults.scale.grid.color = gridColor;
  }

  for (let id in Chart.instances) {
    try {
      let chart = Chart.instances[id];
      if (chart.options && chart.options.scales) {
         if (chart.options.scales.x) {
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
         }
         if (chart.options.scales.y) {
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.y.ticks.color = textColor;
         }
      }
      chart.update();
    } catch (e) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const isDark = applySavedTheme();
  setTimeout(() => updateChartColors(isDark), 1000);
});

// --- LOGOUT ---
window.confirmLogout = function() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('upsen_current_user');
    if (window.firebaseAuth) {
      window.firebaseAuth.signOut().catch(e => console.log(e));
    }
    var auth = window.AuthSystem || window.AuthService || window.Auth;
    if (auth && auth.logout) {
      auth.logout().then(() => window.location.href = '../login.html');
    } else {
      window.location.href = '../login.html';
    }
  }
};

