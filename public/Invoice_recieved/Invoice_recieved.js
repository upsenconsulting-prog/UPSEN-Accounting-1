// Invoice_recieved.js - Sistema de facturas recibidas

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

function getUserId() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) return data.user.uid || data.user.id || 'demo';
    }
  } catch (e) {}
  return 'demo';
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
  return 'rec-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getAllInvoicesReceived() {
  return getUserInvoicesReceived();
}

function addInvoiceReceived(invoice) {
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
  return newInvoice;
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
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay facturas recibidas.</td></tr>';
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
      '<td><button class="btn btn-sm btn-outline-success" data-paid="' + inv.id + '">✓</button> ' +
      '<button class="btn btn-sm btn-outline-danger" data-del="' + inv.id + '">X</button></td>';
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
}

// ========== GUARDAR FACTURA ==========
function saveInvoiceReceived() {
  var form = $('formNewInvoiceReceived');
  if (!form) return false;

  var invoiceNumber = "";
  var supplier = "";
  var invoiceDate = "";
  var amount = "";
  var state = "Pendiente";
  
  var inputs = form.querySelectorAll('input, select');
  for (var i = 0; i < inputs.length; i++) {
    var name = inputs[i].name || inputs[i].getAttribute('name');
    if (name === 'invoiceNumber') invoiceNumber = inputs[i].value;
    if (name === 'supplier') supplier = inputs[i].value;
    if (name === 'invoiceDate') invoiceDate = inputs[i].value;
    if (name === 'amount') amount = inputs[i].value;
    if (name === 'state') state = inputs[i].value;
  }

  if (!invoiceNumber || !supplier || !invoiceDate || !amount) {
    alert('Completa todos los campos.');
    return false;
  }

  addInvoiceReceived({
    invoiceNumber: invoiceNumber,
    supplier: supplier,
    invoiceDate: invoiceDate,
    amount: amount,
    state: state
  });

  // Close modal
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

// ========== ABRIR MODAL ==========
function openNewInvoiceModal() {
  // Generate invoice number
  var date = new Date();
  var num = 'REC-' + date.getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  var numberInput = document.querySelector('#formNewInvoiceReceived input[name="invoiceNumber"]');
  if (numberInput) numberInput.value = num;
  
  // Set today's date
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

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', async function() {
  markActivePage();
  
  // New Invoice Button
  var newInvoiceBtn = document.getElementById('btnNewInvoice');
  if (newInvoiceBtn) {
    newInvoiceBtn.addEventListener('click', function() {
      openNewInvoiceModal();
    });
  }
  
  // Save Button
  var saveBtn = document.getElementById('saveInvoiceReceivedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveInvoiceReceived();
    });
  }
  
  // Refresh button
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

