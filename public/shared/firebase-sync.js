/**
 * Firebase Sync Service - UPSEN Accounting
 * Sincroniza dados entre Firebase Firestore e localStorage
 * Firebase é a fonte primária, localStorage é backup local
 */

(function() {
  'use strict';

  // Verificar se Firebase está disponível
  function isFirebaseReady() {
    return window.firebaseDb && window.firebaseAuth && window.firebaseAuth.currentUser;
  }

  function getUserId() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return window.firebaseAuth.currentUser.uid;
    }
    return null;
  }

  // ========== COLEÇÕES DO FIREBASE ==========
  const COLLECTIONS = {
    expenses: 'expenses',
    invoicesIssued: 'invoicesIssued',
    invoicesReceived: 'invoicesReceived',
    budgets: 'budgets'
  };

  // ========== SYNC: FIREBASE → LOCALSTORAGE ==========
  /**
   * Carrega todos os dados de uma coleção do Firebase para o localStorage
   */
  async function syncCollectionToLocalStorage(collectionName) {
    if (!isFirebaseReady()) {
      console.log(`[Sync] Firebase não pronto para ${collectionName}`);
      return null;
    }

    const userId = getUserId();
    if (!userId) {
      console.log(`[Sync] Utilizador não autenticado`);
      return null;
    }

    try {
      // Usar a estrutura correta: companies/{uid}/{collection}
      const snapshot = await window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .get();

      const data = [];
      snapshot.forEach(doc => {
        const docData = doc.data();
        // Converter timestamp do Firebase para ISO string
        if (docData.createdAt && docData.createdAt.toDate) {
          docData.createdAt = docData.createdAt.toDate().toISOString();
        }
        if (docData.updatedAt && docData.updatedAt.toDate) {
          docData.updatedAt = docData.updatedAt.toDate().toISOString();
        }
        data.push({ id: doc.id, ...docData });
      });

      console.log(`[Sync] ${collectionName}: ${data.length} documentos carregados do Firebase`);

      // Salvar no localStorage com chave única por utilizador
      const baseKey = 'upsen_' + collectionName.toLowerCase();
      const userId = getUserId();
      const userKey = userId ? baseKey + '_' + userId : baseKey;
      localStorage.setItem(userKey, JSON.stringify(data));

      return data;
    } catch (error) {
      console.warn(`[Sync] Erro ao carregar ${collectionName} do Firebase:`, error.message);
      return null;
    }
  }

  /**
   * Sincroniza todas as coleções do Firebase para localStorage
   */
  async function syncAllToLocalStorage() {
    console.log('[Sync] Iniciando sincronização completa...');
    
    const results = {};
    
    for (const [key, collection] of Object.entries(COLLECTIONS)) {
      const data = await syncCollectionToLocalStorage(collection);
      results[key] = data;
    }
    
    console.log('[Sync] Sincronização completa finalizada!', results);
    return results;
  }

  // ========== SYNC: LOCALSTORAGE → FIREBASE ==========
  /**
   * Salva um documento no Firebase E no localStorage
   */
  async function saveToFirebaseAndLocalStorage(collectionName, data) {
    if (!isFirebaseReady()) {
      console.warn(`[Sync] Firebase não pronto, salvando apenas localmente`);
      return saveToLocalStorageOnly(collectionName, data);
    }

    const userId = getUserId();
    if (!userId) {
      console.warn(`[Sync] Utilizador não autenticado, salvando apenas localmente`);
      return saveToLocalStorageOnly(collectionName, data);
    }

    try {
      // Adicionar ao Firebase
      const docRef = await window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .add({
          ...data,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          userId: userId
        });

      console.log(`[Sync] Documento adicionado ao Firebase: ${docRef.id}`);

      // Atualizar o documento com o ID do Firebase
      await docRef.update({ id: docRef.id });

      // Atualizar localStorage
      const localData = getFromLocalStorage(collectionName);
      localData.push({ id: docRef.id, ...data });
      saveToLocalStorageOnly(collectionName, localData);

      return { success: true, id: docRef.id };
    } catch (error) {
      console.warn(`[Sync] Erro ao salvar no Firebase:`, error.message);
      // Fallback: salvar apenas localmente
      return saveToLocalStorageOnly(collectionName, data);
    }
  }

  /**
   * Atualiza um documento no Firebase E no localStorage
   */
  async function updateInFirebaseAndLocalStorage(collectionName, id, updates) {
    if (!isFirebaseReady()) {
      console.warn(`[Sync] Firebase não pronto, atualizando apenas localmente`);
      return updateInLocalStorageOnly(collectionName, id, updates);
    }

    const userId = getUserId();
    if (!userId) {
      console.warn(`[Sync] Utilizador não autenticado, atualizando apenas localmente`);
      return updateInLocalStorageOnly(collectionName, id, updates);
    }

    try {
      // Atualizar no Firebase
      await window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .doc(id)
        .update({
          ...updates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      console.log(`[Sync] Documento atualizado no Firebase: ${id}`);

      // Atualizar localStorage
      updateInLocalStorageOnly(collectionName, id, updates);

      return { success: true };
    } catch (error) {
      console.warn(`[Sync] Erro ao atualizar no Firebase:`, error.message);
      // Fallback: atualizar apenas localmente
      return updateInLocalStorageOnly(collectionName, id, updates);
    }
  }

  /**
   * Remove um documento do Firebase E do localStorage
   */
  async function deleteFromFirebaseAndLocalStorage(collectionName, id) {
    if (!isFirebaseReady()) {
      console.warn(`[Sync] Firebase não pronto, removendo apenas localmente`);
      return deleteFromLocalStorageOnly(collectionName, id);
    }

    const userId = getUserId();
    if (!userId) {
      console.warn(`[Sync] Utilizador não autenticado, removendo apenas localmente`);
      return deleteFromLocalStorageOnly(collectionName, id);
    }

    try {
      // Remover do Firebase
      await window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .doc(id)
        .delete();

      console.log(`[Sync] Documento removido do Firebase: ${id}`);

      // Remover do localStorage
      deleteFromLocalStorageOnly(collectionName, id);

      return { success: true };
    } catch (error) {
      console.warn(`[Sync] Erro ao remover do Firebase:`, error.message);
      // Fallback: remover apenas localmente
      return deleteFromLocalStorageOnly(collectionName, id);
    }
  }

  // ========== FUNÇÕES LOCALSTORAGE (FALLBACK) ==========
  function getLocalStorageKey(collectionName) {
    const keyMap = {
      'expenses': 'upsen_expenses',
      'invoicesIssued': 'upsen_invoices_issued',
      'invoicesReceived': 'upsen_invoices_received',
      'budgets': 'upsen_budgets'
    };
    const baseKey = keyMap[collectionName] || 'upsen_' + collectionName.toLowerCase();
    
    // Usar chave única por utilizador
    const userId = getUserId();
    if (userId) {
      return baseKey + '_' + userId;
    }
    return baseKey;
  }

  function getFromLocalStorage(collectionName) {
    const key = getLocalStorageKey(collectionName);
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToLocalStorageOnly(collectionName, data) {
    const key = getLocalStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  }

  function updateInLocalStorageOnly(collectionName, id, updates) {
    const list = getFromLocalStorage(collectionName);
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      saveToLocalStorageOnly(collectionName, list);
    }
    return { success: true };
  }

  function deleteFromLocalStorageOnly(collectionName, id) {
    const list = getFromLocalStorage(collectionName);
    const filtered = list.filter(item => item.id !== id);
    saveToLocalStorageOnly(collectionName, filtered);
    return { success: true };
  }

  // ========== OBTENER DADOS (PRIORIDADE: LOCALSTORAGE) ==========
  /**
   * Obtém dados de uma coleção - primeiro tenta localStorage,
   * se vazio, tenta carregar do Firebase
   */
  async function getCollectionData(collectionName) {
    // Primeiro tentar localStorage
    let data = getFromLocalStorage(collectionName);
    
    // Se localStorage vazio e Firebase pronto, carregar do Firebase
    if (data.length === 0 && isFirebaseReady()) {
      console.log(`[Sync] localStorage vazio para ${collectionName}, carregando do Firebase...`);
      data = await syncCollectionToLocalStorage(collectionName) || [];
    }
    
    return data;
  }

  // ========== EXPORTS ==========
  window.FirebaseSync = {
    syncAllToLocalStorage,
    syncCollectionToLocalStorage,
    saveToFirebaseAndLocalStorage,
    updateInFirebaseAndLocalStorage,
    deleteFromFirebaseAndLocalStorage,
    getCollectionData,
    getFromLocalStorage,
    isFirebaseReady,
    getUserId,
    COLLECTIONS
  };

  console.log('✅ Firebase Sync Service carregado!');
})();

