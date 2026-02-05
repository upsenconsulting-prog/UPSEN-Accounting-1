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
    
    if (USE_EMULATORS) {
      console.log('🔧 Firebase Emulators mode ativo (desenvolvimento local)');
    }
    
    return { app, db, auth };
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return { app: null, db: null, auth: null };
  }
}

// ===== FIRESTORE SERVICE =====
export const FirestoreService = {
  async init() {
    const result = await initFirebase();
    return result.db !== null;
  },
  
  isAvailable() {
    return db !== null;
  },
  
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
  }
};

// ===== AUTHENTICATION SERVICE =====
export const AuthService = {
  async init() {
    const result = await initFirebase();
    return result.auth !== null;
  },
  
  isAvailable() {
    return auth !== null;
  },
  
  onAuthChange(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  },
  
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
  
  async register(companyName, email, password, phone) {
    if (!auth) {
      return { success: false, message: 'Firebase Auth não disponível' };
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: companyName
      });
      
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
  
  async logout() {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  },
  
  async resetPassword(email) {
    if (!auth) {
      return { success: false, message: 'Firebase Auth não disponível' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Email de recuperação enviado' };
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return { 
        success: false, 
        message: 'Erro ao enviar email' 
      };
    }
  }
};

export { app, db, auth };

