// Initialize Firebase
    if (typeof firebase !== 'undefined' && window.FIREBASE_CONFIG) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      var firebaseDb = firebase.firestore();
      var firebaseAuth = firebase.auth();
      window.firebaseDb = firebaseDb;
      window.firebaseAuth = firebaseAuth;
    }
    
    var isLoggedIn = false;
    var currentUser = null;
    
    // Check auth state
    firebaseAuth.onAuthStateChanged(function(user) {
      if (user) {
        isLoggedIn = true;
        currentUser = user;
        document.getElementById('loginStatus').className = 'alert alert-success';
        document.getElementById('loginStatus').innerHTML = '<i class="fas fa-check-circle me-2"></i>Utilizador logado';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userEmail').textContent = user.email + ' (UID: ' + user.uid.substring(0, 8) + '...)';
        document.getElementById('migrateBtn').disabled = false;
        loadData();
      } else {
        isLoggedIn = false;
        currentUser = null;
        document.getElementById('loginStatus').className = 'alert alert-warning';
        document.getElementById('loginStatus').innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Faça login na aplicação principal primeiro e volte aqui';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('migrateBtn').disabled = true;
      }
    });
    
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
    
    function getDataFromLocalStorage(key) {
      try {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    }
    
    async function loadData() {
      if (!isLoggedIn) return;
      
      // Load Firebase data
      var firebaseDiv = document.getElementById('firebaseData');
      firebaseDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Carregando...</div>';
      
      try {
        var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
        var firebaseHtml = '<div class="row">';
        
        for (var i = 0; i < collections.length; i++) {
          var collection = collections[i];
          var snapshot = await firebaseDb.collection('companies').doc(currentUser.uid).collection(collection).get();
          
          firebaseHtml += '<div class="col-md-6 mb-3">';
          firebaseHtml += '<div class="card">';
          firebaseHtml += '<div class="card-body">';
          firebaseHtml += '<h6>' + collection + '</h6>';
          if (snapshot.size > 0) {
            firebaseHtml += '<span class="badge bg-success">' + snapshot.size + ' documentos</span>';
            snapshot.forEach(function(doc) {
              var data = doc.data();
              firebaseHtml += '<pre class="mt-2" style="font-size: 0.75rem;">' + JSON.stringify(data, null, 2) + '</pre>';
            });
          } else {
            firebaseHtml += '<span class="badge bg-warning">Sem dados</span>';
          }
          firebaseHtml += '</div></div></div>';
        }
        
        firebaseHtml += '</div>';
        firebaseDiv.innerHTML = firebaseHtml;
      } catch (e) {
        firebaseDiv.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados do Firebase: ' + e.message + '</div>';
      }
      
      // Load LocalStorage data
      var localDiv = document.getElementById('localStorageData');
      var keys = getLocalStorageKeys();
      
      if (keys.length === 0) {
        localDiv.innerHTML = '<div class="alert alert-warning">Nenhum dado encontrado no localStorage</div>';
      } else {
        var localHtml = '<div class="row">';
        
        keys.forEach(function(key) {
          var data = getDataFromLocalStorage(key);
          localHtml += '<div class="col-md-6 mb-3">';
          localHtml += '<div class="card">';
          localHtml += '<div class="card-body">';
          localHtml += '<h6>' + key + '</h6>';
          if (data.length > 0) {
            localHtml += '<span class="badge bg-primary">' + data.length + ' itens</span>';
            localHtml += '<pre class="mt-2" style="font-size: 0.75rem;">' + JSON.stringify(data.slice(0, 3), null, 2) + '</pre>';
            if (data.length > 3) {
              localHtml += '<small class="text-muted">... e mais ' + (data.length - 3) + ' itens</small>';
            }
          } else {
            localHtml += '<span class="badge bg-secondary">Vazio</span>';
          }
          localHtml += '</div></div></div>';
        });
        
        localHtml += '</div>';
        localDiv.innerHTML = localHtml;
      }
    }
    
    // Migrate button
    document.getElementById('migrateBtn').addEventListener('click', async function() {
      if (!isLoggedIn) {
        alert('Faça login primeiro!');
        return;
      }
      
      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A migrar...';
      
      var resultDiv = document.getElementById('migrationResult');
      var resultOutput = document.getElementById('migrationOutput');
      resultDiv.style.display = 'block';
      resultOutput.textContent = 'A migrar dados...\n';
      
      try {
        var keys = getLocalStorageKeys();
        var results = {};
        
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var data = getDataFromLocalStorage(key);
          
          if (data.length === 0) continue;
          
          // Map key to collection name
          var collection = null;
          if (key.includes('expenses')) collection = 'expenses';
          else if (key.includes('invoices_issued')) collection = 'invoicesIssued';
          else if (key.includes('invoices_received')) collection = 'invoicesReceived';
          else if (key.includes('budgets')) collection = 'budgets';
          
          if (!collection) continue;
          
          resultOutput.textContent += '\nA migrar ' + data.length + ' itens para ' + collection + '...';
          
          var migrated = 0;
          for (var j = 0; j < data.length; j++) {
            try {
              await firebaseDb.collection('companies').doc(currentUser.uid).collection(collection).add({
                ...data[j],
                migratedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              migrated++;
            } catch (e) {
              resultOutput.textContent += '\nErro: ' + e.message;
            }
          }
          
          results[collection] = { total: data.length, migrated: migrated };
          resultOutput.textContent += ' -> ' + migrated + ' migrados';
        }
        
        resultOutput.textContent += '\n\n? Migração concluída!';
        resultOutput.textContent += '\n' + JSON.stringify(results, null, 2);
        
        // Reload data
        loadData();
        
      } catch (e) {
        resultOutput.textContent += '\n? Erro: ' + e.message;
      }
      
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-upload me-2"></i>Migrar Dados para Firebase';
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    
    // Initial load after a delay to ensure Firebase is ready
    setTimeout(function() {
      if (isLoggedIn) {
        loadData();
      }
    }, 2000);

