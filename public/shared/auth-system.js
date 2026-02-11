
/**
 * ============================================
 * SISTEMA DE AUTENTICAÇÃO UPSEN ACCOUNTING
 * Firebase Auth + Firestore para dados
 * Suporta usuários demo em localStorage
 * @version 2.4.0 - Correção de inicialização
 */

// Variáveis globais
window.USE_FIREBASE = false;
window.firebaseAuth = null;
window.firebaseDb = null;
window.firebaseReady = false;

// Inicializar Firebase com retry
function initFirebaseNow() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 100;
    
    const check = () => {
      attempts++;
      
      // Primeiro verificar se firebase está definido
      if (typeof firebase === 'undefined') {
        if (attempts < maxAttempts) {
          setTimeout(check, 50);
        } else {
          console.warn('Firebase SDK nunca carregou');
          resolve(false);
        }
        return;
      }
      
      // Verificar se apps existe
      if (!firebase.apps) {
        if (attempts < maxAttempts) {
          setTimeout(check, 50);
        } else {
          console.warn('firebase.apps não existe');
          resolve(false);
        }
        return;
      }
      
      // Verificar se já existe app inicializado
      if (firebase.apps.length > 0) {
        const config = window.FIREBASE_CONFIG;
        if (config) {
          try {
            const app = firebase.app();
            window.firebaseAuth = firebase.auth(app);
            window.firebaseDb = firebase.firestore(app);
            window.USE_FIREBASE = true;
            window.firebaseReady = true;
            console.log('Firebase conectado a app existente');
            resolve(true);
            return;
          } catch (error) {
            console.error('Erro ao conectar a app existente:', error);
          }
        }
      }
      
      // Inicializar novo app
      const config = window.FIREBASE_CONFIG;
      if (config) {
        try {
          const app = firebase.initializeApp(config);
          window.firebaseAuth = firebase.auth(app);
          window.firebaseDb = firebase.firestore(app);
          window.USE_FIREBASE = true;
          window.firebaseReady = true;
          console.log('Firebase inicializado com sucesso');
          resolve(true);
          return;
        } catch (error) {
          console.error('Erro ao inicializar Firebase:', error);
          resolve(false);
          return;
        }
      }
      
      // Sem configuração
      if (attempts < maxAttempts) {
        setTimeout(check, 50);
      } else {
        console.warn('Configuração Firebase não encontrada');
        resolve(false);
      }
    };
    
    check();
  });
}

// Inicializar imediatamente
initFirebaseNow().then((success) => {
  window.initFirebaseComplete = true;
  console.log('Firebase init complete:', success, 'Mode:', success ? 'Firebase' : 'Demo');
});

// AuthSystem
const AuthSystem = {
  CURRENT_USER_KEY: 'upsen_current_user',
  USERS_KEY: 'upsen_users',
  DEMO_USERS_LOADED: false,
  firebaseInitialized: false,
  
  // Inicializar
  init(callback) {
    const self = this;
    
    // Aguardar Firebase se ainda não estiver pronto
    const waitAndInit = () => {
      if (window.firebaseReady && window.USE_FIREBASE && window.firebaseAuth) {
        // Firebase pronto, usar Auth
        window.firebaseAuth.onAuthStateChanged(async (user) => {
          if (user) {
            await self.loadFirebaseUserData(user);
          } else {
            self.clearFirebaseSession();
          }
          
          const currentUser = self.getCurrentUser();
          if (callback) {
            callback({ isLoggedIn: self.isLoggedIn(), userData: currentUser, user: currentUser });
          }
        });
      } else {
        // Firebase não disponível, usar modo demo
        setTimeout(waitAndInit, 100);
      }
    };
    
    // Se Firebase já estiver pronto
    if (window.firebaseReady) {
      waitAndInit();
    } else {
      // Aguardar
      let waitAttempts = 0;
      const waitForFirebase = () => {
        waitAttempts++;
        if (window.firebaseReady) {
          waitAndInit();
        } else if (waitAttempts < 50) {
          setTimeout(waitForFirebase, 100);
        } else {
          // Firebase não ficou pronto, usar demo
          this.initDemoMode();
          const currentUser = this.getCurrentUser();
          if (callback) {
            callback({ isLoggedIn: this.isLoggedIn(), userData: currentUser, user: currentUser });
          }
        }
      };
      waitForFirebase();
    }
  },
  
  // Carregar dados do usuário do Firebase
  async loadFirebaseUserData(user) {
    const self = this;
    
    // Criar dados do usuário
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || '',
      company: '',
      phone: user.phoneNumber || '',
      role: 'admin',
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      settings: { currency: 'EUR', language: 'pt', theme: 'light' }
    };
    
    try {
      const docRef = window.firebaseDb.collection('companies').doc(user.uid);
      
      // Tentar criar documento
      try {
        await docRef.set(userData, { merge: true });
        console.log('Documento criado/atualizado no Firestore:', user.email);
      } catch (setError) {
        console.warn('Não foi possível criar documento no Firestore:', setError.message);
        // Continuar mesmo assim - usar dados locais
      }
      
      // Tentar ler documento (para garantir que temos dados atualizados)
      try {
        const doc = await docRef.get();
        if (doc.exists) {
          const firestoreData = doc.data();
          // Mesclar dados do Firestore
          Object.assign(userData, firestoreData);
        }
      } catch (getError) {
        console.warn('Não foi possível ler documento do Firestore:', getError.message);
      }
      
      self.saveSession(userData, true);
      console.log('Usuário Firebase carregado:', user.email);
      
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      // Fallback: criar sessão com dados básicos
      self.saveSession(userData, true);
    }
  },
  
  clearFirebaseSession() {
    const session = localStorage.getItem(this.CURRENT_USER_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data.useFirebase) {
          localStorage.removeItem(this.CURRENT_USER_KEY);
        }
      } catch (e) {
        localStorage.removeItem(this.CURRENT_USER_KEY);
      }
    }
  },
  
  // Modo demo
  initDemoMode() {
    this.createDemoUsers();
    this.cleanExpiredSessions();
    console.log('Modo demo ativado');
  },
  
  // Utilitários
  hash(str) {
    if (!str) return '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },
  
  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  },
  
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch {
      return [];
    }
  },
  
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },
  
  // Usuários demo
  createDemoUsers() {
    if (this.DEMO_USERS_LOADED) return;
    
    const users = this.getUsers();
    if (users.length === 0) {
      users.push({
        id: 'demo_admin',
        email: 'admin@demo.com',
        password: this.hash('demo123'),
        name: 'Administrador',
        company: 'UPSEN Demo',
        phone: '+351 123 456 789',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        settings: { currency: 'EUR', language: 'pt', theme: 'light', notifications: true }
      });
      
      users.push({
        id: 'test_user',
        email: 'test@example.com',
        password: this.hash('123456'),
        name: 'Utilizador Teste',
        company: 'Empresa Teste',
        phone: '+351 000 000 000',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        settings: { currency: 'EUR', language: 'pt', theme: 'light', notifications: true }
      });
      
      this.saveUsers(users);
      this.initUserData('demo_admin');
      this.initUserData('test_user');
      this.createDemoData('demo_admin');
      this.createDemoData('test_user');
      
      console.log('Usuários demo criados');
      console.log('→ admin@demo.com / demo123');
      console.log('→ test@example.com / 123456');
    }
    
    this.DEMO_USERS_LOADED = true;
  },
  
  initUserData(userId) {
    const dataKeys = ['upsen_invoices_received', 'upsen_invoices_issued', 'upsen_expenses', 'upsen_budgets'];
    dataKeys.forEach(key => {
      const userDataKey = `${key}_${userId}`;
      if (!localStorage.getItem(userDataKey)) {
        localStorage.setItem(userDataKey, '[]');
      }
    });
  },
  
  createDemoData(userId) {
    const existingData = localStorage.getItem(`upsen_invoices_received_${userId}`);
    if (existingData && existingData !== '[]') return;
    
    const demoInvoices = [
      { id: this.generateId(), invoiceNumber: 'FR-2025-001', supplier: 'Fornecedor ABC', invoiceDate: '2025-01-15', amount: 1500, state: 'Pago', description: 'Serviços de consultoria', createdAt: new Date().toISOString() },
      { id: this.generateId(), invoiceNumber: 'FR-2025-002', supplier: 'Fornecedor XYZ', invoiceDate: '2025-01-20', amount: 2300, state: 'Pendiente', description: 'Material de escritório', createdAt: new Date().toISOString() }
    ];
    
    const demoIssued = [
      { id: this.generateId(), invoiceNumber: 'FV-2025-001', customer: 'Cliente S.A.', invoiceDate: '2025-01-10', dueDate: '2025-02-10', amount: 5000, state: 'Pago', description: 'Projeto de desenvolvimento', createdAt: new Date().toISOString() }
    ];
    
    const demoExpenses = [
      { id: this.generateId(), date: '2025-01-05', category: 'Material', description: 'Material de escritório', amount: 150, paymentMethod: 'Transferência', createdAt: new Date().toISOString() }
    ];
    
    const demoBudgets = [
      { id: this.generateId(), number: 'ORC-2025-001', series: 'Presupuestos', customer: 'Cliente Principal', date: '2025-01-15', validity: '2025-02-15', total: 8000, status: 'pending', notes: 'Projeto completo', items: [], createdAt: new Date().toISOString() }
    ];
    
    localStorage.setItem(`upsen_invoices_received_${userId}`, JSON.stringify(demoInvoices));
    localStorage.setItem(`upsen_invoices_issued_${userId}`, JSON.stringify(demoIssued));
    localStorage.setItem(`upsen_expenses_${userId}`, JSON.stringify(demoExpenses));
    localStorage.setItem(`upsen_budgets_${userId}`, JSON.stringify(demoBudgets));
  },
  
  // Sessão
  saveSession(user, useFirebase) {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
      user: user,
      loginTime: Date.now(),
      useFirebase: useFirebase
    }));
  },
  
  // Dados do usuário
  getUserData(key) {
    const user = this.getCurrentUser();
    if (!user) return [];
    
    try {
      const data = localStorage.getItem(`${key}_${user.id}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveUserData(key, data) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    localStorage.setItem(`${key}_${user.id}`, JSON.stringify(data));
    return true;
  },
  
  // Login
  async login(email, password) {
    if (window.USE_FIREBASE && window.firebaseAuth) {
      try {
        const { user } = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        
        if (!user.emailVerified) {
          await window.firebaseAuth.signOut();
          return { success: false, message: 'Por favor verifica o teu email antes de fazer login.' };
        }
        
        let userData = null;
        try {
          const doc = await window.firebaseDb.collection('companies').doc(user.uid).get();
          if (doc.exists) {
            userData = { uid: doc.id, ...doc.data() };
          }
        } catch (e) {
          console.log('Erro ao obter dados do Firestore:', e);
        }
        
        if (!userData) {
          userData = {
            uid: user.uid,
            email: user.email,
            name: '',
            company: '',
            role: 'user',
            settings: { currency: 'EUR', language: 'pt', theme: 'light' }
          };
          try {
            await window.firebaseDb.collection('companies').doc(user.uid).set(userData);
          } catch (e) {
            console.log('Erro ao criar documento:', e);
          }
        }
        
        this.saveSession(userData, true);
        return { success: true, user: userData };
      } catch (error) {
        console.error('Erro login Firebase:', error.code, error.message);
        return { success: false, message: this.getErrorMessage(error.code) };
      }
    } else {
      return this.loginDemo(email, password);
    }
  },
  
  // Login modo demo
  loginDemo(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim() && u.password === this.hash(password));
    
    if (user) {
      const users = this.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index].lastLogin = new Date().toISOString();
        this.saveUsers(users);
      }
      
      const sessionUser = { ...user, password: undefined };
      this.saveSession(sessionUser, false);
      return { success: true, user: sessionUser };
    }
    
    return { success: false, message: 'Email ou password incorretos' };
  },
  
  // Registro
  async register(email, password, userData) {
    if (window.USE_FIREBASE && window.firebaseAuth) {
      try {
        const { user } = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
        await user.sendEmailVerification();
        
        const userDoc = {
          email: user.email,
          name: userData.name || '',
          company: userData.company || '',
          phone: userData.phone || '',
          role: 'admin',
          emailVerified: false,
          createdAt: new Date().toISOString(),
          settings: { currency: 'EUR', language: 'pt', theme: 'light' }
        };
        
        await window.firebaseDb.collection('companies').doc(user.uid).set(userDoc);
        await window.firebaseAuth.signOut();
        
        return { success: true, message: 'Conta criada! Verifica o teu email para ativar.' };
      } catch (error) {
        console.error('Erro registro Firebase:', error.code, error.message);
        return { success: false, message: this.getErrorMessage(error.code) };
      }
    } else {
      return this.registerDemo(email, password, userData);
    }
  },
  
  // Registro modo demo
  registerDemo(email, password, userData) {
    const users = this.getUsers();
    
    if (users.find(u => u.email === email.toLowerCase().trim())) {
      return { success: false, message: 'Este email já está registado' };
    }
    
    if (password.length < 6) {
      return { success: false, message: 'Password deve ter pelo menos 6 caracteres' };
    }
    
    const newUser = {
      id: this.generateId(),
      name: userData.name || userData.name,
      email: email.toLowerCase().trim(),
      password: this.hash(password),
      company: userData.company || '',
      phone: userData.phone || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      settings: { currency: 'EUR', language: 'pt', theme: 'light', notifications: true }
    };
    
    users.push(newUser);
    this.saveUsers(users);
    this.initUserData(newUser.id);
    
    const sessionUser = { ...newUser, password: undefined };
    this.saveSession(sessionUser, false);
    
    return { success: true, user: sessionUser, message: 'Conta criada com sucesso' };
  },
  
  // Login Google
  async loginWithGoogle() {
    if (!window.USE_FIREBASE || !window.firebaseAuth) {
      return { success: false, message: 'Google Login não disponível' };
    }
    
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const { user } = await window.firebaseAuth.signInWithPopup(provider);
      
      const doc = await window.firebaseDb.collection('companies').doc(user.uid).get();
      if (!doc.exists) {
        await window.firebaseDb.collection('companies').doc(user.uid).set({
          email: user.email,
          name: user.displayName || '',
          company: '',
          phone: user.phoneNumber || '',
          role: 'admin',
          createdAt: new Date().toISOString(),
          settings: { currency: 'EUR', language: 'pt', theme: 'light' }
        });
      }
      
      const userData = { uid: user.uid, ...doc.data() };
      this.saveSession(userData, true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro Google Login:', error);
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  },
  
  // Logout
  async logout() {
    if (window.USE_FIREBASE && window.firebaseAuth) {
      try {
        await window.firebaseAuth.signOut();
      } catch (error) {
        console.error('Erro logout:', error);
      }
    }
    
    localStorage.removeItem(this.CURRENT_USER_KEY);
    return { success: true, message: 'Sessão terminada' };
  },
  
  // Usuário atual
  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.CURRENT_USER_KEY);
      if (!session) return null;
      
      const data = JSON.parse(session);
      
      if (window.USE_FIREBASE && data.useFirebase && !window.firebaseAuth?.currentUser) {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        return null;
      }
      
      return data.user;
    } catch {
      return null;
    }
  },
  
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },
  
  // Perfil
  async updateProfile(updates) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: 'Não está logado' };
    
    if (window.USE_FIREBASE && user.uid) {
      try {
        await window.firebaseDb.collection('companies').doc(user.uid).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        this.saveSession({ ...user, ...updates }, true);
        return { success: true, message: 'Perfil atualizado!' };
      } catch (error) {
        return { success: false, message: 'Erro ao atualizar perfil' };
      }
    } else {
      const users = this.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        this.saveUsers(users);
        this.saveSession({ ...users[index], password: undefined }, false);
        return { success: true, message: 'Perfil atualizado' };
      }
      
      return { success: false, message: 'Utilizador não encontrado' };
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
      'auth/too-many-requests': 'Muitas tentativas. Tenta novamente mais tarde.',
      'auth/email-not-verified': 'Por favor verifica o teu email.',
      'auth/unauthorized-domain': 'Domínio não autorizado.',
      'auth/internal-error': 'Erro interno. Verifique o console.',
      'auth/cancelled-popup-request': 'Janela cancelada.'
    };
    return messages[code] || 'Ocorreu um erro. Tente novamente: ' + (code || '');
  },
  
  cleanExpiredSessions() {
    try {
      const session = localStorage.getItem(this.CURRENT_USER_KEY);
      if (session) {
        const data = JSON.parse(session);
        if (!data.useFirebase && Date.now() - data.loginTime > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(this.CURRENT_USER_KEY);
        }
      }
    } catch {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  },
  
  getAllUsers() {
    return this.getUsers().map(u => ({
      id: u.id, name: u.name, email: u.email, company: u.company, role: u.role, lastLogin: u.lastLogin
    }));
  }
};

// Expor globalmente - NÃO sobrescrever AuthService se firebase-integration já definiu!
// O firebase-integration.js deve ser carregado ANTES deste ficheiro
window.AuthSystem = AuthSystem;
window.Auth = AuthSystem;

// Se AuthService ainda não tem create(), usar AuthSystem como fallback
if (!window.AuthService || !window.AuthService.create) {
  window.AuthService = AuthSystem;
}

// FirestoreService - NÃO sobrescrever se firebase-integration já definiu!
// O firebase-integration.js deve ser carregado ANTES deste ficheiro
if (!window.FirestoreService || !window.FirestoreService.create) {
  window.FirestoreService = {
    // Helper para obter chave de dados do usuário
    getDataKey(collectionName) {
      const user = AuthSystem.getCurrentUser();
      if (!user) return null;
      return `upsen_${collectionName}_${user.id}`;
    },
    
    // Obter todos os documentos
    async getAll(collectionName) {
      const key = this.getDataKey(collectionName);
      if (!key) return { success: false, data: [] };
      
      // Primeiro tentar Firestore
      if (window.USE_FIREBASE && window.firebaseDb && AuthSystem.getCurrentUser()?.uid) {
        try {
          const user = AuthSystem.getCurrentUser();
          const snapshot = await window.firebaseDb
            .collection('companies').doc(user.uid)
            .collection(collectionName)
            .orderBy('createdAt', 'desc')
            .get();
          
          if (!snapshot.empty) {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Guardar em localStorage como cache
            localStorage.setItem(key, JSON.stringify(docs));
            return { success: true, data: docs };
          }
        } catch (error) {
          console.warn('Firestore getAll falhou, usando localStorage:', error.message);
        }
      }
      
      // Fallback para localStorage
      try {
        const data = localStorage.getItem(key);
        const items = data ? JSON.parse(data) : [];
        return { success: true, data: items };
      } catch {
        return { success: false, data: [], message: 'Erro ao carregar dados' };
      }
    },
    
    // Criar documento (alias: add)
    async create(collectionName, data) {
      const key = this.getDataKey(collectionName);
      if (!key) return { success: false, message: 'Usuário não autenticado' };
      
      const user = AuthSystem.getCurrentUser();
      const newDoc = {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'unknown'
      };
      
      // Primeiro tentar Firestore
      if (window.USE_FIREBASE && window.firebaseDb && user?.uid) {
        try {
          await window.firebaseDb
            .collection('companies').doc(user.uid)
            .collection(collectionName)
            .add(newDoc);
          console.log('Documento criado no Firestore');
          return { success: true };
        } catch (error) {
          console.warn('Firestore create falhou, usando localStorage:', error.message);
        }
      }
      
      // Fallback para localStorage
      try {
        const items = await this.getAll(collectionName);
        const itemsArray = items.data || items;
        itemsArray.push(newDoc);
        localStorage.setItem(key, JSON.stringify(itemsArray));
        return { success: true };
      } catch {
        return { success: false, message: 'Erro ao guardar dados' };
      }
    },
    
    // Alias para create
    async add(collectionName, data) {
      return this.create(collectionName, data);
    },
    
    // Atualizar documento
    async update(collectionName, id, data) {
      const key = this.getDataKey(collectionName);
      if (!key) return { success: false };
      
      const user = AuthSystem.getCurrentUser();
      
      // Primeiro tentar Firestore
      if (window.USE_FIREBASE && window.firebaseDb && user?.uid) {
        try {
          await window.firebaseDb
            .collection('companies').doc(user.uid)
            .collection(collectionName).doc(id)
            .update({ ...data, updatedAt: new Date().toISOString() });
          return { success: true };
        } catch (error) {
          console.warn('Firestore update falhou, usando localStorage:', error.message);
        }
      }
      
      // Fallback para localStorage
      try {
        const itemsResult = await this.getAll(collectionName);
        const items = itemsResult.data || itemsResult;
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
          localStorage.setItem(key, JSON.stringify(items));
          return { success: true };
        }
        return { success: false, message: 'Documento não encontrado' };
      } catch {
        return { success: false };
      }
    },
    
    // Eliminar documento
    async delete(collectionName, id) {
      const key = this.getDataKey(collectionName);
      if (!key) return { success: false };
      
      const user = AuthSystem.getCurrentUser();
      
      // Primeiro tentar Firestore
      if (window.USE_FIREBASE && window.firebaseDb && user?.uid) {
        try {
          await window.firebaseDb
            .collection('companies').doc(user.uid)
            .collection(collectionName).doc(id)
            .delete();
          return { success: true };
        } catch (error) {
          console.warn('Firestore delete falhou, usando localStorage:', error.message);
        }
      }
      
      // Fallback para localStorage
      try {
        const itemsResult = await this.getAll(collectionName);
        const items = itemsResult.data || itemsResult;
        const filtered = items.filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
        return { success: true };
      } catch {
        return { success: false };
      }
    }
  };
}

