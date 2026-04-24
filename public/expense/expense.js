// expense.js - Com dados isolados por usuário + IVA + Importação em massa
// AGORA USA store.js COMO FONTE PRIMÁRIA (Firebase + localStorage backup)

function $(id) {
  return document.getElementById(id);
}

var pageUtils = window.PageUtils || {};
var moneyEUR = pageUtils.moneyEUR || function(n) {
  var v = Number(n || 0);
  return 'EUR ' + v.toFixed(2);
};
var getCurrentUserId = pageUtils.getCurrentUserId || function() { return null; };

// ========== MARK ACTIVE PAGE ==========
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

// Chart instance
var expenseChart = null;

// ========== USAR STORE.JS (Firebase + localStorage) ==========
function getUserExpenses() {
  // Usar store.js - versão síncrona para renderização imediata
  if (window.getExpensesSync) {
    return window.getExpensesSync();
  }
  // Fallback se store.js não estiver disponível
  return [];
}

function loadExpensesFromFirebase(userId) {
  console.log('[expense.js] Use store.js para carregar dados do Firebase');
  if (window.FirebaseSync && window.FirebaseSync.syncAllToLocalStorage) {
    window.FirebaseSync.syncAllToLocalStorage().then(function() {
      renderExpenses();
      renderChart();
      renderSummaryCards();
    });
  }
}

function saveUserExpense(expense, silentRender) {
  // NÃO criar ID aqui - deixar store.js criar o ID
  // Passar os dados diretamente para store.js
  var expenseData = {
    date: expense.date || '',
    category: expense.category || '',
    amount: Number(expense.amount || 0),
    ivaRate: Number(expense.ivaRate || 0),
    ivaAmount: Number(expense.ivaAmount || 0),
    totalAmount: Number(expense.totalAmount || 0),
    notes: expense.notes || '',
    paymentMethod: expense.paymentMethod || '',
    supplierNif: expense.supplierNif || '',
    supplierName: expense.supplierName || ''
  };
  
  // Usar store.js - função assíncrona que salva no Firebase E localStorage
  if (window.addExpense) {
    return window.addExpense(expenseData).then(function(res) {
      if (!silentRender) {
        renderExpenses();
        renderChart();
        renderSummaryCards();
      }
      return res;
    });
  } else {
    console.error('store.js não disponível');
  }
}

function deleteUserExpense(id) {
  if (window.deleteExpense) {
    window.deleteExpense(id).then(function() {
      renderExpenses();
      renderChart();
      renderSummaryCards();
    });
  }
}

// ========== IMPORTAR DADOS EM MASSA ==========
async function importExpensesFromCSV(csvContent) {
  var parsed = window.CsvUtils ? window.CsvUtils.parseCsvContent(csvContent) : { headers: [], rows: [] };
  if (!parsed.rows || parsed.rows.length === 0) {
    alert('CSV vazio ou sem dados.');
    return 0;
  }

  var headers = parsed.headers;
  var importedCount = 0;
  var promises = [];

  for (var i = 0; i < parsed.rows.length; i++) {
    var values = parsed.rows[i];
    var expense = {};
    for (var k = 0; k < headers.length && k < values.length; k++) {
      var header = headers[k].replace(/"/g, '');
      var value = values[k].replace(/"/g, '');
      
      if (header.includes('date') || header.includes('fecha')) expense.date = value;
      else if (header.includes('category') || header.includes('categoría')) expense.category = value;
      else if (header.includes('amount') || header.includes('importe') || header.includes('base')) expense.amount = parseFloat(value) || 0;
      else if (header.includes('iva') || header.includes('tax') || header.includes('impuesto')) expense.ivaRate = parseFloat(value) || 0;
      else if (header.includes('notes') || header.includes('notas')) expense.notes = value;
      else if (header.includes('payment') || header.includes('pago')) expense.paymentMethod = value;
      else if (header.includes('nif') || header.includes('nit')) expense.supplierNif = value;
      else if (header.includes('supplier') || header.includes('proveedor')) expense.supplierName = value;
    }
    
    if (expense.date && expense.amount) {
      // Passar true para não renderizar a cada item
      promises.push(saveUserExpense(expense, true));
      importedCount++;
    }
  }
  
  await Promise.all(promises);
  return importedCount;
}

function handleFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = async function(e) {
    var content = e.target.result;
    var count = 0;
    
    if (file.name.endsWith('.csv')) {
      // Agora aguarda a importação
      count = await importExpensesFromCSV(content);
    } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      alert('Para Excel, por favor converta para CSV primeiro.');
    } else {
      alert('Formato não suportado. Use CSV.');
    }
    
    if (count > 0) {
      alert(count + ' despesas importadas com sucesso!');
      setTimeout(function() {
        renderExpenses();
        renderChart();
        renderSummaryCards();
      }, 500);
    } else {
      alert('Nenhuma despesa importada. Verifique o formato do CSV.');
    }
    
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ========== RENDER FUNCTIONS ==========
function renderSummaryCards() {
  var list = getUserExpenses();
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  
  var monthlyTotal = 0;
  var monthlyIVA = 0;
  var categoryTotals = {};
  var lastExpense = null;
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    
    if (exp.date) {
      var parts = exp.date.split('-');
      if (parts.length >= 2) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        if (year === currentYear && month === currentMonth) {
          monthlyTotal += Number(exp.totalAmount || exp.amount || 0);
          monthlyIVA += Number(exp.ivaAmount || 0);
        }
      }
    }
    
    var cat = exp.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
    
    if (!lastExpense || (exp.date && exp.date > lastExpense.date)) {
      lastExpense = exp;
    }
  }
  
  var monthlyTotalEl = $("monthlyTotal");
  if (monthlyTotalEl) {
    monthlyTotalEl.textContent = moneyEUR(monthlyTotal);
  }
  
  var monthlyIVAEl = $("monthlyIVA");
  if (monthlyIVAEl) {
    monthlyIVAEl.textContent = moneyEUR(monthlyIVA);
  }
  
  var topCategoryEl = $("topCategory");
  if (topCategoryEl) {
    var keys = Object.keys(categoryTotals);
    if (keys.length > 0) {
      var topCat = keys[0];
      var topVal = categoryTotals[keys[0]];
      for (var k = 0; k < keys.length; k++) {
        if (categoryTotals[keys[k]] > topVal) {
          topCat = keys[k];
          topVal = categoryTotals[keys[k]];
        }
      }
      var topCatSpan = topCategoryEl.querySelector('span');
      if (topCatSpan) {
        topCatSpan.textContent = topCat;
      } else {
        topCategoryEl.textContent = topCat;
      }
    } else {
      var topCatSpan = topCategoryEl.querySelector('span');
      if (topCatSpan) {
        topCatSpan.textContent = "Sin datos";
      } else {
        topCategoryEl.textContent = "Sin datos";
      }
    }
  }
  
  var lastExpenseEl = $("lastExpense");
  if (lastExpenseEl) {
    if (lastExpense) {
      var lastExpenseSpan = lastExpenseEl.querySelector('span');
      if (lastExpenseSpan) {
        lastExpenseSpan.innerHTML = lastExpense.date + ' - ' + lastExpense.category;
      } else {
        lastExpenseEl.innerHTML = lastExpense.date + ' - ' + lastExpense.category;
      }
    } else {
      var lastExpenseSpan = lastExpenseEl.querySelector('span');
      if (lastExpenseSpan) {
        lastExpenseSpan.textContent = "Sin gastos";
      } else {
        lastExpenseEl.textContent = "Sin gastos";
      }
    }
  }
}

function renderChart() {
  var chartContainer = document.getElementById('expenseChartCanvas');
  if (!chartContainer) return;

  var list = getUserExpenses();
  var categoryTotals = {};
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    var cat = exp.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
  }

  var labels = Object.keys(categoryTotals);
  var data = Object.values(categoryTotals);

  var ctx = chartContainer.getContext('2d');

  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Sem dados'],
      datasets: [{
        label: 'Gastos por categoría',
        data: data.length ? data : [0],
        backgroundColor: [
          '#2a4d9c', '#3a6cd6', '#1abc9c', '#e74c3c', '#f39c12',
          '#9b59b6', '#3498db', '#1abc9c', '#e67e22', '#34495e'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) { return 'EUR ' + value; }
          }
        }
      }
    }
  });
}

function renderExpenses() {
  var tbody = $("expenseTBody");
  if (!tbody) return;

  var list = getUserExpenses();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay gastos registrados todavía.</td></tr>';
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    var tr = document.createElement("tr");
    var ivaDisplay = e.ivaRate > 0 ? e.ivaRate + '%' : '-';
    tr.innerHTML = '<td>' + (e.date || "-") + '</td>' +
      '<td>' + (e.category || "-") + '</td>' +
      '<td>' + moneyEUR(e.amount) + '</td>' +
      '<td>' + ivaDisplay + '</td>' +
      '<td>' + moneyEUR(e.ivaAmount || 0) + '</td>' +
      '<td>' + moneyEUR(e.totalAmount || e.amount) + '</td>' +
      '<td>' + (e.notes || "") + '</td>' +
      '<td class="action-buttons">' +
        '<button class="btn btn-primary btn-sm py-1 px-2 me-1" style="font-size:0.75rem" data-view="' + e.id + '"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-danger btn-sm py-1 px-2" style="font-size:0.75rem" data-del="' + e.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
  }

  var delBtns = tbody.querySelectorAll("[data-del]");
  for (var j = 0; j < delBtns.length; j++) {
    delBtns[j].addEventListener("click", function() {
      var id = this.getAttribute("data-del");
      if (confirm('Eliminar este gasto?')) {
        deleteUserExpense(id);
      }
    });
  }

  var viewBtns = tbody.querySelectorAll("[data-view]");
  for (var k = 0; k < viewBtns.length; k++) {
    viewBtns[k].addEventListener("click", function() {
      var id = this.getAttribute("data-view");
      viewExpense(id);
    });
  }
}

window.viewExpense = function(id) {
  var list = getUserExpenses();
  var expense = list.find(function(e) { return e.id === id; });
  if (!expense) return;

  var content = document.getElementById('viewExpenseContent');
  if (content) {
    content.innerHTML = '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Fecha:</strong> ' + (expense.date || '-') + '</div>' +
      '<div class="col-md-6"><strong>Categoria:</strong> ' + (expense.category || '-') + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Base Imponible:</strong> <span class="fs-5 fw-bold">' + moneyEUR(expense.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>IVA (' + (expense.ivaRate || 0) + '%):</strong> ' + moneyEUR(expense.ivaAmount || 0) + '</div>' +
      '</div>' +
      '<div class="row mb-3">' +
      '<div class="col-md-6"><strong>Total:</strong> <span class="fs-4 fw-bold text-success">' + moneyEUR(expense.totalAmount || expense.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>Metodo de pago:</strong> ' + (expense.paymentMethod || '-') + '</div>' +
      '</div>' +
      (expense.supplierName ? '<div class="mb-3"><strong>Proveedor:</strong> ' + expense.supplierName + '</div>' : '') +
      (expense.supplierNif ? '<div class="mb-3"><strong>NIF:</strong> ' + expense.supplierNif + '</div>' : '') +
      (expense.notes ? '<div class="mb-3"><strong>Notas:</strong> ' + expense.notes + '</div>' : '') +
      '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(expense.createdAt || '').toLocaleString() + '</small></div>';
  }

  if (window.viewExpenseModal) {
    window.viewExpenseModal.show();
  }
};

async function saveExpense() {
  var form = $("formNewExpense");
  if (!form) {
    console.error('Form not found');
    return;
  }

  // Get values using direct ID access for reliability
  var dateInput = document.getElementById('expenseDate') || form.querySelector('input[name="date"]');
  var categoryInput = document.getElementById('expenseCategory') || form.querySelector('input[name="category"]');
  var amountInput = document.getElementById('expenseBase');
  var ivaRateInput = document.getElementById('expenseIVA');
  var notesInput = document.getElementById('expenseNotes') || form.querySelector('input[name="notes"]');
  var supplierNameInput = document.getElementById('expenseSupplierName') || form.querySelector('input[name="supplierName"]');
  var supplierNifInput = document.getElementById('expenseSupplierNif') || form.querySelector('input[name="supplierNif"]');

  var date = dateInput ? dateInput.value : '';
  var category = categoryInput ? categoryInput.value : '';
  var amount = amountInput ? amountInput.value : '';
  var ivaRate = ivaRateInput ? ivaRateInput.value : '21';
  var notes = notesInput ? notesInput.value : '';
  var supplierName = supplierNameInput ? supplierNameInput.value : '';
  var supplierNif = supplierNifInput ? supplierNifInput.value : '';

  console.log('Saving expense - date:', date, 'category:', category, 'amount:', amount);

  if (!date || !category || !amount) {
    alert("Completa: fecha, categoría e importe.");
    console.log('Validation failed - date:', date, 'category:', category, 'amount:', amount);
    return;
  }

  // Calcular IVA aqui para passar os valores corretos
  var baseImponible = Number(amount || 0);
  var ivaRateNum = Number(ivaRate || 21);
  var ivaAmount = baseImponible * (ivaRateNum / 100);
  var totalAmount = baseImponible + ivaAmount;

  await saveUserExpense({ 
    date: date, 
    category: category, 
    amount: baseImponible, 
    ivaRate: ivaRateNum, 
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    notes: notes, 
    paymentMethod: '',
    supplierName: supplierName,
    supplierNif: supplierNif
  });

  // Hide modal - usar a instância do modal se disponível
  var modalEl = document.getElementById('modalNewExpense');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    } else {
      // Se não há instância, criar e esconder
      var bsModal = new bootstrap.Modal(modalEl);
      bsModal.hide();
    }
  }

  form.reset();
  
  // NÃO fazer re-render aqui - o saveUserExpense já faz isso
  // Isso evita duplicação quando o modal esconde e o utilizador clica em outro lugar
}

function openNewExpenseModal() {
  var dateInput = document.querySelector('#formNewExpense input[name="date"]');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  
  var modalEl = document.getElementById('modalNewExpense');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
  }
}

// Função para calcular o total em tempo real no formulário
function setupRealTimeCalculations() {
  const baseInput = $('expenseBase');
  const ivaSelect = $('expenseIVA');
  const totalInput = $('expenseTotal');

  const update = () => {
    const base = parseFloat(baseInput.value) || 0;
    const iva = parseFloat(ivaSelect.value) || 0;
    const total = base + (base * (iva / 100));
    totalInput.value = total.toFixed(2) + " EUR";
  };

  if (baseInput && ivaSelect) {
    baseInput.addEventListener('input', update);
    ivaSelect.addEventListener('change', update);
  }
}

// ========== INICIALIZAR ==========
document.addEventListener("DOMContentLoaded", function() {
  if (typeof markActivePage === 'function') markActivePage();

  // Função auxiliar para esperar Auth
  function waitForAuth(callback) {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) return callback();
    
    var checkCount = 0;
    var maxChecks = 100; // 10 segundos
    
    function check() {
      checkCount++;
      // Verifica se Firebase Auth está pronto e tem usuário
      var firebaseUser = window.firebaseAuth && window.firebaseAuth.currentUser;
      // OU se AuthService tem usuário
      var authUser = window.AuthService && window.AuthService.getCurrentUser();
      
      if (firebaseUser || authUser) {
        callback();
      } else if (checkCount < maxChecks) {
        setTimeout(check, 100);
      } else {
        // Timeout - talvez redirecionar ou apenas tentar carregar o que der
        console.log('Auth timeout, tentando inicializar mesmo assim...');
        callback();
      }
    }
    check();
  }

  function checkAndInit() {
    // Verifica se store.js está carregado
    if (window.getExpensesSync) {
      console.log('store.js disponível, aguardando auth...');
      
      waitForAuth(function() {
        // Sincronizar dados do Firebase se possível
        if (window.FirebaseSync && window.FirebaseSync.syncAllToLocalStorage) {
          console.log('Sincronizando dados do Firebase...');
          window.FirebaseSync.syncAllToLocalStorage().then(function() {
            initPage();
          }).catch(function(err) {
            console.warn('Erro na sincronização:', err);
            initPage();
          });
        } else {
          initPage();
        }
      });
    } else {
      setTimeout(checkAndInit, 500);
    }
  }
  
  // Iniciar verificação
  setTimeout(checkAndInit, 500);
  
function initPage() {
    console.log('Inicializando expense page...');
    
    setupRealTimeCalculations();

  // Anexar Listeners (Garante que funcionem mesmo se não estiverem no HTML)
  var btnNew = document.getElementById('btnNewExpense') || document.getElementById('newExpenseBtn');
  if (btnNew) btnNew.addEventListener('click', function() { showInlineExpenseForm(); });

    var btnSave = document.getElementById('saveExpenseBtn');
    if (btnSave) {
      // Remove listeners antigos clonando o botão para evitar duplicação
      var newBtn = btnSave.cloneNode(true);
      btnSave.parentNode.replaceChild(newBtn, btnSave);
      newBtn.addEventListener('click', saveExpense);
    }

    var btnImport = document.getElementById('btnImport');
    if (btnImport) {
      btnImport.addEventListener('click', function() {
        var modal = new bootstrap.Modal(document.getElementById('modalImport'));
        modal.show();
      });
    }

    var btnConfirmImport = document.getElementById('confirmImportBtn');
    if (btnConfirmImport) {
      btnConfirmImport.addEventListener('click', function() {
        var fileInput = document.getElementById('importFile');
        if (fileInput) handleFileImport({ target: fileInput });
        // Fechar modal
        var modalEl = document.getElementById('modalImport');
        var modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      });
    }

    var btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', function() {
        var format = prompt("Formato (pdf, csv, excel):", "pdf");
        if (format) exportExpenses(format.toLowerCase());
      });
    }
    
    // Apenas renderizar os dados iniciais
    renderExpenses();
    renderChart();
    renderSummaryCards();
    
    // ========== REALTIME SYNC - Recarregar quando houver alterações ==========
    window.addEventListener('dataUpdated-expenses', function() {
      console.log('📥 Dados de gastos atualizados do Firebase, recarregando...');
      renderExpenses();
      renderChart();
      renderSummaryCards();
    });
  }
});

// Show inline expense form (instead of modal)
function showInlineExpenseForm() {
  try {
    var date = new Date();
    var dateInput = document.getElementById('expenseDateInline');
    if (dateInput && !dateInput.value) dateInput.value = date.toISOString().split('T')[0];

    var inlineCard = document.getElementById('inlineNewExpenseCard');
    if (inlineCard) {
      inlineCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function() { if (dateInput) dateInput.focus(); }, 200);
    }
  } catch (e) { console.error('showInlineExpenseForm error', e); }
}

// Save from inline form
async function saveInlineExpense() {
  var date = document.getElementById('expenseDateInline') ? document.getElementById('expenseDateInline').value : '';
  var category = document.getElementById('expenseCategoryInline') ? document.getElementById('expenseCategoryInline').value : '';
  var amount = document.getElementById('expenseBaseInline') ? document.getElementById('expenseBaseInline').value : '';
  var ivaRate = document.getElementById('expenseIVAInline') ? document.getElementById('expenseIVAInline').value : '21';
  var notes = document.getElementById('expenseNotesInline') ? document.getElementById('expenseNotesInline').value : '';
  var supplierName = document.getElementById('expenseSupplierNameInline') ? document.getElementById('expenseSupplierNameInline').value : '';
  var supplierNif = document.getElementById('expenseSupplierNifInline') ? document.getElementById('expenseSupplierNifInline').value : '';

  if (!date || !category || !amount) {
    alert('Completa: fecha, categoría e importe.');
    return;
  }

  var baseImponible = Number(amount || 0);
  var ivaRateNum = Number(ivaRate || 21);
  var ivaAmount = baseImponible * (ivaRateNum / 100);
  var totalAmount = baseImponible + ivaAmount;

  await saveUserExpense({ 
    date: date, 
    category: category, 
    amount: baseImponible, 
    ivaRate: ivaRateNum, 
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    notes: notes, 
    paymentMethod: '',
    supplierName: supplierName,
    supplierNif: supplierNif
  });

  // Reset inline form (leave visible)
  var form = document.getElementById('formNewExpenseInline');
  if (form) form.reset();
  var inlineCard = document.getElementById('inlineNewExpenseCard');
  if (inlineCard) inlineCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Scroll to table
  var tbody = document.getElementById('expenseTBody');
  if (tbody) tbody.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Wire inline save/cancel buttons and support hash #new
document.addEventListener('DOMContentLoaded', function() {
  var saveInline = document.getElementById('saveInlineExpenseBtn');
  if (saveInline) saveInline.addEventListener('click', saveInlineExpense);
  var cancelInline = document.getElementById('cancelInlineExpenseBtn');
  if (cancelInline) cancelInline.addEventListener('click', function() {
    var f = document.getElementById('formNewExpenseInline'); if (f) f.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (window.location && window.location.hash === '#new') {
    showInlineExpenseForm();
  }
});

// ========== EXPORTAR GASTOS ==========
function exportExpenses(format) {
  var list = getUserExpenses();
  if (!list.length) {
    alert('No hay gastos para exportar.');
    return;
  }
  
  if (format === 'pdf') {
    exportExpensesToPDF(list);
  } else if (format === 'csv') {
    exportExpensesToCSV(list);
  } else if (format === 'excel') {
    exportExpensesToExcel(list);
  }
}

function exportExpensesFallback(format) {
  exportExpenses(format);
}

function getProfileImageForExport() {
  if (window.UPSEN_getProfileImage) {
    return window.UPSEN_getProfileImage() || '';
  }
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (!session) return '';
    var data = JSON.parse(session);
    var user = data && data.user ? data.user : null;
    if (!user) return '';
    return user.profileImage || (user.companyData && user.companyData.logo) || '';
  } catch (e) {
    return '';
  }
}

function addLogoToPdfHeader(doc, imageData, x, y, w, h) {
  return new Promise(function(resolve) {
    if (!imageData) {
      resolve(false);
      return;
    }

    var imageFormat = 'JPEG';
    if (typeof imageData === 'string' && imageData.indexOf('data:image/') === 0) {
      var mime = imageData.substring(5, imageData.indexOf(';')).toLowerCase();
      if (mime.indexOf('png') !== -1 || mime.indexOf('webp') !== -1) {
        imageFormat = 'PNG';
      }
    }

    var img = new Image();
    img.onload = function() {
      try {
        doc.addImage(img, imageFormat, x, y, w, h);
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    };
    img.onerror = function() { resolve(false); };
    img.src = imageData;
  });
}

async function exportExpensesToPDF(list) {
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
  doc.text('Gastos', 105, 28, {align: 'center'});
  await addLogoToPdfHeader(doc, getProfileImageForExport(), 15, 7, 22, 22);
  
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align: 'right'});
  doc.line(15, 40, 195, 40);
  
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Fecha', 15, y);
  doc.text('Categoria', 45, y);
  doc.text('Base', 110, y);
  doc.text('IVA', 140, y);
  doc.text('Total', 170, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.line(15, y - 3, 195, y - 3);
  
  for (var i = 0; i < list.length && y < 270; i++) {
    var exp = list[i];
    doc.text(exp.date || '-', 15, y);
    doc.text((exp.category || '-').substring(0, 20), 45, y);
    doc.text(moneyEUR(exp.amount || 0), 110, y);
    doc.text(moneyEUR(exp.ivaAmount || 0), 140, y);
    doc.text(moneyEUR(exp.totalAmount || exp.amount || 0), 170, y);
    y += 8;
  }
  
  var total = 0;
  var totalIVA = 0;
  for (var j = 0; j < list.length; j++) {
    total += Number(list[j].amount || 0);
    totalIVA += Number(list[j].ivaAmount || 0);
  }
  y += 5;
  doc.setFontSize(12);
  doc.text('Total:', 100, y);
  doc.setFontSize(14);
  doc.setTextColor(42, 77, 156);
  doc.text(moneyEUR(total), 140, y);
  doc.text(moneyEUR(totalIVA), 170, y);
  
  doc.save('gastos.pdf');
  alert('PDF descargado correctamente!');
}

function exportExpensesToCSV(list) {
  var csv = 'Fecha,Categoria,Base Imponible,IVA Rate,IVA Amount,Total,Notas,Proveedor,NIF\n';
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    csv += '"' + (exp.date || '') + '",';
    csv += '"' + (exp.category || '') + '",';
    csv += '"' + (exp.amount || 0) + '",';
    csv += '"' + (exp.ivaRate || 0) + '",';
    csv += '"' + (exp.ivaAmount || 0) + '",';
    csv += '"' + (exp.totalAmount || exp.amount || 0) + '",';
    csv += '"' + (exp.notes || '') + '",';
    csv += '"' + (exp.supplierName || '') + '",';
    csv += '"' + (exp.supplierNif || '') + '"\n';
  }
  
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gastos.csv';
  link.click();
  alert('CSV descargado correctamente!');
}

function exportExpensesToExcel(list) {
  var html = '<table border="1">';
  html += '<tr><th>Fecha</th><th>Categoria</th><th>Base Imponible</th><th>IVA %</th><th>IVA</th><th>Total</th><th>Notas</th><th>Proveedor</th><th>NIF</th></tr>';
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    html += '<tr>';
    html += '<td>' + (exp.date || '') + '</td>';
    html += '<td>' + (exp.category || '') + '</td>';
    html += '<td>' + (exp.amount || 0) + '</td>';
    html += '<td>' + (exp.ivaRate || 0) + '</td>';
    html += '<td>' + (exp.ivaAmount || 0) + '</td>';
    html += '<td>' + (exp.totalAmount || exp.amount || 0) + '</td>';
    html += '<td>' + (exp.notes || '') + '</td>';
    html += '<td>' + (exp.supplierName || '') + '</td>';
    html += '<td>' + (exp.supplierNif || '') + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  
  var excelHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  excelHtml += '<head><meta charset="UTF-8"></head><body>' + html + '</body></html>';
  
  var blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gastos.xls';
  link.click();
  alert('Excel descargado correctamente!');
}

function downloadExpenseTemplate() {
  var template = 'Fecha,Categoria,Base Imponible,IVA Rate,IVA Amount,Notas,Proveedor,NIF\n';
  template += '2024-01-15,Suministros,150.00,21,31.50,Luz enero,Endesa,12345678A\n';
  template += '2024-01-20,Alquiler,500.00,21,105.00,Oficina,Inmobiliaria XYZ,87654321B\n';
  template += '2024-01-25,Material Oficina,75.00,21,15.75,Papelerías,Distribuciones,11223344C\n';
  
  var blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_gastos.csv';
  link.click();
  alert('Template descargado! Use este formato para importar dados.');
}
