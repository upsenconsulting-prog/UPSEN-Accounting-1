// expense.js - Com dados isolados por usuário

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
  list.push({
    id: 'exp-' + Date.now() + '-' + Math.random().toString(16).slice(2),
    date: expense.date || '',
    category: expense.category || '',
    amount: Number(expense.amount || 0),
    notes: expense.notes || '',
    paymentMethod: expense.paymentMethod || '',
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(key, JSON.stringify(list));
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
}

// ========== RENDER FUNCTIONS ==========
function renderSummaryCards() {
  var list = getUserExpenses();
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  
  var monthlyTotal = 0;
  var categoryTotals = {};
  var lastExpense = null;
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    
    // Monthly total
    if (exp.date) {
      var parts = exp.date.split('-');
      if (parts.length >= 2) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        if (year === currentYear && month === currentMonth) {
          monthlyTotal += Number(exp.amount || 0);
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
  
  var topCategoryEl = $("topCategory");
  if (topCategoryEl) {
    var keys = Object.keys(categoryTotals);
    if (keys.length > 0) {
      var topCat = keys[0];
      var topVal = categoryTotals[topCat];
      for (var k = 0; k < keys.length; k++) {
        if (categoryTotals[keys[k]] > topVal) {
          topCat = keys[k];
          topVal = categoryTotals[keys[k]];
        }
      }
      topCategoryEl.textContent = topCat;
    } else {
      topCategoryEl.textContent = "Sin datos";
    }
  }
  
  var lastExpenseEl = $("lastExpense");
  if (lastExpenseEl) {
    if (lastExpense) {
      lastExpenseEl.innerHTML = lastExpense.date + ' - ' + lastExpense.category;
    } else {
      lastExpenseEl.textContent = "Sin gastos";
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

  // Destroy existing chart
  if (expenseChart) {
    expenseChart.destroy();
  }

  // Create new chart
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
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'EUR ' + value;
            }
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
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay gastos registrados todavía.</td></tr>';
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    var tr = document.createElement("tr");
    tr.innerHTML = '<td>' + (e.date || "-") + '</td>' +
      '<td>' + (e.category || "-") + '</td>' +
      '<td>' + moneyEUR(e.amount) + '</td>' +
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

// ========== VER GASTO ==========
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
      '<div class="col-md-6"><strong>Importe:</strong> <span class="fs-4 fw-bold">' + moneyEUR(expense.amount) + '</span></div>' +
      '<div class="col-md-6"><strong>Metodo de pago:</strong> ' + (expense.paymentMethod || '-') + '</div>' +
      '</div>' +
      (expense.notes ? '<div class="mb-3"><strong>Notas:</strong> ' + expense.notes + '</div>' : '') +
      '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(expense.createdAt || '').toLocaleString() + '</small></div>';
  }

  if (window.viewExpenseModal) {
    window.viewExpenseModal.show();
  }
};

// ========== GUARDAR GASTO ==========
function saveExpense() {
  var form = $("formNewExpense");
  if (!form) return;

  var date = "";
  var category = "";
  var amount = "";
  var notes = "";
  var paymentMethod = "";
  
  var dateInput = form.querySelector('input[name="date"]');
  var categoryInput = form.querySelector('input[name="category"]');
  var amountInput = form.querySelector('input[name="amount"]');
  var notesInput = form.querySelector('input[name="notes"]');
  
  if (dateInput) date = dateInput.value;
  if (categoryInput) category = categoryInput.value;
  if (amountInput) amount = amountInput.value;
  if (notesInput) notes = notesInput.value;

  if (!date || !category || !amount) {
    alert("Completa: fecha, categoría e importe.");
    return;
  }

  saveUserExpense({ date: date, category: category, amount: amount, notes: notes, paymentMethod: paymentMethod });

  // Close modal
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

// ========== ABRIR MODAL ==========
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
  
  // New Expense Button
  var newExpenseBtn = document.getElementById('newExpenseBtn');
  if (newExpenseBtn) {
    newExpenseBtn.addEventListener('click', function() {
      openNewExpenseModal();
    });
  }
  
  // Save Button
  var saveBtn = document.getElementById('saveExpenseBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveExpense();
    });
  }
  
  // Refresh button
  var refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      location.reload();
    });
  }
  
  renderExpenses();
  renderChart();
  renderSummaryCards();
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
  
  // Header
  doc.setFillColor(42, 77, 156);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('UPSEN Accounting', 105, 18, {align: 'center'});
  doc.setFontSize(12);
  doc.text('Gastos', 105, 28, {align: 'center'});
  
  // Data
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-ES'), 195, 45, {align: 'right'});
  doc.line(15, 40, 195, 40);
  
  var y = 55;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Fecha', 15, y);
  doc.text('Categoria', 50, y);
  doc.text('Importe', 140, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.line(15, y - 3, 195, y - 3);
  
  for (var i = 0; i < list.length && y < 270; i++) {
    var exp = list[i];
    doc.text(exp.date || '-', 15, y);
    doc.text((exp.category || '-').substring(0, 30), 50, y);
    doc.text(moneyEUR(exp.amount), 140, y);
    y += 8;
  }
  
  // Total
  var total = 0;
  for (var j = 0; j < list.length; j++) {
    total += Number(list[j].amount || 0);
  }
  y += 5;
  doc.setFontSize(12);
  doc.text('Total:', 120, y);
  doc.setFontSize(14);
  doc.setTextColor(42, 77, 156);
  doc.text(moneyEUR(total), 155, y);
  
  doc.save('gastos.pdf');
  alert('PDF descargado correctamente!');
}

function exportExpensesToCSV(list) {
  var csv = 'Fecha,Categoria,Importe,Notas\n';
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    csv += '"' + (exp.date || '') + '",';
    csv += '"' + (exp.category || '') + '",';
    csv += '"' + (exp.amount || 0) + '",';
    csv += '"' + (exp.notes || '') + '"\n';
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
  html += '<tr><th>Fecha</th><th>Categoria</th><th>Importe</th><th>Notas</th></tr>';
  
  for (var i = 0; i < list.length; i++) {
    var exp = list[i];
    html += '<tr>';
    html += '<td>' + (exp.date || '') + '</td>';
    html += '<td>' + (exp.category || '') + '</td>';
    html += '<td>' + (exp.amount || 0) + '</td>';
    html += '<td>' + (exp.notes || '') + '</td>';
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

