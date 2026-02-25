/**
 * Firebase Collections Initialization
 * UPSEN Accounting - Garante que as coleções existem no Firebase
 * ESTRUTURA: companies/{uid}/{collection}
 * 
 * Este script deve ser chamado após a autenticação para criar
 * as subcollections necessárias para cada utilizador.
 */

(function() {
  'use strict';
  
  var CollectionsService = {
    // Inicializa as coleções para um utilizador
    initializeUserCollections: function(userId) {
      if (!window.firebaseDb || !userId || userId === 'unknown') {
        console.log('FirebaseDB ou UserID não disponível para inicialização');
        return Promise.resolve();
      }
      
      console.log('Inicializando coleções para:', userId);
      
      var collections = [
        { name: 'expenses', displayName: 'Despesas' },
        { name: 'invoicesIssued', displayName: 'Faturas Emitidas' },
        { name: 'invoicesReceived', displayName: 'Faturas Recebidas' },
        { name: 'budgets', displayName: 'Orçamentos' }
      ];
      
      var promises = collections.map(function(collection) {
        // Criar documento de inicialização na subcollection (companies/{uid}/{collection})
        return window.firebaseDb.collection('companies').doc(userId).collection(collection.name).doc('_init').set({
          initialized: true,
          initializedAt: firebase.firestore.FieldValue.serverTimestamp(),
          displayName: collection.displayName
        }, { merge: true })
        .then(function() {
          console.log('Coleção initialized:', collection.name);
        })
        .catch(function(error) {
          console.warn('Erro ao inicializar coleção', collection.name + ':', error.message);
        });
      });
      
      return Promise.all(promises).then(function() {
        console.log('Todas as coleções inicializadas com sucesso!');
      }).catch(function(error) {
        console.warn('Erro ao inicializar algumas coleções:', error);
      });
    },
    
    // Verifica se as coleções existem e cria-as se necessário
    ensureCollectionsExist: function(userId) {
      if (!window.firebaseDb || !userId || userId === 'unknown') {
        console.log('FirebaseDB ou UserID não disponível');
        return Promise.resolve();
      }
      
      console.log('Verificando coleções para:', userId);
      
      // Verificar se o documento do utilizador existe na collection companies
      return window.firebaseDb.collection('companies').doc(userId).get()
        .then(function(doc) {
          if (!doc.exists) {
            console.log('Documento do utilizador não existe, criando...');
            return window.firebaseDb.collection('companies').doc(userId).set({
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              initialized: true
            });
          }
          return Promise.resolve();
        })
        .then(function() {
          // Inicializar as coleções
          return CollectionsService.initializeUserCollections(userId);
        })
        .catch(function(error) {
          console.warn('Erro ao verificar/criar coleções:', error.message);
        });
    },
    
    // Sincroniza dados do Firebase para localStorage
    syncFromFirebase: function(userId) {
      return new Promise(function(resolve) {
        if (!window.firebaseDb || !userId || userId === 'unknown') {
          console.log('FirebaseDB ou UserID não disponível para sincronização');
          resolve();
          return;
        }
        
        console.log('Sincronizando dados do Firebase para:', userId);
        
        var promises = [];
        
        // Sync expenses - usando estrutura companies/{uid}/expenses
        var expensesPromise = window.firebaseDb.collection('companies').doc(userId).collection('expenses').get()
          .then(function(snapshot) {
            var expenses = [];
            snapshot.forEach(function(doc) {
              if (doc.id === '_init') return; // Skip init document
              var data = doc.data();
              expenses.push({
                id: doc.id,
                date: data.date || '',
                category: data.category || '',
                amount: parseFloat(data.amount) || 0,
                ivaRate: parseFloat(data.ivaRate) || 0,
                ivaAmount: parseFloat(data.ivaAmount) || 0,
                totalAmount: parseFloat(data.totalAmount) || 0,
                notes: data.notes || '',
                paymentMethod: data.paymentMethod || '',
                supplierNif: data.supplierNif || '',
                supplierName: data.supplierName || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_expenses_' + userId, JSON.stringify(expenses));
            console.log('Expenses sincronizados:', expenses.length);
          }).catch(function(err) { console.log('Erro sync expenses:', err); });
        promises.push(expensesPromise);
        
        // Sync invoices issued - usando estrutura companies/{uid}/invoicesIssued
        var invoicesIssuedPromise = window.firebaseDb.collection('companies').doc(userId).collection('invoicesIssued').get()
          .then(function(snapshot) {
            var invoicesIssued = [];
            snapshot.forEach(function(doc) {
              if (doc.id === '_init') return;
              var data = doc.data();
              invoicesIssued.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber || '',
                customer: data.customer || '',
                customerNif: data.customerNif || '',
                invoiceDate: data.invoiceDate || '',
                dueDate: data.dueDate || '',
                amount: parseFloat(data.amount) || 0,
                ivaRate: parseFloat(data.ivaRate) || 0,
                ivaAmount: parseFloat(data.ivaAmount) || 0,
                totalAmount: parseFloat(data.totalAmount) || 0,
                state: data.state || 'Pendiente',
                description: data.description || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_invoices_issued_' + userId, JSON.stringify(invoicesIssued));
            console.log('Invoices Issued sincronizados:', invoicesIssued.length);
          }).catch(function(err) { console.log('Erro sync invoices issued:', err); });
        promises.push(invoicesIssuedPromise);
        
        // Sync invoices received - usando estrutura companies/{uid}/invoicesReceived
        var invoicesReceivedPromise = window.firebaseDb.collection('companies').doc(userId).collection('invoicesReceived').get()
          .then(function(snapshot) {
            var invoicesReceived = [];
            snapshot.forEach(function(doc) {
              if (doc.id === '_init') return;
              var data = doc.data();
              invoicesReceived.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber || '',
                supplier: data.supplier || '',
                supplierNif: data.supplierNif || '',
                invoiceDate: data.invoiceDate || '',
                amount: parseFloat(data.amount) || 0,
                ivaRate: parseFloat(data.ivaRate) || 0,
                ivaAmount: parseFloat(data.ivaAmount) || 0,
                totalAmount: parseFloat(data.totalAmount) || 0,
                state: data.state || 'Pendiente',
                description: data.description || '',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_invoices_received_' + userId, JSON.stringify(invoicesReceived));
            console.log('Invoices Received sincronizados:', invoicesReceived.length);
          }).catch(function(err) { console.log('Erro sync invoices received:', err); });
        promises.push(invoicesReceivedPromise);
        
        // Sync budgets - usando estrutura companies/{uid}/budgets
        var budgetsPromise = window.firebaseDb.collection('companies').doc(userId).collection('budgets').get()
          .then(function(snapshot) {
            var budgets = [];
            snapshot.forEach(function(doc) {
              if (doc.id === '_init') return;
              var data = doc.data();
              budgets.push({
                id: doc.id,
                number: data.number || '',
                series: data.series || '',
                date: data.date || '',
                customer: data.customer || '',
                total: parseFloat(data.total) || 0,
                status: data.status || 'pending',
                createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
              });
            });
            localStorage.setItem('upsen_budgets_' + userId, JSON.stringify(budgets));
            console.log('Budgets sincronizados:', budgets.length);
          }).catch(function(err) { console.log('Erro sync budgets:', err); });
        promises.push(budgetsPromise);
        
        Promise.all(promises).then(function() {
          console.log('Sincronizacao completa!');
          resolve();
        }).catch(function() {
          resolve();
        });
      });
    }
  };
  
  // Expor globalmente
  window.CollectionsService = CollectionsService;
  
  console.log('CollectionsService carregado!');
  
})();

