// frontPageDashboard.js - Com dados isolados por usuário

function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

// Chart instances
let dashboardChart = null;
let expensesChart = null;
let forecastChart = null;
let paymentsForecastChart = null;

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

// ========== DADOS DO USUÁRIO LOGADO ==========
function getUserExpenses() {
  return AuthSystem.getUserData('upsen_expenses') || [];
}

function getUserInvoicesIssued() {
  return AuthSystem.getUserData('upsen_invoices_issued') || [];
}

function getUserInvoicesReceived() {
  return AuthSystem.getUserData('upsen_invoices_received') || [];
}

// ========== KPI HELPERS ==========
function sumInvoicesReceivedMonthYear(year, month) {
  return getUserInvoicesReceived().reduce((sum, inv) => {
    if (!inv.invoiceDate) return sum;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(inv.amount) || 0);
    }
    return sum;
  }, 0);
}

function countInvoicesReceivedMonthYear(year, month) {
  return getUserInvoicesReceived().filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesReceivedPending() {
  return getUserInvoicesReceived().filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumInvoicesIssuedMonthYear(year, month) {
  return getUserInvoicesIssued().reduce((sum, inv) => {
    if (!inv.invoiceDate) return sum;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(inv.amount) || 0);
    }
    return sum;
  }, 0);
}

function countInvoicesIssuedMonthYear(year, month) {
  return getUserInvoicesIssued().filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesIssuedPending() {
  return getUserInvoicesIssued().filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumExpensesMonthYear(year, month) {
  return getUserExpenses().reduce((sum, exp) => {
    if (!exp.date) return sum;
    const [y, m, d] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(exp.amount) || 0);
    }
    return sum;
  }, 0);
}

function countExpensesMonthYear(year, month) {
  return getUserExpenses().filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function getTopExpenseCategory(year, month) {
  const categoryTotals = {};
  
  getUserExpenses().forEach(exp => {
    if (!exp.date) return;
    const [y, m, d] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const cat = exp.category || "Sin categoría";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
    }
  });
  
  if (Object.keys(categoryTotals).length === 0) return "";
  
  const top = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0];
  
  return top ? top[0] : "";
}

function getExpensesMonthYear(year, month) {
  return getUserExpenses().filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });
}

function getExpensesByCategory(year, month) {
  const categoryTotals = {};
  
  getUserExpenses().forEach(exp => {
    if (!exp.date) return;
    const [y, m] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const cat = exp.category || "Sin categoría";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
    }
  });
  
  return categoryTotals;
}

// ========== KPI DASHBOARD ==========
function renderDashboardKPIs() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Received KPIs
  const totalReceived = sumInvoicesReceivedMonthYear(y, m);
  const countReceived = countInvoicesReceivedMonthYear(y, m);
  const pendingReceived = countInvoicesReceivedPending();

  // Issued KPIs
  const totalIssued = sumInvoicesIssuedMonthYear(y, m);
  const countIssued = countInvoicesIssuedMonthYear(y, m);
  const pendingIssued = countInvoicesIssuedPending();

  // Expenses KPIs
  const totalExpenses = sumExpensesMonthYear(y, m);
  const countExpenses = countExpensesMonthYear(y, m);
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

// ========== COMMENTS TOGGLE ==========
function initCommentsToggle() {
  const toggleBtn = $("toggleComments");
  const commentsContent = $("commentsContent");
  
  if (toggleBtn && commentsContent) {
    toggleBtn.addEventListener("click", function() {
      const isExpanded = commentsContent.classList.contains("show");
      
      if (isExpanded) {
        commentsContent.classList.remove("show");
        toggleBtn.classList.remove("expanded");
        toggleBtn.querySelector(".toggle-icon").textContent = "+";
        toggleBtn.querySelector("span:last-child").textContent = "Mostrar comentarios";
      } else {
        commentsContent.classList.add("show");
        toggleBtn.classList.add("expanded");
        toggleBtn.querySelector(".toggle-icon").textContent = "+";
        toggleBtn.querySelector("span:last-child").textContent = "Ocultar comentarios";
      }
    });
  }
}

// ========== EXPENSES CHART ==========
function renderExpensesChart() {
  const chartContainer = $("expensesChart");
  if (!chartContainer) return;

  const ctx = chartContainer.getContext("2d");
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Get expenses by category for current month
  const categoryData = getExpensesByCategory(y, m);

  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);

  // Colors for categories
  const colors = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
    "#1abc9c", "#e67e22", "#34495e", "#c0392b", "#16a085"
  ];

  // Destroy existing chart
  if (expensesChart) {
    expensesChart.destroy();
  }

  // Create new chart
  expensesChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length > 0 ? labels : ["Sin datos"],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right"
        },
        title: {
          display: true,
          text: "Gastos por categoría (mes actual)",
          font: {
            size: 14,
            weight: "600"
          },
          color: "#2c3e50"
        }
      }
    }
  });
}

// ========== FORECAST CHART (Gastos - Tendência + Previsão) ==========
function renderForecastChart() {
  const chartContainer = $("forecastChart");
  if (!chartContainer) return;

  const ctx = chartContainer.getContext("2d");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Obter últimos 6 meses de dados históricos
  const historicalData = [];
  const labels = [];
  const historicalLabels = [];
  const forecastLabels = [];

  // Histórico: últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const monthName = date.toLocaleDateString("es-ES", { month: "short" });
    labels.push(monthName);
    historicalLabels.push(monthName);

    // Obter gastos do mês
    const expenses = getExpensesMonthYear(year, month);
    const total = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    historicalData.push(total);
  }

  // Calcular previsão (média dos últimos 3 meses)
  const recentMonths = historicalData.slice(-3);
  const average = recentMonths.length > 0 
    ? recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length 
    : 0;

  // Previsão: próximos 3 meses
  const forecastData = new Array(6).fill(null); // null para histórico
  const forecastDataExtended = [...historicalData];
  
  for (let i = 1; i <= 3; i++) {
    const date = new Date(currentYear, currentMonth + i, 1);
    const monthName = date.toLocaleDateString("es-ES", { month: "short" });
    labels.push(monthName);
    forecastLabels.push(monthName);
    forecastDataExtended.push(average);
  }

  // Criar arrays para os datasets
  const historicalDataset = [...historicalData, null, null, null];
  const forecastDataset = [null, null, null, average, average, average];

  // Destruir gráfico existente
  if (forecastChart) {
    forecastChart.destroy();
  }

  // Criar novo gráfico
  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Histórico",
          data: historicalDataset,
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#3498db"
        },
        {
          label: "Previsión (próx. 3 meses)",
          data: forecastDataset,
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          borderDash: [10, 5], // Linha pontilhada
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#e74c3c"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        title: {
          display: true,
          text: "Previsión de gastos (tendencia + próximos 3 meses)",
          font: {
            size: 14,
            weight: "600"
          },
          color: "#2c3e50"
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.raw === null) return null;
              return context.dataset.label + ": €" + context.raw.toLocaleString("es-ES");
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "€" + value.toLocaleString("es-ES");
            }
          },
          grid: {
            color: "#e9ecef"
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

// ========== PAYMENTS FORECAST CHART ==========
function renderPaymentsForecastChart() {
  const chartContainer = $("paymentsForecastChart");
  if (!chartContainer) return;

  const ctx = chartContainer.getContext("2d");

  // Get last 6 months data
  const months = [];
  const pendingPayments = [];
  const issuedPayments = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const monthName = date.toLocaleDateString("es-ES", { month: "short" });
    months.push(monthName);

    // Calculate pending payments (issued invoices not yet paid)
    const invoicesIssued = getUserInvoicesIssued();
    let pendingTotal = 0;
    invoicesIssued.forEach(inv => {
      if (!inv.invoiceDate) return;
      const [invYear, invMonth] = inv.invoiceDate.split("-").map(Number);
      if (invYear === year && invMonth - 1 === month) {
        const state = (inv.state || "").toLowerCase();
        if (state === "pendiente" || state === "vencida") {
          pendingTotal += Number(inv.amount) || 0;
        }
      }
    });
    pendingPayments.push(pendingTotal);

    // Calculate expected payments (all issued invoices)
    let issuedTotal = 0;
    invoicesIssued.forEach(inv => {
      if (!inv.invoiceDate) return;
      const [invYear, invMonth] = inv.invoiceDate.split("-").map(Number);
      if (invYear === year && invMonth - 1 === month) {
        issuedTotal += Number(inv.amount) || 0;
      }
    });
    issuedPayments.push(issuedTotal);
  }

  // Destroy existing chart
  if (paymentsForecastChart) {
    paymentsForecastChart.destroy();
  }

  // Create new chart
  paymentsForecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Pagos Emitidos",
          data: issuedPayments,
          borderColor: "#3a6cd6",
          backgroundColor: "rgba(58, 108, 214, 0.1)",
          fill: true,
          tension: 0.4
        },
        {
          label: "Pagos Pendientes",
          data: pendingPayments,
          borderColor: "#f39c12",
          backgroundColor: "rgba(243, 156, 18, 0.1)",
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
           position: "bottom"
        },
        title: {
          display: true,
          text: "Evolución de pagos (últimos 6 meses)",
          font: {
            size: 14,
            weight: "600"
          },
          color: "#2c3e50"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "€" + value;
            }
          },
          grid: {
            color: "#e9ecef"
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
  renderExpensesChart();
  renderForecastChart();
  renderPaymentsForecastChart();

  // Initialize comments toggle
  initCommentsToggle();

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

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    const modal = $("modalNewDocument");
    if (modal && e.target === modal) {
      hideNewDocumentModal();
    }
  });
});
