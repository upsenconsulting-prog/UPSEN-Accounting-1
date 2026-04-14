/**
 * Firebase Data Migration - users/{uid} -> companies/{uid}
 * UPSEN Accounting
 * 
 * Esta função migra os dados da estrutura legacy (users) para a nova estrutura (companies)
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
  
  // Migração automática de users/{uid} para companies/{uid}
  async function migrateUserToCompanies() {
    if (!isFirebaseReady()) {
      console.error('Firebase não está pronto. Faça login primeiro.');
      return { success: false, error: 'Firebase not ready' };
    }
    
    var userId = getUserId();
    if (!userId) {
      console.error('Utilizador não autenticado');
      return { success: false, error: 'User not authenticated' };
    }
    
    console.log('🚀 Iniciando migração de users/' + userId + ' para companies/' + userId);
    
    var results = {};
    var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
    
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      console.log('\n📦 A migrar ' + collection + '...');
      
      try {
        // Ler da estrutura legacy: users/{uid}/{uid}/documents/{collection}/items
        var snapshot = await window.firebaseDb
          .collection('users')
          .doc(userId)
          .collection(userId)
          .doc('documents')
          .collection(collection)
          .collection('items')
          .get();
        
        console.log('   Encontrados ' + snapshot.size + ' documentos na estrutura legacy');
        
        var migratedCount = 0;
        
        if (snapshot.size > 0) {
          // Para cada documento, copiar para a nova estrutura
          var batch = window.firebaseDb.batch();
          
          snapshot.forEach(function(doc) {
            var data = doc.data();
            
            // Criar documento na nova estrutura: companies/{uid}/{collection}/{docId}
            var newDocRef = window.firebaseDb
              .collection('companies')
              .doc(userId)
              .collection(collection)
              .doc(doc.id);
            
            batch.set(newDocRef, {
              ...data,
              migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
              originalCreatedAt: data.createdAt || new Date().toISOString()
            });
            
            migratedCount++;
          });
          
          // Executar o batch
          await batch.commit();
          console.log('   ✅ ' + migratedCount + ' documentos migrados para companies/' + userId + '/' + collection);
          
          results[collection] = { success: true, migrated: migratedCount, total: snapshot.size };
        } else {
          console.log('   ℹ️ Nenhum documento para migrar');
          results[collection] = { success: true, migrated: 0, total: 0 };
        }
        
      } catch (e) {
        console.error('   ❌ Erro ao migrar ' + collection + ':', e.message);
        results[collection] = { success: false, error: e.message };
      }
    }
    
    console.log('\n✅ Migração concluída!');
    console.log('📊 Resultados:', JSON.stringify(results, null, 2));
    
    return { success: true, results: results };
  }
  
  // Verificar se a migração já foi feita
  async function checkMigrationNeeded() {
    if (!isFirebaseReady()) return null;
    
    var userId = getUserId();
    if (!userId) return null;
    
    // Verificar se já existem dados na estrutura companies
    var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
    var needsMigration = false;
    var stats = {};
    
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      
      try {
        // Verificar estrutura companies
        var companiesSnapshot = await window.firebaseDb
          .collection('companies')
          .doc(userId)
          .collection(collection)
          .get();
        
        // Verificar estrutura legacy
        var usersSnapshot = await window.firebaseDb
          .collection('users')
          .doc(userId)
          .collection(userId)
          .doc('documents')
          .collection(collection)
          .collection('items')
          .get();
        
        stats[collection] = {
          companies: companiesSnapshot.size,
          legacy: usersSnapshot.size
        };
        
        if (usersSnapshot.size > 0 && companiesSnapshot.size === 0) {
          needsMigration = true;
        }
      } catch (e) {
        // Silencioso
      }
    }
    
    return { needsMigration: needsMigration, stats: stats };
  }
  
  // Exportar para o window
  window.DataMigration = {
    migrateUserToCompanies: migrateUserToCompanies,
    checkMigrationNeeded: checkMigrationNeeded
  };
  
  console.log('✅ Data Migration Utility carregada!');
  console.log('📋 Comandos disponíveis:');
  console.log('   DataMigration.migrateUserToCompanies() - Executar migração');
  console.log('   DataMigration.checkMigrationNeeded() - Verificar se precisa de migração');
  
})();

