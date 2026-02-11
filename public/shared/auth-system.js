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
  
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
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
      
      return new Promise(function(resolve) {
        if (window.firebaseAuth) {
          window.firebaseAuth.fetchSignInMethodsForEmail(email)
            .then(function(methods) {
              if (methods.length > 0) {
                resolve({ success: false, message: 'Email ja registado.' });
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
                role: 'user',
                emailVerified: true,
                createdAt: new Date().toISOString(),
                settings: { currency: 'EUR', language: 'pt', theme: 'light' }
              };
              
              self.createUserDocument(user.uid, docData);
              self.loadUserData(user);
              resolve({ success: true, user: self.getCurrentUser(), message: 'Conta criada!' });
            })
            .catch(function(error) {
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
          return;
        }
        
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
      
      return new Promise(function(resolve) {
        if (!window.firebaseAuth) {
          resolve({ success: false, message: 'Google Login requer Firebase.' });
          return;
        }
        
        var provider = new firebase.auth.GoogleAuthProvider();
        
        window.firebaseAuth.signInWithPopup(provider)
          .then(function(result) {
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
            data.user[key] = updates[key];
          }
          localStorage.setItem('upsen_current_user', JSON.stringify(data));
        }
        
        if (window.firebaseDb) {
          window.firebaseDb.collection('users').doc(uid).update(updates)
            .then(function() {
              resolve({ success: true, message: 'Perfil atualizado!' });
            })
            .catch(function(error) {
              resolve({ success: true, message: 'Perfil atualizado (local)!' });
            });
        } else {
          resolve({ success: true, message: 'Perfil atualizado (local)!' });
        }
      });
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
    
    deleteAccount: function() {
      var self = this;
      
      return new Promise(function(resolve) {
        var user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
        
        if (!user) {
          localStorage.removeItem('upsen_current_user');
          self.currentUser = null;
          self.currentUserData = null;
          resolve({ success: true, message: 'Conta eliminada.' });
          return;
        }
        
        if (window.firebaseDb) {
          window.firebaseDb.collection('users').doc(user.uid).delete()
            .then(function() {
              return user.delete();
            })
            .then(function() {
              self.logout();
              resolve({ success: true, message: 'Conta eliminada.' });
            })
            .catch(function(error) {
              resolve({ success: false, message: self.getErrorMessage(error.code) });
            });
        } else {
          self.logout();
          resolve({ success: true, message: 'Conta eliminada.' });
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
  
  AuthService.init();
  
  window.AuthService = AuthService;
  window.Auth = AuthService;
  window.FirestoreService = FirestoreService;
  
  console.log('Auth System carregado');
  
})();
