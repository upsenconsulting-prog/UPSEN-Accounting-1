/**
 * Firebase Data Migration Utility
 * UPSEN Accounting
 * 
 * Use esta ferramenta para migrar dados do localStorage para o Firebase
 * Execute no console do navegador apos fazer login
 */

(function() {
  'use strict';
  
  // Verificar se Firebase esta disponivel
  function isFirebaseReady() {
    return window.firebaseDb && window.firebaseAuth && window.firebaseAuth.currentUser;
  }
  
  function getUserId() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return window.firebaseAuth.currentUser.uid;
    }
    return null;
  }
  
  // Obter todas as chaves de localStorage relacionadas com o UPSEN
  function getLocalStorageKeys() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('upsen_') === 0) {
        keys.push(key);
      }
    }
    return keys;
  }
  
  // Obter dados de uma chave especifica
  function getDataFromLocalStorage(key) {
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
      return [];
    }
  }
  
  // Migrar dados para o Firebase
  function migrateToFirebase(collectionName, data) {
    return new Promise(function(resolve) {
      if (!isFirebaseReady()) {
        console.error('Firebase nao esta pronto');
        resolve({ success: false, error: 'Firebase not ready' });
        return;
      }
      
      var userId = getUserId();
      if (!userId) {
        console.error('Utilizador nao autenticado');
        resolve({ success: false, error: 'User not authenticated' });
        return;
      }
      
      var migratedCount = 0;
      var errors = [];
      var promises = [];
      
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        var promise = window.firebaseDb
          .collection('companies')
          .doc(userId)
          .collection(collectionName)
          .add({
            id: item.id || item.invoiceNumber || 'item-' + i,
            date: item.date || '',
            category: item.category || '',
            amount: parseFloat(item.amount) || 0,
            ivaRate: parseFloat(item.ivaRate) || 0,
            ivaAmount: parseFloat(item.ivaAmount) || 0,
            totalAmount: parseFloat(item.totalAmount) || 0,
            notes: item.notes || '',
            paymentMethod: item.paymentMethod || '',
            supplierNif: item.supplierNif || '',
            supplierName: item.supplierName || '',
            customer: item.customer || '',
            customerNif: item.customerNif || '',
            invoiceNumber: item.invoiceNumber || '',
            invoiceDate: item.invoiceDate || '',
            dueDate: item.dueDate || '',
            state: item.state || 'Pendiente',
            description: item.description || '',
            supplier: item.supplier || '',
            number: item.number || '',
            series: item.series || '',
            total: parseFloat(item.total) || 0,
            status: item.status || 'pending',
            migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
            originalCreatedAt: item.createdAt || new Date().toISOString()
          })
          .then(function() {
            migratedCount++;
          })
          .catch(function(e) {
            errors.push({ item: item.id || i, error: e.message });
          });
        
        promises.push(promise);
      }
      
      Promise.all(promises).then(function() {
        resolve({ 
          success: true, 
          migrated: migratedCount, 
          total: data.length,
          errors: errors 
        });
      });
    });
  }
  
  // Mapear chaves localStorage para colecoes Firebase
  function getCollectionMapping() {
    var userId = getUserId() || '';
    var mapping = {};
    mapping['upsen_expenses'] = 'expenses';
    mapping['upsen_expenses_' + userId] = 'expenses';
    mapping['upsen_invoices_issued'] = 'invoicesIssued';
    mapping['upsen_invoices_issued_' + userId] = 'invoicesIssued';
    mapping['upsen_invoices_received'] = 'invoicesReceived';
    mapping['upsen_invoices_received_' + userId] = 'invoicesReceived';
    mapping['upsen_budgets'] = 'budgets';
    mapping['upsen_budgets_' + userId] = 'budgets';
    return mapping;
  }
  
  // Executar migracao completa
  function runFullMigration() {
    if (!isFirebaseReady()) {
      console.error('Firebase nao esta pronto. Faca login primeiro.');
      return Promise.resolve();
    }
    
    var userId = getUserId();
    console.log('Iniciando migracao para utilizador:', userId);
    
    var mapping = {
      'expenses': 'upsen_expenses' + (userId ? '_' + userId : ''),
      'invoicesIssued': 'upsen_invoices_issued' + (userId ? '_' + userId : ''),
      'invoicesReceived': 'upsen_invoices_received' + (userId ? '_' + userId : ''),
      'budgets': 'upsen_budgets' + (userId ? '_' + userId : '')
    };
    
    var results = {};
    var collections = Object.keys(mapping);
    
    function processNext(index) {
      if (index >= collections.length) {
        console.log('\nRESUMO DA MIGRACAO:');
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      var collection = collections[index];
      var key = mapping[collection];
      
      console.log('\nVerificando ' + collection + '...');
      var data = getDataFromLocalStorage(key);
      
      if (data && data.length > 0) {
        console.log('   Encontrados ' + data.length + ' itens no localStorage');
        console.log('   A migrar para Firebase...');
        
        migrateToFirebase(collection, data).then(function(result) {
          results[collection] = result;
          
          if (result.success) {
            console.log('   OK: ' + result.migrated + ' de ' + result.total + ' itens migrados');
          } else {
            console.log('   Erro: ' + result.error);
          }
          
          processNext(index + 1);
        });
      } else {
        console.log('   Nenhum dado encontrado no localStorage');
        
        // Verificar no Firebase
        window.firebaseDb
          .collection('companies')
          .doc(userId)
          .collection(collection)
          .get()
          .then(function(firebaseData) {
            console.log('   ' + firebaseData.size + ' itens no Firebase');
          })
          .catch(function(e) {
            console.log('   Erro ao verificar Firebase: ' + e.message);
          })
          .finally(function() {
            processNext(index + 1);
          });
      }
    }
    
    processNext(0);
  }
  
  // Mostrar dados atuais
  function showCurrentData() {
    if (!isFirebaseReady()) {
      console.error('Firebase nao esta pronto');
      return;
    }
    
    var userId = getUserId();
    console.log('Dados atuais para utilizador:', userId);
    
    var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
    
    collections.forEach(function(collection) {
      window.firebaseDb
        .collection('companies')
        .doc(userId)
        .collection(collection)
        .get()
        .then(function(snapshot) {
          console.log('\n' + collection + ': ' + snapshot.size + ' documentos');
          
          if (snapshot.size > 0) {
            snapshot.forEach(function(doc) {
              var data = doc.data();
              console.log('   - ' + doc.id + ':', JSON.stringify(data));
            });
          }
        })
        .catch(function(e) {
          console.log('Erro ao obter ' + collection + ':', e.message);
        });
    });
    
    // Tambem mostrar localStorage
    console.log('\nDados no localStorage:');
    var keys = getLocalStorageKeys();
    keys.forEach(function(key) {
      var data = getDataFromLocalStorage(key);
      console.log('   ' + key + ': ' + data.length + ' itens');
    });
  }
  
  // Exportar para o window
  window.FirebaseMigration = {
    migrateToFirebase: migrateToFirebase,
    runFullMigration: runFullMigration,
    showCurrentData: showCurrentData,
    getDataFromLocalStorage: getDataFromLocalStorage,
    getLocalStorageKeys: getLocalStorageKeys
  };
  
  console.log('Firebase Migration Utility carregada!');
  console.log('Comandos disponiveis:');
  console.log('   FirebaseMigration.showCurrentData() - Ver dados atuais');
  console.log('   FirebaseMigration.runFullMigration() - Executar migracao');
  
})();

