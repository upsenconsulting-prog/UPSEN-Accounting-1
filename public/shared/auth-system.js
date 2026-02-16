
/**
 * UPSEN Accounting - Auth System
 * COM SUPORTE FIREBASE COMPLETO
 * Estrutura: users/{userId}/documents/{type}/items/{docId}
 */

(function() {
  'use strict';
  
  var FirebaseConfigured = typeof firebase !== 'undefined' && window.FIREBASE_CONFIG;
  
  // Theme key for localStorage
  var THEME_KEY = 'upsen_theme';
  
  // ========== SYNC SERVICE ==========
  var SyncService = {
    syncFromFirebase: function(userId) {
      return new Promise(function(resolve) {
        if (!window.firebaseDb || !userId || userId === 'unknown') {
          resolve();
          return;
        }
        
        console.log('Sincronizando dados do Firebase...');
        
        var promises = [];
        
        // Sync expenses
        var expensesPromise = window.firebaseDb.collection('users').doc(userId).collection('documents').doc('expenses').collection('items').get()
          .then(function(snapshot) {
            var expenses = [];
            snapshot.forEach(function(doc) {
              var data = doc.data();
              expenses.push({
                id: doc.id,
                date: data.date || '',
                category: data.category || '',
                amount: data.amount || 0,
                notes: data.notes || '',
                paymentMethod: data.paymentMethod || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_expenses_' + userId, JSON.stringify(expenses));
            console.log('Expenses sincronizados:', expenses.length);
          }).catch(function() {});
        promises.push(expensesPromise);
        
        // Sync invoices issued
        var invoicesIssuedPromise = window.firebaseDb.collection('users').doc(userId).collection('documents').doc('invoicesIssued').collection('items').get()
          .then(function(snapshot) {
            var invoicesIssued = [];
            snapshot.forEach(function(doc) {
              var data = doc.data();
              invoicesIssued.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber || '',
                invoiceDate: data.invoiceDate || '',
                clientName: data.clientName || '',
                amount: data.amount || 0,
                state: data.state || '',
                notes: data.notes || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_invoices_issued_' + userId, JSON.stringify(invoicesIssued));
            console.log('Invoices Issued sincronizados:', invoicesIssued.length);
          }).catch(function() {});
        promises.push(invoicesIssuedPromise);
        
        // Sync invoices received
        var invoicesReceivedPromise = window.firebaseDb.collection('users').doc(userId).collection('documents').doc('invoicesReceived').collection('items').get()
          .then(function(snapshot) {
            var invoicesReceived = [];
            snapshot.forEach(function(doc) {
              var data = doc.data();
              invoicesReceived.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber || '',
                invoiceDate: data.invoiceDate || '',
                supplierName: data.supplierName || '',
                amount: data.amount || 0,
                state: data.state || '',
                notes: data.notes || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_invoices_received_' + userId, JSON.stringify(invoicesReceived));
            console.log('Invoices Received sincronizados:', invoicesReceived.length);
          }).catch(function() {});
        promises.push(invoicesReceivedPromise);
        
        Promise.all(promises).then(function() {
          console.log('Sincronizacao completa!');
          resolve();
        }).catch(function() {
          resolve();
        });
      });
    }
  };
  
  window.SyncService = SyncService;
  
  // ========== FIREBASE SETUP ==========
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
  
  // ========== AUTH SERVICE ==========
  var AuthService = {
    currentUser: null,
    currentUserData: null,
    firebaseReady: false,
    firebaseError: null,
    
    init: function() {
      var self = this;
      
      // Apply saved theme on init
      this.applySavedTheme();
      
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
    
    applySavedTheme: function() {
      var savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme) {
        applyTheme(savedTheme);
      }
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
      
      // Load from users collection
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
              
              // Apply user theme preference
              if (userData.settings && userData.settings.theme) {
                applyTheme(userData.settings.theme);
                localStorage.setItem(THEME_KEY, userData.settings.theme);
              }
              
              // Sync data
              if (SyncService && SyncService.syncFromFirebase) {
                SyncService.syncFromFirebase(firebaseUser.uid);
              }
            } else {
              self.createUserDocument(firebaseUser.uid, userData);
            }
          })
          .catch(function(error) {
            console.warn('Erro Firestore:', error.message);
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
      if (!window.firebaseDb) return;
      
      window.firebaseDb.collection('users').doc(uid).set(userData, { merge: true })
        .then(function() {
          console.log('Documento criado:', uid);
          // Initialize documents subcollection
          return window.firebaseDb.collection('users').doc(uid).collection('documents').doc('expenses').set({ initialized: true });
        })
        .then(function() {
          return window.firebaseDb.collection('users').doc(uid).collection('documents').doc('invoicesIssued').set({ initialized: true });
        })
        .then(function() {
          return window.firebaseDb.collection('users').doc(uid).collection('documents').doc('invoicesReceived').set({ initialized: true });
        })
        .then(function() {
          return window.firebaseDb.collection('users').doc(uid).collection('documents').doc('budgets').set({ initialized: true });
        })
        .catch(function(error) {
          console.warn('Erro ao criar documento:', error.message);
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
              if (!result.user.emailVerified) {
                resolve({ success: false, message: 'Verifica o teu email antes de fazer login.' });
                result.user.sendEmailVerification().catch(function() {});
                return;
              }
              
              self.loadUserData(result.user);
              
              if (SyncService && SyncService.syncFromFirebase) {
                SyncService.syncFromFirebase(result.user.uid).then(function() {
                  resolve({ success: true, user: self.getCurrentUser(), message: 'Login realizado!' });
                });
              } else {
                resolve({ success: true, user: self.getCurrentUser(), message: 'Login realizado!' });
              }
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
      
      function validateEmail(email) {
        if (!email || email.trim() === '') {
          return { valid: false, message: 'O campo email nao pode estar vazio.' };
        }
        
        var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          return { valid: false, message: 'Formato de email invalido.' };
        }
        
        var domain = email.split('@')[1];
        if (!domain || domain.indexOf('.') === -1) {
          return { valid: false, message: 'O dominio do email deve ser valido.' };
        }
        
        return { valid: true, message: 'Email valido.' };
      }
      
      var emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return Promise.resolve({ success: false, message: emailValidation.message });
      }
      
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
          window.firebaseAuth.fetchSignInMethodsForEmail(email)
            .then(function(methods) {
              if (methods.length > 0) {
                resolve({ success: false, message: 'Este email ja esta registado.' });
                return;
              }
              
              return window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            })
            .then(function(result) {
              if (!result) return;
              
              var user = result.user;
              
              var docData = {
                uid: user.uid,
                email: user.email,
                name: userData.name || '',
                company: userData.company || '',
                phone: userData.phone || '',
                role: 'admin',
                emailVerified: false,
                createdAt: new Date().toISOString(),
                settings: { currency: 'EUR', language: 'pt', theme: 'light' }
              };
              
              // Create in users collection
              if (window.firebaseDb) {
                window.firebaseDb.collection('users').doc(user.uid).set(docData)
                  .then(function() {
                    console.log('Documento criado no Firestore:', user.uid);
                  })
                  .catch(function(error) {
                    console.warn('Erro ao criar documento:', error.message);
                  });
              }
              
              user.sendEmailVerification()
                .then(function() {
                  console.log('Email de verificacao enviado');
                })
                .catch(function() {});
              
              window.firebaseAuth.signOut()
                .then(function() {
                  resolve({ 
                    success: true, 
                    user: null, 
                    message: 'Conta criada! Verifica o teu email para ativar a conta.' 
                  });
                })
                .catch(function() {
                  resolve({ 
                    success: true, 
                    user: null, 
                    message: 'Conta criada! Verifica o teu email para ativar a conta.' 
                  });
                });
            })
            .catch(function(error) {
              console.error('Erro no registo:', error);
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
          return;
        }
        
        // Demo mode
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
      
      if (this.googleLoginInProgress) {
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
              role: 'admin',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              settings: { currency: 'EUR', language: 'pt', theme: 'light' }
            };
            
            self.createUserDocument(user.uid, docData);
            self.loadUserData(user);
            
            if (SyncService && SyncService.syncFromFirebase) {
              SyncService.syncFromFirebase(user.uid).then(function() {
                resolve({ success: true, user: self.getCurrentUser(), message: 'Login com Google realizado!' });
              });
            } else {
              resolve({ success: true, user: self.getCurrentUser(), message: 'Login com Google realizado!' });
            }
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
        var session = localStorage.getItem('upsen_current_user');
        if (session) {
          var data = JSON.parse(session);
          for (var key in updates) {
            if (key === 'settings') {
              data.user.settings = Object.assign({}, data.user.settings || {}, updates.settings);
              // Save theme to localStorage
              if (updates.settings && updates.settings.theme) {
                localStorage.setItem(THEME_KEY, updates.settings.theme);
                applyTheme(updates.settings.theme);
              }
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
              window.firebaseDb.collection('users').doc(uid).set(updates, { merge: true })
                .then(function() {
                  resolve({ success: true, message: 'Perfil atualizado!' });
                })
                .catch(function() {
                  resolve({ success: true, message: 'Perfil atualizado (local)!' });
                });
            });
        } else {
          resolve({ success: true, message: 'Perfil atualizado (local)!' });
        }
      });
    },
    
    updateUserProfile: function(updates) {
      var user = this.getCurrentUser();
      var uid = user ? (user.uid || user.id) : null;
      return this.updateProfile(uid, updates);
    },
    
    getUserData: function(key) {
      try {
        var data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
      } catch (e) {}
      return [];
    },
    
    saveUserData: function(key, data) {
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    },
    
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
          localStorage.removeItem(THEME_KEY);
          self.currentUser = null;
          self.currentUserData = null;
          resolve({ success: true, message: 'Conta eliminada.' });
          return;
        }
        
        if (window.firebaseDb && userId) {
          window.firebaseDb.collection('users').doc(userId).delete()
            .catch(function(error) {
              console.warn('Erro ao eliminar documento:', error.message);
            });
          
          user.delete()
            .then(function() {
              self.logout();
              localStorage.removeItem(THEME_KEY);
              resolve({ success: true, message: 'Conta eliminada com sucesso.' });
            })
            .catch(function(error) {
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
        } else {
          user.delete()
            .then(function() {
              self.logout();
              localStorage.removeItem(THEME_KEY);
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
        'auth/weak-password': 'Password muito fraca.',
        'auth/too-many-requests': 'Demasiadas tentativas.',
        'auth/network-request-failed': 'Erro de conexao.',
        'auth/requires-recent-login': 'Faz login novamente.',
        'auth/user-disabled': 'Conta desativada.'
      };
      return messages[code] || 'Erro: ' + (code || '');
    }
  };
  
  // ========== FIRESTORE SERVICE ==========
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
    
    add: function(collectionName, data) {
      var self = this;
      
      return new Promise(function(resolve) {
        var userId = self.getUserId();
        var key = self.getDataKey(collectionName);
        
        var newDoc = Object.assign({ id: AuthService.generateId(), createdAt: new Date().toISOString() }, data);
        
        // Save to localStorage
        try {
          var currentData = JSON.parse(localStorage.getItem(key) || '[]');
          currentData.unshift(newDoc);
          localStorage.setItem(key, JSON.stringify(currentData));
        } catch (e) {}
        
        // Save to Firebase - users/{uid}/documents/{type}/items/{docId}
        if (window.firebaseDb && userId !== 'unknown') {
          window.firebaseDb.collection('users').doc(userId).collection('documents').doc(collectionName).collection('items')
            .add({
              ...data,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdBy: userId
            })
            .then(function(docRef) {
              newDoc.id = docRef.id;
              try {
                var currentData = JSON.parse(localStorage.getItem(key) || '[]');
                if (currentData.length > 0) {
                  currentData[0].id = docRef.id;
                  localStorage.setItem(key, JSON.stringify(currentData));
                }
              } catch (e) {}
              console.log('Dado salvo no Firebase:', collectionName);
            })
            .catch(function(error) {
              console.warn('Erro ao guardar no Firebase:', error.message);
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
          window.firebaseDb.collection('users').doc(userId).collection('documents').doc(collectionName).collection('items').doc(id)
            .update(Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }))
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
          window.firebaseDb.collection('users').doc(userId).collection('documents').doc(collectionName).collection('items').doc(id)
            .delete()
            .catch(function() {});
        }
        
        resolve({ success: true });
      });
    }
  };
  
  // ========== THEME ==========
  function applyTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#1a1a2e';
      document.body.style.color = '#ffffff';
      
      var cards = document.querySelectorAll('.modern-card, .stat-card, .summary-card');
      cards.forEach(function(card) {
        card.style.backgroundColor = '#16213e';
        card.style.color = '#ffffff';
      });
      
      var texts = document.querySelectorAll('.section-title, .page-title, .form-label, .info-label, .info-value, .stat-value, .stat-label');
      texts.forEach(function(t) {
        t.style.color = '#ffffff';
      });
    } else {
      document.body.style.backgroundColor = '#eef1f7';
      document.body.style.color = '#2c3e50';
      
      var cards = document.querySelectorAll('.modern-card, .stat-card, .summary-card');
      cards.forEach(function(card) {
        card.style.backgroundColor = '';
        card.style.color = '';
      });
      
      var texts = document.querySelectorAll('.section-title, .page-title, .form-label, .info-label, .info-value, .stat-value, .stat-label');
      texts.forEach(function(t) {
        t.style.color = '';
      });
    }
  }
  
  // ========== INIT ==========
  AuthService.init();
  
  window.AuthService = AuthService;
  window.Auth = AuthService;
  window.AuthSystem = AuthService;
  window.FirestoreService = FirestoreService;
  window.applyTheme = applyTheme;
  
  console.log('Auth System carregado!');
  
})();

