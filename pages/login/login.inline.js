var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    var demoSection = document.getElementById('demoSection');
    var messageDiv = document.getElementById('message');
    var messageText = document.getElementById('messageText');
    var loginBtn = document.getElementById('loginBtn');
    var registerBtn = document.getElementById('registerBtn');
    
    // Email validation regex - enhanced version
    function isValidEmail(email) {
      if (!email || email.trim() === '') {
        return { valid: false, message: 'O campo email não pode estar vazio.' };
      }
      
      // Basic format check
      var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return { valid: false, message: 'Formato de email inválido. Use o formato: nome@exemplo.com' };
      }
      
      // Check for minimum domain length (must have at least one dot)
      var domain = email.split('@')[1];
      if (!domain || domain.indexOf('.') === -1) {
        return { valid: false, message: 'O domínio do email deve ser válido (ex: .com, .pt, .org)' };
      }
      
      // Check for valid characters (no spaces, no consecutive dots)
      if (email.includes(' ') || email.includes('..')) {
        return { valid: false, message: 'Email contém caracteres inválidos.' };
      }
      
      // Check email length limits
      if (email.length > 254) {
        return { valid: false, message: 'Email demasiado longo.' };
      }
      
      // Check local part (before @) - cannot start or end with certain characters
      var localPart = email.split('@')[0];
      if (localPart && (localPart.startsWith('.') || localPart.endsWith('.') || localPart.startsWith('-') || localPart.endsWith('-'))) {
        return { valid: false, message: 'O email não pode começar ou terminar com caracteres especiais.' };
      }
      
      return { valid: true, message: 'Email válido.' };
    }
    
    // Password strength validation
    function validatePassword(password) {
      var requirements = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
      };
      return requirements;
    }
    
    // Update password requirement indicators
    function updatePasswordIndicators(password) {
      var reqs = validatePassword(password);
      
      var reqLength = document.getElementById('req-length');
      var reqUpper = document.getElementById('req-upper');
      var reqLower = document.getElementById('req-lower');
      var reqNumber = document.getElementById('req-number');
      
      if (reqLength) {
        reqLength.className = reqs.length ? 'valid' : 'invalid';
        reqLength.querySelector('i').className = reqs.length ? 'fas fa-check-circle' : 'fas fa-circle';
      }
      if (reqUpper) {
        reqUpper.className = reqs.upper ? 'valid' : 'invalid';
        reqUpper.querySelector('i').className = reqs.upper ? 'fas fa-check-circle' : 'fas fa-circle';
      }
      if (reqLower) {
        reqLower.className = reqs.lower ? 'valid' : 'invalid';
        reqLower.querySelector('i').className = reqs.lower ? 'fas fa-check-circle' : 'fas fa-circle';
      }
      if (reqNumber) {
        reqNumber.className = reqs.number ? 'valid' : 'invalid';
        reqNumber.querySelector('i').className = reqs.number ? 'fas fa-check-circle' : 'fas fa-circle';
      }
      
      return reqs.length && reqs.upper && reqs.lower && reqs.number;
    }
    
    function showMessage(text, type) {
      messageText.textContent = text;
      messageDiv.className = 'alert alert-' + (type || 'info');
    }
    
    function showLogin() {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      showMessage('Sistema FactuFácil - Inicia sesion para continuar', 'info');
    }
    
    function showRegister() {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      demoSection.classList.add('hidden');
      showMessage('Crea tu cuenta para empezar', 'info');
    }
    
    function redirectToDashboard() {
      window.location.href = 'frontPage/frontPage.html';
    }
    
    function tryGoogleLogin() {
      showMessage('Iniciando sesion con Google...', 'info');
      AuthService.loginWithGoogle().then(function(result) {
        if (result.success) {
          showMessage('Bienvenido!', 'success');
          setTimeout(redirectToDashboard, 1000);
        } else {
          showMessage(result.message, 'error');
        }
      });
    }
    
    // Add password strength listener
    var regPasswordInput = document.getElementById('regPassword');
    if (regPasswordInput) {
      regPasswordInput.addEventListener('input', function() {
        updatePasswordIndicators(this.value);
      });
    }
    
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;
      
      if (!email || !password) {
        showMessage('Por favor, completa todos los campos.', 'error');
        return;
      }
      
      var emailValidation = isValidEmail(email);
      if (!emailValidation.valid) {
        showMessage(emailValidation.message, 'error');
        return;
      }
      
      loginBtn.disabled = true;
      showMessage('Iniciando sesion...', 'info');
      
      AuthService.login(email, password).then(function(result) {
        loginBtn.disabled = false;
        
        if (result.success) {
          showMessage('Bienvenido!', 'success');
          setTimeout(redirectToDashboard, 1000);
        } else {
          showMessage(result.message, 'error');
        }
      });
    });
    
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = document.getElementById('regName').value.trim();
      var company = document.getElementById('regCompany').value.trim();
      var email = document.getElementById('regEmail').value.trim();
      var phone = document.getElementById('regPhone').value.trim();
      var password = document.getElementById('regPassword').value;
      var passwordConfirm = document.getElementById('regPasswordConfirm').value;
      
      if (!name || !company || !email || !password) {
        showMessage('Por favor, completa todos los campos obligatorios.', 'error');
        return;
      }
      
      var emailValidation = isValidEmail(email);
      if (!emailValidation.valid) {
        showMessage(emailValidation.message, 'error');
        return;
      }
      
      if (password !== passwordConfirm) {
        showMessage('Las contrasenas no coinciden.', 'error');
        return;
      }
      
      var passwordValid = validatePassword(password);
      if (!passwordValid.length || !passwordValid.upper || !passwordValid.lower || !passwordValid.number) {
        showMessage('La contrasena no cumple todos los requisitos.', 'error');
        return;
      }
      
      registerBtn.disabled = true;
      showMessage('Creando cuenta...', 'info');
      
      AuthService.register(email, password, { 
        name: name, 
        company: company,
        phone: phone 
      }).then(function(result) {
        registerBtn.disabled = false;
        
        if (result.success) {
          showMessage(result.message, 'success');
          // Clear form and switch to login after delay
          setTimeout(function() {
            registerForm.reset();
            // Reset password indicators
            updatePasswordIndicators('');
            showLogin();
          }, 3000);
        } else {
          showMessage(result.message, 'error');
        }
      });
    });

