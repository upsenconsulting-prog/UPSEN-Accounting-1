// --- THEME LOGIC (read-only, controlled from settings page) ---
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

var editModal = null;
var passwordModal = null;
var personalLogoFileData = null;

function hideLoading() { var o = document.getElementById('loadingOverlay'); if (o) o.style.display = 'none'; }
function getUserId() { try { var s = localStorage.getItem('upsen_current_user'); if (s) { var d = JSON.parse(s); if (d && d.user) return d.user.uid || d.user.id || 'demo'; } } catch (e) {} return 'demo'; }
function getUserData(k) { try { var d = localStorage.getItem(k); if (d) return JSON.parse(d); } catch (e) {} return []; }
function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
function formatDate(ds) {
  if (!ds) return '-';
  // Handle Firestore timestamp
  if (ds && ds.toDate && typeof ds.toDate === 'function') {
    ds = ds.toDate();
  }
  var d = new Date(ds);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// Personal Logo Functions
function loadPersonalLogo() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (!session) return;
    
    var data = JSON.parse(session);
    var logo = data && data.user && data.user.personalData && data.user.personalData.logo;
    
    if (!logo) return;
    
    var avatarImg = document.getElementById('avatarImage');
    var avatarInitials = document.getElementById('avatarInitials');
    if (avatarImg) {
      avatarImg.src = logo;
      avatarImg.style.display = 'block';
      if (avatarInitials) avatarInitials.style.display = 'none';
    }
  } catch (e) { console.log('Error loading personal logo:', e); }
}

document.addEventListener('DOMContentLoaded', function() {
  editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));

  document.querySelectorAll('.stat-card[role="button"]').forEach(function(card) {
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  function checkAuth() {
    // Check Firebase Auth directly first
    var firebaseUser = null;
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      firebaseUser = window.firebaseAuth.currentUser;
      console.log('Firebase Auth user found:', firebaseUser.email);
    }

    // Check localStorage session
    var hasLocalSession = false;
    try {
      var s = localStorage.getItem('upsen_current_user');
      if (s) {
        var d = JSON.parse(s);
        if (d && d.user) {
          hasLocalSession = true;
          console.log('Local session found:', d.user.email);
        }
      }
    } catch (e) {}

    // If we have Firebase user or local session, load profile
    if (firebaseUser || hasLocalSession) {
      if (window.AuthSystem && window.AuthSystem.isLoggedIn && window.AuthSystem.isLoggedIn()) {
        loadProfile();
      } else if (hasLocalSession) {
        var s = localStorage.getItem('upsen_current_user');
        if (s) {
          try {
            var d = JSON.parse(s);
            if (d && d.user) {
              loadProfileFromLocal(d.user);
            }
          } catch (e) {}
        }
      }
      hideLoading();
      return;
    }

    // Wait for Auth
    if (window.AuthSystem && window.AuthSystem.isLoggedIn && window.AuthSystem.isLoggedIn()) {
      loadProfile();
      hideLoading();
    }
    else {
      setTimeout(checkAuth, 100);
    }
  }

  setTimeout(checkAuth, 500);
});
function loadProfileFromLocal(user) {
  var initials = (user.name || user.email || 'U').substring(0,2).toUpperCase();
  
  // Set initials first
  var avatarInitials = document.getElementById('avatarInitials');
  if (avatarInitials) avatarInitials.textContent = initials;
  
  setText('userName', user.name || 'Usuario');
  setText('userEmail', user.email || '-');
  setText('userRole', user.role === 'admin' ? 'Administrador' : 'Usuario');
  setText('displayCompanyName', user.company || '-');
  setText('displayPhone', user.phone || '-');
  setText('displayEmail', user.email || '-');
  setText('displayRole', user.role === 'admin' ? 'Administrador' : 'Usuario');
  var curr = {'EUR':'Euro (EUR)','USD':'Dolar (USD)','GBP':'Libra (GBP)','BRL':'Real (BRL)'};
  var lang = {'es':'Español','pt':'Português','en':'English'};
  var them = {'light':'Claro','dark':'Oscuro'};
  var s = user.settings || {};
  setText('displayCurrency', curr[s.currency] || 'Euro (EUR)');
  setText('displayLanguage', lang[s.language] || 'Español');
  setText('displayTheme', them[s.theme] || 'Claro');
  setText('displayCreatedAt', formatDate(user.createdAt));
  setText('displayLastLogin', user.lastLogin ? formatDate(user.lastLogin) : 'Primera sesion');
  loadStats();
  loadPersonalLogo();
}
function loadStats() {
  // Usar store.js para obter estatísticas
  var inv = [];
  var iss = [];
  var exp = [];
  var bud = [];

  if (window.getInvoicesReceivedSync) {
    inv = window.getInvoicesReceivedSync();
  }
  if (window.getInvoicesIssuedSync) {
    iss = window.getInvoicesIssuedSync();
  }
  if (window.getExpensesSync) {
    exp = window.getExpensesSync();
  }
  if (window.getBudgetsSync) {
    bud = window.getBudgetsSync();
  }

  setText('statInvoices', inv.length || 0);
  setText('statIssued', iss.length || 0);
  setText('statExpenses', exp.length || 0);
  setText('statBudgets', bud.length || 0);
}
function loadProfile() { var user = AuthSystem.getCurrentUser(); if (!user) return; loadProfileFromLocal(user); }
function showAlert(id, msg, type) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.className = 'alert alert-' + (type || 'info'); el.classList.remove('hidden'); setTimeout(function() { el.classList.add('hidden'); }, 5000); } }
function showEditModal() { var user = AuthSystem.getCurrentUser(); if (!user) return; document.getElementById('editName').value = user.name || ''; document.getElementById('editCompany').value = user.company || ''; document.getElementById('editPhone').value = user.phone || ''; document.getElementById('editEmail').value = user.email || ''; var s = user.settings || {}; document.getElementById('editCurrency').value = s.currency || 'EUR'; document.getElementById('editLanguage').value = s.language || 'es'; document.getElementById('editAlert').classList.add('hidden'); editModal.show(); }
function showPasswordModal() { 
  document.getElementById('currentPassword').value = ''; 
  document.getElementById('newPassword').value = ''; 
  document.getElementById('confirmPassword').value = ''; 
  document.getElementById('passwordAlert').classList.add('hidden');
  updatePasswordStrength();
  passwordModal.show(); 
}
async function saveProfile() {
  var name = document.getElementById('editName').value.trim();
  var company = document.getElementById('editCompany').value.trim();
  var phone = document.getElementById('editPhone').value.trim();
  var currency = document.getElementById('editCurrency').value;
  var language = document.getElementById('editLanguage').value;

  if (!name || !company) { showAlert('editAlert', 'Completa todos los campos.', 'error'); return; }

  var saveBtn = document.querySelector('#editProfileModal .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'; }

  var res = await AuthSystem.updateUserProfile({name:name, company:company, phone:phone, settings:{currency:currency, language:language}});

  if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar'; }

  if (res.success) {
    editModal.hide();
    loadProfile();
    showAlert('alertMessage', 'Perfil actualizado correctamente!', 'success');
  }
  else { showAlert('editAlert', res.message || 'Error.', 'error'); }
}

async function changePassword() {
  var cp = document.getElementById('currentPassword').value.trim();
  var np = document.getElementById('newPassword').value;
  var cnp = document.getElementById('confirmPassword').value;
  
  if (!cp) { showAlert('passwordAlert', 'Introduce tu contrasena actual.', 'error'); return; }
  if (!np || !cnp) { showAlert('passwordAlert', 'Completa todos los campos.', 'error'); return; }
  if (np !== cnp) { showAlert('passwordAlert', 'Las contrasenas nuevas no coinciden.', 'error'); return; }
  
  // Check password strength requirements
  if (!isPasswordStrong(np)) {
    showAlert('passwordAlert', 'Contrasena no cumple los requisitos de seguridad.', 'error');
    return;
  }
  
  // Verify current password and change
  if (window.AuthSystem && window.AuthSystem.verifyPassword) {
    var verified = await AuthSystem.verifyPassword(cp);
    if (!verified) {
      showAlert('passwordAlert', 'Contrasena actual incorrecta.', 'error');
      return;
    }
  }
  
  var res = await AuthSystem.changePassword(np);
  if (res.success) { 
    passwordModal.hide();
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showAlert('alertMessage', 'Contrasena cambiada exitosamente!', 'success'); 
  }
  else { 
    showAlert('passwordAlert', res.message || 'Error al cambiar contrasena.', 'error'); 
  }
}
// Password Security Functions
function togglePasswordField(fieldId) {
  var field = document.getElementById(fieldId);
  var btn = event.target.closest('button');
  if (field.type === 'password') {
    field.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    field.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function updatePasswordStrength() {
  var pwd = document.getElementById('newPassword').value;
  var strengthBar = document.getElementById('strengthBar');
  var strengthText = document.getElementById('strengthText');
  
  var strength = 0;
  var strengthLevel = 'muy debil';
  
  // Check requirements
  var hasLength = pwd.length >= 8;
  var hasUpper = /[A-Z]/.test(pwd);
  var hasLower = /[a-z]/.test(pwd);
  var hasNumber = /[0-9]/.test(pwd);
  var hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  
  // Update requirement elements with icons
  updateRequirement('req-length', hasLength);
  updateRequirement('req-upper', hasUpper);
  updateRequirement('req-lower', hasLower);
  updateRequirement('req-number', hasNumber);
  updateRequirement('req-special', hasSpecial);
  
  if (hasLength) strength++;
  if (hasUpper) strength++;
  if (hasLower) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  
  strengthBar.className = 'password-strength-bar';
  if (strength === 0) {
    strengthBar.classList.add('strength-very-weak');
    strengthLevel = 'Sin contrasena';
  } else if (strength === 1) {
    strengthBar.classList.add('strength-weak');
    strengthLevel = 'Muy debil';
  } else if (strength === 2) {
    strengthBar.classList.add('strength-fair');
    strengthLevel = 'Regular';
  } else if (strength === 3) {
    strengthBar.classList.add('strength-good');
    strengthLevel = 'Buena';
  } else {
    strengthBar.classList.add('strength-strong');
    strengthLevel = 'Muy fuerte';
  }
  
  strengthText.textContent = 'Fortaleza: ' + strengthLevel;
}

function updateRequirement(reqId, isMet) {
  var element = document.getElementById(reqId);
  if (!element) return;
  
  var icon = element.querySelector('i');
  element.classList.toggle('met', isMet);
  
  if (icon) {
    if (isMet) {
      icon.className = 'fas fa-circle-check';
    } else {
      icon.className = 'fas fa-circle-xmark';
    }
  }
}

function isPasswordStrong(pwd) {
  if (pwd.length < 8) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return false;
  return true;
}

function getCompanyLogoForPdf() {
  try {
    var authUser = AuthSystem && AuthSystem.getCurrentUser ? AuthSystem.getCurrentUser() : null;
    var authLogo = authUser && authUser.companyData && authUser.companyData.logo;
    if (authLogo) return authLogo;
  } catch (e) {}

  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      var logo = data && data.user && data.user.companyData && data.user.companyData.logo;
      if (logo) return logo;
    }
  } catch (e) {}

  return null;
}

function imageToPngDataUrl(source) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    if (typeof source === 'string' && source.indexOf('data:image') !== 0) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = function() {
      reject(new Error('Could not load logo image'));
    };
    img.src = source;
  });
}

async function exportDataPDF() {
  var user = AuthSystem.getCurrentUser();
  if (!user) { showAlert('alertMessage', 'Usuario no encontrado.', 'error'); return; }

  var logoSource = getCompanyLogoForPdf();
  var logoDataUrl = null;
  if (logoSource) {
    try {
      logoDataUrl = await imageToPngDataUrl(logoSource);
    } catch (e) {
      console.log('Company logo not available for PDF:', e);
    }
  }

  var doc = new window.jspdf.jsPDF();
  doc.setFillColor(9, 88, 178);
  doc.rect(0, 0, 210, 35, 'F');

  if (logoDataUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 7, 24, 21, 2, 2, 'F');
      doc.addImage(logoDataUrl, 'PNG', 14, 9, 20, 17);
    } catch (e) {
      console.log('Could not render company logo in PDF:', e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('FactuFácil', 105, 18, {align:'center'});
  doc.setFontSize(12);
  doc.text('Perfil de Usuario', 105, 28, {align:'center'});
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align:'right'});
  doc.line(15, 40, 195, 40);
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text('Informacion del Perfil', 15, y);
  y += 10;
  doc.setFontSize(10);
  doc.text('Nombre: ' + (user.name || '-'), 20, y); y += 7;
  doc.text('Empresa: ' + (user.company || '-'), 20, y); y += 7;
  doc.text('Email: ' + (user.email || '-'), 20, y); y += 7;
  doc.text('Telefono: ' + (user.phone || '-'), 20, y); y += 15;
  doc.setFontSize(14);
  doc.text('Preferencias', 15, y);
  y += 10;
  doc.setFontSize(10);
  var s = user.settings || {};
  doc.text('Moneda: ' + (s.currency || 'EUR'), 20, y); y += 7;
  doc.text('Idioma: ' + (s.language || 'es'), 20, y); y += 7;
  doc.text('Tema: ' + (s.theme || 'light'), 20, y);
  doc.save('upsen_perfil.pdf');
  showAlert('alertMessage', 'PDF exportado!', 'success');
}
function deleteAccount() {
  if (confirm('Eliminar cuenta? Esta accion no se puede deshacer.')) {
    AuthSystem.deleteAccount().then(function(result) {
      if (result && result.success) {
        window.location.href = '../login.html';
      } else {
        showAlert('alertMessage', result.message || 'Error al eliminar cuenta', 'error');
      }
    });
  }
}
// Logout function with Firebase sign out
function logout() {
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

    // 3. Try AuthService logout
    if (AuthSystem && AuthSystem.logout) {
      AuthSystem.logout();
    }

    window.location.href = '../login.html';
  }
}

// Personal Logo Upload Handler
document.addEventListener('DOMContentLoaded', function() {
  // Handle both upload inputs
  var logoUploadInputs = ['personalLogoUpload', 'personalLogoUploadTop'];
  
  logoUploadInputs.forEach(function(inputId) {
    var input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
          showAlert('alertMessage', 'Logo muy grande. Máximo 5MB.', 'error');
          return;
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
          personalLogoFileData = e.target.result;
          
          // Show preview in avatar
          var avatarImg = document.getElementById('avatarImage');
          var avatarInitials = document.getElementById('avatarInitials');
          if (avatarImg) {
            avatarImg.src = personalLogoFileData;
            avatarImg.style.display = 'block';
            if (avatarInitials) avatarInitials.style.display = 'none';
          }
          
          showAlert('alertMessage', 'Logo cargado!', 'success');
          // Auto-save immediately
          savePersonalLogo();
        };
        reader.readAsDataURL(file);
      });
    }
  });
});

function savePersonalLogo() {
  if (!personalLogoFileData) {
    showAlert('alertMessage', 'Selecciona un logo primero.', 'error');
    return;
  }
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        if (!data.user.personalData) data.user.personalData = {};
        data.user.personalData.logo = personalLogoFileData;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  if (window.AuthSystem && window.AuthSystem.updateUserProfile) {
    window.AuthSystem.updateUserProfile({ 
      personalData: { logo: personalLogoFileData } 
    }).then(function(result) {
      showAlert('alertMessage', 'Logo guardado!', 'success');
      personalLogoFileData = null;
    });
  } else {
    showAlert('alertMessage', 'Logo guardado localmente!', 'success');
    personalLogoFileData = null;
  }
}

function deletePersonalLogo() {
  if (!confirm('¿Eliminar el logo personal?')) return;
  
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user && data.user.personalData) {
        delete data.user.personalData.logo;
        localStorage.setItem('upsen_current_user', JSON.stringify(data));
      }
    }
  } catch (e) {}
  
  if (window.AuthSystem && window.AuthSystem.updateUserProfile) {
    window.AuthSystem.updateUserProfile({ 
      personalData: { logo: null } 
    }).then(function(result) {
      showAlert('alertMessage', 'Logo eliminado!', 'success');
      personalLogoFileData = null;
      // Reset avatar to initials
      var avatarImg = document.getElementById('avatarImage');
      var avatarInitials = document.getElementById('avatarInitials');
      if (avatarImg && avatarInitials) {
        avatarImg.style.display = 'none';
        avatarInitials.style.display = 'block';
      }
    });
  } else {
    showAlert('alertMessage', 'Logo eliminado!', 'success');
    personalLogoFileData = null;
    // Reset avatar to initials
    var avatarImg = document.getElementById('avatarImage');
    var avatarInitials = document.getElementById('avatarInitials');
    if (avatarImg && avatarInitials) {
      avatarImg.style.display = 'none';
      avatarInitials.style.display = 'block';
    }
  }
}

