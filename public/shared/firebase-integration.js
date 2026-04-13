/**
 * Firebase Integration - UPSEN Accounting
 * Serviços: Auth e Firestore com API Compat
 * Dados guardados no Firebase Firestore
 */

(function() {
  'use strict';
  
  // Verificar se Firebase SDK está disponível
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK não carregado!');
    return;
  }
  
  // Obter configuração do firebase-config.js
  const firebaseConfig = window.FIREBASE_CONFIG || window.FIREBASE_CONFIG_OBJ;
  
  if (!firebaseConfig) {
    console.error('Firebase config não encontrada!');
    return;
  }
  
  // Inicializar Firebase
  let app, auth, db, googleProvider;
  
  try {
    // Verificar se já inicializado
    if (firebase.apps && firebase.apps.length > 0) {
      app = firebase.apps[0];
    } else {
      app = firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth(app);
    db = firebase.firestore(app);
    
    // Google Provider
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    
    // Configurar persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    
    console.log('✅ Firebase inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return;
  }
  
  // ==================== AUTH SERVICE ====================
  // Definir globalmente ANTES de criar o objeto (para não ser sobrescrito)
  window.AuthService = window.AuthService || {};

  const AuthService = {
    currentUser: null,
    currentUserData: null,
    
    // Observar estado de autenticação
    onAuthChange(callback) {
      if (!auth) {
        console.warn('Auth não inicializado');
        callback({ user: null, userData: null, isLoggedIn: false });
        return function() {};
      }
      
      return auth.onAuthStateChanged(async (user) => {
        if (user) {
          let userData = null;
          try {
            const doc = await db.collection('companies').doc(user.uid).get();
            if (doc.exists) {
              userData = { uid: doc.id, ...doc.data() };
            }
          } catch (e) {
            console.log('Erro ao obter dados do utilizador:', e);
          }
          
          this.currentUser = user;
          this.currentUserData = userData;
          callback({ user, userData, isLoggedIn: true });
        } else {
          this.currentUser = null;
          this.currentUserData = null;
          callback({ user: null, userData: null, isLoggedIn: false });
        }
      });
    },
    
    getCurrentUser() {
      return this.currentUserData || this.currentUser || null;
    },
    
    isLoggedIn() {
      return auth && auth.currentUser !== null;
    },
    
    // Registrar nova empresa/utilizador
    async register(email, password, userData) {
      // Enhanced email validation
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
        return {
          success: false,
          message: emailValidation.message,
          code: 'auth/invalid-email'
        };
      }
      
      try {
        const { user } = await auth.createUserWithEmailAndPassword(email, password);
        
        // Enviar email de verificação
        await user.sendEmailVerification();
        console.log('Email de verificação enviado');
        
        // Criar documento no Firestore
        await db.collection('companies').doc(user.uid).set({
          email: user.email,
          name: userData.name || '',
          company: userData.company || '',
          phone: userData.phone || '',
          role: 'admin',
          emailVerified: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
            currency: 'EUR',
            language: 'es',
            theme: 'light'
          }
        });
        
        // Inicializar coleções
        await this.initializeUserCollections(user.uid);
        
        // Fazer logout
        await auth.signOut();
        
        return {
          success: true,
          user: { uid: user.uid, email: user.email, ...userData },
          message: 'Conta criada! Verifica o teu email.'
        };
      } catch (error) {
        console.error('Erro no registro:', error);
        return {
          success: false,
          message: this.getErrorMessage(error.code),
          code: error.code
        };
      }
    },
    
    // Inicializar coleções do utilizador
    async initializeUserCollections(uid) {
      const collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
      for (const collection of collections) {
        await db.collection('companies').doc(uid).collection(collection).doc('_init').set({
          initialized: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    },
    
    // Login com email/password
    async login(email, password) {
      try {
        const { user } = await auth.signInWithEmailAndPassword(email, password);
        
        // Verificar email verificado
        if (!user.emailVerified) {
          await auth.signOut();
          return {
            success: false,
            message: 'Por favor verifica o teu email antes de fazer login.',
            code: 'auth/email-not-verified'
          };
        }
        
        // Atualizar último login
        await db.collection('companies').doc(user.uid).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const userData = await this.getUserData(user.uid);
        
        return {
          success: true,
          user: userData,
          message: 'Login realizado!'
        };
      } catch (error) {
        console.error('Erro no login:', error);
        return {
          success: false,
          message: this.getErrorMessage(error.code),
          code: error.code
        };
      }
    },
    
    // Login com Google
    async loginWithGoogle() {
      try {
        const { user } = await auth.signInWithPopup(googleProvider);
        
        // Criar documento se não existir
        const userDoc = await db.collection('companies').doc(user.uid).get();
        if (!userDoc.exists) {
          await db.collection('companies').doc(user.uid).set({
            email: user.email,
            name: user.displayName || '',
            company: '',
            phone: user.phoneNumber || '',
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
              currency: 'EUR',
              language: 'es',
              theme: 'light'
            }
          });
        }
        
        // Atualizar último login também para Google login
        await db.collection('companies').doc(user.uid).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const userData = await this.getUserData(user.uid);
        
        return {
          success: true,
          user: userData,
          message: 'Login com Google realizado!'
        };
      } catch (error) {
        console.error('Erro no login Google:', error);
        return {
          success: false,
          message: this.getErrorMessage(error.code),
          code: error.code
        };
      }
    },
    
    // Logout
    async logout() {
      try {
        this.currentUser = null;
        this.currentUserData = null;
        await auth.signOut();
        return { success: true, message: 'Sessão terminada!' };
      } catch (error) {
        return { success: false, message: 'Erro ao terminar sessão.' };
      }
    },
    
    // Recuperar password
    async resetPassword(email) {
      try {
        await auth.sendPasswordResetEmail(email);
        return { success: true, message: 'Email de recuperação enviado!' };
      } catch (error) {
        return { success: false, message: this.getErrorMessage(error.code) };
      }
    },
    
    // Obter dados do utilizador
    async getUserData(uid) {
      try {
        const doc = await db.collection('companies').doc(uid).get();
        if (doc.exists) {
          return { uid: doc.id, ...doc.data() };
        }
        return null;
      } catch (error) {
        console.error('Erro ao obter dados:', error);
        return null;
      }
    },
    
    // Atualizar perfil
    async updateProfile(uid, updates) {
      try {
        await db.collection('companies').doc(uid).update({
          ...updates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: 'Perfil atualizado!' };
      } catch (error) {
        return { success: false, message: 'Erro ao atualizar perfil.' };
      }
    },
    
    // Mudar password
    async changePassword(newPassword) {
      try {
        const user = auth.currentUser;
        if (!user) return { success: false, message: 'Utilizador não autenticado.' };
        await user.updatePassword(newPassword);
        return { success: true, message: 'Password alterada!' };
      } catch (error) {
        return { success: false, message: this.getErrorMessage(error.code) };
      }
    },
    
    // Mensagens de erro
    getErrorMessage(code) {
      const messages = {
        'auth/email-already-in-use': 'Este email já está registado.',
        'auth/invalid-email': 'Email inválido.',
        'auth/operation-not-allowed': 'Operação não permitida.',
        'auth/weak-password': 'Password muito fraca.',
        'auth/user-disabled': 'Conta desativada.',
        'auth/user-not-found': 'Utilizador não encontrado.',
        'auth/wrong-password': 'Password incorreta.',
        'auth/popup-closed-by-user': 'Janela de login cancelada.',
        'auth/network-request-failed': 'Erro de rede.',
        'auth/too-many-requests': 'Muitas tentativas. Tenta novamente mais tarde.'
      };
      return messages[code] || 'Ocorreu um erro. Tente novamente.';
    }
  };
  
  // ==================== FIRESTORE SERVICE ====================
  const FirestoreService = {
    getCollectionPath(collectionName) {
      const user = auth && auth.currentUser;
      if (!user) throw new Error('Utilizador não autenticado.');
      return `companies/${user.uid}/${collectionName}`;
    },
    
    // Adicionar documento (alias: create)
    async add(collectionName, data) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        const docRef = await db.collection(`companies/${user.uid}/${collectionName}`).add({
          ...data,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: user.uid
        });
        return { success: true, id: docRef.id };
      } catch (error) {
        console.error('Erro ao adicionar:', error);
        return { success: false, message: error.message };
      }
    },
    
    // Alias para add (compatibilidade)
    async create(collectionName, data) {
      return this.add(collectionName, data);
    },
    
    // Obter documento por ID
    async getById(collectionName, id) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        const doc = await db.collection(`companies/${user.uid}/${collectionName}`).doc(id).get();
        if (doc.exists) {
          return { success: true, data: { id: doc.id, ...doc.data() } };
        }
        return { success: false, message: 'Documento não encontrado.' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    
    // Obter todos os documentos
    async getAll(collectionName) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        const snapshot = await db.collection(`companies/${user.uid}/${collectionName}`)
          .orderBy('createdAt', 'desc')
          .get();
        
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: docs };
      } catch (error) {
        console.error('Erro ao obter todos:', error);
        return { success: false, message: error.message, data: [] };
      }
    },
    
    // Atualizar documento
    async update(collectionName, id, data) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        await db.collection(`companies/${user.uid}/${collectionName}`).doc(id).update({
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    
    // Eliminar documento
    async delete(collectionName, id) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        await db.collection(`companies/${user.uid}/${collectionName}`).doc(id).delete();
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    
    // Observar alterações em coleção
    subscribeToCollection(collectionName, callback) {
      const user = auth && auth.currentUser;
      if (!user) {
        callback([]);
        return function() {};
      }
      
      return db.collection(`companies/${user.uid}/${collectionName}`)
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(docs);
          },
          (error) => console.error('Erro no snapshot:', error)
        );
    },
    
    // Contar documentos
    async count(collectionName) {
      try {
        const user = auth && auth.currentUser;
        if (!user) return 0;
        
        const snapshot = await db.collection(`companies/${user.uid}/${collectionName}`).count().get();
        return snapshot.data().count;
      } catch {
        return 0;
      }
    },
    
    // Obter documento único (sem array)
    async getDocument(collectionName, docId) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        const doc = await db.collection(`companies/${user.uid}/${collectionName}`).doc(docId).get();
        if (doc.exists) {
          return { success: true, data: { id: doc.id, ...doc.data() } };
        }
        return { success: false, message: 'Documento não encontrado.' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    
    // Definir documento
    async setDocument(collectionName, docId, data) {
      try {
        const user = auth && auth.currentUser;
        if (!user) throw new Error('Utilizador não autenticado.');
        
        await db.collection(`companies/${user.uid}/${collectionName}`).doc(docId).set({
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  };
  
  // ==================== AUTH GUARD ====================
  const AuthGuard = {
    requireAuth(redirectTo = '../login.html') {
      const user = auth && auth.currentUser;
      if (!user) {
        window.location.href = redirectTo;
        return false;
      }
      return true;
    },
    
    init(publicPages = ['login.html', 'index.html']) {
      const currentPage = window.location.pathname.split('/').pop();
      
      if (!publicPages.includes(currentPage) && !AuthService.isLoggedIn()) {
        window.location.href = '../login.html';
        return false;
      }
      
      if (currentPage === 'login.html' && AuthService.isLoggedIn()) {
        window.location.href = '../frontPage/frontPage.html';
        return false;
      }
      
      return true;
    },
    
    watch(redirectTo = '../login.html') {
      return AuthService.onAuthChange(({ isLoggedIn }) => {
        const currentPage = window.location.pathname.split('/').pop();
        const isPublicPage = ['login.html', 'index.html'].includes(currentPage);
        
        if (!isLoggedIn && !isPublicPage) {
          window.location.href = redirectTo;
        } else if (isLoggedIn && isPublicPage) {
          window.location.href = '../frontPage/frontPage.html';
        }
      });
    }
  };
  
  // ==================== EXPORTS GLOBAIS ====================
  // Não sobrescrever se já existem (de outros scripts)
  window.FirebaseApp = window.FirebaseApp || {
    initialize: function() {
      return Promise.resolve({ auth: AuthService, db: FirestoreService });
    },
    auth: AuthService,
    firestore: FirestoreService,
    guard: AuthGuard,
    config: firebaseConfig
  }; 
  
  // AuthService já definido acima
  // FirestoreService - não sobrescrever
  window.FirestoreService = window.FirestoreService || FirestoreService;
  window.AuthGuard = window.AuthGuard || AuthGuard;
  
  // Guardar referências
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  
  console.log('Firebase Integration carregado!');
  
})();

