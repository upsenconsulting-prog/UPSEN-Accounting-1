// invoice-issued.js - Sistema de facturas emitidas

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

var issuedChart = null;

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
  return 'inv-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getAllInvoicesIssued() {
  return getUserInvoicesIssued();
}

function addInvoiceIssued(invoice) {
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
  return newInvoice;
}

function deleteInvoiceIssued(id) {
  var invoices = getUserInvoicesIssued();
  var filtered = [];
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id !== id) {
      filtered.push(invoices[i]);
    }
  }
  saveUserInvoicesIssued(filtered);
}

function updateInvoiceIssued(id, updates) {
  var invoices = getUserInvoicesIssued();
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id === id) {
      invoices[i] = Object.assign({}, invoices[i], updates);
      saveUserInvoicesIssued(invoices);
      break;
    }
  }
}

async function renderSummaryCards() {
  var list = getAllInvoicesIssued();
  var now = new Date();
  var pendingTotal = 0;
  var overdueTotal = 0;
  var monthlyCount = 0;
  var totalAmount = 0;
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
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
  }
  
  var avgAmount = list.length > 0 ? totalAmount / list.length : 0;
  
  if ($('pendingTotal')) $('pendingTotal').textContent = moneyEUR(pendingTotal);
  if ($('overdueTotal')) $('overdueTotal').textContent = moneyEUR(overdueTotal);
  if ($('monthlyCount')) $('monthlyCount').textContent = monthlyCount + ' facturas';
  if ($('averageAmount')) $('averageAmount').textContent = moneyEUR(avgAmount);
}

async function renderChart() {
  var chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  var list = getAllInvoicesIssued();
  var monthlyData = {};
  var now = new Date();
  
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthlyData[key] = 0;
  }
  
  for (var j = 0; j < list.length; j++) {
    var inv = list[j];
    if (inv.invoiceDate) {
      var monthKey = inv.invoiceDate.substring(0, 7);
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += Number(inv.amount || 0);
      }
    }
  }

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

  var list = getAllInvoicesIssued();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay facturas emitidas.</td></tr>';
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
      '<td>' + (inv.customer || '-') + '</td>' +
      '<td>' + formatDate(inv.invoiceDate) + '</td>' +
      '<td>' + formatDate(inv.dueDate) + '</td>' +
      '<td>' + moneyEUR(inv.amount) + '</td>' +
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
        deleteInvoiceIssued(id);
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
      updateInvoiceIssued(id, { state: 'Pagada' });
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

// ========== VER FACTURA ==========
window.viewInvoice = function(id) {
  var list = getAllInvoicesIssued();
  var invoice = list.find(function(inv) { return inv.id === id; });
  if (!invoice) return;

  var content = document.getElementById('viewInvoiceContent');
  if (content) {
    var statusLabels = { Pendiente: 'Pendiente', Pagada: 'Pagada', Vencida: 'Vencida' };
    content.innerHTML = '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Numero:</strong> ' + (invoice.invoiceNumber || '-') + '</div>' +
      '<div class="col-md-6"><strong>Cliente:</strong> ' + (invoice.customer || '-') + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Fecha:</strong> ' + formatDate(invoice.invoiceDate) + '</div>' +
      '<div class="col-md-6"><strong>Vence:</strong> ' + formatDate(invoice.dueDate) + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Importe:</strong> <span class="fs-4 fw-bold">' + moneyEUR(invoice.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">' + (statusLabels[invoice.state] || 'Pendiente') + '</span></div>' +
      '</div>' +
      '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(invoice.createdAt || '').toLocaleString() + '</small></div>';
  }

  if (window.viewInvoiceModal) {
    window.viewInvoiceModal.show();
  }
};

// ========== GUARDAR FACTURA ==========
function saveInvoiceIssued() {
  var form = $('formNewInvoiceIssued');
  if (!form) return false;

  var invoiceNumber = "";
  var customer = "";
  var invoiceDate = "";
  var dueDate = "";
  var amount = "";
  var state = "Pendiente";
  
  var inputs = form.querySelectorAll('input, select');
  for (var i = 0; i < inputs.length; i++) {
    var name = inputs[i].name || inputs[i].getAttribute('name');
    if (name === 'invoiceNumber') invoiceNumber = inputs[i].value;
    if (name === 'customer') customer = inputs[i].value;
    if (name === 'invoiceDate') invoiceDate = inputs[i].value;
    if (name === 'dueDate') dueDate = inputs[i].value;
    if (name === 'amount') amount = inputs[i].value;
    if (name === 'state') state = inputs[i].value;
  }

  if (!invoiceNumber || !customer || !invoiceDate || !dueDate || !amount) {
    alert('Completa todos los campos.');
    return false;
  }

  addInvoiceIssued({
    invoiceNumber: invoiceNumber,
    customer: customer,
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    amount: amount,
    state: state
  });

  // Close modal
  var modalEl = document.getElementById('modalNewInvoiceIssued');
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
  var num = 'INV-' + date.getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  var numberInput = document.querySelector('#formNewInvoiceIssued input[name="invoiceNumber"]');
  if (numberInput) numberInput.value = num;
  
  // Set default dates
  var invoiceDate = document.querySelector('#formNewInvoiceIssued input[name="invoiceDate"]');
  var dueDate = document.querySelector('#formNewInvoiceIssued input[name="dueDate"]');
  if (invoiceDate) invoiceDate.value = new Date().toISOString().split('T')[0];
  if (dueDate) {
    var due = new Date();
    due.setDate(due.getDate() + 30);
    dueDate.value = due.toISOString().split('T')[0];
  }
  
  var modalEl = document.getElementById('modalNewInvoiceIssued');
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
  var newInvoiceBtn = document.getElementById('newInvoiceBtn');
  if (newInvoiceBtn) {
    newInvoiceBtn.addEventListener('click', function() {
      openNewInvoiceModal();
    });
  }
  
  // Save Button
  var saveBtn = document.getElementById('saveInvoiceIssuedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveInvoiceIssued();
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

