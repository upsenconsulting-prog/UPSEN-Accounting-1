/**
 * UPSEN Accounting - Auth System
 */

(function() {
  'use strict';
  
  var FirebaseConfigured = typeof firebase !== 'undefined' && window.FIREBASE_CONFIG;
  
  function waitForFirebase(callback) {
    var attempts = 0;
    var maxAttempts = 20;
    
    function check() {
      attempts++;
      
      if (FirebaseConfigured && typeof firebase !== 'undefined' && firebase.apps) {
        try {
          if (firebase.apps.length > 0) {
            window.firebaseApp = firebase.apps[0];
          } else {
            window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
          }
          window.firebaseAuth = firebase.auth(window.firebaseApp);
          window.firebaseDb = firebase.firestore(window.firebaseApp);
          callback(true);
        } catch (e) {
          console.warn('Firebase config error:', e.message);
          callback(false);
        }
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      } else {
        callback(false);
      }
    }
    
    setTimeout(check, 50);
  }
  
  function getDemoUsers() {
    var users = localStorage.getItem('upsen_demo_users');
    if (users) return JSON.parse(users);
    
    var demoUsers = [
      {
        id: 'demo_admin',
        email: 'admin@demo.com',
        password: hashPassword('demo123'),
        name: 'Administrador',
        company: 'UPSEN Demo',
        phone: '+351 123 456 789',
        role: 'admin',
        createdAt: new Date().toISOString(),
        settings: { currency: 'EUR', language: 'pt', theme: 'light' }
      }
    ];
    
    localStorage.setItem('upsen_demo_users', JSON.stringify(demoUsers));
    return demoUsers;
  }
  
  function hashPassword(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  var AuthService = {
    currentUser: null,
    currentUserData: null,
    firebaseReady: false,
    firebaseError: null,
    
    init: function() {
      var self = this;
      
      waitForFirebase(function(ready) {
        self.firebaseReady = ready;
        
        if (ready && window.firebaseAuth) {
          window.firebaseAuth.onAuthStateChanged(function(user) {
            if (user) {
              self.loadUserData(user);
            }
          });
        }
        
        console.log('AuthSystem inicializado. Firebase:', ready);
      });
    },
    
    loadUserData: function(firebaseUser) {
      var self = this;
      this.currentUser = firebaseUser;
      
      var userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || '',
        company: '',
        phone: firebaseUser.phoneNumber || '',
        role: 'user',
        emailVerified: firebaseUser.emailVerified || true,
        createdAt: new Date().toISOString(),
        settings: { currency: 'EUR', language: 'pt', theme: 'light' }
      };
      
      this.saveSession(userData);
      
      if (window.firebaseDb) {
        window.firebaseDb.collection('users').doc(firebaseUser.uid).get()
          .then(function(doc) {
            if (doc.exists) {
              var data = doc.data();
              for (var key in data) {
                userData[key] = data[key];
              }
              self.currentUserData = userData;
              self.saveSession(userData);
              console.log('Dados carregados do Firestore:', userData.email);
            } else {
              self.createUserDocument(firebaseUser.uid, userData);
            }
          })
          .catch(function(error) {
            console.warn('Erro Firestore (usando localStorage):', error.message);
            self.firebaseError = error.message;
            self.currentUserData = userData;
            self.saveSession(userData);
          });
      } else {
        this.currentUserData = userData;
        this.saveSession(userData);
      }
    },
    
    createUserDocument: function(uid, userData) {
      var self = this;
      
      if (!window.firebaseDb) return;
      
      window.firebaseDb.collection('users').doc(uid).set(userData, { merge: true })
        .then(function() {
          console.log('Documento criado:', uid);
        })
        .catch(function(error) {
          if (error.code !== 'permission-denied') {
            console.warn('Erro ao criar documento:', error.message);
          }
        });
    },
    
    saveSession: function(user) {
      localStorage.setItem('upsen_current_user', JSON.stringify({
        user: user,
        loginTime: Date.now()
      }));
    },
    
    getCurrentUser: function() {
      if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        return window.firebaseAuth.currentUser;
      }
      
      try {
        var session = localStorage.getItem('upsen_current_user');
        if (session) {
          var data = JSON.parse(session);
          if (data && data.user) return data.user;
        }
      } catch (e) {}
      
      return this.currentUserData || this.currentUser;
    },
    
    isLoggedIn: function() {
      return this.getCurrentUser() !== null;
    },
    
    login: function(email, password) {
      var self = this;
      
      return new Promise(function(resolve) {
        if (window.firebaseAuth) {
          window.firebaseAuth.signInWithEmailAndPassword(email, password)
            .then(function(result) {
              // Check if email is verified
              if (!result.user.emailVerified) {
                resolve({ success: false, message: 'Verifica o teu email antes de fazer login. Recebeste um email de verificacao?' });
                // Send verification email again if needed
                result.user.sendEmailVerification().catch(function() {});
                return;
              }
              self.loadUserData(result.user);
              resolve({ success: true, user: self.getCurrentUser(), message: 'Login realizado!' });
            })
            .catch(function(error) {
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
        } else {
          var users = getDemoUsers();
          var found = null;
          
          for (var i = 0; i < users.length; i++) {
            if (users[i].email === email.toLowerCase() && users[i].password === hashPassword(password)) {
              found = users[i];
              break;
            }
          }
          
          if (found) {
            self.currentUserData = found;
            self.saveSession(found);
            resolve({ success: true, user: found, message: 'Login demo!' });
          } else {
            resolve({ success: false, message: 'Email ou password incorretos.' });
          }
        }
      });
    },
    
    register: function(email, password, userData) {
      var self = this;
      
      // Enhanced email validation - return object with valid status and message
      function validateEmail(email) {
        if (!email || email.trim() === '') {
          return { valid: false, message: 'O campo email não pode estar vazio.' };
        }
        
        // Basic format check
        var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          return { valid: false, message: 'Formato de email inválido. Usa o formato: nome@exemplo.com' };
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
        
        // Check local part (before @)
        var localPart = email.split('@')[0];
        if (localPart && (localPart.startsWith('.') || localPart.endsWith('.') || localPart.startsWith('-') || localPart.endsWith('-'))) {
          return { valid: false, message: 'O email não pode começar ou terminar com caracteres especiais.' };
        }
        
        return { valid: true, message: 'Email válido.' };
      }
      
      // Run email validation
      var emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return Promise.resolve({ success: false, message: emailValidation.message });
      }
      
      // Client-side password validation (keep existing)
      if (password.length < 8) {
        return Promise.resolve({ success: false, message: 'Password muito curta. Minimo 8 caracteres.' });
      }
      if (!/[A-Z]/.test(password)) {
        return Promise.resolve({ success: false, message: 'Password precisa de uma letra maiuscula.' });
      }
      if (!/[a-z]/.test(password)) {
        return Promise.resolve({ success: false, message: 'Password precisa de uma letra minuscula.' });
      }
      if (!/[0-9]/.test(password)) {
        return Promise.resolve({ success: false, message: 'Password precisa de um numero.' });
      }
      
      return new Promise(function(resolve) {
        if (window.firebaseAuth) {
          // First check if email already exists
          window.firebaseAuth.fetchSignInMethodsForEmail(email)
            .then(function(methods) {
              if (methods.length > 0) {
                resolve({ success: false, message: 'Este email já está registado. Tenta fazer login ou usa outro email.' });
                return;
              }
              
              // Create the user
              return window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            })
            .then(function(result) {
              if (!result) return; // Email already exists, resolved already
              
              var user = result.user;
              
              // Prepare user document data
              var docData = {
                uid: user.uid,
                email: user.email,
                name: userData.name || '',
                company: userData.company || '',
                phone: userData.phone || '',
                role: 'user',
                emailVerified: false,
                createdAt: new Date().toISOString(),
                settings: { currency: 'EUR', language: 'pt', theme: 'light' }
              };
              
              // Try to create user document in Firestore
              var createDocPromise;
              if (window.firebaseDb) {
                createDocPromise = window.firebaseDb.collection('users').doc(user.uid).set(docData)
                  .then(function() {
                    console.log('Documento criado no Firestore:', user.uid);
                    return { success: true, firestore: true };
                  })
                  .catch(function(error) {
                    console.warn('Erro ao criar documento no Firestore:', error.message);
                    return { success: true, firestore: false };
                  });
              } else {
                createDocPromise = Promise.resolve({ success: true, firestore: false });
              }
              
              // After creating document, send verification email
              createDocPromise.then(function(firestoreResult) {
                user.sendEmailVerification()
                  .then(function() {
                    console.log('Email de verificação enviado com sucesso');
                  })
                  .catch(function(error) {
                    console.warn('Erro ao enviar email de verificação:', error.message);
                  });
                
                // Sign out until email is verified
                window.firebaseAuth.signOut()
                  .then(function() {
                    var message = 'Conta criada! Verifica o teu email para ativar a conta.';
                    if (!firestoreResult.firestore) {
                      message += ' (Dados guardados localmente)';
                    }
                    resolve({ 
                      success: true, 
                      user: null, 
                      message: message
                    });
                  })
                  .catch(function() {
                    resolve({ 
                      success: true, 
                      user: null, 
                      message: 'Conta criada! Verifica o teu email para ativar a conta.' 
                    });
                  });
              });
            })
            .catch(function(error) {
              console.error('Erro no registo:', error);
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
          return;
        }
        
        // Demo mode (no Firebase)
        var users = getDemoUsers();
        
        for (var i = 0; i < users.length; i++) {
          if (users[i].email === email.toLowerCase()) {
            resolve({ success: false, message: 'Email ja registado.' });
            return;
          }
        }
        
        var newUser = {
          id: 'user_' + Date.now(),
          email: email.toLowerCase(),
          name: userData.name || '',
          company: userData.company || '',
          phone: userData.phone || '',
          role: 'user',
          createdAt: new Date().toISOString(),
          settings: { currency: 'EUR', language: 'pt', theme: 'light' }
        };
        
        users.push(newUser);
        localStorage.setItem('upsen_demo_users', JSON.stringify(users));
        
        self.currentUserData = newUser;
        self.saveSession(newUser);
        resolve({ success: true, user: newUser, message: 'Conta criada!' });
      });
    },
    
    loginWithGoogle: function() {
      var self = this;
      
      // Protection flag to prevent multiple concurrent popup requests
      if (this.googleLoginInProgress) {
        console.log('Google login already in progress');
        return Promise.resolve({ success: false, message: 'Login em progresso.' });
      }
      this.googleLoginInProgress = true;
      
      return new Promise(function(resolve) {
        if (!window.firebaseAuth) {
          self.googleLoginInProgress = false;
          resolve({ success: false, message: 'Google Login requer Firebase.' });
          return;
        }
        
        var provider = new firebase.auth.GoogleAuthProvider();
        
        window.firebaseAuth.signInWithPopup(provider)
          .then(function(result) {
            self.googleLoginInProgress = false;
            var user = result.user;
            var docData = {
              uid: user.uid,
              email: user.email,
              name: user.displayName || '',
              company: '',
              phone: '',
              role: 'user',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              settings: { currency: 'EUR', language: 'pt', theme: 'light' }
            };
            
            self.createUserDocument(user.uid, docData);
            self.loadUserData(user);
            resolve({ success: true, user: self.getCurrentUser(), message: 'Google OK!' });
          })
          .catch(function(error) {
            self.googleLoginInProgress = false;
            resolve({ success: false, message: self.getErrorMessage(error.code) });
          });
      });
    },
    
    logout: function() {
      var self = this;
      
      return new Promise(function(resolve) {
        self.currentUser = null;
        self.currentUserData = null;
        localStorage.removeItem('upsen_current_user');
        
        if (window.firebaseAuth) {
          window.firebaseAuth.signOut()
            .then(function() { resolve({ success: true }); })
            .catch(function() { resolve({ success: true }); });
        } else {
          resolve({ success: true });
        }
      });
    },
    
    updateProfile: function(uid, updates) {
      var self = this;
      
      return new Promise(function(resolve) {
        // Also update localStorage session
        var session = localStorage.getItem('upsen_current_user');
        if (session) {
          var data = JSON.parse(session);
          for (var key in updates) {
            if (key === 'settings') {
              data.user.settings = Object.assign({}, data.user.settings || {}, updates.settings);
            } else {
              data.user[key] = updates[key];
            }
          }
          localStorage.setItem('upsen_current_user', JSON.stringify(data));
        }
        
        if (window.firebaseDb && uid) {
          window.firebaseDb.collection('users').doc(uid).update(updates)
            .then(function() {
              resolve({ success: true, message: 'Perfil atualizado!' });
            })
            .catch(function(error) {
              // Try with set instead of update
              if (window.firebaseDb && uid) {
                window.firebaseDb.collection('users').doc(uid).set(updates, { merge: true })
                  .then(function() {
                    resolve({ success: true, message: 'Perfil atualizado!' });
                  })
                  .catch(function() {
                    resolve({ success: true, message: 'Perfil atualizado (local)!' });
                  });
              } else {
                resolve({ success: true, message: 'Perfil atualizado (local)!' });
              }
            });
        } else {
          resolve({ success: true, message: 'Perfil atualizado (local)!' });
        }
      });
    },
    
    // Convenience method for updating current user profile (auto-gets uid)
    updateUserProfile: function(updates) {
      var self = this;
      var user = this.getCurrentUser();
      var uid = user ? (user.uid || user.id) : null;
      return this.updateProfile(uid, updates);
    },
    
    // Get user data from localStorage
    getUserData: function(key) {
      try {
        var data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
      } catch (e) {}
      return [];
    },
    
    // Save user data to localStorage
    saveUserData: function(key, data) {
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    },
    
    // Generate unique ID
    generateId: function() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    },
    
    changePassword: function(newPassword) {
      var self = this;
      
      return new Promise(function(resolve) {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
          resolve({ success: true, message: 'Password demo!' });
          return;
        }
        
        window.firebaseAuth.currentUser.updatePassword(newPassword)
          .then(function() {
            resolve({ success: true, message: 'Password atualizada!' });
          })
          .catch(function(error) {
            resolve({ success: false, message: self.getErrorMessage(error.code) });
          });
      });
    },
    
    // Send email verification again
    sendVerificationEmail: function() {
      var self = this;
      
      return new Promise(function(resolve) {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
          resolve({ success: false, message: 'Nenhum utilizador logado.' });
          return;
        }
        
        window.firebaseAuth.currentUser.sendEmailVerification()
          .then(function() {
            resolve({ success: true, message: 'Email de verificacao enviado!' });
          })
          .catch(function(error) {
            resolve({ success: false, message: self.getErrorMessage(error.code) });
          });
      });
    },
    
    deleteAccount: function() {
      var self = this;
      
      return new Promise(function(resolve) {
        var user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
        var userId = user ? user.uid : null;
        
        if (!user) {
          localStorage.removeItem('upsen_current_user');
          self.currentUser = null;
          self.currentUserData = null;
          resolve({ success: true, message: 'Conta eliminada.' });
          return;
        }
        
        // Delete from Firestore first (user data)
        if (window.firebaseDb && userId) {
          window.firebaseDb.collection('users').doc(userId).delete()
            .catch(function(error) {
              console.warn('Erro ao eliminar documento do Firestore:', error.message);
            });
          
          // Delete user's invoice collections
          var collections = ['invoices_issued', 'invoices_received', 'expenses'];
          var deletePromises = [];
          
          for (var i = 0; i < collections.length; i++) {
            (function(collectionName) {
              var p = window.firebaseDb.collection('users').doc(userId).collection(collectionName).get()
                .then(function(snapshot) {
                  var batch = window.firebaseDb.batch();
                  snapshot.forEach(function(doc) {
                    batch.delete(doc.ref);
                  });
                  return batch.commit();
                })
                .catch(function() {});
              deletePromises.push(p);
            })(collections[i]);
          }
          
          // Wait for all deletions
          Promise.all(deletePromises).then(function() {
            // Now delete from Firebase Auth
            user.delete()
              .then(function() {
                self.logout();
                resolve({ success: true, message: 'Conta eliminada com sucesso.' });
              })
              .catch(function(error) {
                // If requires recent login, try re-authenticating
                if (error.code === 'auth/requires-recent-login') {
                  resolve({ success: false, message: 'Faz logout e login novamente para eliminar a conta (requer autenticacao recente).' });
                } else {
                  resolve({ success: false, message: self.getErrorMessage(error.code) });
                }
              });
          });
        } else {
          user.delete()
            .then(function() {
              self.logout();
              resolve({ success: true, message: 'Conta eliminada.' });
            })
            .catch(function(error) {
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
        }
      });
    },
    
    getErrorMessage: function(code) {
      var messages = {
        'auth/email-already-in-use': 'Email ja registado.',
        'auth/invalid-email': 'Email invalido.',
        'auth/user-not-found': 'Utilizador nao encontrado.',
        'auth/wrong-password': 'Password incorreta.',
        'auth/weak-password': 'Password muito fragil.',
        'auth/too-many-requests': 'Demasiadas tentativas.',
        'auth/network-request-failed': 'Erro de conexao.',
        'auth/requires-recent-login': 'Faz login novamente.',
        'auth/user-disabled': 'Conta desativada.'
      };
      return messages[code] || 'Erro: ' + (code || '');
    }
  };
  
  var FirestoreService = {
    getUserId: function() {
      var user = AuthService.getCurrentUser();
      if (user) return user.uid || user.id;
      try {
        var session = localStorage.getItem('upsen_current_user');
        if (session) {
          var data = JSON.parse(session);
          if (data && data.user) return data.user.uid || data.user.id;
        }
      } catch (e) {}
      return 'unknown';
    },
    
    getDataKey: function(type) {
      return 'upsen_' + type + '_' + this.getUserId();
    },
    
    getAll: function(collectionName) {
      var self = this;
      
      return new Promise(function(resolve) {
        var userId = self.getUserId();
        var key = self.getDataKey(collectionName);
        
        try {
          var localData = localStorage.getItem(key);
          if (localData) {
            resolve(JSON.parse(localData));
            return;
          }
        } catch (e) {}
        
        if (window.firebaseDb && userId !== 'unknown') {
          window.firebaseDb.collection('users').doc(userId).collection(collectionName)
            .orderBy('createdAt', 'desc')
            .get()
            .then(function(snapshot) {
              var docs = [];
              snapshot.forEach(function(doc) {
                docs.push({ id: doc.id, data: doc.data() });
              });
              resolve(docs);
            })
            .catch(function(error) {
              console.warn('Erro ao carregar ' + collectionName + ':', error.message);
              resolve([]);
            });
        } else {
          resolve([]);
        }
      });
    },
    
    add: function(collectionName, data) {
      var self = this;
      
      return new Promise(function(resolve) {
        var userId = self.getUserId();
        var key = self.getDataKey(collectionName);
        
        var newDoc = Object.assign({ id: generateId(), createdAt: new Date().toISOString() }, data);
        
        try {
          var currentData = JSON.parse(localStorage.getItem(key) || '[]');
          currentData.unshift(newDoc);
          localStorage.setItem(key, JSON.stringify(currentData));
        } catch (e) {}
        
        if (window.firebaseDb && userId !== 'unknown') {
          window.firebaseDb.collection('users').doc(userId).collection(collectionName)
            .add(newDoc)
            .catch(function(error) {
              console.warn('Erro ao guardar:', error.message);
            });
        }
        
        resolve({ success: true, id: newDoc.id });
      });
    },
    
    update: function(collectionName, id, data) {
      var self = this;
      
      return new Promise(function(resolve) {
        var userId = self.getUserId();
        var key = self.getDataKey(collectionName);
        
        try {
          var currentData = JSON.parse(localStorage.getItem(key) || '[]');
          for (var i = 0; i < currentData.length; i++) {
            if (currentData[i].id === id) {
              currentData[i] = Object.assign({}, currentData[i], data, { updatedAt: new Date().toISOString() });
              break;
            }
          }
          localStorage.setItem(key, JSON.stringify(currentData));
        } catch (e) {}
        
        if (window.firebaseDb && userId !== 'unknown') {
          window.firebaseDb.collection('users').doc(userId).collection(collectionName).doc(id)
            .update(Object.assign({}, data, { updatedAt: new Date().toISOString() }))
            .catch(function() {});
        }
        
        resolve({ success: true });
      });
    },
    
    remove: function(collectionName, id) {
      var self = this;
      
      return new Promise(function(resolve) {
        var userId = self.getUserId();
        var key = self.getDataKey(collectionName);
        
        try {
          var currentData = JSON.parse(localStorage.getItem(key) || '[]');
          var filtered = [];
          for (var i = 0; i < currentData.length; i++) {
            if (currentData[i].id !== id) {
              filtered.push(currentData[i]);
            }
          }
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (e) {}
        
        if (window.firebaseDb && userId !== 'unknown') {
          window.firebaseDb.collection('users').doc(userId).collection(collectionName).doc(id)
            .delete()
            .catch(function() {});
        }
        
        resolve({ success: true });
      });
    }
  };
  
  // Global theme application function
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#1a1a2e';
      document.body.style.color = '#ffffff';
      
      // Apply to all cards
      var cards = document.querySelectorAll('.modern-card, .stat-card, .summary-card');
      cards.forEach(function(card) {
        card.style.backgroundColor = '#16213e';
        card.style.color = '#ffffff';
      });
      
      // Apply to titles and text
      var texts = document.querySelectorAll('.section-title, .page-title, .form-label, .info-label, .info-value, .stat-value, .stat-label, .kpi-card h3, .summary-card h3, .kpi-value');
      texts.forEach(function(t) {
        t.style.color = '#ffffff';
      });
      
      // Apply to tables
      var tableCells = document.querySelectorAll('td');
      tableCells.forEach(function(td) {
        td.style.color = '#ffffff';
      });
    } else {
      document.body.style.backgroundColor = '#eef1f7';
      document.body.style.color = '#2c3e50';
      
      // Reset all cards
      var cards = document.querySelectorAll('.modern-card, .stat-card, .summary-card');
      cards.forEach(function(card) {
        card.style.backgroundColor = '';
        card.style.color = '';
      });
      
      // Reset texts
      var texts = document.querySelectorAll('.section-title, .page-title, .form-label, .info-label, .info-value, .stat-value, .stat-label, .kpi-card h3, .summary-card h3, .kpi-value');
      texts.forEach(function(t) {
        t.style.color = '';
      });
      
      // Reset table cells
      var tableCells = document.querySelectorAll('td');
      tableCells.forEach(function(td) {
        td.style.color = '';
      });
    }
  }
  
  AuthService.init();
  
  window.AuthService = AuthService;
  window.Auth = AuthService;
  window.FirestoreService = FirestoreService;
  window.applyTheme = applyTheme;
  
  console.log('Auth System carregado');
  
})();
