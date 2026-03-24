// expense.js - Com dados isolados por usuário + IVA + Importação em massa
// INTEGRAT CU NOILE CERINȚE: 4 TARJETAS, 6 TARJETAS, ULTIMAS FACTURAS

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  var v = Number(n || 0);
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
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

// ========== USAR STORE.JS (Firebase + localStorage) ==========
function getUserExpenses() {
  if (window.getExpensesSync) {
    return window.getExpensesSync();
  }
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

function saveUserExpense(expense) {
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
    supplierName: expense.supplierName || '',
    receiptNumber: expense.receiptNumber || '',
    state: expense.state || 'Pagado'
  };
  
  if (window.addExpense) {
    return window.addExpense(expenseData).then(function() {
      renderExpenses();
      renderChart();
      renderSummaryCards();
    }).catch(function(err) {
      console.error('Erro ao salvar despesa:', err);
    });
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

// ========== IMPORTAR DADOS EM MASSA (CSV) ==========
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
    
    var values = [];
    var current = '';
    var inQuotes = false;
    for (var j = 0; j < line.length; j++) {
      var char = line[j];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
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
      const base = Number(expense.amount);
      const rate = Number(expense.ivaRate || 21);
      const ivaVal = base * (rate / 100);
      expense.ivaAmount = ivaVal;
      expense.totalAmount = base + ivaVal;
      saveUserExpense(expense);
      importedCount++;
    }
  }
  return importedCount;
}

// ========== RENDER SUMMARY (CALCULO BACKEND) ==========
function renderSummaryCards() {
  const expenses = getUserExpenses();
  const invoicesIssued = (window.getInvoicesIssuedSync) ? window.getInvoicesIssuedSync() : [];

  // GASTOS
  let totalBaseGastos = 0;
  let totalIvaSoportado = 0;
  let totalGastos = 0;
  let pendingGastos = 0;
  let overdueGastos = 0;

  expenses.forEach(exp => {
    totalBaseGastos += Number(exp.amount || 0);
    totalIvaSoportado += Number(exp.ivaAmount || 0);
    totalGastos += Number(exp.totalAmount || 0);
    if (exp.state === 'Pendiente') pendingGastos++;
    if (exp.state === 'Vencida') overdueGastos++;
  });

  // INGRESOS (Facturas Emitidas)
  let totalBaseIngresos = 0;
  let totalIvaRepercutido = 0;
  let totalIngresos = 0;

  invoicesIssued.forEach(inv => {
    totalBaseIngresos += Number(inv.amount || 0);
    totalIvaRepercutido += Number(inv.ivaAmount || 0);
    totalIngresos += Number(inv.totalAmount || 0);
  });

  // RESULTADO & IVA FINAL
  const resultadoNeto = totalBaseIngresos - totalBaseGastos;
  const ivaFinal = totalIvaRepercutido - totalIvaSoportado;

  // Render UI - 4 Tarjetas
  if ($('resumen-ingresos-total')) $('resumen-ingresos-total').innerText = moneyEUR(totalIngresos);
  if ($('resumen-ingresos-base')) $('resumen-ingresos-base').innerText = moneyEUR(totalBaseIngresos);
  if ($('resumen-ingresos-iva')) $('resumen-ingresos-iva').innerText = moneyEUR(totalIvaRepercutido);

  if ($('resumen-gastos-total')) $('resumen-gastos-total').innerText = moneyEUR(totalGastos);
  if ($('resumen-gastos-base')) $('resumen-gastos-base').innerText = moneyEUR(totalBaseGastos);
  if ($('resumen-gastos-iva')) $('resumen-gastos-iva').innerText = moneyEUR(totalIvaSoportado);

  if ($('resumen-resultado-neto')) {
    $('resumen-resultado-neto').innerText = moneyEUR(resultadoNeto);
    $('resumen-resultado-neto').style.color = resultadoNeto >= 0 ? "#1E7D34" : "#B42318";
  }

  if ($('resumen-iva-final')) {
    $('resumen-iva-final').innerText = moneyEUR(ivaFinal);
    if ($('iva-status')) $('iva-status').innerText = ivaFinal >= 0 ? "IVA a pagar" : "IVA a compensar";
  }

  // Render UI - 6 Tarjetas Detalle
  if ($('stats-count')) $('stats-count').innerText = expenses.length;
  if ($('stats-base')) $('stats-base').innerText = moneyEUR(totalBaseGastos);
  if ($('stats-iva')) $('stats-iva').innerText = moneyEUR(totalIvaSoportado);
  if ($('stats-total')) $('stats-total').innerText = moneyEUR(totalGastos);
  if ($('stats-pending')) $('stats-pending').innerText = pendingGastos;
  if ($('stats-overdue')) $('stats-overdue').innerText = overdueGastos;

  renderRecentInvoices(invoicesIssued);
}

// ========== RENDER TABLES ==========
function renderExpenses() {
  var tbody = $("expenseTBody");
  if (!tbody) return;
  var list = getUserExpenses();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay gastos registrados.</td></tr>';
    return;
  }

  list.forEach(e => {
    var tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date || "-"}</td>
      <td><span class="badge bg-light text-dark border">${e.category || "General"}</span></td>
      <td>${e.supplierName || "-"}</td>
      <td class="text-end">${moneyEUR(e.amount)}</td>
      <td class="text-center">${e.ivaRate}%</td>
      <td class="text-end fw-bold">${moneyEUR(e.totalAmount || e.amount)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-light border me-1" onclick="window.viewExpense('${e.id}')"><i class="fas fa-eye text-primary"></i></button>
        <button class="btn btn-sm btn-light border" onclick="deleteExpenseHandler('${e.id}')"><i class="fas fa-trash text-danger"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderRecentInvoices(invoices) {
  const tbody = $("recentInvoicesTBody");
  if (!tbody) return;
  const recent = [...invoices].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)).slice(0, 5);
  tbody.innerHTML = "";
  recent.forEach(inv => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-4 fw-semibold" style="color:#5B3DF5;">${inv.invoiceNumber}</td>
      <td>${inv.invoiceDate}</td>
      <td>${inv.customer}</td>
      <td class="text-end">${moneyEUR(inv.amount)}</td>
      <td class="text-end fw-bold">${moneyEUR(inv.totalAmount)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-light border">Ver</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ========== ACTIONS ==========
window.saveExpense = function() {
  const date = $("expenseDate").value;
  const amount = parseFloat($("expenseAmount").value) || 0;
  const category = $("expenseCategory").value;
  const ivaRate = parseFloat($("expenseIvaRate").value) || 0;
  
  if (!date || amount <= 0) {
    alert("Completa fecha e importe.");
    return;
  }

  const ivaAmount = amount * (ivaRate / 100);
  const totalAmount = amount + ivaAmount;

  saveUserExpense({
    date: date,
    amount: amount,
    category: category,
    ivaRate: ivaRate,
    ivaAmount: ivaAmount,
    totalAmount: totalAmount,
    supplierName: $("expenseSupplierName").value,
    notes: $("expenseNotes").value,
    receiptNumber: $("expenseReceipt") ? $("expenseReceipt").value : '',
    paymentMethod: $("expensePaymentMethod") ? $("expensePaymentMethod").value : 'Tarjeta',
    state: 'Pagado'
  }).then(() => {
    const modalEl = document.getElementById('modalNewExpense');
    bootstrap.Modal.getInstance(modalEl).hide();
  });
};

window.deleteExpenseHandler = function(id) {
  if (confirm('¿Eliminar este gasto?')) deleteUserExpense(id);
};

// ========== EXPORT FUNCTIONS (CONSERVATE) ==========
function exportExpenses(format) {
  var list = getUserExpenses();
  if (!list.length) return alert('No hay datos.');
  if (format === 'csv') exportExpensesToCSV(list);
  if (format === 'pdf') exportExpensesToPDF(list);
}

function exportExpensesToCSV(list) {
  var csv = 'Fecha,Categoria,Base,IVA Rate,IVA Amount,Total,Proveedor\n';
  list.forEach(exp => {
    csv += `"${exp.date}","${exp.category}",${exp.amount},${exp.ivaRate},${exp.ivaAmount},${exp.totalAmount},"${exp.supplierName}"\n`;
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gastos.csv';
  link.click();
}

function exportExpensesToPDF(list) {
  if (typeof window.jspdf === 'undefined') return alert('jsPDF no disponible.');
  var doc = new window.jspdf.jsPDF();
  doc.text("Reporte de Gastos", 14, 20);
  let y = 30;
  list.forEach(exp => {
    doc.text(`${exp.date} - ${exp.category} - ${moneyEUR(exp.totalAmount)}`, 14, y);
    y += 10;
  });
  doc.save('gastos.pdf');
}

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", function() {
  markActivePage();
  function checkAndInit() {
    if (window.getExpensesSync && window.FirebaseSync) {
      window.FirebaseSync.syncAllToLocalStorage().then(() => {
        renderExpenses();
        renderSummaryCards();
        if (typeof renderChart === 'function') renderChart();
      });
    } else {
      setTimeout(checkAndInit, 500);
    }
  }
  checkAndInit();
  window.addEventListener('dataUpdated-expenses', () => {
    renderExpenses();
    renderSummaryCards();
  });
});

// ========== CHART ==========
function renderChart() {
  const ctx = document.getElementById('expenseChartCanvas');
  if (!ctx) return;
  const expenses = getUserExpenses();
  const cats = {};
  expenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + Number(e.amount));
  
  if (window.myChart) window.myChart.destroy();
  window.myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats),
      datasets: [{ data: Object.values(cats), backgroundColor: ['#5B3DF5', '#7A5CFF', '#B26A00', '#15966D', '#B42318'] }]
    },
    options: { maintainAspectRatio: false }
  });
}