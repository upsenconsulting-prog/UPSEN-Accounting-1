var currentUser = null;
var THEME_STORAGE_KEY = 'factufacil-theme';

function getEl(id) { return document.getElementById(id); }

function getSavedTheme() {
  var savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!savedTheme) {
    // Backward compatibility for old key.
    var legacyTheme = localStorage.getItem('theme');
    if (legacyTheme === 'dark' || legacyTheme === 'light') {
      savedTheme = legacyTheme;
      localStorage.setItem(THEME_STORAGE_KEY, legacyTheme);
    }
  }

  return savedTheme === 'dark' ? 'dark' : 'light';
}

function showAlert(message, type) {
  var el = getEl('alertMessage');
  if (el) {
    el.textContent = message;
    el.className = 'alert alert-' + (type || 'info');
    el.style.display = 'flex';
    setTimeout(function() { el.style.display = 'none'; }, 5000);
  }
}
function getUser() {
  // First check AuthSystem
  var auth = window.AuthSystem || window.AuthService || window.Auth;
  if (auth && typeof auth.getCurrentUser === 'function') {
    var user = auth.getCurrentUser();
    if (user) return user;
  }
  
  // Then check Firebase Auth directly
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser;
  }
  
  // Finally check localStorage
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) return data.user;
    }
  } catch (e) {}
  
  return null;
}
function getUserId() {
  var user = getUser();
  return user ? (user.uid || user.id) : null;
}
function loadSettings() {
  var user = getUser();
  if (!user) {
    console.log('loadSettings: Utilizador não encontrado');
    showAlert('Inicia sesión primero.', 'error');
    return;
  }
  
  console.log('loadSettings: Utilizador encontrado:', user.email);
  currentUser = user;
  var nameEl = getEl('userNameSidebar');
  var emailEl = getEl('userEmailSidebar');
  if (nameEl) nameEl.textContent = user.name || user.email || 'Usuario';
  if (emailEl) emailEl.textContent = user.email || '-';
  var companyData = user.companyData || {};
  if (getEl('companyName')) getEl('companyName').value = companyData.name || user.company || '';
  if (getEl('companyTaxId')) getEl('companyTaxId').value = companyData.taxId || '';
  if (getEl('companyAddress')) getEl('companyAddress').value = companyData.address || '';
  if (getEl('companyCity')) getEl('companyCity').value = companyData.city || '';
  if (getEl('companyCountry')) getEl('companyCountry').value = companyData.country || 'Portugal';
  if (getEl('companyWebsite')) getEl('companyWebsite').value = companyData.website || '';
  var settings = user.settings || {};
  if (getEl('settingCurrency')) getEl('settingCurrency').value = settings.currency || 'EUR';
  if (getEl('settingLanguage')) getEl('settingLanguage').value = settings.language || 'es';
  var selectedTheme = settings.theme || getSavedTheme() || 'light';
  if (getEl('settingTheme')) getEl('settingTheme').value = selectedTheme;
  applyTheme(selectedTheme);
  localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
  var notifications = settings.notifications || {};
  if (getEl('notifyEmail')) getEl('notifyEmail').checked = notifications.email !== false;
  if (getEl('notifyBrowser')) getEl('notifyBrowser').checked = notifications.browser || false;

  var billingSettings = settings.billingSummaryCard || {};
  if (getEl('billingShowPlan')) getEl('billingShowPlan').checked = billingSettings.showPlan !== false;
  if (getEl('billingShowMonthUsage')) getEl('billingShowMonthUsage').checked = billingSettings.showMonthUsage !== false;
  if (getEl('billingShowPending')) getEl('billingShowPending').checked = billingSettings.showPending !== false;
  if (getEl('billingShowUpgradeWarning')) getEl('billingShowUpgradeWarning').checked = billingSettings.showUpgradeWarning !== false;

  // Load logo preview
  loadLogoPreview();
}
function saveCompanySettings() {
  var userId = getUserId();
  if (!userId) { showAlert('Error: No hay usuario.', 'error'); return; }
  
  var saveBtn = document.querySelector('.modern-card:first-child .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }
  
  var companyData = {
    name: getEl('companyName')?.value || '',
    taxId: getEl('companyTaxId')?.value || '',
    address: getEl('companyAddress')?.value || '',
    city: getEl('companyCity')?.value || '',
    country: getEl('companyCountry')?.value || '',
    website: getEl('companyWebsite')?.value || ''
  };
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        data.user.companyData = companyData;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  AuthSystem.updateUserProfile({ companyData: companyData }).then(function(result) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Empresa'; }
    showAlert(result.message || 'Datos guardados!', 'success');
  });
}

function savePreferences() {
  var userId = getUserId();
  if (!userId) { showAlert('Error: No hay usuario.', 'error'); return; }
  
  var saveBtn = document.querySelector('.modern-card:nth-child(2) .btn-success');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }
  
  var settings = {
    currency: getEl('settingCurrency')?.value || 'EUR',
    language: getEl('settingLanguage')?.value || 'es',
    theme: getEl('settingTheme')?.value || 'light',
    billingSummaryCard: {
      showPlan: getEl('billingShowPlan')?.checked !== false,
      showMonthUsage: getEl('billingShowMonthUsage')?.checked !== false,
      showPending: getEl('billingShowPending')?.checked !== false,
      showUpgradeWarning: getEl('billingShowUpgradeWarning')?.checked !== false
    }
  };

  localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        settings = Object.assign({}, data.user.settings || {}, settings);
        data.user.settings = settings;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  AuthSystem.updateUserProfile({ settings: settings }).then(function(result) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Guardar Preferencias'; }
    showAlert(result.message || 'Preferencias guardadas!', 'success');
    // Apply theme
    if (window.applyTheme) applyTheme(settings.theme);
  });
}

function saveNotifications() {
  var userId = getUserId();
  if (!userId) { showAlert('Error: No hay usuario.', 'error'); return; }
  
  var saveBtn = document.querySelector('.modern-card:nth-child(3) .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }
  
  var notifications = {
    email: getEl('notifyEmail')?.checked !== false,
    browser: getEl('notifyBrowser')?.checked || false
  };
  
  var settings = { notifications: notifications };
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        data.user.settings = Object.assign({}, data.user.settings || {}, settings);
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  AuthSystem.updateUserProfile({ settings: settings }).then(function(result) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-bell me-2"></i>Guardar perfil'; }
    showAlert(result.message || 'Notificaciones guardadas!', 'success');
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.remove('theme-dark');
  }
}

// LOGO FUNCTIONS
var logoFileData = null;

function loadLogoPreview() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user && data.user.companyData && data.user.companyData.logo) {
        var preview = getEl('logoPreview');
        var deleteBtn = getEl('deleteLogoBtn');
        if (preview) {
          preview.innerHTML = '<img src="' + data.user.companyData.logo + '" alt="Logo">';
          preview.classList.remove('empty');
        }
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
      }
    }
  } catch (e) { console.log('Error loading logo preview:', e); }
}

getEl('logoUpload')?.addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Logo muy grande. Máximo 5MB.', 'error');
    return;
  }
  
  var reader = new FileReader();
  reader.onload = function(e) {
    logoFileData = e.target.result;
    var preview = getEl('logoPreview');
    if (preview) {
      preview.innerHTML = '<img src="' + logoFileData + '" alt="Logo">';
      preview.classList.remove('empty');
    }
    showAlert('Logo cargado! Clica "Guardar Logo" para confirmar.', 'success');
  };
  reader.readAsDataURL(file);
});

function saveLogo() {
  if (!logoFileData) {
    showAlert('Selecciona un logo primero.', 'error');
    return;
  }
  
  var userId = getUserId();
  if (!userId) { showAlert('Error: No hay usuario.', 'error'); return; }
  
  var saveBtn = getEl('saveLogo');
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        if (!data.user.companyData) data.user.companyData = {};
        data.user.companyData.logo = logoFileData;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  AuthSystem.updateUserProfile({ 
    companyData: { logo: logoFileData } 
  }).then(function(result) {
    showAlert('Logo guardado!', 'success');
    logoFileData = null;
    var deleteBtn = getEl('deleteLogoBtn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
  });
}

function deleteLogo() {
  if (!confirm('¿Eliminar el logo?')) return;
  
  var userId = getUserId();
  if (!userId) { showAlert('Error: No hay usuario.', 'error'); return; }
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user && data.user.companyData) {
        delete data.user.companyData.logo;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  AuthSystem.updateUserProfile({ 
    companyData: { logo: null } 
  }).then(function(result) {
    showAlert('Logo eliminado!', 'success');
    logoFileData = null;
    var preview = getEl('logoPreview');
    if (preview) {
      preview.innerHTML = '<i class="fas fa-image me-2"></i>Sin logo';
      preview.classList.add('empty');
    }
    var deleteBtn = getEl('deleteLogoBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';
  });
}
// Logout function with Firebase sign out
function doLogout() {
  if (confirm('Cerrar sesion?')) {
    // 1. Limpar localStorage primeiro
    localStorage.removeItem('upsen_current_user');
    
    // 2. Try to sign out from Firebase
    if (window.firebaseAuth) {
      window.firebaseAuth.signOut().then(function() {
        console.log('Firebase signed out');
      }).catch(function(e) {
        console.log('Firebase sign out error:', e);
      });
    }
    
    // 3. Try AuthSystem logout
    var auth = window.AuthSystem || window.AuthService || window.Auth;
    if (auth && auth.logout) {
      auth.logout().then(function() { window.location.href = '../login.html'; });
    } else { window.location.href = '../login.html'; }
  }
}
document.addEventListener('DOMContentLoaded', function() {
  applyTheme(getSavedTheme());

  // Wait for auth to be ready with proper timing
  var checkAuth = function() {
    var auth = window.AuthSystem || window.AuthService || window.Auth;
    
    // Check if Firebase is configured and ready
    if (window.firebaseAuth) {
      // Use a small delay to ensure Firebase is fully initialized
      setTimeout(function() {
        // Check if there's a current user in Firebase
        var firebaseUser = window.firebaseAuth.currentUser;
        if (firebaseUser) {
          console.log('Firebase Auth user detected:', firebaseUser.email);
          // Also check if session is saved in localStorage
          var session = localStorage.getItem('upsen_current_user');
          if (session) {
            try {
              var data = JSON.parse(session);
              if (data && data.user) {
                console.log('User from localStorage:', data.user.email);
                loadSettings();
                return;
              }
            } catch (e) {}
          }
          // If no localStorage but Firebase user exists, load settings anyway
          loadSettings();
        } else {
          // No Firebase user, check localStorage
          var session = localStorage.getItem('upsen_current_user');
          if (session) {
            try {
              var data = JSON.parse(session);
              if (data && data.user) {
                console.log('User from localStorage:', data.user.email);
                loadSettings();
                return;
              }
            } catch (e) {}
          }
          // Still no user - show alert
          console.log('No user found');
          loadSettings(); // This will show the alert
        }
      }, 500); // Wait 500ms for Firebase to initialize
    } else if (auth && typeof auth.getCurrentUser === 'function') {
      setTimeout(function() { loadSettings(); }, 500);
    } else {
      setTimeout(checkAuth, 100);
    }
  };
  
  // Start checking after a short delay to allow scripts to load
  setTimeout(checkAuth, 500);
});

