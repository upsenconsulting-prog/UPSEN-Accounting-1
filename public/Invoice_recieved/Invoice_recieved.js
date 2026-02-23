
// Invoice_recieved.js - Sistema de facturas recibidas - COM FIREBASE E IVA

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  return 'EUR ' + Number(n || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function markActivePage() {
  var currentPage = window.location.href;
  var links = document.querySelectorAll('.sidebar-link');
  for (var i = 0; i < links.length; i++) {
    links[i].parentElement.classList.remove('active');
    if (links[i].href === currentPage) {
      links[i].parentElement.classList.add('active');
    }
  }
}

var receivedChart = null;

// ========== USER ID - CORRIGIDO ==========
function getUserId() {
  // First check Firebase Auth directly (this always works)
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser.uid;
  }
  
  // Also check AuthService
  try {
    var auth = window.AuthService || window.Auth;
    if (auth && auth.getCurrentUser) {
      var user = auth.getCurrentUser();
      if (user) {
        return user.uid || user.id;
      }
    }
  } catch (e) {}
  
  // Fallback to localStorage
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        return data.user.uid || data.user.id || 'unknown';
      }
    }
  } catch (e) {}
  
  return 'unknown';
}

function isLoggedIn() {
  var userId = getUserId();
  return userId && userId !== 'demo' && userId !== 'unknown';
}

function getDataKey() {
  return 'upsen_invoices_received_' + getUserId();
}

function getUserInvoicesReceived() {
  // First check Firebase Auth directly
  var userId = null;
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    userId = window.firebaseAuth.currentUser.uid;
  }
  
  // Try AuthService
  if (!userId) {
    try {
      var auth = window.AuthService || window.Auth;
      if (auth && auth.getCurrentUser) {
        var user = auth.getCurrentUser();
        if (user) {
          userId = user.uid || user.id;
        }
      }
    } catch (e) {}
  }

  // Use ONLY user-specific keys - no fallback to other users
  if (userId) {
    try {
      var data = localStorage.getItem('upsen_invoices_received_' + userId);
      if (data) return JSON.parse(data);
    } catch (e) {}
  }

  // REMOVED: Fallback that was loading data from other users
  // Each user now has isolated data

  return [];
}

function saveUserInvoicesReceived(invoices) {
  localStorage.setItem(getDataKey(), JSON.stringify(invoices));
}

function generateId() {
  return 'rec-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getAllInvoicesReceived() {
  return getUserInvoicesReceived();
}

function addInvoiceReceived(invoice) {
  var invoices = getUserInvoicesReceived();
  
  // Calcular IVA
  var baseImponible = Number(invoice.amount || 0);
  var ivaRate = Number(invoice.ivaRate || 0);
  var ivaAmount = baseImponible * (ivaRate / 100);
  var totalAmount = baseImponible + ivaAmount;
  
  var newInvoice = {
    id: generateId(),
    invoiceNumber: invoice.invoiceNumber || '',
    supplier: invoice.supplier || '',
    supplierNif: invoice.supplierNif || '',
    invoiceDate: invoice.invoiceDate || '',
    amount: baseImponible,
    ivaRate: ivaRate,
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    state: invoice.state || 'Pendiente',
    description: invoice.description || '',
    createdAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  saveUserInvoicesReceived(invoices);
  
  // Also save to Firebase
  saveInvoiceReceivedToFirebase(newInvoice);
  
  return newInvoice;
}

function saveInvoiceReceivedToFirebase(invoice) {
  var userId = getUserId();
  console.log('=== SAVE TO FIREBASE ===');
  console.log('userId:', userId);
  console.log('invoice:', invoice);
  
  // Always save to Firebase if not demo
  if (!userId || userId === 'unknown' || userId === 'demo') {
    console.log('Utilizador não está logado, salvando apenas localmente');
    return;
  }
  
  if (!window.firebaseDb) {
    console.log('Firebase não disponível, salvando apenas localmente');
    return;
  }
  
  console.log('Salvando no Firebase...');
  console.log('Path: users/' + userId + '/documents/invoicesReceived/items');
  
  window.firebaseDb.collection('users').doc(userId).collection('documents').doc('invoicesReceived').collection('items').add({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    supplier: invoice.supplier,
    supplierNif: invoice.supplierNif || '',
    invoiceDate: invoice.invoiceDate,
    amount: invoice.amount,
    ivaRate: invoice.ivaRate || 0,
    ivaAmount: invoice.ivaAmount || 0,
    totalAmount: invoice.totalAmount || invoice.amount,
    state: invoice.state,
    description: invoice.description || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    console.log('Fatura recebida salva no Firebase');
  }).catch(function(error) {
    console.warn('Erro ao salvar no Firebase:', error.message);
  });
}

function deleteInvoiceReceived(id) {
  var invoices = getUserInvoicesReceived();
  var filtered = [];
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id !== id) {
      filtered.push(invoices[i]);
    }
  }
  saveUserInvoicesReceived(filtered);
  
  // Also delete from Firebase
  deleteInvoiceReceivedFromFirebase(id);
}

function deleteInvoiceReceivedFromFirebase(id) {
  var userId = getUserId();
  if (!userId || userId === 'unknown') return;
  if (!window.firebaseDb) return;
  
  window.firebaseDb.collection('users').doc(userId).collection('documents').doc('invoicesReceived').collection('items')
    .where('id', '==', id)
    .get()
    .then(function(snapshot) {
      snapshot.forEach(function(doc) {
        doc.ref.delete();
      });
      console.log('Fatura recebida eliminada do Firebase');
    })
    .catch(function(error) {
      console.warn('Erro ao eliminar do Firebase:', error.message);
    });
}

function updateInvoiceReceived(id, updates) {
  var invoices = getUserInvoicesReceived();
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id === id) {
      invoices[i] = Object.assign({}, invoices[i], updates);
      saveUserInvoicesReceived(invoices);
      break;
    }
  }
}

async function renderSummaryCards() {
  var list = getAllInvoicesReceived();
  var now = new Date();
  var pendingTotal = 0;
  var paidTotal = 0;
  var monthlyTotal = 0;
  var overdueCount = 0;
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    var amount = Number(inv.amount || 0);
    
    if (inv.state === 'Pendiente') {
      pendingTotal += amount;
      
      if (inv.invoiceDate) {
        var invoiceDate = new Date(inv.invoiceDate);
        var dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        if (dueDate < now) {
          overdueCount++;
        }
      }
    } else if (inv.state === 'Pagada') {
      paidTotal += amount;
    }
    
    if (inv.invoiceDate) {
      var parts = inv.invoiceDate.split('-');
      if (parts.length >= 2) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        if (year === now.getFullYear() && month === now.getMonth()) {
          monthlyTotal += amount;
        }
      }
    }
  }
  
  if ($('pendingTotal')) $('pendingTotal').textContent = moneyEUR(pendingTotal);
  if ($('paidTotal')) $('paidTotal').textContent = moneyEUR(paidTotal);
  if ($('monthlyTotal')) $('monthlyTotal').textContent = moneyEUR(monthlyTotal);
  if ($('overdueCount')) $('overdueCount').textContent = overdueCount;
}

async function renderChart() {
  var chartContainer = document.getElementById('receivedChartCanvas');
  if (!chartContainer) return;

  var list = getAllInvoicesReceived();
  var supplierTotals = {};
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    var supplier = inv.supplier || 'Sin proveedor';
    supplierTotals[supplier] = (supplierTotals[supplier] || 0) + Number(inv.amount || 0);
  }

  var labels = Object.keys(supplierTotals);
  var data = Object.values(supplierTotals);
  var ctx = chartContainer.getContext('2d');

  if (receivedChart) receivedChart.destroy();

  receivedChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: ['#2a4d9c', '#3a6cd6', '#1abc9c', '#e74c3c', '#f39c12']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}

async function renderInvoices() {
  var tbody = $('invoiceTBody');
  if (!tbody) return;

  var list = getAllInvoicesReceived();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay facturas recibidas.</td></tr>';
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    var statusClass = 'status-pending';
    var statusText = 'Pendiente';
    
    if (inv.state === 'Pagada') {
      statusClass = 'status-paid';
      statusText = 'Pagada';
    } else if (inv.state === 'Vencida') {
      statusClass = 'status-overdue';
      statusText = 'Vencida';
    }
    
    var ivaDisplay = inv.ivaRate > 0 ? inv.ivaRate + '%' : '-';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (inv.invoiceNumber || '-') + '</td>' +
      '<td>' + (inv.supplier || '-') + '</td>' +
      '<td>' + formatDate(inv.invoiceDate) + '</td>' +
      '<td>' + moneyEUR(inv.amount) + '</td>' +
      '<td>' + ivaDisplay + '</td>' +
      '<td>' + moneyEUR(inv.ivaAmount || 0) + '</td>' +
      '<td>' + moneyEUR(inv.totalAmount || inv.amount) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td class="action-buttons">' +
        '<button class="btn btn-primary btn-sm py-1 px-2 me-1" style="font-size:0.75rem" data-view="' + inv.id + '"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-success btn-sm py-1 px-2 me-1" style="font-size:0.75rem" data-paid="' + inv.id + '"><i class="fas fa-check"></i></button>' +
        '<button class="btn btn-danger btn-sm py-1 px-2" style="font-size:0.75rem" data-del="' + inv.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
  }

  var delBtns = tbody.querySelectorAll('[data-del]');
  for (var j = 0; j < delBtns.length; j++) {
    delBtns[j].addEventListener('click', function() {
      var id = this.getAttribute('data-del');
      if (confirm('Eliminar factura?')) {
        deleteInvoiceReceived(id);
        renderInvoices();
        renderChart();
        renderSummaryCards();
      }
    });
  }

  var paidBtns = tbody.querySelectorAll('[data-paid]');
  for (var k = 0; k < paidBtns.length; k++) {
    paidBtns[k].addEventListener('click', function() {
      var id = this.getAttribute('data-paid');
      updateInvoiceReceived(id, { state: 'Pagada' });
      renderInvoices();
      renderSummaryCards();
    });
  }

  var viewBtns = tbody.querySelectorAll('[data-view]');
  for (var l = 0; l < viewBtns.length; l++) {
    viewBtns[l].addEventListener('click', function() {
      var id = this.getAttribute('data-view');
      viewInvoice(id);
    });
  }
}

window.viewInvoice = function(id) {
  var list = getAllInvoicesReceived();
  var invoice = list.find(function(inv) { return inv.id === id; });
  if (!invoice) return;

  var content = document.getElementById('viewInvoiceContent');
  if (content) {
    var statusLabels = { Pendiente: 'Pendiente', Pagada: 'Pagada', Vencida: 'Vencida' };
    content.innerHTML = '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Numero:</strong> ' + (invoice.invoiceNumber || '-') + '</div>' +
      '<div class="col-md-6"><strong>Proveedor:</strong> ' + (invoice.supplier || '-') + '</div>' +
      '</div>' +
      (invoice.supplierNif ? '<div class="row mb-3"><div class="col-md-6"><strong>NIF Proveedor:</strong> ' + invoice.supplierNif + '</div></div>' : '') +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Fecha:</strong> ' + formatDate(invoice.invoiceDate) + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Base Imponible:</strong> <span class="fs-5 fw-bold">' + moneyEUR(invoice.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>IVA (' + (invoice.ivaRate || 0) + '%):</strong> ' + moneyEUR(invoice.ivaAmount || 0) + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Total:</strong> <span class="fs-4 fw-bold text-success">' + moneyEUR(invoice.totalAmount || invoice.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">' + (statusLabels[invoice.state] || 'Pendiente') + '</span></div>' +
      '</div>' +
      '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(invoice.createdAt || '').toLocaleString() + '</small></div>';
  }

  if (window.viewInvoiceModal) {
    window.viewInvoiceModal.show();
  }
};

function saveInvoiceReceived() {
  var form = $('formNewInvoiceReceived');
  if (!form) return false;

  var invoiceNumber = "";
  var supplier = "";
  var supplierNif = "";
  var invoiceDate = "";
  var amount = "";
  var ivaRate = "";
  var state = "Pendiente";
  
  var inputs = form.querySelectorAll('input, select');
  for (var i = 0; i < inputs.length; i++) {
    var name = inputs[i].name || inputs[i].getAttribute('name');
    if (name === 'invoiceNumber') invoiceNumber = inputs[i].value;
    if (name === 'supplier') supplier = inputs[i].value;
    if (name === 'supplierNif') supplierNif = inputs[i].value;
    if (name === 'invoiceDate') invoiceDate = inputs[i].value;
    if (name === 'amount') amount = inputs[i].value;
    if (name === 'ivaRate') ivaRate = inputs[i].value;
    if (name === 'state') state = inputs[i].value;
  }

  if (!invoiceNumber || !supplier || !invoiceDate || !amount) {
    alert('Completa todos los campos.');
    return false;
  }

  addInvoiceReceived({
    invoiceNumber: invoiceNumber,
    supplier: supplier,
    supplierNif: supplierNif,
    invoiceDate: invoiceDate,
    amount: amount,
    ivaRate: ivaRate || 0,
    state: state
  });

  var modalEl = document.getElementById('modalNewInvoiceReceived');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    } else {
      new bootstrap.Modal(modalEl).hide();
    }
  }

  form.reset();
  renderInvoices();
  renderChart();
  renderSummaryCards();
  return true;
}

function openNewInvoiceModal() {
  var date = new Date();
  var num = 'REC-' + date.getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  var numberInput = document.querySelector('#formNewInvoiceReceived input[name="invoiceNumber"]');
  if (numberInput) numberInput.value = num;
  
  var invoiceDate = document.querySelector('#formNewInvoiceReceived input[name="invoiceDate"]');
  if (invoiceDate) invoiceDate.value = new Date().toISOString().split('T')[0];
  
  var modalEl = document.getElementById('modalNewInvoiceReceived');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  markActivePage();
  
  // Wait for auth to be ready before loading data
  window.waitForAuth(function() {
    console.log('Auth ready, initializing invoice received page...');
    
    var newInvoiceBtn = document.getElementById('btnNewInvoice');
    if (newInvoiceBtn) {
      newInvoiceBtn.addEventListener('click', function() {
        openNewInvoiceModal();
      });
    }
    
    var saveBtn = document.getElementById('saveInvoiceReceivedBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        saveInvoiceReceived();
      });
    }
    
    // Import button handler - Open modal instead of clicking hidden input
    var importBtn = document.getElementById('btnImport');
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        var modalEl = document.getElementById('modalImport');
        if (modalEl) {
          var modal = bootstrap.Modal.getInstance(modalEl);
          if (!modal) {
            modal = new bootstrap.Modal(modalEl);
          }
          modal.show();
        }
      });
    }
    
    // Export button handler - Open modal
    var exportBtn = document.getElementById('btnExport');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var modalEl = document.getElementById('modalExport');
        if (modalEl) {
          var modal = bootstrap.Modal.getInstance(modalEl);
          if (!modal) {
            modal = new bootstrap.Modal(modalEl);
          }
          modal.show();
        }
      });
    }
    
    // Confirm Import Button handler
    var confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', function() {
        var fileInput = document.getElementById('importFileInputReceived');
        if (fileInput && fileInput.files.length > 0) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var content = e.target.result;
            var count = 0;
            if (typeof importInvoicesReceivedFromCSV === 'function') {
              count = importInvoicesReceivedFromCSV(content);
            }
            
            if (count > 0) {
              alert(count + ' facturas importadas con éxito!');
              renderInvoices();
              renderChart();
              renderSummaryCards();
              var modalEl = document.getElementById('modalImport');
              if (modalEl) {
                var modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
              }
            } else {
              alert('Ninguna factura importada. Verifica el formato del CSV.');
            }
            
            fileInput.value = '';
          };
          reader.readAsText(fileInput.files[0]);
        } else {
          alert('Por favor, selecciona un archivo CSV.');
        }
      });
    }
    
    // Confirm Export Button handler
    var confirmExportBtn = document.getElementById('confirmExportBtn');
    if (confirmExportBtn) {
      confirmExportBtn.addEventListener('click', function() {
        var format = document.getElementById('exportFormat')?.value || 'pdf';
        var period = document.getElementById('exportPeriod')?.value || 'all';
        
        if (typeof exportReceivedInvoices === 'function') {
          exportReceivedInvoices(format, period);
        }
        
        var modalEl = document.getElementById('modalExport');
        if (modalEl) {
          var modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      });
    }
    
    var ocrBtn = document.getElementById('btnNewInvoiceOCR');
    if (ocrBtn) {
      ocrBtn.addEventListener('click', function() {
        openOCRModal();
      });
    }
    
    var saveOCRBtn = document.getElementById('saveOCRBtn');
    if (saveOCRBtn) {
      saveOCRBtn.addEventListener('click', function() {
        processOCR();
      });
    }
    
    var filterBtn = document.getElementById('btnFilter');
    if (filterBtn) {
      filterBtn.addEventListener('click', function() {
        toggleFilter();
      });
    }
    
    var applyFilterBtn = document.getElementById('applyFilter');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', function() {
        applyFilters();
      });
    }
    
    var clearFilterBtn = document.getElementById('clearFilter');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', function() {
        clearFilters();
      });
    }
    
    var downloadBtn = document.getElementById('btnDownload');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        exportToPDF();
      });
    }
    
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        location.reload();
      });
    }
    
    renderInvoices();
    renderChart();
    renderSummaryCards();
  });
});

function openOCRModal() {
  var modalEl = document.getElementById('modalNewInvoiceOCR');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
  }
}

function processOCR() {
  var fileInput = document.querySelector('#formNewInvoiceOCR input[name="ocrFile"]');
  if (!fileInput || !fileInput.files.length) {
    alert('Por favor, selecciona un archivo.');
    return;
  }
  
  alert('El archivo esta siendo procesado. Esta funcion requiere integracion con un servicio OCR.');
  
  var modalEl = document.getElementById('modalNewInvoiceOCR');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
  }
}

var currentFilters = {
  state: '',
  dateFrom: '',
  dateTo: ''
};

function toggleFilter() {
  var filterCard = document.getElementById('filterCard');
  if (filterCard) {
    if (filterCard.style.display === 'none') {
      filterCard.style.display = 'block';
    } else {
      filterCard.style.display = 'none';
    }
  }
}

function applyFilters() {
  var form = document.getElementById('filterForm');
  if (form) {
    currentFilters.state = form.querySelector('[name="state"]')?.value || '';
    currentFilters.dateFrom = form.querySelector('[name="dateFrom"]')?.value || '';
    currentFilters.dateTo = form.querySelector('[name="dateTo"]')?.value || '';
  }
  
  renderInvoicesFiltered();
  
  var filterCard = document.getElementById('filterCard');
  if (filterCard) {
    filterCard.style.display = 'none';
  }
}

function clearFilters() {
  currentFilters = {
    state: '',
    dateFrom: '',
    dateTo: ''
  };
  
  var form = document.getElementById('filterForm');
  if (form) {
    form.reset();
  }
  
  renderInvoices();
}

function renderInvoicesFiltered() {
  var tbody = $('invoiceTBody');
  if (!tbody) return;

  var allInvoices = getAllInvoicesReceived();
  var filtered = [];

  for (var i = 0; i < allInvoices.length; i++) {
    var inv = allInvoices[i];
    var include = true;
    
    if (currentFilters.state && inv.state !== currentFilters.state) {
      include = false;
    }
    
    if (currentFilters.dateFrom && inv.invoiceDate && inv.invoiceDate < currentFilters.dateFrom) {
      include = false;
    }
    
    if (currentFilters.dateTo && inv.invoiceDate && inv.invoiceDate > currentFilters.dateTo) {
      include = false;
    }
    
    if (include) {
      filtered.push(inv);
    }
  }

  renderInvoicesFromList(filtered);
}

function renderInvoicesFromList(list) {
  var tbody = $('invoiceTBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay facturas que coincidan con los filtros.</td></tr>';
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    var statusClass = 'status-pending';
    var statusText = 'Pendiente';
    
    if (inv.state === 'Pagada') {
      statusClass = 'status-paid';
      statusText = 'Pagada';
    } else if (inv.state === 'Vencida') {
      statusClass = 'status-overdue';
      statusText = 'Vencida';
    }
    
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (inv.invoiceNumber || '-') + '</td>' +
      '<td>' + (inv.supplier || '-') + '</td>' +
      '<td>' + formatDate(inv.invoiceDate) + '</td>' +
      '<td>' + moneyEUR(inv.amount) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td class="action-buttons">' +
        '<button class="btn btn-primary btn-sm py-1 px-2 me-1" style="font-size:0.75rem" data-view="' + inv.id + '"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-success btn-sm py-1 px-2 me-1" style="font-size:0.75rem" data-paid="' + inv.id + '"><i class="fas fa-check"></i></button>' +
        '<button class="btn btn-danger btn-sm py-1 px-2" style="font-size:0.75rem" data-del="' + inv.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
  }

  attachInvoiceListeners();
}

function attachInvoiceListeners() {
  var tbody = $('invoiceTBody');
  if (!tbody) return;

  var delBtns = tbody.querySelectorAll('[data-del]');
  for (var j = 0; j < delBtns.length; j++) {
    delBtns[j].addEventListener('click', function() {
      var id = this.getAttribute('data-del');
      if (confirm('Eliminar factura?')) {
        deleteInvoiceReceived(id);
        if (currentFilters.state || currentFilters.dateFrom || currentFilters.dateTo) {
          renderInvoicesFiltered();
        } else {
          renderInvoices();
        }
        renderChart();
        renderSummaryCards();
      }
    });
  }

  var paidBtns = tbody.querySelectorAll('[data-paid]');
  for (var k = 0; k < paidBtns.length; k++) {
    paidBtns[k].addEventListener('click', function() {
      var id = this.getAttribute('data-paid');
      updateInvoiceReceived(id, { state: 'Pagada' });
      if (currentFilters.state || currentFilters.dateFrom || currentFilters.dateTo) {
        renderInvoicesFiltered();
      } else {
        renderInvoices();
      }
      renderSummaryCards();
    });
  }

  var viewBtns = tbody.querySelectorAll('[data-view]');
  for (var l = 0; l < viewBtns.length; l++) {
    viewBtns[l].addEventListener('click', function() {
      var id = this.getAttribute('data-view');
      viewInvoice(id);
    });
  }
}

function exportToPDF() {
  var list = getAllInvoicesReceived();
  if (!list.length) {
    alert('No hay facturas para exportar.');
    return;
  }
  
  if (typeof window.jspdf === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function() {
      generatePDF(list);
    };
    script.onerror = function() {
      alert('Error al cargar la biblioteca PDF. Por favor, intentelo de nuevo.');
    };
    document.head.appendChild(script);
  } else {
    generatePDF(list);
  }
}

function generatePDF(list) {
  var doc = new window.jspdf.jsPDF();
  
  doc.setFillColor(42, 77, 156);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('UPSEN Accounting', 105, 18, {align: 'center'});
  doc.setFontSize(12);
  doc.text('Facturas Recibidas', 105, 28, {align: 'center'});
  
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align: 'right'});
  doc.line(15, 40, 195, 40);
  
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Numero', 15, y);
  doc.text('Proveedor', 55, y);
  doc.text('Fecha', 105, y);
  doc.text('Importe', 155, y);
  doc.text('Estado', 185, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.line(15, y - 3, 195, y - 3);
  
  for (var i = 0; i < list.length && y < 270; i++) {
    var inv = list[i];
    doc.text(inv.invoiceNumber || '-', 15, y);
    doc.text((inv.supplier || '-').substring(0, 25), 55, y);
    doc.text(formatDate(inv.invoiceDate), 105, y);
    doc.text(moneyEUR(inv.amount), 155, y);
    doc.text(inv.state || 'Pendiente', 185, y);
    y += 8;
  }
  
  var total = 0;
  for (var j = 0; j < list.length; j++) {
    total += Number(list[j].amount || 0);
  }
  y += 5;
  doc.setFontSize(12);
  doc.text('Total:', 130, y);
  doc.setFontSize(14);
  doc.setTextColor(42, 77, 156);
  doc.text(moneyEUR(total), 165, y);
  
  doc.save('facturas_recibidas.pdf');
  alert('PDF descargado correctamente!');
}

// ========== TEMPLATE CSV ==========
function downloadReceivedInvoiceTemplate() {
  var template = 'Numero,Proveedor,NIF,Fecha,Base Imponible,IVA Rate,Estado\n';
  template += 'REC-2025-001,Proveedor SL,12345678A,2025-01-15,1000.00,21,Pendiente\n';
  template += 'REC-2025-002,Empresa SA,87654321B,2025-01-20,2500.00,21,Pagada\n';
  
  var blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_facturas_recibidas.csv';
  link.click();
  alert('Template descargado! Use este formato para importar facturas.');
}

// ========== IMPORTAR FACTURAS RECIBIDAS ==========
function importInvoicesReceivedFromCSV(csvContent) {
  var lines = csvContent.split('\n');
  if (lines.length < 2) {
    alert('CSV vacío o sin datos.');
    return 0;
  }
  
  var headers = lines[0].split(',').map(function(h) { return h.trim().toLowerCase().replace(/"/g, ''); });
  var importedCount = 0;
  
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    var values = [];
    var current = '';
    var inQuotes = false;
    for (var j = 0; j < line.length; j++) {
      var char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    var invoice = {};
    for (var k = 0; k < headers.length && k < values.length; k++) {
      var header = headers[k].replace(/"/g, '');
      var value = values[k].replace(/"/g, '');
      
      if (header.includes('numero') || header.includes('number')) invoice.invoiceNumber = value;
      else if (header.includes('proveedor') || header.includes('supplier')) invoice.supplier = value;
      else if (header.includes('nif') || header.includes('nit')) invoice.supplierNif = value;
      else if (header.includes('fecha') || header.includes('date')) invoice.invoiceDate = value;
      else if (header.includes('base') || header.includes('importe') || header.includes('amount')) invoice.amount = parseFloat(value) || 0;
      else if (header.includes('iva') || header.includes('rate') || header.includes('tax')) invoice.ivaRate = parseFloat(value) || 0;
      else if (header.includes('estado') || header.includes('state')) invoice.state = value;
    }
    
    if (invoice.invoiceNumber && invoice.supplier && invoice.amount) {
      addInvoiceReceived(invoice);
      importedCount++;
    }
  }
  
  return importedCount;
}

function handleFileImportReceived(event) {
  var file = event.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var content = e.target.result;
    var count = 0;
    
    if (file.name.endsWith('.csv')) {
      count = importInvoicesReceivedFromCSV(content);
    } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      alert('Para Excel, por favor convierte a CSV primero.');
    } else {
      alert('Formato no soportado. Usa CSV.');
    }
    
    if (count > 0) {
      alert(count + ' facturas importadas con éxito!');
      renderInvoices();
      renderChart();
      renderSummaryCards();
    } else {
      alert('Ninguna factura importada. Verifica el formato del CSV.');
    }
    
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ========== EXPORTAR FACTURAS RECIBIDAS ==========
function exportReceivedInvoices(format, period) {
  var list = getAllInvoicesReceived();
  if (!list.length) {
    alert('No hay facturas para exportar.');
    return;
  }
  
  // Filtrar por período
  var now = new Date();
  var filtered = list;
  
  if (period === 'month') {
    filtered = list.filter(function(inv) {
      if (!inv.invoiceDate) return false;
      var parts = inv.invoiceDate.split('-');
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]) - 1;
      return year === now.getFullYear() && month === now.getMonth();
    });
  } else if (period === 'year') {
    filtered = list.filter(function(inv) {
      if (!inv.invoiceDate) return false;
      var parts = inv.invoiceDate.split('-');
      var year = parseInt(parts[0]);
      return year === now.getFullYear();
    });
  }
  
  if (format === 'pdf') {
    exportReceivedInvoicesToPDF(filtered);
  } else if (format === 'csv') {
    exportReceivedInvoicesToCSV(filtered);
  } else if (format === 'excel') {
    exportReceivedInvoicesToExcel(filtered);
  }
}

function exportReceivedInvoicesToPDF(list) {
  if (typeof window.jspdf === 'undefined') {
    alert('Biblioteca PDF no disponible.');
    return;
  }
  
  var doc = new window.jspdf.jsPDF();
  
  // Header
  doc.setFillColor(42, 77, 156);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('UPSEN Accounting', 105, 18, {align: 'center'});
  doc.setFontSize(12);
  doc.text('Facturas Recibidas', 105, 28, {align: 'center'});
  
  // Data
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align: 'right'});
  doc.line(15, 40, 195, 40);
  
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Numero', 15, y);
  doc.text('Proveedor', 50, y);
  doc.text('Fecha', 105, y);
  doc.text('Importe', 155, y);
  doc.text('Estado', 185, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.line(15, y - 3, 195, y - 3);
  
  for (var i = 0; i < list.length && y < 270; i++) {
    var inv = list[i];
    doc.text(inv.invoiceNumber || '-', 15, y);
    doc.text((inv.supplier || '-').substring(0, 20), 50, y);
    doc.text(formatDate(inv.invoiceDate), 105, y);
    doc.text(moneyEUR(inv.amount), 155, y);
    doc.text(inv.state || 'Pendiente', 185, y);
    y += 8;
  }
  
  // Total
  var total = 0;
  for (var j = 0; j < list.length; j++) {
    total += Number(list[j].amount || 0);
  }
  y += 5;
  doc.setFontSize(12);
  doc.text('Total:', 130, y);
  doc.setFontSize(14);
  doc.setTextColor(42, 77, 156);
  doc.text(moneyEUR(total), 165, y);
  
  doc.save('facturas_recibidas.pdf');
  alert('PDF descargado correctamente!');
}

function exportReceivedInvoicesToCSV(list) {
  var csv = 'Numero,Proveedor,NIF,Fecha,Importe,IVA Rate,IVA,Total,Estado\n';
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    csv += '"' + (inv.invoiceNumber || '') + '",';
    csv += '"' + (inv.supplier || '') + '",';
    csv += '"' + (inv.supplierNif || '') + '",';
    csv += '"' + (inv.invoiceDate || '') + '",';
    csv += '"' + (inv.amount || 0) + '",';
    csv += '"' + (inv.ivaRate || 0) + '",';
    csv += '"' + (inv.ivaAmount || 0) + '",';
    csv += '"' + (inv.totalAmount || inv.amount || 0) + '",';
    csv += '"' + (inv.state || 'Pendiente') + '"\n';
  }
  
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'facturas_recibidas.csv';
  link.click();
  alert('CSV descargado correctamente!');
}

function exportReceivedInvoicesToExcel(list) {
  var html = '<table border="1">';
  html += '<tr><th>Numero</th><th>Proveedor</th><th>NIF</th><th>Fecha</th><th>Importe</th><th>IVA %</th><th>IVA</th><th>Total</th><th>Estado</th></tr>';
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    html += '<tr>';
    html += '<td>' + (inv.invoiceNumber || '') + '</td>';
    html += '<td>' + (inv.supplier || '') + '</td>';
    html += '<td>' + (inv.supplierNif || '') + '</td>';
    html += '<td>' + (inv.invoiceDate || '') + '</td>';
    html += '<td>' + (inv.amount || 0) + '</td>';
    html += '<td>' + (inv.ivaRate || 0) + '</td>';
    html += '<td>' + (inv.ivaAmount || 0) + '</td>';
    html += '<td>' + (inv.totalAmount || inv.amount || 0) + '</td>';
    html += '<td>' + (inv.state || 'Pendiente') + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  
  var excelHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  excelHtml += '<head><meta charset="UTF-8"></head><body>' + html + '</body></html>';
  
  var blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'facturas_recibidas.xls';
  link.click();
  alert('Excel descargado correctamente!');
}

