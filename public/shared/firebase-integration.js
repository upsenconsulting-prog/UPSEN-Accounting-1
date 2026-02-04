/**
 * Firebase Integration - UPSEN Accounting
 * Sistema completo de autenticação e base de dados
 * Suporta: Firebase Auth + Firestore + Firebase Emulators
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Importar configuração
import { firebaseConfig, USE_EMULATORS } from './firebase-config.js';

// ===== INICIALIZAÇÃO FIREBASE =====
let app = null;
let db = null;
let auth = null;

async function initFirebase() {
  if (app) return { app, db, auth };
  
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Configurar emulators se estiver em desenvolvimento
    if (USE_EMULATORS) {
      console.log('🔧 Firebase Emulators mode ativo (desenvolvimento local)');
      // Os emulators são configurados automaticamente via .firebaserc
    }
    
    return { app, db, auth };
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return { app: null, db: null, auth: null };
  }
}

// ===== FIRESTORE SERVICE =====
export const FirestoreService = {
  // Inicializar serviço
  async init() {
    const result = await initFirebase();
    return result.db !== null;
  },
  
  // Verificar se Firestore está disponível
  isAvailable() {
    return db !== null;
  },
  
  // ===== OPERAÇÕES DE USUÁRIO (companies) =====
  
  // Criar documento de utilizador/empresa
  async createUser(userData) {
    if (!db) return null;
    
    try {
      const userRef = doc(db, 'users', userData.id);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return userData;
    } catch (error) {
      console.error('Erro ao criar utilizador:', error);
      throw error;
    }
  },
  
  // Obter dados do utilizador
  async getUser(userId) {
    if (!db) return null;
    
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
    } catch (error) {
      console.error('Erro ao obter utilizador:', error);
      return null;
    }
  },
  
  // Atualizar utilizador
  async updateUser(userId, updates) {
    if (!db) return false;
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar utilizador:', error);
      return false;
    }
  },
  
  // ===== SUBCOLECTIONS POR EMPRESA =====
  
  // Adicionar documento à subcollection do utilizador
  async addDocument(userId, collectionName, docData) {
    if (!db) return null;
    
    try {
      const colRef = collection(db, 'users', userId, collectionName);
      const docRef = doc(colRef);
      await setDoc(docRef, {
        ...docData,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error('Erro ao adicionar documento:', error);
      throw error;
    }
  },
  
  // Obter todos os documentos de uma subcollection
  async getDocuments(userId, collectionName) {
    if (!db) return [];
    
    try {
      const colRef = collection(db, 'users', userId, collectionName);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao obter documentos:', error);
      return [];
    }
  },
  
  // Obter documentos com filtros
  async getDocumentsFiltered(userId, collectionName, filters = []) {
    if (!db) return [];
    
    try {
      const colRef = collection(db, 'users', userId, collectionName);
      let q = query(colRef);
      
      filters.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao filtrar documentos:', error);
      return [];
    }
  },
  
  // Atualizar documento
  async updateDocument(userId, collectionName, docId, updates) {
    if (!db) return false;
    
    try {
      const docRef = doc(db, 'users', userId, collectionName, docId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      return false;
    }
  },
  
  // Eliminar documento
  async deleteDocument(userId, collectionName, docId) {
    if (!db) return false;
    
    try {
      const docRef = doc(db, 'users', userId, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Erro ao eliminar documento:', error);
      return false;
    }
  },
  
  // ===== MIGRAÇÃO DE DADOS =====
  
  // Migrar dados do localStorage para Firestore
  async migrateFromLocalStorage(userId) {
    if (!db) return { success: false, message: 'Firestore não disponível' };
    
    try {
      // Obter dados do localStorage
      const dataKeys = [
        'upsen_invoices_received',
        'upsen_invoices_issued', 
        'upsen_expenses',
        'upsen_budgets'
      ];
      
      const results = {};
      
      for (const key of dataKeys) {
        const localData = localStorage.getItem(`${key}_${userId}`);
        if (localData) {
          const documents = JSON.parse(localData);
          const collectionName = key.replace('upsen_', '');
          
          // Adicionar cada documento
          for (const doc of documents) {
            await this.addDocument(userId, collectionName, doc);
          }
          
          results[collectionName] = documents.length;
        }
      }
      
      return { success: true, migrated: results };
    } catch (error) {
      console.error('Erro na migração:', error);
      return { success: false, message: error.message };
    }
  },
  
  // Exportar dados do Firestore para JSON
  async exportUserData(userId) {
    if (!db) return null;
    
    try {
      const collections = ['invoices_received', 'invoices_issued', 'expenses', 'budgets'];
      const data = {};
      
      for (const colName of collections) {
        data[colName] = await this.getDocuments(userId, colName);
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      return null;
    }
  }
};

// ===== AUTHENTICATION SERVICE =====
export const AuthService = {
  // Inicializar serviço de auth
  async init() {
    const result = await initFirebase();
    return result.auth !== null;
  },
  
  isAvailable() {
    return auth !== null;
  },
  
  // Observar estado de autenticação
  onAuthChange(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }
    
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  },
  
  // Login com email e password
  async login(email, password) {
    if (!auth) {
      return { success: false, message: 'Firebase Auth não disponível' };
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await FirestoreService.getUser(userCredential.user.uid);
      
      return { 
        success: true, 
        user: userData || {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          companyName: userCredential.user.displayName || 'Empresa'
        }
      };
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Mensagens de erro em português
      const errorMessages = {
        'auth/user-not-found': 'Utilizador não encontrado',
        'auth/wrong-password': 'Password incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Demasiadas tentativas. Aguarde uns minutos.'
      };
      
      return { 
        success: false, 
        message: errorMessages[error.code] || 'Erro ao iniciar sessão' 
      };
    }
  },
  
  // Registar nova empresa
  async register(companyName, email, password, phone) {
    if (!auth) {
      return { success: false, message: 'Firebase Auth não disponível' };
    }
    
    try {
      // Criar conta no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil com nome da empresa
      await updateProfile(userCredential.user, {
        displayName: companyName
      });
      
      // Criar documento do utilizador na Firestore
      const userData = {
        id: userCredential.user.uid,
        companyName,
        email,
        phone,
        role: 'admin',
        settings: {
          currency: 'EUR',
          language: 'pt',
          theme: 'light'
        }
      };
      
      await FirestoreService.createUser(userData);
      
      // Inicializar subcollections vazias
      await this.initUserCollections(userCredential.user.uid);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro no registo:', error);
      
      const errorMessages = {
        'auth/email-already-in-use': 'Este email já está registado',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'A password deve ter pelo menos 6 caracteres'
      };
      
      return { 
        success: false, 
        message: errorMessages[error.code] || 'Erro ao criar conta' 
      };
    }
  },
  
  // Inicializar colecções vazias para novo utilizador
  async initUserCollections(userId) {
    const collections = ['invoices_received', 'invoices_issued', 'expenses', 'budgets'];
    
    for (const colName of collections) {
      const colRef = collection(db, 'users', userId, colName);
      // Apenas criar a referência (subcollections são criadas automaticamente)
    }
  },
  
  // Logout
  async logout() {
    if (!auth) return;
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  },
  
  // Reset password
  async resetPassword(email) {
    if (!auth) {
      return { success: false, message: 'Firebase Auth não disponível' };
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Email de recuperação enviado' };
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      
      const errorMessages = {
        'auth/user-not-found': 'Utilizador não encontrado',
        'auth/invalid-email': 'Email inválido'
      };
      
      return { 
        success: false, 
        message: errorMessages[error.code] || 'Erro ao enviar email' 
      };
    }
  }
};

// Exportar instância do Firebase
export { app, db, auth };

