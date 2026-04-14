/**
 * Firebase Sync Service - UPSEN Accounting
 */

(function() {
  'use strict';

  function isFirebaseReady() {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      console.log('[Sync] Firebase SDK not loaded');
      return false;
    }
    
    // Check if Firebase is initialized
    if (!window.firebaseDb) {
      console.log('[Sync] Firebase DB not initialized');
      return false;
    }
    
    // Check if Auth is ready (user can be null but auth should be initialized)
    if (!window.firebaseAuth) {
      console.log('[Sync] Firebase Auth not initialized');
      return false;
    }
    
    // Auth is ready, user may or may not be logged in
    return true;
  }

  function getUserId() {
    // First try Firebase Auth
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return window.firebaseAuth.currentUser.uid;
    }
    
    // Fallback: try to get from localStorage session
    try {
      var session = localStorage.getItem('upsen_current_user');
      if (session) {
        var data = JSON.parse(session);
        if (data && data.user && data.user.uid) {
          return data.user.uid;
        }
      }
    } catch (e) {}
    
    return null;
  }

  var COLLECTIONS = {
    expenses: 'expenses',
    invoicesIssued: 'invoicesIssued',
    invoicesReceived: 'invoicesReceived',
    budgets: 'budgets'
  };

  function syncCollectionToLocalStorage(collectionName) {
    return new Promise(function(resolve) {
      var userId = getUserId();
      
      // Try to get from localStorage first (faster)
      var baseKey = 'upsen_' + collectionName.toLowerCase();
      var userKey = userId ? baseKey + '_' + userId : baseKey;
      var localData = localStorage.getItem(userKey);
      
      // If we have local data and Firebase is not ready, return local data
      if (!isFirebaseReady()) {
        if (localData) {
          try {
            var parsedData = JSON.parse(localData);
            console.log('[Sync] Firebase nao pronto, usando dados locais para ' + collectionName + ': ' + parsedData.length);
            resolve(parsedData);
            return;
          } catch (e) {}
        }
        console.log('[Sync] Firebase nao pronto para ' + collectionName);
        resolve(null);
        return;
      }

      if (!userId) {
        console.log('[Sync] Utilizador nao autenticado, usando dados locais');
        if (localData) {
          try {
            var parsedData = JSON.parse(localData);
            resolve(parsedData);
            return;
          } catch (e) {}
        }
        resolve(null);
        return;
      }

      console.log(`[Sync] A ler do Firestore: companies/${userId}/${collectionName}`);

      window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .get()
        .then(function(snapshot) {
          var data = [];
          snapshot.forEach(function(doc) {
            if (doc.id === '_init') return;
            var docData = doc.data();
            var item = { id: doc.id };
            for (var key in docData) {
              if (key !== 'id' && docData.hasOwnProperty(key)) {
                if (docData[key] && docData[key].toDate && typeof docData[key].toDate === 'function') {
                  item[key] = docData[key].toDate().toISOString();
                } else {
                  item[key] = docData[key];
                }
              }
            }
            data.push(item);
          });

          console.log(`[Sync] Sucesso para ${collectionName}: ${data.length} documentos encontrados.`);

          if (data.length > 0) {
            localStorage.setItem(userKey, JSON.stringify(data));
          }

          resolve(data); // Sempre resolver com os dados, mesmo que seja um array vazio
        })
        .catch(function(error) {
          console.warn('[Sync] Erro:', error.message);
          // On error, try to return local data
          if (localData) {
            try {
              var parsedData = JSON.parse(localData);
              resolve(parsedData);
              return;
            } catch (e) {}
          }
          resolve(null);
        });
    });
  }

  function syncAllToLocalStorage() {
    return new Promise(function(resolve) {
      console.log('[Sync] Iniciando sincronizacao...');

      var results = {};
      var keys = Object.keys(COLLECTIONS);
      var count = 0;

      keys.forEach(function(key) {
        syncCollectionToLocalStorage(COLLECTIONS[key]).then(function(data) {
          results[key] = data;
          count++;
          if (count === keys.length) {
            console.log('[Sync] Sincronizacao concluida!', results);
            resolve(results);
          }
        });
      });
    });
  }

  function saveToFirebaseAndLocalStorage(collectionName, data, skipLocalUpdate) {
    return new Promise(function(resolve) {
      if (!isFirebaseReady()) {
        resolve(saveToLocalStorageOnly(collectionName, data));
        return;
      }

      var userId = getUserId();
      if (!userId) {
        resolve(saveToLocalStorageOnly(collectionName, data));
        return;
      }

      var docData = {};
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          docData[key] = data[key];
        }
      }
      
      var serverTs = null;
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        serverTs = firebase.firestore.FieldValue.serverTimestamp();
      }
      docData.createdAt = serverTs || new Date().toISOString();
      docData.userId = userId;

      window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .add(docData)
        .then(function(docRef) {
          console.log('[Sync] Salvo no Firebase: ' + docRef.id);
          return docRef.update({ id: docRef.id }).then(function() {
            return docRef; // Return docRef to the next .then()
          });
        })
        .then(function(docRef) {
          if (!skipLocalUpdate) {
            var localData = getFromLocalStorage(collectionName);
            var exists = false;
            for (var i = 0; i < localData.length; i++) {
              if (localData[i].id === data.id) {
                exists = true;
                break;
              }
            }
            if (!exists) {
              localData.push({ id: data.id || docRef.id });
              for (var key in data) {
                if (data.hasOwnProperty(key)) {
                  localData[localData.length - 1][key] = data[key];
                }
              }
              saveToLocalStorageOnly(collectionName, localData);
            }
          }
          resolve({ success: true, id: docRef.id });
        })
        .catch(function(error) {
          console.warn('[Sync] Erro ao salvar:', error.message);
          resolve(saveToLocalStorageOnly(collectionName, data));
        });
    });
  }
  function updateInFirebaseAndLocalStorage(collectionName, id, updates) {
    return new Promise(function(resolve) {
      if (!isFirebaseReady()) {
        resolve(updateInLocalStorageOnly(collectionName, id, updates));
        return;
      }

      var userId = getUserId();
      if (!userId) {
        resolve(updateInLocalStorageOnly(collectionName, id, updates));
        return;
      }

      var updateData = {};
      for (var key in updates) {
        if (updates.hasOwnProperty(key)) {
          updateData[key] = updates[key];
        }
      }
      
      var serverTs = null;
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        serverTs = firebase.firestore.FieldValue.serverTimestamp();
      }
      updateData.updatedAt = serverTs || new Date().toISOString();

      window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .doc(id)
        .update(updateData)
        .then(function() {
          updateInLocalStorageOnly(collectionName, id, updates);
          resolve({ success: true });
        })
        .catch(function(error) {
          console.warn('[Sync] Erro ao atualizar:', error.message);
          resolve(updateInLocalStorageOnly(collectionName, id, updates));
        });
    });
  }

  function deleteFromFirebaseAndLocalStorage(collectionName, id) {
    return new Promise(function(resolve) {
      if (!isFirebaseReady()) {
        resolve(deleteFromLocalStorageOnly(collectionName, id));
        return;
      }

      var userId = getUserId();
      if (!userId) {
        resolve(deleteFromLocalStorageOnly(collectionName, id));
        return;
      }

      window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .doc(id)
        .delete()
        .then(function() {
          deleteFromLocalStorageOnly(collectionName, id);
          resolve({ success: true });
        })
        .catch(function(error) {
          console.warn('[Sync] Erro ao remover:', error.message);
          resolve(deleteFromLocalStorageOnly(collectionName, id));
        });
    });
  }

  function getLocalStorageKey(collectionName) {
    var keyMap = {
      'expenses': 'upsen_expenses',
      'invoicesIssued': 'upsen_invoices_issued',
      'invoicesReceived': 'upsen_invoices_received',
      'budgets': 'upsen_budgets'
    };
    var baseKey = keyMap[collectionName] || 'upsen_' + collectionName.toLowerCase();
    var userId = getUserId();
    return userId ? baseKey + '_' + userId : baseKey;
  }

  function getFromLocalStorage(collectionName) {
    var key = getLocalStorageKey(collectionName);
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToLocalStorageOnly(collectionName, data) {
    var key = getLocalStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  }

  function updateInLocalStorageOnly(collectionName, id, updates) {
    var list = getFromLocalStorage(collectionName);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var key in updates) {
          if (updates.hasOwnProperty(key)) {
            list[i][key] = updates[key];
          }
        }
        break;
      }
    }
    saveToLocalStorageOnly(collectionName, list);
    return { success: true };
  }

  function deleteFromLocalStorageOnly(collectionName, id) {
    var list = getFromLocalStorage(collectionName);
    var filtered = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) {
        filtered.push(list[i]);
      }
    }
    saveToLocalStorageOnly(collectionName, filtered);
    return { success: true };
  }

  function getCollectionData(collectionName) {
    return new Promise(function(resolve) {
      var data = getFromLocalStorage(collectionName);
      if (data.length === 0 && isFirebaseReady()) {
        syncCollectionToLocalStorage(collectionName).then(function(fbData) {
          resolve(fbData || []);
        });
      } else {
        resolve(data);
      }
    });
  }

  // Realtime sync
  var activeListeners = {};

  function enableRealtimeSync(collectionName) {
    if (!isFirebaseReady()) {
      console.log('[Realtime] Firebase nao pronto para ' + collectionName);
      return;
    }
    
    var userId = getUserId();
    if (!userId) {
      console.log('[Realtime] Utilizador nao autenticado para ' + collectionName);
      return;
    }
    
    if (activeListeners[collectionName]) {
      console.log('[Realtime] Listener ja ativo para ' + collectionName);
      return;
    }

    console.log('[Realtime] Ativando listener para ' + collectionName + ' (userId: ' + userId + ')');

    try {
      var unsubscribe = window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collectionName)
        .onSnapshot(function(snapshot) {
          var data = [];
          snapshot.forEach(function(doc) {
            if (doc.id === '_init') return;
            var docData = doc.data();
            var item = { id: doc.id };
            for (var key in docData) {
              if (key !== 'id' && docData.hasOwnProperty(key)) {
                if (docData[key] && docData[key].toDate && typeof docData[key].toDate === 'function') {
                  item[key] = docData[key].toDate().toISOString();
                } else {
                  item[key] = docData[key];
                }
              }
            }
            data.push(item);
          });

          var baseKey = 'upsen_' + collectionName.toLowerCase();
          var userKey = userId ? baseKey + '_' + userId : baseKey;
          localStorage.setItem(userKey, JSON.stringify(data));

          window.dispatchEvent(new CustomEvent('dataSync-' + collectionName, {
            detail: { data: data, source: 'firebase' }
          }));
        }, function(error) {
          console.warn('[Realtime] Erro:', error.message);
        });

      activeListeners[collectionName] = unsubscribe;
      console.log('[Realtime] Listener ativo para ' + collectionName);
    } catch (error) {
      console.warn('[Realtime] Erro ao ativar:', error.message);
    }
  }

  function disableRealtimeSync(collectionName) {
    if (activeListeners[collectionName]) {
      activeListeners[collectionName]();
      delete activeListeners[collectionName];
    }
  }

  function disableAllRealtimeSync() {
    var keys = Object.keys(activeListeners);
    for (var i = 0; i < keys.length; i++) {
      disableRealtimeSync(keys[i]);
    }
  }

  window.FirebaseSync = {
    syncAllToLocalStorage: syncAllToLocalStorage,
    syncCollectionToLocalStorage: syncCollectionToLocalStorage,
    saveToFirebaseAndLocalStorage: saveToFirebaseAndLocalStorage,
    updateInFirebaseAndLocalStorage: updateInFirebaseAndLocalStorage,
    deleteFromFirebaseAndLocalStorage: deleteFromFirebaseAndLocalStorage,
    getCollectionData: getCollectionData,
    getFromLocalStorage: getFromLocalStorage,
    isFirebaseReady: isFirebaseReady,
    getUserId: getUserId,
    COLLECTIONS: COLLECTIONS,
    enableRealtimeSync: enableRealtimeSync,
    disableRealtimeSync: disableRealtimeSync,
    disableAllRealtimeSync: disableAllRealtimeSync,
    activeListeners: activeListeners
  };

  console.log('Firebase Sync Service carregado!');
})();
