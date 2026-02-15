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

// ========== VER FACTURA ==========
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
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Fecha:</strong> ' + formatDate(invoice.invoiceDate) + '</div>' +
      '<div class="col-md-6"><strong>Importe:</strong> <span class="fs-4 fw-bold">' + moneyEUR(invoice.amount) + '</span></div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">' + (statusLabels[invoice.state] || 'Pendiente') + '</span></div>' +
      '</div>' +
      '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(invoice.createdAt || '').toLocaleString() + '</small></div>';
  }

  if (window.viewInvoiceModal) {
    window.viewInvoiceModal.show();
  }
};

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
  
  // OCR Button
  var ocrBtn = document.getElementById('btnNewInvoiceOCR');
  if (ocrBtn) {
    ocrBtn.addEventListener('click', function() {
      openOCRModal();
    });
  }
  
  // OCR Save Button
  var saveOCRBtn = document.getElementById('saveOCRBtn');
  if (saveOCRBtn) {
    saveOCRBtn.addEventListener('click', function() {
      processOCR();
    });
  }
  
  // Filter Button
  var filterBtn = document.getElementById('btnFilter');
  if (filterBtn) {
    filterBtn.addEventListener('click', function() {
      toggleFilter();
    });
  }
  
  // Apply Filter Button
  var applyFilterBtn = document.getElementById('applyFilter');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', function() {
      applyFilters();
    });
  }
  
  // Clear Filter Button
  var clearFilterBtn = document.getElementById('clearFilter');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', function() {
      clearFilters();
    });
  }
  
  // Download PDF Button
  var downloadBtn = document.getElementById('btnDownload');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      exportToPDF();
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

// ========== OCR MODAL ==========
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
  
  // Simular processamento OCR
  alert('El archivo está siendo procesado. Esta función requiere integración con un servicio OCR.');
  
  // Fechar modal
  var modalEl = document.getElementById('modalNewInvoiceOCR');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
  }
}

// ========== FILTROS ==========
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
  
  // Ocultar filtro após aplicar
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
    
    // Filtro por estado
    if (currentFilters.state && inv.state !== currentFilters.state) {
      include = false;
    }
    
    // Filtro por data desde
    if (currentFilters.dateFrom && inv.invoiceDate && inv.invoiceDate < currentFilters.dateFrom) {
      include = false;
    }
    
    // Filtro por data até
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

// ========== EXPORTAR PDF ==========
function exportToPDF() {
  var list = getAllInvoicesReceived();
  if (!list.length) {
    alert('No hay facturas para exportar.');
    return;
  }
  
  // Verificar se jsPDF está disponível
  if (typeof window.jspdf === 'undefined') {
    // Carregar jsPDF dinamicamente
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function() {
      generatePDF(list);
    };
    script.onerror = function() {
      alert('Error al cargar la biblioteca PDF. Por favor, inténtalo de nuevo.');
    };
    document.head.appendChild(script);
  } else {
    generatePDF(list);
  }
}

function generatePDF(list) {
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
  doc.text('Número', 15, y);
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

