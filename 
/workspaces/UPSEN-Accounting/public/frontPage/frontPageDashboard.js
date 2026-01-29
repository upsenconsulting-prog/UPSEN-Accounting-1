
import {
  sumInvoicesReceivedMonth,
  countInvoicesReceivedMonth,
  countInvoicesReceivedPending,
  sumInvoicesIssuedMonth,
  countInvoicesIssuedMonth,
  countInvoicesIssuedPending,
  sumExpensesMonth,
  countExpensesMonth,
  getTopExpenseCategory,
  getExpensesMonth,
  getExpensesByMonth,
  getInvoicesReceived,
  getInvoicesIssued,
  getExpenses,
  getTotals
} from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

// Chart instances
let dashboardChart = null;
let forecastChart = null;
let expenseForecastChart = null;

// ========== MARK ACTIVE PAGE ==========
function markActivePage() {
  const currentPage = window.location.href;
  const links = document.querySelectorAll('.sidebar-link');
  
  links.forEach(link => {
    link.parentElement.classList.remove('active');
    
    if (link.href === currentPage) {
      link.parentElement.classList.add('active');
    }
  });
}

// ========== KPI DASHBOARD ==========
function renderDashboardKPIs() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Received KPIs
  const totalReceived = sumInvoicesReceivedMonth(y, m);
  const countReceived = countInvoicesReceivedMonth(y, m);
  const pendingReceived = countInvoicesReceivedPending();

  // Issued KPIs
  const totalIssued = sumInvoicesIssuedMonth(y, m);
  const countIssued = countInvoicesIssuedMonth(y, m);
  const pendingIssued = countInvoicesIssuedPending();

  // Expenses KPIs
  const totalExpenses = sumExpensesMonth(y, m);
  const countExpenses = countExpensesMonth(y, m);
  const topCategory = getTopExpenseCategory(y, m);

  // Update Received KPIs
  const elReceivedTotal = $("kpi-received-total");
  const elReceivedCount = $("kpi-received-count");
  const elPending = $("kpi-received-pending");

  if (elReceivedTotal) elReceivedTotal.textContent = formatEUR(totalReceived);
  if (elReceivedCount) elReceivedCount.textContent = String(countReceived);
  if (elPending) elPending.textContent = String(pendingReceived);

  // Update Issued KPIs
  const elIssuedTotal = $("kpi-issued-total");
  const elIssuedCount = $("kpi-issued-count");
  const elIssuedPending = $("kpi-issued-pending");

  if (elIssuedTotal) elIssuedTotal.textContent = formatEUR(totalIssued);
  if (elIssuedCount) elIssuedCount.textContent = String(countIssued);
  if (elIssuedPending) elIssuedPending.textContent = String(pendingIssued);

  // Update Expenses KPIs
  const elExpensesTotal = $("kpi-expenses-total");
  const elExpensesCount = $("kpi-expenses-count");
  const elExpensesCategory = $("kpi-expenses-category");

  if (elExpensesTotal) elExpensesTotal.textContent = formatEUR(totalExpenses);
  if (elExpensesCount) elExpensesCount.textContent = String(countExpenses);
  if (elExpensesCategory) elExpensesCategory.textContent = topCategory || "-";
}

// ========== CHART RENDERING ==========
function renderDashboardChart() {
  const chartContainer = $('dashboardChart');
  if (!chartContainer) return;

  const ctx = chartContainer.getContext('2d');
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Get data for current month
  const received = sumInvoicesReceivedMonth(y, m);
  const issued = sumInvoicesIssuedMonth(y, m);
  const expenses = sumExpensesMonth(y, m);

  // Destroy existing chart
  if (dashboardChart) {
    dashboardChart.destroy();
  }

  // Create new chart
  dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Recibidas', 'Emitidas', 'Gastos'],
      datasets: [{
        label: 'Monto (EUR)',
        data: [received, issued, expenses],
        backgroundColor: ['#28a745', '#3a6cd6', '#e74c3c'],
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Comparación del mes actual',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#2c3e50'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          },
          grid: {
            color: '#e9ecef'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderForecastChart() {
  const chartContainer = $('forecastChart');
  if (!chartContainer) return;

  const ctx = chartContainer.getContext('2d');

  // Get last 6 months data
  const months = [];
  const receivedData = [];
  const issuedData = [];
  const expensesData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
    months.push(monthName);

    receivedData.push(sumInvoicesReceivedMonth(year, month));
    issuedData.push(sumInvoicesIssuedMonth(year, month));
    expensesData.push(sumExpensesMonth(year, month));
  }

  // Destroy existing chart
  if (forecastChart) {
    forecastChart.destroy();
  }

  // Create new chart
  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Recibidas',
          data: receivedData,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Emitidas',
          data: issuedData,
          borderColor: '#3a6cd6',
          backgroundColor: 'rgba(58, 108, 214, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Gastos',
          data: expensesData,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Evolución de los últimos 6 meses',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#2c3e50'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          },
          grid: {
            color: '#e9ecef'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderExpenseForecastChart() {
  const chartContainer = $('expenseForecastChart');
  if (!chartContainer) return;

  const ctx = chartContainer.getContext('2d');
  
  // Get forecast period
  const periodSelect = $('forecastPeriod');
  const monthsAhead = periodSelect ? parseInt(periodSelect.value) : 6;

  // Get historical data by category
  const expenses = getExpenses();
  const categoryTotals = {};
  
  expenses.forEach(exp => {
    if (!exp.date || !exp.category) return;
    const [year, month] = exp.date.split('-').map(Number);
    const cat = exp.category || "Sin categoría";
    
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { total: 0, count: 0, monthly: {} };
    }
    
    categoryTotals[cat].total += Number(exp.amount) || 0;
    categoryTotals[cat].count += 1;
    
    const key = `${year}-${month}`;
    if (!categoryTotals[cat].monthly[key]) {
      categoryTotals[cat].monthly[key] = 0;
    }
    categoryTotals[cat].monthly[key] += Number(exp.amount) || 0;
  });

  // Calculate average monthly expense
  const now = new Date();
  const historicalTotal = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0);
  const monthCount = Object.keys(categoryTotals).length > 0 ? 6 : 1; // Assume last 6 months
  const averageMonthly = historicalTotal / Math.max(monthCount, 1);

  // Calculate projection
  const projection = averageMonthly * monthsAhead;

  // Update summary
  const elHistorical = $("forecast-historical");
  const elAverage = $("forecast-average");
  const elProjection = $("forecast-projection");

  if (elHistorical) elHistorical.textContent = formatEUR(historicalTotal);
  if (elAverage) elAverage.textContent = formatEUR(averageMonthly);
  if (elProjection) elProjection.textContent = formatEUR(projection);

  // Get top 5 categories
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  // Prepare data for chart
  const labels = sortedCategories.map(([name]) => name);
  const historicalData = sortedCategories.map(([, data]) => data.total);
  const projectedData = sortedCategories.map(([, data]) => (data.total / monthCount) * monthsAhead);

  // Destroy existing chart
  if (expenseForecastChart) {
    expenseForecastChart.destroy();
  }

  // Create new chart
  expenseForecastChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Histórico',
          data: historicalData,
          backgroundColor: '#e74c3c',
          borderRadius: 4
        },
        {
          label: `Projeção (${monthsAhead} meses)`,
          data: projectedData,
          backgroundColor: 'rgba(231, 76, 60, 0.4)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Gastos por categoría - Histórico vs Projeção',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#2c3e50'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          },
          grid: {
            color: '#e9ecef'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// ========== NEW DOCUMENT MODAL ==========
function showNewDocumentModal() {
  const modal = $("modalNewDocument");
  if (modal) {
    modal.classList.add("show");
  }
}

function hideNewDocumentModal() {
  const modal = $("modalNewDocument");
  if (modal) {
    modal.classList.remove("show");
  }
}

function navigateToPage(page) {
  hideNewDocumentModal();
  setTimeout(() => {
    window.location.href = page;
  }, 150);
}

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  // Mark current page as active
  markActivePage();
  
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Render KPIs and Charts
  renderDashboardKPIs();
  renderDashboardChart();
  renderForecastChart();
  renderExpenseForecastChart();

  // New document button
  const newDocBtn = $("newDocumentBtn");
  if (newDocBtn) {
    newDocBtn.addEventListener("click", showNewDocumentModal);
  }

  // Close modal buttons
  const closeModalBtn = $("closeNewDocumentModal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", hideNewDocumentModal);
  }

  const cancelModalBtn = $("cancelNewDocumentBtn");
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", hideNewDocumentModal);
  }

  // Document type buttons
  const btnNewExpense = $("btnNewExpense");
  if (btnNewExpense) {
    btnNewExpense.addEventListener("click", () => navigateToPage("../expense/expense.html"));
  }

  const btnNewInvoiceIssued = $("btnNewInvoiceIssued");
  if (btnNewInvoiceIssued) {
    btnNewInvoiceIssued.addEventListener("click", () => navigateToPage("../Invoice-issued/invoice-issued.html"));
  }

  const btnNewInvoiceReceived = $("btnNewInvoiceReceived");
  if (btnNewInvoiceReceived) {
    btnNewInvoiceReceived.addEventListener("click", () => navigateToPage("../Invoice_recieved/Invoice_recieved.html"));
  }

  const btnNewBudget = $("btnNewBudget");
  if (btnNewBudget) {
    btnNewBudget.addEventListener("click", () => navigateToPage("../budgetPage/budget.html"));
  }

  // Forecast period selector
  const forecastPeriod = $("forecastPeriod");
  if (forecastPeriod) {
    forecastPeriod.addEventListener("change", renderExpenseForecastChart);
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    const modal = $("modalNewDocument");
    if (modal && e.target === modal) {
      hideNewDocumentModal();
    }
  });
});


