const THEME_STORAGE_KEY = 'factufacil-theme';

function applySavedTheme() {
  var savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!savedTheme) {
    // Backward compatibility for old key.
    var legacyTheme = localStorage.getItem('theme');
    if (legacyTheme === 'dark' || legacyTheme === 'light') {
      savedTheme = legacyTheme;
      localStorage.setItem(THEME_STORAGE_KEY, legacyTheme);
    } else {
      savedTheme = 'light';
    }
  }

  if (savedTheme === 'dark') {
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.remove('theme-dark');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTopStatusMessage();
  applySavedTheme();
});

function getTopStatusStorageKey() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      var user = data && data.user;
      var userId = user && (user.uid || user.id || user.email);
      if (userId) {
        return 'upsen_top_status_closed_' + userId;
      }
    }
  } catch (e) {}

  return 'upsen_top_status_closed';
}

function initTopStatusMessage() {
  var statusMessage = document.getElementById('topStatusMessage');
  var closeButton = document.getElementById('closeTopStatusMessage');
  if (!statusMessage || !closeButton) return;

  var storageKey = getTopStatusStorageKey();
  if (localStorage.getItem(storageKey) === '1') {
    statusMessage.classList.add('hidden');
    return;
  }

  closeButton.addEventListener('click', function () {
    statusMessage.classList.add('hidden');
    localStorage.setItem(storageKey, '1');
  });
}

// Rest of original script...
// --- FUNC?II ORIGINALE ---
function loadUserInfo() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        var nameEl = document.getElementById('userNameSidebar');
        var emailEl = document.getElementById('userEmailSidebar');
        if (nameEl) nameEl.textContent = data.user.name || data.user.email || 'Usuario';
        if (emailEl) emailEl.textContent = data.user.email || '-';
      }
    }
  } catch (e) {}
}

window.confirmLogout = function() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('upsen_current_user');
    if (window.firebaseAuth) {
      window.firebaseAuth.signOut().catch(e => console.log(e));
    }
    var auth = window.AuthService || window.Auth;
    if (auth && auth.logout) {
      auth.logout().then(() => window.location.href = '../login.html');
    } else {
      window.location.href = '../login.html';
    }
  }
};

