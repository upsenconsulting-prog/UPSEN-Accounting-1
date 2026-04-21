// invoice-issued.js - Sistema de facturas emitidas com IVA e Importação em massa
// VERSÃO CORRIGIDA - Evita recursão infinita

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

// ========== USER ID ==========
function getUserId() {
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser.uid;
  }
  try {
    var auth = window.AuthService || window.Auth;
    if (auth && auth.getCurrentUser) {
      var user = auth.getCurrentUser();
      if (user) return user.uid || user.id;
    }
  } catch (e) {}
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) return data.user.uid || data.user.id || 'unknown';
    }
  } catch (e) {}
  return 'unknown';
}

function isLoggedIn() {
  var userId = getUserId();
  return userId && userId !== 'demo' && userId !== 'unknown';
}

// ========== ACESSO AO STORE.JS ==========
function initStoreReferences() {
  // Esta função agora é apenas para compatibilidade
  // A lógica de detecção foi movida para addInvoiceIssued
}

// Usar store.js
function getUserInvoicesIssued() {
  if (window.getInvoicesIssuedSync) {
    return window.getInvoicesIssuedSync();
  }
  return [];
}

function generateId() {
  return 'inv-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getAllInvoicesIssued() {
  return getUserInvoicesIssued();
}

// ========== GUARDAR FACTURA (Wrapper local) ==========
// Renomeado para evitar conflito com window.addInvoiceIssued do store.js
function processInvoiceIssued(invoice) {
  console.log('processInvoiceIssued chamado:', invoice);
  
  // Calcular IVA
  var baseImponible = Number(invoice.amount || 0);
  var ivaRate = Number(invoice.ivaRate || 0);
  var ivaAmount = baseImponible * (ivaRate / 100);
  var totalAmount = baseImponible + ivaAmount;
  
  var newInvoice = {
    id: invoice.id || generateId(),
    invoiceNumber: invoice.invoiceNumber || '',
    customer: invoice.customer || '',
    customerNif: invoice.customerNif || '',
    invoiceDate: invoice.invoiceDate || '',
    dueDate: invoice.dueDate || '',
    amount: baseImponible,
    ivaRate: ivaRate,
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    state: invoice.state || 'Pendiente',
    description: invoice.description || '',
    createdAt: invoice.createdAt || new Date().toISOString()
  };
  
  // Se store.js estiver disponível, usar ele (salva no Firebase + localStorage)
  if (window.addInvoiceIssued && typeof window.addInvoiceIssued === 'function') {
    console.log('Usando store.js para salvar no Firebase...');
    // store.js retorna uma promise
    window.addInvoiceIssued(newInvoice).then(() => {
        // Renderizar após sucesso
        if (typeof renderInvoices === 'function') renderInvoices();
        if (typeof renderChart === 'function') renderChart();
        if (typeof renderSummaryCards === 'function') renderSummaryCards();
    });
    return newInvoice;
  }
  
  // Fallback: salvar apenas localmente
  console.log('Store.js não disponível, salvando apenas localmente...');
  var invoices = getUserInvoicesIssued();
  invoices.push(newInvoice);
  var key = 'upsen_invoices_issued_' + getUserId();
  try {
    localStorage.setItem(key, JSON.stringify(invoices));
  } catch (e) {
    console.error('Erro ao salvar localmente:', e);
  }
  
  console.log('Fatura salva localmente:', newInvoice.invoiceNumber);
  
  // Renderizar
  if (typeof renderInvoices === 'function') renderInvoices();
  if (typeof renderChart === 'function') renderChart();
  if (typeof renderSummaryCards === 'function') renderSummaryCards();
  
  // Disipar evento para outras páginas
  window.dispatchEvent(new CustomEvent('dataUpdated-invoicesIssued', { detail: newInvoice }));
  
  return newInvoice;
}

function deleteInvoiceIssued(id) {
  var invoices = getUserInvoicesIssued();
  var filtered = invoices.filter(function(inv) { return inv.id !== id; });
  var key = 'upsen_invoices_issued_' + getUserId();
  try {
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {}
  
  // Tentar eliminar do Firebase usando store.js se disponível
  if (window.deleteInvoiceIssued && typeof window.deleteInvoiceIssued === 'function') {
    window.deleteInvoiceIssued(id).catch(err => console.warn(err));
  }
  
  renderInvoices();
  renderChart();
  renderSummaryCards();
}

function updateInvoiceIssued(id, updates) {
  var invoices = getUserInvoicesIssued();
  for (var i = 0; i < invoices.length; i++) {
    if (invoices[i].id === id) {
      invoices[i] = Object.assign({}, invoices[i], updates);
      var key = 'upsen_invoices_issued_' + getUserId();
      try {
        localStorage.setItem(key, JSON.stringify(invoices));
      } catch(e) {}
      break;
    }
  }
  renderInvoices();
  renderSummaryCards();
}

async function renderSummaryCards() {
  var list = getAllInvoicesIssued();
  var now = new Date();
  var pendingTotal = 0, overdueTotal = 0, monthlyCount = 0, totalAmount = 0;
  var paymentTotals = {
    efectivo: 0, tarjeta: 0, transferencia: 0, recibo: 0, cheque: 0, paypal: 0
  };
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    var amount = Number(inv.amount || 0);
    totalAmount += amount;
    
    // Existing stats
    if (inv.state === 'Pendiente') pendingTotal += amount;
    if (inv.dueDate && inv.state === 'Pendiente') {
      var dueDate = new Date(inv.dueDate);
      if (dueDate < now) overdueTotal += amount;
    }
    if (inv.invoiceDate) {
      var parts = inv.invoiceDate.split('-');
      if (parts.length >= 2) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        if (year === now.getFullYear() && month === now.getMonth()) monthlyCount++;
      }
    }
    
    // NEW: Payment method totals (only paid invoices)
    if (inv.state === 'Pagada' && inv.paymentMethod && paymentTotals[inv.paymentMethod]) {
      paymentTotals[inv.paymentMethod] += amount;
    }
  }
  
  var avgAmount = list.length > 0 ? totalAmount / list.length : 0;
  
  // Update existing cards
  if ($('pendingTotal')) $('pendingTotal').textContent = moneyEUR(pendingTotal);
  if ($('overdueTotal')) $('overdueTotal').textContent = moneyEUR(overdueTotal);
  if ($('monthlyCount')) {
    var mcSpan = $('monthlyCount').querySelector('span');
    if (mcSpan) mcSpan.textContent = monthlyCount;
    else $('monthlyCount').textContent = monthlyCount + ' facturas';
  }
  if ($('averageAmount')) {
    var avgSpan = $('averageAmount').querySelector('span');
    if (avgSpan) avgSpan.textContent = moneyEUR(avgAmount);
    else $('averageAmount').textContent = moneyEUR(avgAmount);
  }
  
}

function renderPaymentSummaryCards(totals) {
  var container = $('paymentSummaryContainer');
  if (!container) return;
  
  var methods = [
    {key: 'efectivo', icon: 'EF', label: 'Efectivo'},
    {key: 'tarjeta', icon: 'TJ', label: 'Tarjeta'},
    {key: 'transferencia', icon: 'TR', label: 'Transferencia'},
    {key: 'recibo', icon: 'RB', label: 'Recibo'},
    {key: 'cheque', icon: 'CH', label: 'Cheque'},
    {key: 'paypal', icon: 'PP', label: 'Paypal'}
  ];
  
  var html = '';
  methods.forEach(function(method) {
    var amount = moneyEUR(totals[method.key]);
    html += '<div class="col-md-2 mb-3">' +
      '<div class="summary-card">' +
        '<div class="summary-icon">' + method.icon + '</div>' +
        '<h3>' + method.label + '</h3>' +
        '<p>' + amount + '</p>' +
      '</div>' +
    '</div>';
  });
  
  container.innerHTML = html;
  
  // Update totals in existing cards
  document.querySelectorAll('[id$="Total"]').forEach(function(el) {
    var method = el.id.replace('Total', '').toLowerCase();
    if (totals[method]) {
      el.textContent = moneyEUR(totals[method]);
    }
  });
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

// ========== VERIFICAR STATUS VERI*FACTU ==========
function getVeriFactuStatus(invoice) {
  // Se VeriFactuIntegration disponível, usar
  if (window.VeriFactuIntegration && window.VeriFactuIntegration.getInvoiceStatus) {
    return window.VeriFactuIntegration.getInvoiceStatus(invoice);
  }
  
  // Fallback: verificar campos diretamente
  if (!invoice) {
    return { registered: false, status: 'no_data', hashPreview: '---------', icon: 'fa-minus', iconClass: 'text-muted' };
  }
  
  var registered = invoice.verifactuRegistered === true || invoice.verifactuRegistered === 'true';
  var status = invoice.verifactuStatus || 'draft';
  
  if (registered && status === 'registered') {
    var hashPreview = invoice.verifactuHash ? invoice.verifactuHash.substring(0, 8) + '...' : '---------';
    return {
      registered: true,
      status: 'registered',
      hashPreview: hashPreview,
      fullHash: invoice.verifactuHash,
      timestamp: invoice.verifactuTimestamp,
      icon: 'fa-check-circle',
      iconClass: 'text-success'
    };
  } else if (status === 'error') {
    return { registered: false, status: 'error', hashPreview: '---------', icon: 'fa-exclamation-triangle', iconClass: 'text-danger' };
  } else {
    return { registered: false, status: 'draft', hashPreview: '---------', icon: 'fa-edit', iconClass: 'text-muted' };
  }
}

async function renderInvoices() {
  var tbody = $('invoiceTbody');
  if (!tbody) return;

  var list = getAllInvoicesIssued();
  
  // Apply filters
  if (window.paymentFilter && window.paymentFilter !== 'todas') {
    list = list.filter(inv => inv.paymentMethod === window.paymentFilter);
  }
  if (window.dateFilter === 'mes') {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    list = list.filter(inv => {
      if (!inv.invoiceDate) return false;
      var parts = inv.invoiceDate.split('-');
      return parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month;
    });
  } else if (window.dateFilter === 'trimestre') {
    var now = new Date();
    var year = now.getFullYear();
    var quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    list = list.filter(inv => {
      if (!inv.invoiceDate) return false;
      var parts = inv.invoiceDate.split('-');
      var invMonth = parseInt(parts[1]) - 1;
      return parseInt(parts[0]) === year && Math.floor(invMonth / 3) === Math.floor(quarterMonth / 3);
    });
  } else if (window.dateFilter === 'ano') {
    var now = new Date();
    var year = now.getFullYear();
    list = list.filter(inv => {
      if (!inv.invoiceDate) return false;
      return parseInt(inv.invoiceDate.split('-')[0]) === year;
    });
  }
  if (window.searchTerm) {
    var term = window.searchTerm.toLowerCase();
    list = list.filter(inv => 
      (inv.invoiceNumber || '').toLowerCase().includes(term) ||
      (inv.customer || '').toLowerCase().includes(term) ||
      (inv.paymentNotes || '').toLowerCase().includes(term)
    );
  }
  
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">No hay facturas que coincidan con los filtros.</td></tr>';
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
    
    // Veri*Factu status
    var vfStatus = getVeriFactuStatus(inv);
    var vfIcon = vfStatus.icon || 'fa-minus';
    var vfClass = vfStatus.iconClass || 'text-muted';
    var vfTitle = vfStatus.registered ? 'Hash: ' + (vfStatus.fullHash || 'N/A') + '\nRegistrado: ' + (vfStatus.timestamp || 'N/A') : 'Estado: ' + vfStatus.status;
    
    var ivaDisplay = inv.ivaRate > 0 ? inv.ivaRate + '%' : '-';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (inv.invoiceNumber || '-') + '</td>' +
      '<td>' + (inv.customer || '-') + '</td>' +
      '<td>' + formatDate(inv.invoiceDate) + '</td>' +
      '<td>' + formatDate(inv.dueDate) + '</td>' +
      '<td>' + moneyEUR(inv.amount) + '</td>' +
      '<td>' + ivaDisplay + '</td>' +
      '<td>' + moneyEUR(inv.ivaAmount || 0) + '</td>' +
      '<td>' + moneyEUR(inv.totalAmount || inv.amount) + '</td>' +
'<td><i class="fas ' + vfIcon + ' ' + vfClass + '" title="' + vfTitle + '"></i> <small class="text-muted">' + vfStatus.hashPreview + '</small></td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td>' + getPaymentMethodText(inv.paymentMethod) + (inv.paymentDate ? '<br><small>' + formatDate(inv.paymentDate) + '</small>' : '') + '</td>' +
      '<td class="action-buttons">' +
        '<button class="btn btn-primary" data-view="' + inv.id + '" title="Ver detalles"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-info" data-rectify="' + inv.id + '" title="Cambiar a factura rectificativa"><i class="fas fa-redo"></i></button>' +
        '<button class="btn btn-success" data-paid="' + inv.id + '" title="Marcar como pagada"><i class="fas fa-check"></i></button>' +
        '<button class="btn btn-danger" data-del="' + inv.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
  }

  var delBtns = tbody.querySelectorAll('[data-del]');
  for (var j = 0; j < delBtns.length; j++) {
    delBtns[j].addEventListener('click', function() {
      var id = this.getAttribute('data-del');
      if (confirm('Eliminar factura?')) {
        deleteInvoiceIssued(id);
      }
    });
  }

  var paidBtns = tbody.querySelectorAll('[data-paid]');
  for (var k = 0; k < paidBtns.length; k++) {
    paidBtns[k].addEventListener('click', function() {
      var id = this.getAttribute('data-paid');
      $('#markPaidInvoiceId').value = id;
      $('formMarkPaid [name="paymentDate"]').value = new Date().toISOString().split('T')[0];
      var modal = new bootstrap.Modal(document.getElementById('modalMarkPaid'));
      modal.show();
    });
  }

// Confirmar pagamento - MELHORADO
  var confirmBtn = document.getElementById('confirmMarkPaid');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
      var form = document.getElementById('formMarkPaid');
      var paymentMethod = form.querySelector('[name="paymentMethod"]').value;
      var paymentDate = form.querySelector('[name="paymentDate"]').value;
      var paymentNotes = form.querySelector('[name="paymentNotes"]').value;
      
      if (!paymentMethod) {
        alert('Por favor, selecciona el método de cobro.');
        return;
      }
      if (!paymentDate) {
        alert('Por favor, selecciona la fecha de pago.');
        return;
      }
      
      var formData = {
        state: 'Pagada',
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        paymentNotes: paymentNotes
      };
      var invoiceId = $('#markPaidInvoiceId').value;
      
      updateInvoiceIssued(invoiceId, formData);
      
      var modal = bootstrap.Modal.getInstance(document.getElementById('modalMarkPaid'));
      modal.hide();
      form.reset();
      // Auto-reload
      setTimeout(renderInvoices, 300);
      setTimeout(renderSummaryCards, 300);
      
      // Dispatch sync event
      window.dispatchEvent(new CustomEvent('dataUpdated-invoicesIssued', { detail: { id: invoiceId, updates: formData } }));
    });
  }

  // Credit Note Buttons
  var rectifyBtns = tbody.querySelectorAll('[data-rectify]');
  for (var m = 0; m < rectifyBtns.length; m++) {
    rectifyBtns[m].addEventListener('click', function() {
      var id = this.getAttribute('data-rectify');
      window.createCreditNote(id);
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
      (invoice.customerNif ? '<div class="row mb-3"><div class="col-md-6"><strong>NIF Cliente:</strong> ' + invoice.customerNif + '</div></div>' : '') +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Fecha:</strong> ' + formatDate(invoice.invoiceDate) + '</div>' +
      '<div class="col-md-6"><strong>Vence:</strong> ' + formatDate(invoice.dueDate) + '</div>' +
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

  var modalEl = document.getElementById('viewInvoiceModal');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
  }
};

// ========== GUARDAR FACTURA DO FORM ==========
/**
 * Gerar campos Veri*Factu por defeito para fallback
 */
function computeFallbackVeriFactuFields(invoiceData) {
  return {
    series: 'A',
    verifactuHash: 'FALHOU_CALCULO',
    previousHash: '',
    verifactuTimestamp: new Date().toISOString(),
    verifactuRegistered: false,
    verifactuStatus: 'fallback'
  };
}

/**
 * Verificar status Veri*Factu com suporte a fallback
 */
function getPaymentMethodText(method) {
  const methods = {
    'efectivo': 'Efectivo',
    'tarjeta': 'Tarjeta', 
    'transferencia': 'Transferencia',
    'recibo': 'Recibo bancario',
    'cheque': 'Cheque/Pagare',
    'paypal': 'Paypal'
  };
  return methods[method] || method || '-';
}

function getVeriFactuStatus(invoice) {
  if (window.VeriFactuIntegration && window.VeriFactuIntegration.getInvoiceStatus) {
    return window.VeriFactuIntegration.getInvoiceStatus(invoice);
  }
  
  if (!invoice) {
    return { registered: false, status: 'no_data', hashPreview: '---------', icon: 'fa-minus', iconClass: 'text-muted' };
  }
  
  var registered = invoice.verifactuRegistered === true || invoice.verifactuRegistered === 'true';
  var status = invoice.verifactuStatus || 'draft';
  
  if (status === 'fallback') {
    return {
      registered: false,
      status: 'fallback',
      hashPreview: 'F',
      fullHash: 'FALHOU_CALCULO',
      timestamp: invoice.verifactuTimestamp,
      icon: 'fa-exclamation-circle',
      iconClass: 'text-warning',
      title: 'Cálculo falhou - Fatura salva com fallback'
    };
  }
  
  if (registered && status === 'registered') {
    var hashPreview = invoice.verifactuHash ? invoice.verifactuHash.substring(0, 8) + '...' : '---------';
    return {
      registered: true,
      status: 'registered',
      hashPreview: hashPreview,
      fullHash: invoice.verifactuHash,
      timestamp: invoice.verifactuTimestamp,
      icon: 'fa-check-circle',
      iconClass: 'text-success'
    };
  } else if (status === 'error') {
    return { registered: false, status: 'error', hashPreview: 'ERR', icon: 'fa-exclamation-triangle', iconClass: 'text-danger' };
  } else {
    return { registered: false, status: 'draft', hashPreview: '---------', icon: 'fa-edit', iconClass: 'text-muted' };
  }
}

async function populateCustomerSelect() {
  var select = document.getElementById('customerSelect');
  var nameInput = document.getElementById('customerName');
  var nifInput = document.getElementById('customerNif');

  if (!select || !window.ClientService || !window.ClientService.getClients) return;

  try {
    var clients = await window.ClientService.getClients();
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clients.forEach(function(client) {
      var opt = document.createElement('option');
      opt.value = client.id;
      opt.textContent = (client.nombre || client.name || '(sin nombre)') + ' - ' + (client.nif_nie_cif || client.nif || 'sin NIF');
      select.appendChild(opt);
    });

    select.addEventListener('change', function() {
      var selected = clients.find(function(c) { return c.id === select.value; });
      if (selected) {
        var custName = selected.nombre || selected.name || '';
        var custNif = selected.nif_nie_cif || selected.nif || '';
        if (nameInput) nameInput.value = custName;
        if (nifInput) nifInput.value = custNif;
      } else {
        if (nameInput) nameInput.value = '';
        if (nifInput) nifInput.value = '';
      }
    });

  } catch (error) {
    console.error('Error populando lista de clientes:', error);
  }
}

async function saveInvoiceIssued() {
  var form = $('formNewInvoiceIssued');
  if (!form) return false;

  var invoiceNumber = "";
  var customerId = "";
  var customer = "";
  var customerNif = "";
  var invoiceDate = "";
  var dueDate = "";
  var amount = "";
  var ivaRate = "";
  var state = "Pendiente";
  
  var inputs = form.querySelectorAll('input, select');
  for (var i = 0; i < inputs.length; i++) {
    var name = inputs[i].name || inputs[i].getAttribute('name');
    if (name === 'invoiceNumber') invoiceNumber = inputs[i].value;
    if (name === 'customerId') customerId = inputs[i].value;
    if (name === 'customer') customer = inputs[i].value;
    if (name === 'customerNif') customerNif = inputs[i].value;
    if (name === 'invoiceDate') invoiceDate = inputs[i].value;
    if (name === 'dueDate') dueDate = inputs[i].value;
    if (name === 'amount') amount = inputs[i].value;
    if (name === 'ivaRate') ivaRate = inputs[i].value;
    if (name === 'state') state = inputs[i].value;
  }

  // If customer is selected from clients, set name and NIF from service
  if (customerId && window.ClientService && typeof window.ClientService.getClients === 'function') {
    var clients = await window.ClientService.getClients();
    var matched = clients.find(function(c) { return c.id === customerId; });
    if (matched) {
      customer = matched.nombre || matched.name || customer || '';
      customerNif = matched.nif_nie_cif || matched.nif || customerNif || '';
    }
  }

  if (!invoiceNumber || !customer || !invoiceDate || !dueDate || !amount) {
    alert('Completa todos los campos.');
    return false;
  }

  var invoiceData = {
    invoiceNumber: invoiceNumber,
    customer: customer,
    customerNif: customerNif,
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    amount: amount,
    ivaRate: ivaRate || 0,
    state: state,
    paymentMethod: form.querySelector('[name="paymentMethod"]').value || null,
    paymentDate: form.querySelector('[name="paymentDate"]').value || null
  };

  var verifactuSuccess = false;

  // Tentar Veri*Factu Integration
  if (window.VeriFactuIntegration && window.VeriFactuIntegration.createInvoiceIssued) {
    try {
      console.log('🔐 Criando fatura com Veri*Factu...');
      await window.VeriFactuIntegration.createInvoiceIssued(invoiceData);
      verifactuSuccess = true;
      console.log('✅ Veri*Factu sucesso!');
    } catch (err) {
      console.warn('⚠️ Veri*Factu falhou:', err.message);
      console.log('💾 Salvando com fallback fields...');
      
      // ADICIONAR campos fallback ANTES de chamar addInvoiceIssued
      var fallbackFields = computeFallbackVeriFactuFields(invoiceData);
      Object.assign(invoiceData, fallbackFields);
      
      console.log('💾 Chamando processInvoiceIssued com dados (fallback):', invoiceData);
      processInvoiceIssued(invoiceData);
      verifactuSuccess = false;
    }
  } else {
    console.log('ℹ️ Veri*Factu não disponível, usando fallback');
    
    // ADICIONAR campos fallback
    var fallbackFields = computeFallbackVeriFactuFields(invoiceData);
    Object.assign(invoiceData, fallbackFields);
    
    console.log('💾 Chamando processInvoiceIssued com dados:', invoiceData);
    processInvoiceIssued(invoiceData);
  }

  // Close modal
  var modalEl = document.getElementById('modalNewInvoiceIssued');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
  }

  form.reset();
  return true;
}

// ========== CREAR FACTURA RECTIFICATIVA ==========
window.createCreditNote = function(invoiceId) {
  var list = getAllInvoicesIssued();
  var originalInvoice = list.find(function(inv) { return inv.id === invoiceId; });
  
  if (!originalInvoice) {
    alert('No se encontró la factura original.');
    return;
  }

  // Pre-fill form with credit note data
  var form = $('formNewInvoiceIssued');
  if (!form) return;

  var date = new Date();
  var rectifyNumber = 'REC-' + originalInvoice.invoiceNumber || 'REC-' + date.getTime();
  
  // Populate form fields
  var invoiceNumberInput = form.querySelector('input[name="invoiceNumber"]');
  var customerInput = form.querySelector('input[name="customer"]');
  var customerNifInput = form.querySelector('input[name="customerNif"]');
  var invoiceDateInput = form.querySelector('input[name="invoiceDate"]');
  var dueDateInput = form.querySelector('input[name="dueDate"]');
  var amountInput = form.querySelector('input[name="amount"]');
  var ivaRateInput = form.querySelector('input[name="ivaRate"]');
  var stateSelect = form.querySelector('select[name="state"]');

  if (invoiceNumberInput) invoiceNumberInput.value = rectifyNumber;
  if (customerInput) customerInput.value = originalInvoice.customer || '';
  if (customerNifInput) customerNifInput.value = originalInvoice.customerNif || '';
  
  var currentDate = date.toISOString().split('T')[0];
  if (invoiceDateInput) invoiceDateInput.value = currentDate;
  if (dueDateInput) dueDateInput.value = currentDate;

  // Use original invoice amount (user can edit to make it negative or positive)
  var amount = Number(originalInvoice.amount || 0);
  if (amountInput) amountInput.value = amount;
  
  if (ivaRateInput) ivaRateInput.value = originalInvoice.ivaRate || 21;
  if (stateSelect) stateSelect.value = 'Pendiente';

  // Store reference to original invoice
  form.setAttribute('data-credit-note-of', invoiceId);
  form.setAttribute('data-is-credit-note', 'true');

  // Show credit note alert and update modal title
  var titleEl = document.getElementById('modalNewInvoiceTitle');
  var alertEl = document.getElementById('creditNoteAlert');
  if (titleEl) titleEl.textContent = 'Factura Rectificativa';
  if (alertEl) alertEl.style.display = 'block';

  // Show modal
  var modalEl = document.getElementById('modalNewInvoiceIssued');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
  }
};

// ========== ABRIR MODAL ==========
async function openNewInvoiceModal() {
  // Populate customer select first
  if (typeof populateCustomerSelect === 'function') {
    await populateCustomerSelect();
  }

  var form = $('formNewInvoiceIssued');
  if (form) {
    form.removeAttribute('data-credit-note-of');
    form.removeAttribute('data-is-credit-note');
  }

  // Hide credit note alert and reset modal title
  var titleEl = document.getElementById('modalNewInvoiceTitle');
  var alertEl = document.getElementById('creditNoteAlert');
  if (titleEl) titleEl.textContent = 'Nueva factura';
  if (alertEl) alertEl.style.display = 'none';

  var date = new Date();
  var num = 'INV-' + date.getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  var numberInput = document.querySelector('#formNewInvoiceIssued input[name="invoiceNumber"]');
  if (numberInput) numberInput.value = num;
  
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
  
// Global filter state FIXED
window.paymentFilter = 'todas';
window.dateFilter = 'todos';
window.searchTerm = '';

window.clearFilters = function() {
  window.paymentFilter = 'todas';
  window.dateFilter = 'todos';
  window.searchTerm = '';
  if ($('paymentFilter')) $('paymentFilter').value = 'todas';
  if ($('dateFilter')) $('dateFilter').value = 'todos';
  if ($('searchInput')) $('searchInput').value = '';
  renderInvoices();
  renderSummaryCards();
};

window.applyFilters = function() {
  renderInvoices();
};

window.initFilters = function() {
  var paymentSelect = $('paymentFilter');
  if (paymentSelect) {
    paymentSelect.addEventListener('change', function() {
      window.paymentFilter = this.value;
      renderInvoices();
    });
  }
  
  var dateSelect = $('dateFilter');
  if (dateSelect) {
    dateSelect.addEventListener('change', function() {
      window.dateFilter = this.value;
      renderInvoices();
    });
  }
  
  var searchInput = $('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      window.searchTerm = this.value;
      renderInvoices();
    });
  }
};

// Quarterly helpers for 2024-2026
window.getQuarterlyTotals = function() {
  var list = getAllInvoicesIssued();
  var quarters = {};
  list.forEach(function(inv) {
    if (!inv.invoiceDate) return;
    var date = new Date(inv.invoiceDate);
    var year = date.getFullYear();
    var q = Math.floor(date.getMonth() / 3) + 1;
    if (year >= 2024 && year <= 2026) {
      var key = year + '-Q' + q;
      quarters[key] = (quarters[key] || 0) + Number(inv.totalAmount || inv.amount || 0);
    }
  });
  return quarters;
};

// Annual helpers for 2020-2024
window.getAnnualTotals = function() {
  var list = getAllInvoicesIssued();
  var years = {};
  list.forEach(function(inv) {
    if (!inv.invoiceDate) return;
    var date = new Date(inv.invoiceDate);
    var year = date.getFullYear();
    if (year >= 2020 && year <= 2024) {
      years[year] = (years[year] || 0) + Number(inv.totalAmount || inv.amount || 0);
    }
  });
  return years;
};

// Inicializar referências do store.js
initStoreReferences();
  
  function checkAndInit() {
    if (window.getInvoicesIssuedSync) {
      console.log('store.js disponível, inicializando invoice issued page...');
      initPage();
    } else {
      console.log('Aguardando store.js...');
      setTimeout(checkAndInit, 500);
    }
  }
  
  setTimeout(checkAndInit, 500);
  
  function initPage() {
    console.log('Inicializando página de facturas emitidas...');
    
    var newInvoiceBtn = document.getElementById('newInvoiceBtn');
    if (newInvoiceBtn) {
      newInvoiceBtn.addEventListener('click', function() {
        openNewInvoiceModal();
      });
    }
    
    var saveBtn = document.getElementById('saveInvoiceIssuedBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        saveInvoiceIssued();
      });
    }
    
    // Initialize filters
    window.initFilters();

    
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        location.reload();
      });
    }
    
    renderInvoices();
    renderChart();
    renderSummaryCards();
    
    // Sincronização em tempo real
    window.addEventListener('dataUpdated-invoicesIssued', function() {
      console.log('Dados atualizados, recarregando...');
      renderInvoices();
      renderChart();
      renderSummaryCards();
    });
  }
});

// ========== EXPORTAR FACTURAS ==========
function exportInvoices(format, period) {
  var list = getAllInvoicesIssued();
  if (!list.length) {
    alert('No hay facturas para exportar.');
    return;
  }
  
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
    exportToPDF(filtered);
  } else if (format === 'csv') {
    exportToCSV(filtered);
  } else if (format === 'excel') {
    exportToExcel(filtered);
  }
}

function getCompanyLogoForExport() {
  try {
    var auth = window.AuthSystem || window.AuthService || window.Auth;
    var user = auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
    if (user && user.companyData && user.companyData.logo) {
      return user.companyData.logo;
    }
  } catch (e) {}

  try {
    var session = localStorage.getItem('upsen_current_user');
    if (!session) return '';
    var data = JSON.parse(session);
    var user = data && data.user ? data.user : null;
    return (user && user.companyData && user.companyData.logo) || '';
  } catch (e) {
    return '';
  }
}

function normalizeImageToPngDataUrl(source) {
  return new Promise(function(resolve, reject) {
    if (!source) {
      reject(new Error('Missing image source'));
      return;
    }

    var img = new Image();
    if (typeof source === 'string' && source.indexOf('data:image') !== 0) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = function() {
      try {
        var naturalWidth = img.naturalWidth || img.width;
        var naturalHeight = img.naturalHeight || img.height;
        var canvas = document.createElement('canvas');
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: naturalWidth,
          height: naturalHeight
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = function() {
      reject(new Error('Could not load logo image'));
    };

    img.src = source;
  });
}

async function addCompanyLogoToPdfHeader(doc, x, y, w, h) {
  var logoSource = getCompanyLogoForExport();
  if (!logoSource) return false;

  try {
    var logoImage = await normalizeImageToPngDataUrl(logoSource);
    var logoDataUrl = logoImage.dataUrl;
    var logoWidth = logoImage.width || 1;
    var logoHeight = logoImage.height || 1;

    // Soft layered badge to keep logo readable over blue header.
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x - 2.6, y - 2.6, w + 5.2, h + 5.2, 2.2, 2.2, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4, 1.8, 1.8, 'F');
    doc.setDrawColor(214, 223, 236);
    doc.setLineWidth(0.25);
    doc.roundedRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4, 1.8, 1.8, 'S');

    var innerPadding = 1.0;
    var fitW = Math.max(1, w - innerPadding * 2);
    var fitH = Math.max(1, h - innerPadding * 2);
    var scale = Math.min(fitW / logoWidth, fitH / logoHeight);
    var drawW = logoWidth * scale;
    var drawH = logoHeight * scale;
    var drawX = x + (w - drawW) / 2;
    var drawY = y + (h - drawH) / 2;

    doc.addImage(logoDataUrl, 'PNG', drawX, drawY, drawW, drawH);
    return true;
  } catch (e) {
    console.log('Could not render company logo in emitted invoices PDF:', e);
    return false;
  }
}

async function exportToPDF(list) {
  if (typeof window.jspdf === 'undefined') {
    alert('Biblioteca PDF no disponible.');
    return;
  }
  
  var doc = new window.jspdf.jsPDF();
  
  doc.setFillColor(42, 77, 156);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('UPSEN Accounting', 105, 18, {align: 'center'});
  doc.setFontSize(12);
  doc.text('Facturas Emitidas', 105, 28, {align: 'center'});
  await addCompanyLogoToPdfHeader(doc, 13, 5, 55, 25);
  
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align: 'right'});
  doc.line(15, 40, 195, 40);
  
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Numero', 15, y);
  doc.text('Cliente', 50, y);
  doc.text('Fecha', 105, y);
  doc.text('Importe', 155, y);
  doc.text('Estado', 185, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.line(15, y - 3, 195, y - 3);
  
  for (var i = 0; i < list.length && y < 270; i++) {
    var inv = list[i];
    doc.text(inv.invoiceNumber || '-', 15, y);
    doc.text((inv.customer || '-').substring(0, 20), 50, y);
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
  
  doc.save('facturas_emitidas.pdf');
  alert('PDF descargado correctamente!');
}

function exportToCSV(list) {
  var csv = 'Numero,Cliente,Fecha,Vence,Importe,Estado\n';
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    csv += '"' + (inv.invoiceNumber || '') + '",';
    csv += '"' + (inv.customer || '') + '",';
    csv += '"' + (inv.invoiceDate || '') + '",';
    csv += '"' + (inv.dueDate || '') + '",';
    csv += '"' + (inv.amount || 0) + '",';
    csv += '"' + (inv.state || 'Pendiente') + '"\n';
  }
  
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'facturas_emitidas.csv';
  link.click();
  alert('CSV descargado correctamente!');
}

function exportToExcel(list) {
  var html = '<table border="1">';
  html += '<tr><th>Numero</th><th>Cliente</th><th>Fecha</th><th>Vence</th><th>Importe</th><th>Estado</th></tr>';
  
  for (var i = 0; i < list.length; i++) {
    var inv = list[i];
    html += '<tr>';
    html += '<td>' + (inv.invoiceNumber || '') + '</td>';
    html += '<td>' + (inv.customer || '') + '</td>';
    html += '<td>' + (inv.invoiceDate || '') + '</td>';
    html += '<td>' + (inv.dueDate || '') + '</td>';
    html += '<td>' + (inv.amount || 0) + '</td>';
    html += '<td>' + (inv.state || 'Pendiente') + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  
  var excelHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  excelHtml += '<head><meta charset="UTF-8"></head><body>' + html + '</body></html>';
  
  var blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'facturas_emitidas.xls';
  link.click();
  alert('Excel descargado correctamente!');
}

function downloadIssuedInvoiceTemplate() {
  var template = 'Numero,Cliente,NIF,Fecha,Vence,Base Imponible,IVA Rate,Estado\n';
  template += 'INV-2025-001,Cliente SL,12345678A,2025-01-15,2025-02-15,1000.00,21,Pendiente\n';
  template += 'INV-2025-002,Empresa SA,87654321B,2025-01-20,2025-02-20,2500.00,21,Pagada\n';
  
  var blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_facturas_emitidas.csv';
  link.click();
  alert('Template descargado!');
}

function importInvoicesFromCSV(csvContent) {
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
      else if (header.includes('cliente') || header.includes('customer')) invoice.customer = value;
      else if (header.includes('nif') || header.includes('nit')) invoice.customerNif = value;
      else if (header.includes('fecha') || header.includes('date')) invoice.invoiceDate = value;
      else if (header.includes('vence') || header.includes('due')) invoice.dueDate = value;
      else if (header.includes('base') || header.includes('importe') || header.includes('amount')) invoice.amount = parseFloat(value) || 0;
      else if (header.includes('iva') || header.includes('rate') || header.includes('tax')) invoice.ivaRate = parseFloat(value) || 0;
      else if (header.includes('estado') || header.includes('state')) invoice.state = value;
    }
    
    if (invoice.invoiceNumber && invoice.customer && invoice.amount) {
      processInvoiceIssued(invoice);
      importedCount++;
    }
  }
  
  return importedCount;
}
// ===== ADD CALCULATION FUNCTIONS =====
function calculateLineSubtotal(line) {
    if (!line) return 0;
    var price = Number(line.price || line.precio || 0);
    var quantity = Number(line.quantity || line.qty || line.cantidad || 0);
    return price * quantity;
}

function calculateTaxableAmount(invoice) {
    if (!invoice) return 0;
    if (Array.isArray(invoice.lineas) && invoice.lineas.length > 0) {
        var total = 0;
        for (var i = 0; i < invoice.lineas.length; i++) {
            total += calculateLineSubtotal(invoice.lineas[i]);
        }
        return total;
    }
    return Number(invoice.amount || 0);
}

function calculateVAT(invoice) {
    if (!invoice) return 0;
    var base = calculateTaxableAmount(invoice);
    var vatRate = Number(invoice.ivaRate || 0);
    return base * (vatRate / 100);
}

function calculateInvoiceTotal(invoice) {
    if (!invoice) return 0;
    var base = calculateTaxableAmount(invoice);
    var vat = calculateVAT(invoice);
    return base + vat;
}
// Define supported VAT rates
const vatRates = [0, 0.10, 0.21]; // 0%, 10%, 21%

// Calculate subtotal for a line (price * quantity)
function calculateLineSubtotal(price, quantity) {
    return price * quantity;
}

// Calculate the taxable amount for an invoice (sum of all line subtotals)
function calculateTaxableAmount(invoiceLines) {
    return invoiceLines.reduce((total, line) => {
        return total + calculateLineSubtotal(line.price, line.quantity);
    }, 0);
}

// Calculate VAT for a given taxable amount and VAT rate
function calculateVAT(taxableAmount, vatRate) {
    return taxableAmount * vatRate;
}

// Calculate total invoice (taxable amount + VAT)
function calculateInvoiceTotal(invoiceLines, vatRate) {
    const taxableAmount = calculateTaxableAmount(invoiceLines);
    const vat = calculateVAT(taxableAmount, vatRate);
    return taxableAmount + vat;
}

// Example usage
const invoiceLines = [
    { price: 100, quantity: 2 }, // line 1
    { price: 50, quantity: 1 }   // line 2
];

vatRates.forEach(rate => {
    const total = calculateInvoiceTotal(invoiceLines, rate);
    console.log(`Total with VAT ${rate * 100}%: ${total}`);
});
