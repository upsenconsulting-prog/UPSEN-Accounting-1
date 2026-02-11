// invoice-issued.js - Sistema com suporte a Firebase + localStorage

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

var issuedChart = null;

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
  return 'upsen_invoices_issued_' + getUserId();
}

function getUserInvoicesIssued() {
  var key = getDataKey();
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

function saveUserInvoicesIssued(invoices) {
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
    var docRef = await window.firebaseDb.collection('users').doc(userId).collection('invoicesIssued').add(data);
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
    await window.firebaseDb.collection('users').doc(userId).collection('invoicesIssued').doc(id).delete();
    return true;
  } catch (error) {
    return false;
  }
}

async function getAllInvoicesIssued() {
  return getUserInvoicesIssued();
}

async function addInvoiceIssued(invoice) {
  var invoices = getUserInvoicesIssued();
  var newInvoice = {
    id: generateId(),
    invoiceNumber: invoice.invoiceNumber || '',
    customer: invoice.customer || '',
    invoiceDate: invoice.invoiceDate || '',
    dueDate: invoice.dueDate || '',
    amount: Number(invoice.amount || 0),
    state: invoice.state || 'Pendiente',
    description: invoice.description || '',
    createdAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  saveUserInvoicesIssued(invoices);
  await saveToFirestore(newInvoice);
  return newInvoice;
}

async function deleteInvoiceIssued(id) {
  var invoices = getUserInvoicesIssued();
  var filtered = invoices.filter(function(i) { return i.id !== id; });
  saveUserInvoicesIssued(filtered);
  await deleteFromFirestore(id);
}

async function updateInvoiceIssued(id, updates) {
  var invoices = getUserInvoicesIssued();
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id === id) {
      invoices[i] = Object.assign({}, invoices[i], updates);
      saveUserInvoicesIssued(invoices);
      
      if (window.USE_FIREBASE && window.firebaseDb) {
        window.firebaseDb.collection('users').doc(getUserId()).collection('invoicesIssued').doc(id).update(updates);
      }
      break;
    }
  }
}

async function renderSummaryCards() {
  var list = await getAllInvoicesIssued();
  var now = new Date();
  var pendingTotal = 0;
  var overdueTotal = 0;
  var monthlyCount = 0;
  var totalAmount = 0;
  
  list.forEach(function(inv) {
    var amount = Number(inv.amount || 0);
    totalAmount += amount;
    
    if (inv.state === 'Pendiente') {
      pendingTotal += amount;
    }
    
    if (inv.dueDate && inv.state === 'Pendiente') {
      var dueDate = new Date(inv.dueDate);
      if (dueDate < now) {
        overdueTotal += amount;
      }
    }
    
    if (inv.invoiceDate) {
      var parts = inv.invoiceDate.split('-');
      if (parts.length >= 2) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        if (year === now.getFullYear() && month === now.getMonth()) {
          monthlyCount++;
        }
      }
    }
  });
  
  var avgAmount = list.length > 0 ? totalAmount / list.length : 0;
  
  if ($('pendingTotal')) $('pendingTotal').textContent = moneyEUR(pendingTotal);
  if ($('overdueTotal')) $('overdueTotal').textContent = moneyEUR(overdueTotal);
  if ($('monthlyCount')) $('monthlyCount').textContent = monthlyCount + ' facturas';
  if ($('averageAmount')) $('averageAmount').textContent = moneyEUR(avgAmount);
}

async function renderChart() {
  var chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  var list = await getAllInvoicesIssued();
  var monthlyData = {};
  var now = new Date();
  
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthlyData[key] = 0;
  }
  
  list.forEach(function(inv) {
    if (inv.invoiceDate) {
      var monthKey = inv.invoiceDate.substring(0, 7);
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += Number(inv.amount || 0);
      }
    }
  });

  var labels = Object.keys(monthlyData).map(function(k) {
    var parts = k.split('-');
    return parts[1] + '/' + parts[0].slice(2);
  });
  var data = Object.values(monthlyData);
  var ctx = chartContainer.getContext('2d');

  if (issuedChart) issuedChart.destroy();

  issuedChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ingresos',
        data: data,
        borderColor: '#2a4d9c',
        backgroundColor: 'rgba(42, 77, 156, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return 'EUR ' + v; } } } }
    }
  });
}

async function renderInvoices() {
  var tbody = $('invoiceTbody');
  if (!tbody) return;

  var list = await getAllInvoicesIssued();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay facturas emitidas.</td></tr>';
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
      '<td>' + (inv.customer || '-') + '</td>' +
      '<td>' + formatDate(inv.invoiceDate) + '</td>' +
      '<td>' + formatDate(inv.dueDate) + '</td>' +
      '<td>' + moneyEUR(inv.amount) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td><button class="btn btn-sm btn-outline-success" data-paid="' + inv.id + '">✓</button> ' +
      '<button class="btn btn-sm btn-outline-danger" data-del="' + inv.id + '">X</button></td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (confirm('Eliminar factura?')) {
        await deleteInvoiceIssued(btn.getAttribute('data-del'));
        await renderInvoices();
        await renderChart();
        await renderSummaryCards();
      }
    });
  });

  tbody.querySelectorAll('[data-paid]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await updateInvoiceIssued(btn.getAttribute('data-paid'), { state: 'Pagada' });
      await renderInvoices();
      await renderSummaryCards();
    });
  });
}

window.saveInvoiceIssuedData = async function() {
  var form = $('formNewInvoiceIssued');
  if (!form) return false;

  var fd = new FormData(form);
  var data = {
    invoiceNumber: String(fd.get('invoiceNumber') || ''),
    customer: String(fd.get('customer') || ''),
    invoiceDate: String(fd.get('invoiceDate') || ''),
    dueDate: String(fd.get('dueDate') || ''),
    amount: String(fd.get('amount') || ''),
    state: String(fd.get('state') || 'Pendiente')
  };

  if (!data.invoiceNumber || !data.customer || !data.invoiceDate || !data.dueDate || !data.amount) {
    alert('Completa todos los campos.');
    return false;
  }

  await addInvoiceIssued(data);
  
  // Refresh the UI
  await renderInvoices();
  await renderChart();
  await renderSummaryCards();
  
  // Hide modal
  var modal = bootstrap.Modal.getInstance(document.getElementById('modalNewInvoiceIssued'));
  if (modal) modal.hide();
  
  return true;
};

document.addEventListener('DOMContentLoaded', async function() {
  markActivePage();
  
  // Add event listener for save button
  var saveBtn = $('saveInvoiceIssuedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      await saveInvoiceIssuedData();
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
