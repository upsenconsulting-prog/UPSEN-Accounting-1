// Invoice_recieved.js - Sistema com suporte a Firebase + localStorage

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
  links.forEach(function(link) {
    link.parentElement.classList.remove('active');
    if (link.href === currentPage) {
      link.parentElement.classList.add('active');
    }
  });
}

var receivedChart = null;

function getUserId() {
  var auth = window.AuthService || window.Auth;
  if (auth && auth.getCurrentUser) {
    var user = auth.getCurrentUser();
    if (user) return user.uid || user.id || 'unknown';
  }
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) return data.user.uid || data.user.id || 'unknown';
    }
  } catch (e) {}
  return 'unknown';
}

function getDataKey() {
  return 'upsen_invoices_received_' + getUserId();
}

function getUserInvoicesReceived() {
  var key = getDataKey();
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

function saveUserInvoicesReceived(invoices) {
  localStorage.setItem(getDataKey(), JSON.stringify(invoices));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

async function saveToFirestore(data) {
  if (!window.USE_FIREBASE || !window.firebaseDb) return null;
  var userId = getUserId();
  if (userId === 'unknown') return null;
  try {
    var docRef = await window.firebaseDb.collection('users').doc(userId).collection('invoicesReceived').add(data);
    return docRef.id;
  } catch (error) {
    console.warn('Erro ao guardar no Firestore:', error.message);
    return null;
  }
}

async function deleteFromFirestore(id) {
  if (!window.USE_FIREBASE || !window.firebaseDb) return false;
  var userId = getUserId();
  if (userId === 'unknown') return false;
  try {
    await window.firebaseDb.collection('users').doc(userId).collection('invoicesReceived').doc(id).delete();
    return true;
  } catch (error) {
    return false;
  }
}

async function getAllInvoicesReceived() {
  return getUserInvoicesReceived();
}

async function addInvoiceReceived(invoice) {
  var invoices = getUserInvoicesReceived();
  var newInvoice = {
    id: generateId(),
    invoiceNumber: invoice.invoiceNumber || '',
    supplier: invoice.supplier || '',
    invoiceDate: invoice.invoiceDate || '',
    amount: Number(invoice.amount || 0),
    state: invoice.state || 'Pendiente',
    description: invoice.description || '',
    createdAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  saveUserInvoicesReceived(invoices);
  await saveToFirestore(newInvoice);
  return newInvoice;
}

async function deleteInvoiceReceived(id) {
  var invoices = getUserInvoicesReceived();
  var filtered = invoices.filter(function(i) { return i.id !== id; });
  saveUserInvoicesReceived(filtered);
  await deleteFromFirestore(id);
}

async function updateInvoiceReceived(id, updates) {
  var invoices = getUserInvoicesReceived();
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id === id) {
      invoices[i] = Object.assign({}, invoices[i], updates);
      saveUserInvoicesReceived(invoices);
      
      if (window.USE_FIREBASE && window.firebaseDb) {
        window.firebaseDb.collection('users').doc(getUserId()).collection('invoicesReceived').doc(id).update(updates);
      }
      break;
    }
  }
}

async function renderSummaryCards() {
  var list = await getAllInvoicesReceived();
  var now = new Date();
  var pendingTotal = 0;
  var paidTotal = 0;
  var monthlyTotal = 0;
  var overdueCount = 0;
  
  list.forEach(function(inv) {
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
  });
  
  if ($('pendingTotal')) $('pendingTotal').textContent = moneyEUR(pendingTotal);
  if ($('paidTotal')) $('paidTotal').textContent = moneyEUR(paidTotal);
  if ($('monthlyTotal')) $('monthlyTotal').textContent = moneyEUR(monthlyTotal);
  if ($('overdueCount')) $('overdueCount').textContent = overdueCount;
}

async function renderChart() {
  var chartContainer = document.getElementById('receivedChartCanvas');
  if (!chartContainer) return;

  var list = await getAllInvoicesReceived();
  var supplierTotals = {};
  
  list.forEach(function(inv) {
    var supplier = inv.supplier || 'Sin proveedor';
    supplierTotals[supplier] = (supplierTotals[supplier] || 0) + Number(inv.amount || 0);
  });

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

  var list = await getAllInvoicesReceived();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay facturas recibidas.</td></tr>';
    return;
  }

  list.forEach(function(inv) {
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
      '<td><button class="btn btn-sm btn-outline-success" data-paid="' + inv.id + '">✓</button> ' +
      '<button class="btn btn-sm btn-outline-danger" data-del="' + inv.id + '">X</button></td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (confirm('Eliminar factura?')) {
        await deleteInvoiceReceived(btn.getAttribute('data-del'));
        await renderInvoices();
        await renderChart();
        await renderSummaryCards();
      }
    });
  });

  tbody.querySelectorAll('[data-paid]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await updateInvoiceReceived(btn.getAttribute('data-paid'), { state: 'Pagada' });
      await renderInvoices();
      await renderSummaryCards();
    });
  });
}

window.saveInvoiceReceivedData = async function() {
  var form = $('formNewInvoiceReceived');
  if (!form) return false;

  var fd = new FormData(form);
  var data = {
    invoiceNumber: String(fd.get('invoiceNumber') || ''),
    supplier: String(fd.get('supplier') || ''),
    invoiceDate: String(fd.get('invoiceDate') || ''),
    amount: String(fd.get('amount') || ''),
    state: String(fd.get('state') || 'Pendiente')
  };

  if (!data.invoiceNumber || !data.supplier || !data.invoiceDate || !data.amount) {
    alert('Completa todos los campos.');
    return false;
  }

  await addInvoiceReceived(data);
  
  // Refresh the UI
  await renderInvoices();
  await renderChart();
  await renderSummaryCards();
  
  // Hide modal
  var modal = bootstrap.Modal.getInstance(document.getElementById('modalNewInvoiceReceived'));
  if (modal) modal.hide();
  
  return true;
};

document.addEventListener('DOMContentLoaded', async function() {
  markActivePage();
  
  // Add event listener for save button
  var saveBtn = $('saveInvoiceReceivedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      await saveInvoiceReceivedData();
    });
  }
  
  function waitForAuth() {
    var auth = window.AuthService || window.Auth;
    if (auth && typeof auth.isLoggedIn === 'function') {
      renderInvoices();
      renderChart();
      renderSummaryCards();
    } else {
      setTimeout(waitForAuth, 100);
    }
  }
  
  setTimeout(waitForAuth, 200);
});
