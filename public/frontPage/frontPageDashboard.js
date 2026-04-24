// frontPageDashboard.js - Dashboard com suporte a Firebase + localStorage

function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  return "EUR " + Number(n || 0).toFixed(2);
}

function getCurrentUserData() {
  var auth = window.AuthService || window.AuthSystem || window.Auth;
  if (auth && typeof auth.getCurrentUser === 'function') {
    var authUser = auth.getCurrentUser();
    if (authUser) return authUser;
  }

  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser;
  }

  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) return data.user;
    }
  } catch (e) {}

  return null;
}

function getBillingSummaryConfig() {
  var defaults = {
    showPlan: true,
    showMonthUsage: true,
    showPending: true,
    showUpgradeWarning: true
  };

  var user = getCurrentUserData();
  var userSettings = user && user.settings ? user.settings : {};
  var savedConfig = userSettings.billingSummaryCard || {};

  return Object.assign({}, defaults, savedConfig);
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

  function getUserBudgets() {
    if (window.getBudgetsSync) {
      var data = window.getBudgetsSync();
      if (data && data.length > 0) {
        return data;
      }
    }

    if (window._dashboardBudgets && window._dashboardBudgets.length > 0) {
      return window._dashboardBudgets;
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

function sumInvoicesIssuedPendingAmount() {
  var total = 0;
  var invoices = getUserInvoicesIssued();

  for (var i = 0; i < invoices.length; i++) {
    var state = (invoices[i].state || '').toLowerCase();
    if (state === 'pendiente') {
      total += Number(invoices[i].amount) || 0;
    }
  }

  return total;
}

function countBudgetsPending() {
  var count = 0;
  var budgets = getUserBudgets();

  for (var i = 0; i < budgets.length; i++) {
    var status = (budgets[i].status || '').toLowerCase();
    if (status === 'pending') count++;
  }

  return count;
}

function sumBudgetsPendingAmount() {
  var total = 0;
  var budgets = getUserBudgets();

  for (var i = 0; i < budgets.length; i++) {
    var status = (budgets[i].status || '').toLowerCase();
    if (status === 'pending') {
      total += Number(budgets[i].total) || 0;
    }
  }

  return total;
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

function getMonthReference(date, offsetMonths) {
  var reference = new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
  return {
    year: reference.getFullYear(),
    month: reference.getMonth()
  };
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || !isFinite(value)) return 'N/D';
  var prefix = value > 0 ? '+' : '';
  return prefix + value.toFixed(1) + '%';
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

function getFinancialSummaryData() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  if (window.DashboardSummary && typeof window.DashboardSummary.getFinancialSummary === 'function') {
    var rangeStart = new Date(y, m, 1);
    var rangeEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
    var summary = window.DashboardSummary.getFinancialSummary({ startDate: rangeStart, endDate: rangeEnd });
    var netResult = Number(summary.netResult || 0);
    return {
      currentNetResult: netResult,
      netResultClass: netResult >= 0 ? 'is-positive' : 'is-negative',
      trendClass: 'is-neutral',
      netStatusLabel: netResult >= 0 ? 'Positivo' : 'Negativo',
      trendLabel: 'Resumen centralizado',
      netChangePercent: null,
      revenue: Number(summary.revenue || 0),
      expenses: Number(summary.expenses || 0),
      outstandingAmount: Number(summary.outstandingAmount || 0),
      overdueAmount: Number(summary.overdueAmount || 0),
      pendingDocuments: Number(summary.pendingDocuments || 0),
      overdueDocuments: Number(summary.overdueDocuments || 0)
    };
  }

  var totalIssuedThisMonth = sumInvoicesIssuedMonthYear(y, m);
  var totalExpensesThisMonth = sumExpensesMonthYear(y, m);
  var currentNetResult = totalIssuedThisMonth - totalExpensesThisMonth;

  var previousRef = getMonthReference(now, -1);
  var previousNetResult = sumInvoicesIssuedMonthYear(previousRef.year, previousRef.month) - sumExpensesMonthYear(previousRef.year, previousRef.month);
  var netChangePercent = null;
  if (previousNetResult === 0) {
    if (currentNetResult !== 0) {
      netChangePercent = currentNetResult > 0 ? 100 : -100;
    }
  } else {
    netChangePercent = ((currentNetResult - previousNetResult) / Math.abs(previousNetResult)) * 100;
  }

  var netResultClass = currentNetResult >= 0 ? 'is-positive' : 'is-negative';
  var trendClass = netChangePercent === null ? 'is-neutral' : (netChangePercent >= 0 ? 'is-positive' : 'is-negative');
  var netStatusLabel = currentNetResult >= 0 ? 'Positivo' : 'Negativo';
  var trendLabel = netChangePercent === null ? 'Sin base en el mes anterior' : formatSignedPercent(netChangePercent) + ' vs mes anterior';

  return {
    currentNetResult: currentNetResult,
    netResultClass: netResultClass,
    trendClass: trendClass,
    netStatusLabel: netStatusLabel,
    trendLabel: trendLabel,
    netChangePercent: netChangePercent
  };
}

function renderPendingSummaryCard() {
  var primaryEl = $('pendingSummaryPrimary');
  var detailsEl = $('pendingSummaryDetails');
  var footerEl = $('pendingSummaryFooter');

  if (!primaryEl || !detailsEl || !footerEl) return;

  var issuedPendingCount = countInvoicesIssuedPending();
  var issuedPendingAmount = sumInvoicesIssuedPendingAmount();
  var budgetsPendingCount = countBudgetsPending();

  var financial = getFinancialSummaryData();

  primaryEl.textContent = 'Documentos y presupuestos pendientes del mes.';

  detailsEl.innerHTML = [
    '<div class="summary-row">',
      '<div class="summary-row-left">',
        '<span class="summary-icon summary-icon--blue"><i class="fas fa-clock"></i></span>',
        '<div class="summary-copy">',
          '<div class="summary-label">Facturas por cobrar</div>',
          '<div class="summary-note">Cobro pendiente</div>',
        '</div>',
      '</div>',
      '<div class="summary-value">',
        '<div><span class="summary-count">' + (financial.pendingDocuments !== undefined ? financial.pendingDocuments : issuedPendingCount) + '</span></div>',
        '<div class="summary-money">' + formatEUR(financial.outstandingAmount !== undefined ? financial.outstandingAmount : issuedPendingAmount) + '</div>',
      '</div>',
    '</div>',
    '<div class="summary-row">',
      '<div class="summary-row-left">',
        '<span class="summary-icon summary-icon--pink"><i class="fas fa-file-alt"></i></span>',
        '<div class="summary-copy">',
          '<div class="summary-label">Presupuestos sin respuesta</div>',
          '<div class="summary-note">Pendiente de respuesta del cliente</div>',
        '</div>',
      '</div>',
      '<div class="summary-value">',
        '<div class="summary-count">' + budgetsPendingCount + '</div>',
      '</div>',
    '</div>'
  ].join('');

  footerEl.innerHTML = 'Ver pendientes <i class="fas fa-arrow-right"></i>';
}

function renderFinancialSummaryCard() {
  var primaryEl = $('financeSummaryPrimary');
  var detailsEl = $('financeSummaryDetails');
  var footerEl = $('financeSummaryFooter');

  if (!primaryEl || !detailsEl || !footerEl) return;

  var financial = getFinancialSummaryData();

  primaryEl.textContent = 'Resultado y evolución actual.';

  detailsEl.innerHTML = [
    '<div class="summary-row">',
      '<div class="summary-row-left">',
        '<span class="summary-icon summary-icon--green"><i class="fas fa-arrow-trend-up"></i></span>',
        '<div class="summary-copy">',
          '<div class="summary-label">Resultado neto</div>',
          '<div class="summary-note">Ingresos - gastos</div>',
        '</div>',
      '</div>',
      '<div class="summary-value">',
        '<div class="summary-trend ' + financial.netResultClass + '">' + formatEUR(financial.currentNetResult) + '</div>',
      '</div>',
    '</div>',
    '<div class="summary-row">',
      '<div class="summary-row-left">',
        '<span class="summary-icon summary-icon--orange"><i class="fas fa-triangle-exclamation"></i></span>',
        '<div class="summary-copy">',
          '<div class="summary-label">Documentos vencidos</div>',
          '<div class="summary-note">Cobros y pagos atrasados</div>',
        '</div>',
      '</div>',
      '<div class="summary-value">',
        '<div class="summary-trend is-negative">' + (financial.overdueDocuments !== undefined ? financial.overdueDocuments : 0) + '</div>',
        '<div class="summary-money is-negative">' + formatEUR(financial.overdueAmount !== undefined ? financial.overdueAmount : 0) + '</div>',
      '</div>',
    '</div>',
    '<div class="summary-row">',
      '<div class="summary-row-left">',
        '<span class="summary-icon summary-icon--violet"><i class="fas fa-arrow-up-right-dots"></i></span>',
        '<div class="summary-copy">',
          '<div class="summary-label">Comparativa vs mes anterior</div>',
          '<div class="summary-note">Evolución mensual</div>',
        '</div>',
      '</div>',
      '<div class="summary-value">',
        '<div class="summary-trend ' + financial.trendClass + '">' + (financial.netChangePercent === null ? 'N/D' : formatSignedPercent(financial.netChangePercent)) + '</div>',
      '</div>',
    '</div>'
  ].join('');

  footerEl.innerHTML = 'Ver informe completo <i class="fas fa-arrow-right"></i>';
}

// ========== CHARTS ==========
function renderExpensesChart() {
  var chartContainer = $('expensesDonutChart');
  if (!chartContainer) return;

  var ctx = chartContainer.getContext('2d');
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  var categoryData = getExpensesByCategory(y, m);

  var labels = Object.keys(categoryData);
  var data = Object.values(categoryData);

  var legendContainerLeft = $('expenses-legend-left');
  var legendContainerRight = $('expenses-legend');
  var palette = [
    '#3E74B5', '#4E84BF', '#5D92C7', '#6CA0CF',
    '#2F8C88', '#3D9A95', '#4AA8A2', '#58B5AE',
    '#699F4D', '#77AA5A', '#85B567', '#93C074',
    '#C48E3A', '#CF9B47', '#D9A855', '#E2B462',
    '#C25151', '#CC5E5E', '#D66B6B', '#DF7878',
    '#6C58B3', '#7A66BD', '#8873C5', '#9581CD',
    '#5763B7', '#6671BF', '#7580C7', '#848ECE',
    '#BC5F95', '#C86EA1', '#D37DAC', '#DD8DB8'
  ];

  var chartLabels = labels.length > 0 ? labels : ['Sin datos'];
  var chartData = data.length > 0 ? data : [1];
  var chartColors = chartLabels.map(function(_, i) { return palette[i % palette.length]; });

  if (expensesChart) {
    expensesChart.destroy();
  }

  expensesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      layout: {
        padding: 12
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      animation: {
        duration: 300
      }
    }
  });

  renderCustomLegend(expensesChart, legendContainerLeft, legendContainerRight);
}

function renderCustomLegend(chart, leftContainer, rightContainer) {
  if (!chart || !rightContainer) return;

  var labels = chart.data.labels || [];
  var colors = (chart.data.datasets && chart.data.datasets[0] && chart.data.datasets[0].backgroundColor) || [];
  var maxItemsPerSide = 15;
  var firstSideCount = Math.min(labels.length, maxItemsPerSide);

  var useBothSides = !!leftContainer && labels.length > maxItemsPerSide;

  if (leftContainer) {
    leftContainer.innerHTML = '';
    leftContainer.style.display = useBothSides ? 'flex' : 'none';
  }

  rightContainer.innerHTML = '';
  rightContainer.style.display = 'flex';

  function createLegendItem(label, index, targetContainer) {
    if (!targetContainer) return;

    var item = document.createElement('div');
    item.className = 'chart-legend-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', 'Mostrar u ocultar ' + label);
    item.title = 'Clic para ocultar o mostrar esta categoria';

    var color = document.createElement('span');
    color.className = 'chart-legend-color';
    color.style.backgroundColor = colors[index] || '#1D4ED8';

    var text = document.createElement('span');
    text.className = 'chart-legend-label';
    text.textContent = label;

    item.appendChild(color);
    item.appendChild(text);
    targetContainer.appendChild(item);

    function syncLegendVisibilityState() {
      var isVisible = chart.getDataVisibility ? chart.getDataVisibility(index) : true;
      item.classList.toggle('is-hidden', !isVisible);
    }

    function toggleCategory() {
      if (!chart.toggleDataVisibility) return;
      chart.toggleDataVisibility(index);
      chart.update();
      syncLegendVisibilityState();
    }

    item.addEventListener('click', toggleCategory);
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCategory();
      }
    });

    syncLegendVisibilityState();
  }

  if (useBothSides) {
    labels.forEach(function(label, index) {
      var target = index < firstSideCount ? leftContainer : rightContainer;
      createLegendItem(label, index, target);
    });
    return;
  }

  labels.forEach(function(label, index) {
    createLegendItem(label, index, rightContainer);
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
  var modalEl = $('modalNewDocument');
  if (!modalEl) return;
  // Prefer Bootstrap modal if available
  if (window.bootstrap && bootstrap.Modal && typeof bootstrap.Modal.getOrCreateInstance === 'function') {
    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
    return;
  }

  // Fallback: simple show by toggling classes and adding backdrop
  modalEl.classList.add('show');
  modalEl.style.display = 'block';
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.removeAttribute('aria-hidden');
  // Add backdrop
  if (!document.querySelector('.custom-modal-backdrop')) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show custom-modal-backdrop';
    document.body.appendChild(backdrop);
  }
}

function hideNewDocumentModal() {
  var modalEl = $('modalNewDocument');
  if (!modalEl) return;
  if (window.bootstrap && bootstrap.Modal && typeof bootstrap.Modal.getInstance === 'function') {
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    return;
  }

  // Fallback hide
  modalEl.classList.remove('show');
  modalEl.style.display = 'none';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.removeAttribute('aria-modal');
  var existing = document.querySelectorAll('.custom-modal-backdrop');
  existing.forEach(function(b) { b.parentElement && b.parentElement.removeChild(b); });
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
      var session = localStorage.getItem('upsen_current_user');
      if (session) {
        var data = JSON.parse(session);
        if (data && data.user) {
          userId = data.user.uid || data.user.id || 'unknown';
        }
      }
    } catch (e) {}
  }
  
  console.log('UserID para dados:', userId);
  
  // Trigger Firebase sync if user is logged in and Firebase is ready
  if (userId && userId !== 'unknown' && window.FirebaseSync && window.FirebaseSync.syncAllToLocalStorage) {
    console.log('Iniciando sincronização Firebase...');
    // MODIFICADO: Agora passa os resultados do sync para loadDashboardData
    window.FirebaseSync.syncAllToLocalStorage().then(function(syncResults) {
      console.log('Sincronização concluída!', syncResults);
      // Passar os resultados da sincronização (dados do Firebase) para loadDashboardData
      loadDashboardData(userId, syncResults);
      renderDashboardContent();
    }).catch(function(err) {
      console.warn('Erro na sincronização:', err);
      loadDashboardData(userId, null); // Fallback para localStorage
      renderDashboardContent();
    });
  } else {
    // No Firebase sync, load directly from localStorage
    loadDashboardData(userId, null);
    renderDashboardContent();
  }
}

// Load data from localStorage after sync
// MODIFICADO: Agora usa os dados retornados pelo syncAllToLocalStorage diretamente
// em vez de chamar as funções sync novamente (que liam do localStorage)
function loadDashboardData(userId, syncResults) {
  // Se temos resultados da sincronização (dados do Firebase), usar esses
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
    // Fallback: se não há resultados do sync, usar store.js (localStorage)
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
  
  console.log('Dados carregados - Expenses:', window._dashboardExpenses.length, 'Invoices Issued:', window._dashboardInvoicesIssued.length, 'Invoices Received:', window._dashboardInvoicesReceived.length);
}

// Render dashboard with loaded data
function renderDashboardContent() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth();

  renderDashboardKPIs();
  renderPendingSummaryCard();
  renderFinancialSummaryCard();
  renderExpensesChart();
  renderForecastChart();
  renderPaymentsForecastChart();

  console.log('Dashboard carregado');
}

// Mover listeners para fora para que funcionem independente da carga de dados
function initDashboardUI() {
  var newExpenseBtn = $('newExpenseBtn');
  if (newExpenseBtn) {
    newExpenseBtn.onclick = function() { window.location.href = '../expense/expense.html'; };
  }

  var newInvoiceIssuedBtn = $('newInvoiceIssuedBtn');
  if (newInvoiceIssuedBtn) {
    newInvoiceIssuedBtn.onclick = function() { window.location.href = '../Invoice-issued/invoice-issued.html'; };
  }

  var newInvoiceReceivedBtn = $('newInvoiceReceivedBtn');
  if (newInvoiceReceivedBtn) {
    newInvoiceReceivedBtn.onclick = function() { window.location.href = '../Invoice_recieved/Invoice_recieved.html'; };
  }

  var newBudgetBtn = $('newBudgetBtn');
  if (newBudgetBtn) {
    newBudgetBtn.onclick = function() { showNewDocumentModal(); };
  }
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
document.addEventListener('DOMContentLoaded', function() {
  // Inicializa a UI imediatamente para que os botões do modal funcionem
  initDashboardUI();
});

setTimeout(function() {
  // Primeiro verificar se store.js está disponível
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
