// expense.js - Com dados isolados por usuário + IVA + Importação em massa

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  var v = Number(n || 0);
  return 'EUR ' + v.toFixed(2);
}

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

// ========== DADOS DO USUÁRIO LOGADO ==========
function getUserId() {
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        return data.user.uid || data.user.id || 'demo';
      }
    }
  } catch (e) {}
  return 'demo';
}

function getUserExpenses() {
  var key = 'upsen_expenses_' + getUserId();
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

function saveUserExpense(expense) {
  var key = 'upsen_expenses_' + getUserId();
  var list = getUserExpenses();
  
  // Calcular IVA
  var baseImponible = Number(expense.amount || 0);
  var ivaRate = Number(expense.ivaRate || 0);
  var ivaAmount = baseImponible * (ivaRate / 100);
  var totalAmount = baseImponible + ivaAmount;
  
  var newExpense = {
    id: 'exp-' + Date.now() + '-' + Math.random().toString(16).slice(2),
    date: expense.date || '',
    category: expense.category || '',
    amount: baseImponible,
    ivaRate: ivaRate,
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    notes: expense.notes || '',
    paymentMethod: expense.paymentMethod || '',
    supplierNif: expense.supplierNif || '',
    supplierName: expense.supplierName || '',
    createdAt: new Date().toISOString()
  };
  list.push(newExpense);
  localStorage.setItem(key, JSON.stringify(list));
  
  // Também salvar no Firebase
  saveExpenseToFirebase(newExpense);
}

function saveExpenseToFirebase(expense) {
  var userId = getUserId();
  console.log('=== SAVE EXPENSE TO FIREBASE ===');
  console.log('userId:', userId);
  
  if (!userId || userId === 'unknown' || userId === 'demo') return;
  if (!window.firebaseDb) return;
  
  window.firebaseDb.collection('users').doc(userId).collection('documents').doc('expenses').collection('items').add({
    id: expense.id,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    ivaRate: expense.ivaRate,
    ivaAmount: expense.ivaAmount,
    totalAmount: expense.totalAmount,
    notes: expense.notes,
    paymentMethod: expense.paymentMethod,
    supplierNif: expense.supplierNif,
    supplierName: expense.supplierName,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    console.log('Despesa salva no Firebase');
  }).catch(function(error) {
    console.warn('Erro ao salvar no Firebase:', error.message);
  });
}

function deleteUserExpense(id) {
  var key = 'upsen_expenses_' + getUserId();
  var list = getUserExpenses();
  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      filtered.push(list[i]);
    }
  }
  localStorage.setItem(key, JSON.stringify(filtered));
  
  // Também eliminar do Firebase
  deleteExpenseFromFirebase(id);
}

function deleteExpenseFromFirebase(id) {
  var userId = getUserId();
  if (!userId || userId === 'unknown' || userId === 'demo') return;
  if (!window.firebaseDb) return;
  
  window.firebaseDb.collection('users').doc(userId).collection('documents').doc('expenses').collection('items')
    .where('id', '==', id)
    .get()
    .then(function(snapshot) {
      snapshot.forEach(function(doc) {
        doc.ref.delete();
      });
    })
    .catch(function(error) {
      console.warn('Erro ao eliminar do Firebase:', error.message);
    });
}

// ========== IMPORTAR DADOS EM MASSA ==========
function importExpensesFromCSV(csvContent) {
  var lines = csvContent.split('\n');
  if (lines.length < 2) {
    alert('CSV vazio ou sem dados.');
    return 0;
  }
  
  var headers = lines[0].split(',').map(function(h) { return h.trim().toLowerCase().replace(/"/g, ''); });
  var importedCount = 0;
  
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handling quoted values)
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
    
    // Map values to fields
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
      saveUserExpense(expense);
      importedCount++;
    }
  }
  
  return importedCount;
}

function handleFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var content = e.target.result;
    var count = 0;
    
    if (file.name.endsWith('.csv')) {
      count = importExpensesFromCSV(content);
    } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      alert('Para Excel, por favor converta para CSV primeiro.');
    } else {
      alert('Formato não suportado. Use CSV.');
    }
    
    if (count > 0) {
      alert(count + ' despesas importadas com sucesso!');
      renderExpenses();
      renderChart();
      renderSummaryCards();
    } else {
      alert('Nenhuma despesa importada. Verifique o formato do CSV.');
    }
    
    // Reset file input
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
    
    // Monthly total (com IVA)
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
    
    // Category totals
    var cat = exp.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
    
    // Last expense by date
    if (!lastExpense || (exp.date && exp.date > lastExpense.date)) {
      lastExpense = exp;
    }
  }
  
  var monthlyTotalEl = $("monthlyTotal");
  if (monthlyTotalEl) {
    monthlyTotalEl.textContent = moneyEUR(monthlyTotal);
  }
  
  // Also update IVA if element exists
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
      // Check if there's a span inside
      var topCatSpan = topCategoryEl.querySelector('span');
      if (topCatSpan) {
        topCatSpan.textContent = topCat;
      } else {
        topCategoryEl.textContent = topCat;
      }
    } else {
      // Check if there's a span inside
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
      // Check if there's a span inside
      var lastExpenseSpan = lastExpenseEl.querySelector('span');
      if (lastExpenseSpan) {
        lastExpenseSpan.innerHTML = lastExpense.date + ' - ' + lastExpense.category;
      } else {
        lastExpenseEl.innerHTML = lastExpense.date + ' - ' + lastExpense.category;
      }
    } else {
      // Check if there's a span inside
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
        renderExpenses();
        renderChart();
        renderSummaryCards();
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

function saveExpense() {
  var form = $("formNewExpense");
  if (!form) return;

  var date = "";
  var category = "";
  var amount = "";
  var ivaRate = "";
  var notes = "";
  var paymentMethod = "";
  var supplierNif = "";
  var supplierName = "";
  
  var dateInput = form.querySelector('input[name="date"]');
  var categoryInput = form.querySelector('input[name="category"]');
  var amountInput = form.querySelector('input[name="amount"]');
  var ivaRateInput = form.querySelector('input[name="ivaRate"]');
  var notesInput = form.querySelector('input[name="notes"]');
  
  if (dateInput) date = dateInput.value;
  if (categoryInput) category = categoryInput.value;
  if (amountInput) amount = amountInput.value;
  if (ivaRateInput) ivaRate = ivaRateInput.value;
  if (notesInput) notes = notesInput.value;

  // Get supplier fields if they exist
  var supplierNameInput = form.querySelector('input[name="supplierName"]');
  var supplierNifInput = form.querySelector('input[name="supplierNif"]');
  if (supplierNameInput) supplierName = supplierNameInput.value;
  if (supplierNifInput) supplierNif = supplierNifInput.value;

  if (!date || !category || !amount) {
    alert("Completa: fecha, categoría e importe.");
    return;
  }

  saveUserExpense({ 
    date: date, 
    category: category, 
    amount: amount, 
    ivaRate: ivaRate || 0, 
    notes: notes, 
    paymentMethod: paymentMethod,
    supplierName: supplierName,
    supplierNif: supplierNif
  });

  var modalEl = document.getElementById('modalNewExpense');
  if (modalEl) {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    } else {
      var bsModal = new bootstrap.Modal(modalEl);
      bsModal.hide();
    }
  }

  form.reset();
  renderExpenses();
  renderChart();
  renderSummaryCards();
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

// ========== INICIALIZAR ==========
document.addEventListener("DOMContentLoaded", function() {
  markActivePage();
  
  // Wait for auth to be ready before loading data
  window.waitForAuth(function() {
    console.log('Auth ready, initializing expense page...');
    
    var newExpenseBtn = document.getElementById('newExpenseBtn');
    if (newExpenseBtn) {
      newExpenseBtn.addEventListener('click', function() {
        openNewExpenseModal();
      });
    }
    
    var saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        saveExpense();
      });
    }
    
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        location.reload();
      });
    }
    
    // Setup import button
    var importBtn = document.getElementById('importExpensesBtn');
    if (importBtn) {
      var fileInput = document.getElementById('importExpensesFile');
      if (fileInput) {
        importBtn.addEventListener('click', function() {
          fileInput.click();
        });
        fileInput.addEventListener('change', handleFileImport);
      }
    }
    
    renderExpenses();
    renderChart();
    renderSummaryCards();
  });
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

function exportExpensesToPDF(list) {
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
  alert('CSV descargado correctamente! (Formateado para importación)');
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

// ========== GERAR TEMPLATE CSV ==========
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

