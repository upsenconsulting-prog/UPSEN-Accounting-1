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
   * Suporta múltiplas estruturas de dados:
   * - companies/{uid}/{collection} (estrutura correta)
   * - users/{uid}/{uid}/documents/{collection}/items (estrutura legado)
   * 
   * Se encontrar dados na estrutura legacy, copia automaticamente para a nova estrutura
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

    let data = [];
    let sourceFound = '';
    let needsMigration = false;

    try {
      // Tentar primeira estrutura: companies/{uid}/{collection}
      console.log(`[Sync] A tentar companies/{uid}/${collectionName}...`);
      const snapshot1 = await window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .get();

      snapshot1.forEach(doc => {
        if (doc.id === '_init') return;
        const docData = doc.data();
        if (docData.createdAt && docData.createdAt.toDate) {
          docData.createdAt = docData.createdAt.toDate().toISOString();
        }
        if (docData.updatedAt && docData.updatedAt.toDate) {
          docData.updatedAt = docData.updatedAt.toDate().toISOString();
        }
        data.push({ id: doc.id, ...docData });
        console.log(`[Sync] Documento encontrado em companies:`, doc.id);
      });

      if (data.length > 0) {
        sourceFound = 'companies';
      }
    } catch (error) {
      console.warn(`[Sync] Erro ao ler companies:`, error.message);
    }

    // Se não encontrou dados, tentar estrutura legacy: users/{uid}/{uid}/documents/{collection}/items
    if (data.length === 0) {
      console.log(`[Sync] A tentar users/${userId}/${userId}/documents/${collectionName}/items...`);
      try {
        const snapshot2 = await window.firebaseDb
          .collection('users')
          .doc(userId)
          .collection(userId)
          .doc('documents')
          .collection(collectionName)
          .collection('items')
          .get();

        snapshot2.forEach(doc => {
          const docData = doc.data();
          if (docData.createdAt && docData.createdAt.toDate) {
            docData.createdAt = docData.createdAt.toDate().toISOString();
          }
          if (docData.updatedAt && docData.updatedAt.toDate) {
            docData.updatedAt = docData.updatedAt.toDate().toISOString();
          }
          data.push({ id: doc.id, ...docData });
          console.log(`[Sync] Documento encontrado em users (legacy):`, doc.id);
        });

        if (data.length > 0) {
          sourceFound = 'users (legacy)';
          needsMigration = true;
        }
      } catch (error) {
        console.warn(`[Sync] Erro ao ler users (legacy):`, error.message);
      }
    }

    // Se ainda não encontrou, tentar outra estrutura: users/{uid}/documents/{collection}
    if (data.length === 0) {
      console.log(`[Sync] A tentar users/${userId}/documents/${collectionName}...`);
      try {
        const snapshot3 = await window.firebaseDb
          .collection('users')
          .doc(userId)
          .collection('documents')
          .collection(collectionName)
          .get();

        snapshot3.forEach(doc => {
          const docData = doc.data();
          if (docData.createdAt && docData.createdAt.toDate) {
            docData.createdAt = docData.createdAt.toDate().toISOString();
          }
          data.push({ id: doc.id, ...docData });
          console.log(`[Sync] Documento encontrado em users/documents:`, doc.id);
        });

        if (data.length > 0) {
          sourceFound = 'users/documents';
          needsMigration = true;
        }
      } catch (error) {
        console.warn(`[Sync] Erro ao ler users/documents:`, error.message);
      }
    }

    // Se encontrou dados em estrutura legacy, migrar automaticamente para companies
    if (needsMigration && data.length > 0) {
      console.log(`[Sync] 🚀 Migrando ${data.length} documentos de users para companies...`);
      try {
        const batch = window.firebaseDb.batch();
        
        data.forEach(doc => {
          const newDocRef = window.firebaseDb
            .collection('companies')
            .doc(userId)
            .collection(collectionName)
            .doc(doc.id);
          
          batch.set(newDocRef, {
            ...doc,
            migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
            originalCreatedAt: doc.createdAt || new Date().toISOString()
          });
        });
        
        await batch.commit();
        console.log(`[Sync] ✅ Migração concluída para ${collectionName}`);
      } catch (error) {
        console.warn(`[Sync] ❌ Erro na migração:`, error.message);
      }
    }

    console.log(`[Sync] ${collectionName}: ${data.length} documentos encontrados em ${sourceFound || 'nenhum local'}`);

    // Salvar no localStorage
    if (data.length > 0) {
      const baseKey = 'upsen_' + collectionName.toLowerCase();
      const userKey = userId ? baseKey + '_' + userId : baseKey;
      localStorage.setItem(userKey, JSON.stringify(data));
    }

    return data.length > 0 ? data : null;
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
   * @param {string} collectionName - Nome da coleção
   * @param {object} data - Dados a salvar
   * @param {boolean} skipLocalStorageUpdate - Se true, não atualiza o localStorage (já foi atualizado pelo caller)
   */
  async function saveToFirebaseAndLocalStorage(collectionName, data, skipLocalStorageUpdate) {
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

      // Apenas atualizar localStorage se não foi feito pelo caller (store.js)
      if (!skipLocalStorageUpdate) {
        const localData = getFromLocalStorage(collectionName);
        // Verificar se o item já existe para evitar duplicação
        const exists = localData.some(item => item.id === data.id || item.id === docRef.id);
        if (!exists) {
          localData.push({ id: docRef.id, ...data });
          saveToLocalStorageOnly(collectionName, localData);
        }
      }

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
  // Variável para controlar listeners ativos
  var activeListeners = {};

  /**
   * Ativa listeners em tempo real para uma coleção
   * Quando houver alterações no Firebase, atualiza automaticamente o localStorage
   */
  function enableRealtimeSync(collectionName) {
    if (!isFirebaseReady()) {
      console.log(`[Realtime] Firebase não pronto para ${collectionName}`);
      return;
    }

    const userId = getUserId();
    if (!userId) {
      console.log(`[Realtime] Utilizador não autenticado`);
      return;
    }

    // Se já tem listener ativo, não criar outro
    if (activeListeners[collectionName]) {
      console.log(`[Realtime] Listener já ativo para ${collectionName}`);
      return;
    }

    console.log(`[Realtime] A ativar listener para companies/${userId}/${collectionName}...`);

    try {
      const unsubscribe = window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .onSnapshot((snapshot) => {
          console.log(`[Realtime] Alteração detectada em ${collectionName}:`, snapshot.size, 'documentos');
          
          const data = [];
          snapshot.forEach((doc) => {
            if (doc.id === '_init') return;
            const docData = doc.data();
            if (docData.createdAt && docData.createdAt.toDate) {
              docData.createdAt = docData.createdAt.toDate().toISOString();
            }
            if (docData.updatedAt && docData.updatedAt.toDate) {
              docData.updatedAt = docData.updatedAt.toDate().toISOString();
            }
            data.push({ id: doc.id, ...docData });
          });

          // Atualizar localStorage com dados do Firebase
          const baseKey = 'upsen_' + collectionName.toLowerCase();
          const userKey = userId ? baseKey + '_' + userId : baseKey;
          localStorage.setItem(userKey, JSON.stringify(data));

          // Disparar evento para通知 outras partes da app
          window.dispatchEvent(new CustomEvent('dataSync-' + collectionName, { 
            detail: { data: data, source: 'firebase' } 
          }));

          console.log(`[Realtime] ${collectionName} atualizado no localStorage`);
        }, (error) => {
          console.warn(`[Realtime] Erro no listener de ${collectionName}:`, error.message);
        });

      activeListeners[collectionName] = unsubscribe;
      console.log(`[Realtime] ✅ Listener ativo para ${collectionName}`);
    } catch (error) {
      console.warn(`[Realtime] Erro ao ativar listener:`, error.message);
    }
  }

  /**
   * Desativa listeners em tempo real
   */
  function disableRealtimeSync(collectionName) {
    if (activeListeners[collectionName]) {
      activeListeners[collectionName]();
      delete activeListeners[collectionName];
      console.log(`[Realtime] Listener desativado para ${collectionName}`);
    }
  }

  /**
   * Desativa todos os listeners
   */
  function disableAllRealtimeSync() {
    Object.keys(activeListeners).forEach(function(col) {
      disableRealtimeSync(col);
    });
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
    COLLECTIONS,
    // Novas funções de sync em tempo real
    enableRealtimeSync,
    disableRealtimeSync,
    disableAllRealtimeSync,
    activeListeners
  };

  console.log('✅ Firebase Sync Service carregado com Realtime Sync!');
})();

