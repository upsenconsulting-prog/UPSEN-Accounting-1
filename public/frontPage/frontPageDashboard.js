// frontPageDashboard.js - Dashboard com suporte a Firebase + localStorage

function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  return "EUR " + Number(n || 0).toFixed(2);
}

// Chart instances
var dashboardChart = null;
var expensesChart = null;
var forecastChart = null;
var paymentsForecastChart = null;

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

// ========== OBTENER USER ID ==========
function getUserId() {
  var auth = window.AuthService || window.Auth;
  if (auth && auth.getCurrentUser) {
    var user = auth.getCurrentUser();
    if (user) {
      return user.uid || user.id || 'unknown';
    }
  }
  
  // Fallback: leer de localStorage
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        return data.user.uid || data.user.id || 'unknown';
      }
    }
  } catch (e) {}
  
  return 'unknown';
}

function getDataKey(type) {
  var userId = getUserId();
  return 'upsen_' + type + '_' + userId;
}

// ========== DATOS LOCALES ==========
function getUserExpenses() {
  var auth = window.AuthService || window.Auth;
  var user = auth ? auth.getCurrentUser() : null;
  var userId = user?.uid || user?.id || 'unknown';
  var key = 'upsen_expenses_' + userId;
  
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  
  return [];
}

function getUserInvoicesIssued() {
  var auth = window.AuthService || window.Auth;
  var user = auth ? auth.getCurrentUser() : null;
  var userId = user?.uid || user?.id || 'unknown';
  var key = 'upsen_invoices_issued_' + userId;
  
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  
  return [];
}

function getUserInvoicesReceived() {
  var auth = window.AuthService || window.Auth;
  var user = auth ? auth.getCurrentUser() : null;
  var userId = user?.uid || user?.id || 'unknown';
  var key = 'upsen_invoices_received_' + userId;
  
  try {
    var data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}
  
  return [];
}

// ========== KPI HELPERS ==========
function sumInvoicesReceivedMonthYear(year, month) {
  var total = 0;
  var invoices = getUserInvoicesReceived();
  
  for (var i = 0; i < invoices.length; i++) {
    var inv = invoices[i];
    if (!inv.invoiceDate) continue;
    
    var parts = inv.invoiceDate.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) {
        total += Number(inv.amount) || 0;
      }
    }
  }
  return total;
}

function countInvoicesReceivedMonthYear(year, month) {
  var count = 0;
  var invoices = getUserInvoicesReceived();
  
  for (var i = 0; i < invoices.length; i++) {
    var inv = invoices[i];
    if (!inv.invoiceDate) continue;
    
    var parts = inv.invoiceDate.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) count++;
    }
  }
  return count;
}

function countInvoicesReceivedPending() {
  var count = 0;
  var invoices = getUserInvoicesReceived();
  
  for (var i = 0; i < invoices.length; i++) {
    var state = (invoices[i].state || '').toLowerCase();
    if (state === 'pendiente') count++;
  }
  return count;
}

function sumInvoicesIssuedMonthYear(year, month) {
  var total = 0;
  var invoices = getUserInvoicesIssued();
  
  for (var i = 0; i < invoices.length; i++) {
    var inv = invoices[i];
    if (!inv.invoiceDate) continue;
    
    var parts = inv.invoiceDate.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) {
        total += Number(inv.amount) || 0;
      }
    }
  }
  return total;
}

function countInvoicesIssuedMonthYear(year, month) {
  var count = 0;
  var invoices = getUserInvoicesIssued();
  
  for (var i = 0; i < invoices.length; i++) {
    var inv = invoices[i];
    if (!inv.invoiceDate) continue;
    
    var parts = inv.invoiceDate.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) count++;
    }
  }
  return count;
}

function countInvoicesIssuedPending() {
  var count = 0;
  var invoices = getUserInvoicesIssued();
  
  for (var i = 0; i < invoices.length; i++) {
    var state = (invoices[i].state || '').toLowerCase();
    if (state === 'pendiente') count++;
  }
  return count;
}

function sumExpensesMonthYear(year, month) {
  var total = 0;
  var expenses = getUserExpenses();
  
  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    if (!exp.date) continue;
    
    var parts = exp.date.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) {
        total += Number(exp.amount) || 0;
      }
    }
  }
  return total;
}

function countExpensesMonthYear(year, month) {
  var count = 0;
  var expenses = getUserExpenses();
  
  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    if (!exp.date) continue;
    
    var parts = exp.date.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) count++;
    }
  }
  return count;
}

function getTopExpenseCategory(year, month) {
  var categoryTotals = {};
  var expenses = getUserExpenses();
  
  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    if (!exp.date) continue;
    
    var parts = exp.date.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) {
        var cat = exp.category || 'Sin categoria';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount) || 0;
      }
    }
  }
  
  var keys = Object.keys(categoryTotals);
  if (keys.length === 0) return '';
  
  var topCat = keys[0];
  var maxVal = 0;
  for (var i = 0; i < keys.length; i++) {
    if (categoryTotals[keys[i]] > maxVal) {
      maxVal = categoryTotals[keys[i]];
      topCat = keys[i];
    }
  }
  return topCat;
}

function getExpensesMonthYear(year, month) {
  var result = [];
  var expenses = getUserExpenses();
  
  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    if (!exp.date) continue;
    
    var parts = exp.date.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) result.push(exp);
    }
  }
  return result;
}

function getExpensesByCategory(year, month) {
  var categoryTotals = {};
  var expenses = getUserExpenses();
  
  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    if (!exp.date) continue;
    
    var parts = exp.date.split('-');
    if (parts.length >= 2) {
      var y = parseInt(parts[0]);
      var m = parseInt(parts[1]) - 1;
      if (y === year && m === month) {
        var cat = exp.category || 'Sin categoria';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount) || 0;
      }
    }
  }
  return categoryTotals;
}

// ========== KPI DASHBOARD ==========
function renderDashboardKPIs() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  var totalReceived = sumInvoicesReceivedMonthYear(y, m);
  var countReceived = countInvoicesReceivedMonthYear(y, m);
  var pendingReceived = countInvoicesReceivedPending();

  var totalIssued = sumInvoicesIssuedMonthYear(y, m);
  var countIssued = countInvoicesIssuedMonthYear(y, m);
  var pendingIssued = countInvoicesIssuedPending();

  var totalExpenses = sumExpensesMonthYear(y, m);
  var countExpenses = countExpensesMonthYear(y, m);
  var topCategory = getTopExpenseCategory(y, m);

  if ($('kpi-received-total')) $('kpi-received-total').textContent = formatEUR(totalReceived);
  if ($('kpi-received-count')) $('kpi-received-count').textContent = String(countReceived);
  if ($('kpi-received-pending')) $('kpi-received-pending').textContent = String(pendingReceived);

  if ($('kpi-issued-total')) $('kpi-issued-total').textContent = formatEUR(totalIssued);
  if ($('kpi-issued-count')) $('kpi-issued-count').textContent = String(countIssued);
  if ($('kpi-issued-pending')) $('kpi-issued-pending').textContent = String(pendingIssued);

  if ($('kpi-expenses-total')) $('kpi-expenses-total').textContent = formatEUR(totalExpenses);
  if ($('kpi-expenses-count')) $('kpi-expenses-count').textContent = String(countExpenses);
  if ($('kpi-expenses-category')) $('kpi-expenses-category').textContent = topCategory || '-';
}

// ========== CHARTS ==========
function renderExpensesChart() {
  var chartContainer = $('expensesChart');
  if (!chartContainer) return;

  var ctx = chartContainer.getContext('2d');
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  var categoryData = getExpensesByCategory(y, m);

  var labels = Object.keys(categoryData);
  var data = Object.values(categoryData);

  var colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

  if (expensesChart) {
    expensesChart.destroy();
  }

  expensesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['Sin datos'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: labels.map(function(_, i) { return colors[i % colors.length]; }),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        title: {
          display: true,
          text: 'Gastos por categoria (mes actual)',
          font: { size: 14, weight: '600' }
        }
      }
    }
  });
}

function renderForecastChart() {
  var chartContainer = $('forecastChart');
  if (!chartContainer) return;

  var ctx = chartContainer.getContext('2d');
  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonth = now.getMonth();

  var historicalData = [];
  var labels = [];

  for (var i = 5; i >= 0; i--) {
    var date = new Date(currentYear, currentMonth - i, 1);
    var year = date.getFullYear();
    var month = date.getMonth();
    
    var monthName = date.toLocaleString('es-ES', { month: 'short' });
    labels.push(monthName);

    var expenses = getExpensesMonthYear(year, month);
    var total = 0;
    for (var j = 0; j < expenses.length; j++) {
      total += Number(expenses[j].amount) || 0;
    }
    historicalData.push(total);
  }

  var recentMonths = historicalData.slice(-3);
  var sum = 0;
  for (var i = 0; i < recentMonths.length; i++) sum += recentMonths[i];
  var average = recentMonths.length > 0 ? sum / recentMonths.length : 0;

  var forecastDataExtended = historicalData.slice();
  for (var i = 1; i <= 3; i++) {
    var date = new Date(currentYear, currentMonth + i, 1);
    var monthName = date.toLocaleString('es-ES', { month: 'short' });
    labels.push(monthName);
    forecastDataExtended.push(average);
  }

  var historicalDataset = historicalData.slice();
  historicalDataset.push(null, null, null);
  
  var forecastDataset = [null, null, null];
  for (var i = 0; i < 3; i++) forecastDataset.push(average);

  if (forecastChart) {
    forecastChart.destroy();
  }

  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Historico',
          data: historicalDataset,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3
        },
        {
          label: 'Previsao',
          data: forecastDataset,
          borderColor: '#e74c3c',
          borderDash: [10, 5],
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Previsao de gastos',
          font: { size: 14, weight: '600' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'EUR ' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

function renderPaymentsForecastChart() {
  var chartContainer = $('paymentsForecastChart');
  if (!chartContainer) return;

  var ctx = chartContainer.getContext('2d');
  var months = [];
  var pendingPayments = [];
  var issuedPayments = [];

  for (var i = 5; i >= 0; i--) {
    var date = new Date();
    date.setMonth(date.getMonth() - i);
    var year = date.getFullYear();
    var month = date.getMonth();
    
    var monthName = date.toLocaleString('es-ES', { month: 'short' });
    months.push(monthName);

    var invoicesIssued = getUserInvoicesIssued();
    var pendingTotal = 0;
    var issuedTotal = 0;
    
    for (var j = 0; j < invoicesIssued.length; j++) {
      var inv = invoicesIssued[j];
      if (!inv.invoiceDate) continue;
      
      var parts = inv.invoiceDate.split('-');
      if (parts.length >= 2) {
        var invYear = parseInt(parts[0]);
        var invMonth = parseInt(parts[1]) - 1;
        
        if (invYear === year && invMonth === month) {
          var state = (inv.state || '').toLowerCase();
          if (state === 'pendiente' || state === 'vencida') {
            pendingTotal += Number(inv.amount) || 0;
          }
          issuedTotal += Number(inv.amount) || 0;
        }
      }
    }
    pendingPayments.push(pendingTotal);
    issuedPayments.push(issuedTotal);
  }

  if (paymentsForecastChart) {
    paymentsForecastChart.destroy();
  }

  paymentsForecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Pagos Emitidos',
          data: issuedPayments,
          borderColor: '#3a6cd6',
          backgroundColor: 'rgba(58, 108, 214, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Pagos Pendientes',
          data: pendingPayments,
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Evolucion de pagamentos',
          font: { size: 14, weight: '600' }
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

// ========== MODAL ==========
function showNewDocumentModal() {
  var modal = $('modalNewDocument');
  if (modal) modal.classList.add('show');
}

function hideNewDocumentModal() {
  var modal = $('modalNewDocument');
  if (modal) modal.classList.remove('show');
}

function navigateToPage(page) {
  hideNewDocumentModal();
  setTimeout(function() { window.location.href = page; }, 150);
}

// ========== INITIALIZATION ==========
function initDashboard() {
  console.log('Dashboard inicializando...');
  
  markActivePage();
  
  var auth = window.AuthService || window.Auth;
  var user = auth ? auth.getCurrentUser() : null;
  console.log('Usuario atual:', user ? (user.email || user.name) : 'null');
  console.log('Firebase Auth:', window.firebaseAuth ? 'disponivel' : 'nao disponivel');
  console.log('Firebase DB:', window.firebaseDb ? 'disponivel' : 'nao disponivel');
  
  var expenses = getUserExpenses();
  var invoicesIssued = getUserInvoicesIssued();
  var invoicesReceived = getUserInvoicesReceived();
  
  console.log('Expenses no localStorage:', expenses.length, 'itens');
  console.log('Invoices Issued no localStorage:', invoicesIssued.length, 'itens');
  console.log('Invoices Received no localStorage:', invoicesReceived.length, 'itens');
  
  // Debug info removed - keeping the console logs for debugging purposes only
  
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  renderDashboardKPIs();
  renderExpensesChart();
  renderForecastChart();
  renderPaymentsForecastChart();

  var newDocBtn = $('newDocumentBtn');
  if (newDocBtn) {
    newDocBtn.addEventListener('click', showNewDocumentModal);
  }

  var btnNewExpense = $('btnNewExpense');
  if (btnNewExpense) {
    btnNewExpense.addEventListener('click', function() { navigateToPage('../expense/expense.html'); });
  }

  var btnNewInvoiceIssued = $('btnNewInvoiceIssued');
  if (btnNewInvoiceIssued) {
    btnNewInvoiceIssued.addEventListener('click', function() { navigateToPage('../Invoice-issued/invoice-issued.html'); });
  }

  var btnNewInvoiceReceived = $('btnNewInvoiceReceived');
  if (btnNewInvoiceReceived) {
    btnNewInvoiceReceived.addEventListener('click', function() { navigateToPage('../Invoice_recieved/Invoice_recieved.html'); });
  }

  var btnNewBudget = $('btnNewBudget');
  if (btnNewBudget) {
    btnNewBudget.addEventListener('click', function() { navigateToPage('../budgetPage/budget.html'); });
  }

  window.addEventListener('click', function(e) {
    var modal = $('modalNewDocument');
    if (modal && e.target === modal) {
      hideNewDocumentModal();
    }
  });
  
  console.log('Dashboard carregado');
}

// Esperar Auth estar pronto
var authCheckCount = 0;
var maxAuthChecks = 100;

function checkAuthAndInit() {
  authCheckCount++;
  
  var auth = window.AuthService || window.Auth;
  
  // Primeiro verificar Firebase Auth diretamente
  var firebaseUser = null;
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    firebaseUser = window.firebaseAuth.currentUser;
    console.log('Firebase Auth user found:', firebaseUser.email);
  }
  
  // Também verificar sessão no localStorage
  var hasLocalSession = false;
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        hasLocalSession = true;
        console.log('Local session found:', data.user.email);
      }
    }
  } catch (e) {}
  
  // Se temos utilizador do Firebase ou sessão local, inicializar
  if (firebaseUser || hasLocalSession) {
    console.log('Auth ready, initializing dashboard');
    initDashboard();
    return;
  }
  
  // Se não temos AuthService ainda, esperar mais
  if (!auth || typeof auth.isLoggedIn !== 'function') {
    if (authCheckCount < maxAuthChecks) {
      console.log('Waiting for Auth... (attempt ' + authCheckCount + ')');
      setTimeout(checkAuthAndInit, 100);
    } else {
      console.error('Auth not found');
      window.location.href = '../login.html';
    }
    return;
  }
  
  // Tentar com AuthService
  var user = auth.getCurrentUser();
  
  if (user) {
    console.log('AuthService user found:', user.email);
    initDashboard();
    return;
  }
  
  if (authCheckCount < maxAuthChecks) {
    console.log('Waiting for Auth... (attempt ' + authCheckCount + ')');
    setTimeout(checkAuthAndInit, 100);
  } else {
    console.log('Timeout waiting for Auth, redirecting to login...');
    window.location.href = '../login.html';
  }
}

// Iniciar com um pequeno atraso para garantir que todos os scripts estão carregados
// Usar o novo sistema waitForAuth do auth-system.js
setTimeout(function() {
  window.waitForAuth(function() {
    console.log('Auth ready via waitForAuth, initializing dashboard...');
    checkAuthAndInit();
  });
  
  // Também iniciar checkAuthAndInit como fallback após um tempo
  setTimeout(function() {
    checkAuthAndInit();
  }, 3000);
}, 500);
console.log('frontPageDashboard.js carregado');
