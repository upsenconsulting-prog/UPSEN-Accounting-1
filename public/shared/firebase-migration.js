/**
 * Firebase Data Migration Utility
 * UPSEN Accounting
 * 
 * Use esta ferramenta para migrar dados do localStorage para o Firebase
 * Execute no console do navegador após fazer login
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
  
  // Obter todas as chaves de localStorage relacionadas com o UPSEN
  function getLocalStorageKeys() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('upsen_')) {
        keys.push(key);
      }
    }
    return keys;
  }
  
  // Obter dados de uma chave específica
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
  async function migrateToFirebase(collectionName, data) {
    if (!isFirebaseReady()) {
      console.error('Firebase não está pronto');
      return { success: false, error: 'Firebase not ready' };
    }
    
    var userId = getUserId();
    if (!userId) {
      console.error('Utilizador não autenticado');
      return { success: false, error: 'User not authenticated' };
    }
    
    var migratedCount = 0;
    var errors = [];
    
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      try {
        await window.firebaseDb
          .collection('companies')
          .doc(userId)
          .collection(collectionName)
          .add({
            ...item,
            migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
            originalCreatedAt: item.createdAt || new Date().toISOString()
          });
        migratedCount++;
      } catch (e) {
        errors.push({ item: item.id || i, error: e.message });
      }
    }
    
    return { 
      success: true, 
      migrated: migratedCount, 
      total: data.length,
      errors: errors 
    };
  }
  
  // Mapear chaves localStorage para coleções Firebase
  function getCollectionMapping() {
    var userId = getUserId() || '';
    return {
      'upsen_expenses': 'expenses',
      'upsen_expenses_' + userId: 'expenses',
      'upsen_invoices_issued': 'invoicesIssued',
      'upsen_invoices_issued_' + userId: 'invoicesIssued',
      'upsen_invoices_received': 'invoicesReceived',
      'upsen_invoices_received_' + userId: 'invoicesReceived',
      'upsen_budgets': 'budgets',
      'upsen_budgets_' + userId: 'budgets'
    };
  }
  
  // Executar migração completa
  async function runFullMigration() {
    if (!isFirebaseReady()) {
      console.error('❌ Firebase não está pronto. Faça login primeiro.');
      return;
    }
    
    var userId = getUserId();
    console.log('🚀 Iniciando migração para utilizador:', userId);
    
    var mapping = {
      'expenses': 'upsen_expenses' + (userId ? '_' + userId : ''),
      'invoicesIssued': 'upsen_invoices_issued' + (userId ? '_' + userId : ''),
      'invoicesReceived': 'upsen_invoices_received' + (userId ? '_' + userId : ''),
      'budgets': 'upsen_budgets' + (userId ? '_' + userId : '')
    };
    
    var results = {};
    
    for (var [collection, key] of Object.entries(mapping)) {
      console.log(`\n📦 Verificando ${collection}...`);
      var data = getDataFromLocalStorage(key);
      
      if (data && data.length > 0) {
        console.log(`   Encontrados ${data.length} itens no localStorage`);
        console.log('   A migrar para Firebase...');
        
        var result = await migrateToFirebase(collection, data);
        results[collection] = result;
        
        if (result.success) {
          console.log(`   ✅ ${result.migrated} de ${result.total} itens migrados`);
        } else {
          console.log(`   ❌ Erro: ${result.error}`);
        }
      } else {
        console.log(`   ℹ️ Nenhum dado encontrado no localStorage`);
        
        // Verificar no Firebase
        try {
          var firebaseData = await window.firebaseDb
            .collection('companies')
            .doc(userId)
            .collection(collection)
            .get();
          
          console.log(`   📊 ${firebaseData.size} itens no Firebase`);
        } catch (e) {
          console.log(`   ❌ Erro ao verificar Firebase: ${e.message}`);
        }
      }
    }
    
    console.log('\n📊 RESUMO DA MIGRAÇÃO:');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
  }
  
  // Mostrar dados actuais
  function showCurrentData() {
    if (!isFirebaseReady()) {
      console.error('Firebase não está pronto');
      return;
    }
    
    var userId = getUserId();
    console.log('📊 Dados actuais para utilizador:', userId);
    
    var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
    
    collections.forEach(async function(collection) {
      try {
        var snapshot = await window.firebaseDb
          .collection('companies')
          .doc(userId)
          .collection(collection)
          .get();
        
        console.log(`\n📁 ${collection}: ${snapshot.size} documentos`);
        
        if (snapshot.size > 0) {
          snapshot.forEach(function(doc) {
            var data = doc.data();
            console.log(`   - ${doc.id}:`, JSON.stringify(data));
          });
        }
      } catch (e) {
        console.log(`❌ Erro ao obter ${collection}:`, e.message);
      }
    });
    
    // Também mostrar localStorage
    console.log('\n💾 Dados no localStorage:');
    var keys = getLocalStorageKeys();
    keys.forEach(function(key) {
      var data = getDataFromLocalStorage(key);
      console.log(`   ${key}: ${data.length} itens`);
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
  
  console.log('✅ Firebase Migration Utility carregada!');
  console.log('📋 Comandos disponíveis:');
  console.log('   FirebaseMigration.showCurrentData() - Ver dados actuais');
  console.log('   FirebaseMigration.runFullMigration() - Executar migração');
  
})();

