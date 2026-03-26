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

// ========== OBTENER USER ID ==========
function getUserId() {
  // First check Firebase Auth directly (this always works)
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser.uid;
  }
  
  // Also check AuthService
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

// ========== DATOS LOCALES - Agora usa store.js ==========
function getUserExpenses() {
  // Primeiro tentar store.js (versão síncrona)
  if (window.getExpensesSync) {
    var data = window.getExpensesSync();
    if (data && data.length > 0) {
      return data;
    }
  }
  
  // Fallback: tentar dados globais do dashboard
  if (window._dashboardExpenses && window._dashboardExpenses.length > 0) {
    return window._dashboardExpenses;
  }
  
  return [];
}

function getUserInvoicesIssued() {
  // Primeiro tentar store.js (versão síncrona)
  if (window.getInvoicesIssuedSync) {
    var data = window.getInvoicesIssuedSync();
    if (data && data.length > 0) {
      return data;
    }
  }
  
  // Fallback: tentar dados globais do dashboard
  if (window._dashboardInvoicesIssued && window._dashboardInvoicesIssued.length > 0) {
    return window._dashboardInvoicesIssued;
  }
  
  return [];
}

function getUserInvoicesReceived() {
  // Primeiro tentar store.js (versão síncrona)
  if (window.getInvoicesReceivedSync) {
    var data = window.getInvoicesReceivedSync();
    if (data && data.length > 0) {
      return data;
    }
  }
  
  // Fallback: tentar dados globais do dashboard
  if (window._dashboardInvoicesReceived && window._dashboardInvoicesReceived.length > 0) {
    return window._dashboardInvoicesReceived;
  }
  
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
  for (var j = 0; j < keys.length; j++) {
    if (categoryTotals[keys[j]] > maxVal) {
      maxVal = categoryTotals[keys[j]];
      topCat = keys[j];
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

// ========== COMBINED METRICS ==========
function computeDashboardStats() {
  var issued = getUserInvoicesIssued();
  var received = getUserInvoicesReceived();
  var expenses = getUserExpenses();

  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonth = now.getMonth();

  var stats = {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,

    ivaRepercutido: 0,
    ivaSoportado: 0,
    ivaToPay: 0,

    ytdIncome: 0,
    ytdExpenses: 0,
    ytdProfit: 0,

    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0
  };

  // Issued invoices (income)
  for (var i = 0; i < issued.length; i++) {
    var inv = issued[i];
    var amount = Number(inv.amount || 0);
    var iva = Number(inv.ivaAmount || 0);

    stats.totalIncome += amount;
    stats.ivaRepercutido += iva;

    if (inv.invoiceDate) {
      var parts = inv.invoiceDate.split('-').map(Number);
      var y = parts[0];
      var m = parts[1];

      if (y === currentYear) {
        stats.ytdIncome += amount;
      }
      if (y === currentYear && m - 1 === currentMonth) {
        stats.monthlyIncome += amount;
      }
    }
  }

  // Received invoices (IVA soportado only)
  for (var j = 0; j < received.length; j++) {
    var rinv = received[j];
    stats.ivaSoportado += Number(rinv.ivaAmount || 0);
  }

  // Expenses (costs + IVA soportado)
  for (var k = 0; k < expenses.length; k++) {
    var exp = expenses[k];
    var total = Number(exp.totalAmount || exp.amount || 0);
    var eiva = Number(exp.ivaAmount || 0);

    stats.totalExpenses += total;
    stats.ivaSoportado += eiva;

    if (exp.date) {
      var eparts = exp.date.split('-').map(Number);
      var ey = eparts[0];
      var em = eparts[1];

      if (ey === currentYear) {
        stats.ytdExpenses += total;
      }
      if (ey === currentYear && em - 1 === currentMonth) {
        stats.monthlyExpenses += total;
      }
    }
  }

  // Combined metrics
  stats.netProfit = stats.totalIncome - stats.totalExpenses;
  stats.ytdProfit = stats.ytdIncome - stats.ytdExpenses;
  stats.monthlyProfit = stats.monthlyIncome - stats.monthlyExpenses;

  stats.ivaToPay = stats.ivaRepercutido - stats.ivaSoportado;

  return stats;
}

function renderCombinedKPIs() {
  var stats = computeDashboardStats();

  if ($('kpi-total-income')) $('kpi-total-income').textContent = formatEUR(stats.totalIncome);
  if ($('kpi-total-expenses')) $('kpi-total-expenses').textContent = formatEUR(stats.totalExpenses);
  if ($('kpi-net-profit')) $('kpi-net-profit').textContent = formatEUR(stats.netProfit);

  if ($('kpi-iva-repercutido')) $('kpi-iva-repercutido').textContent = formatEUR(stats.ivaRepercutido);
  if ($('kpi-iva-soportado')) $('kpi-iva-soportado').textContent = formatEUR(stats.ivaSoportado);
  if ($('kpi-iva-topay')) $('kpi-iva-topay').textContent = formatEUR(stats.ivaToPay);

  if ($('kpi-ytd-income')) $('kpi-ytd-income').textContent = formatEUR(stats.ytdIncome);
  if ($('kpi-ytd-expenses')) $('kpi-ytd-expenses').textContent = formatEUR(stats.ytdExpenses);
  if ($('kpi-ytd-profit')) $('kpi-ytd-profit').textContent = formatEUR(stats.ytdProfit);
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
  for (var k = 0; k < recentMonths.length; k++) sum += recentMonths[k];
  var average = recentMonths.length > 0 ? sum / recentMonths.length : 0;

  var historicalDataset = historicalData.slice();
  historicalDataset.push(null, null, null);
  
  var forecastDataset = [null, null, null];
  for (var l = 0; l < 3; l++) forecastDataset.push(average);

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

// NEW: Cashflow chart (Ingresos vs Gastos vs Beneficio)
function renderCashflowChart() {
  var canvas = $('cashflowChart');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var issued = getUserInvoicesIssued();
  var expenses = getUserExpenses();

  var now = new Date();
  var labels = [];
  var incomeData = [];
  var expenseData = [];
  var profitData = [];

  for (var i = 11; i >= 0; i--) {
    var date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var y = date.getFullYear();
    var m = date.getMonth();

    labels.push(date.toLocaleString('es-ES', { month: 'short' }));

    var income = 0;
    var cost = 0;

    for (var j = 0; j < issued.length; j++) {
      var inv = issued[j];
      if (!inv.invoiceDate) continue;
      var partsInv = inv.invoiceDate.split('-').map(Number);
      var iy = partsInv[0];
      var im = partsInv[1];
      if (iy === y && im - 1 === m) income += Number(inv.amount || 0);
    }

    for (var k = 0; k < expenses.length; k++) {
      var exp = expenses[k];
      if (!exp.date) continue;
      var partsExp = exp.date.split('-').map(Number);
      var ey = partsExp[0];
      var em = partsExp[1];
      if (ey === y && em - 1 === m) cost += Number(exp.totalAmount || exp.amount || 0);
    }

    incomeData.push(income);
    expenseData.push(cost);
    profitData.push(income - cost);
  }

  if (dashboardChart) dashboardChart.destroy();

  dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Ingresos', data: incomeData, backgroundColor: '#2ecc71' },
        { label: 'Gastos', data: expenseData, backgroundColor: '#e74c3c' },
        { label: 'Beneficio', data: profitData, type: 'line', borderColor: '#3498db', borderWidth: 3, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
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
  
  // Also check Firebase Auth directly
  if (!user && window.firebaseAuth && window.firebaseAuth.currentUser) {
    user = window.firebaseAuth.currentUser;
  }
  
  // Check localStorage as last resort
  if (!user) {
    try {
      var session = localStorage.getItem('upsen_current_user');
      if (session) {
        var data = JSON.parse(session);
        if (data && data.user) {
          user = data.user;
          console.log('Usuario obtido do localStorage:', user.email);
        }
      }
    } catch (e) {}
  }
  
  console.log('Usuario atual:', user ? (user.email || user.name) : 'null');
  console.log('Firebase Auth:', window.firebaseAuth ? 'disponivel' : 'nao disponivel');
  console.log('Firebase DB:', window.firebaseDb ? 'disponivel' : 'nao disponivel');
  
  // Get user ID for localStorage - use Firebase UID or localStorage user
  var userId = 'unknown';
  if (user && user.uid) {
    userId = user.uid;
  } else if (user && user.id) {
    userId = user.id;
  } else {
    // Try to get from localStorage directly
    try {
      var session2 = localStorage.getItem('upsen_current_user');
      if (session2) {
        var data2 = JSON.parse(session2);
        if (data2 && data2.user) {
          userId = data2.user.uid || data2.user.id || 'unknown';
        }
      }
    } catch (e2) {}
  }
  
  console.log('UserID para dados:', userId);
  
  // Trigger Firebase sync if user is logged in and Firebase is ready
  if (userId && userId !== 'unknown' && window.FirebaseSync && window.FirebaseSync.syncAllToLocalStorage) {
    console.log('Iniciando sincronização Firebase...');
    window.FirebaseSync.syncAllToLocalStorage().then(function(syncResults) {
      console.log('Sincronização concluída!', syncResults);
      loadDashboardData(userId, syncResults);
      renderDashboardContent();
    }).catch(function(err) {
      console.warn('Erro na sincronização:', err);
      loadDashboardData(userId, null);
      renderDashboardContent();
    });
  } else {
    // No Firebase sync, load directly from localStorage
    loadDashboardData(userId, null);
    renderDashboardContent();
  }
}

// Load data from localStorage after sync
function loadDashboardData(userId, syncResults) {
  if (syncResults) {
    if (syncResults.expenses) {
      window._dashboardExpenses = syncResults.expenses;
      console.log('Expenses carregados do Firebase: ', window._dashboardExpenses.length);
    } else {
      window._dashboardExpenses = [];
    }
    
    if (syncResults.invoicesIssued) {
      window._dashboardInvoicesIssued = syncResults.invoicesIssued;
      console.log('Invoices Issued carregados do Firebase: ', window._dashboardInvoicesIssued.length);
    } else {
      window._dashboardInvoicesIssued = [];
    }
    
    if (syncResults.invoicesReceived) {
      window._dashboardInvoicesReceived = syncResults.invoicesReceived;
      console.log('Invoices Received carregados do Firebase: ', window._dashboardInvoicesReceived.length);
    } else {
      window._dashboardInvoicesReceived = [];
    }
  } else {
    if (window.getExpensesSync) {
      window._dashboardExpenses = window.getExpensesSync() || [];
      console.log('Expenses carregados do store.js (fallback):', window._dashboardExpenses.length);
    } else {
      var expensesData = localStorage.getItem('upsen_expenses_' + userId);
      window._dashboardExpenses = expensesData ? JSON.parse(expensesData) : [];
    }
    
    if (window.getInvoicesIssuedSync) {
      window._dashboardInvoicesIssued = window.getInvoicesIssuedSync() || [];
      console.log('Invoices Issued carregados do store.js (fallback):', window._dashboardInvoicesIssued.length);
    } else {
      var invoicesIssuedData = localStorage.getItem('upsen_invoices_issued_' + userId);
      window._dashboardInvoicesIssued = invoicesIssuedData ? JSON.parse(invoicesIssuedData) : [];
    }
    
    if (window.getInvoicesReceivedSync) {
      window._dashboardInvoicesReceived = window.getInvoicesReceivedSync() || [];
      console.log('Invoices Received carregados do store.js (fallback):', window._dashboardInvoicesReceived.length);
    } else {
      var invoicesReceivedData = localStorage.getItem('upsen_invoices_received_' + userId);
      window._dashboardInvoicesReceived = invoicesReceivedData ? JSON.parse(invoicesReceivedData) : [];
    }
  }
  
  console.log(
    'Dados carregados - Expenses:',
    window._dashboardExpenses.length,
    'Invoices Issued:',
    window._dashboardInvoicesIssued.length,
    'Invoices Received:',
    window._dashboardInvoicesReceived.length
  );
}

// Render dashboard with loaded data
function renderDashboardContent() {
  renderDashboardKPIs();      // existing monthly KPIs
  renderCombinedKPIs();       // NEW combined KPIs
  renderExpensesChart();
  renderForecastChart();
  renderPaymentsForecastChart();
  renderCashflowChart();      // NEW cashflow chart

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
  
  if (firebaseUser || hasLocalSession) {
    console.log('Auth ready, initializing dashboard');
    initDashboard();
    return;
  }
  
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
setTimeout(function() {
  function checkAndInit() {
    if (window.getExpensesSync && window.getInvoicesIssuedSync && window.getInvoicesReceivedSync) {
      console.log('Store.js disponível, inicializando dashboard...');
      checkAuthAndInit();
    } else {
      console.log('Aguardando store.js...');
      setTimeout(checkAndInit, 500);
    }
  }
  
  checkAndInit();
}, 1000);

console.log('frontPageDashboard.js carregado');
