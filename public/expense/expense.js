import { getExpenses, addExpense, deleteExpense } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return `€${v.toFixed(2)}`;
}

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

// Chart instance
let expenseChart = null;

function renderSummaryCards() {
  const list = getExpenses();
  
  // Calculate monthly total (current month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let monthlyTotal = 0;
  let categoryTotals = {};
  let lastExpense = null;
  
  list.forEach(exp => {
    // Monthly total
    if (exp.date) {
      const [year, month, day] = exp.date.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyTotal += Number(exp.amount || 0);
      }
    }
    
    // Category totals
    const cat = exp.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
    
    // Last expense by date
    if (!lastExpense || (exp.date && exp.date > lastExpense.date)) {
      lastExpense = exp;
    }
  });
  
  // Update DOM
  const monthlyTotalEl = $("monthlyTotal");
  if (monthlyTotalEl) {
    monthlyTotalEl.textContent = moneyEUR(monthlyTotal);
  }
  
  const topCategoryEl = $("topCategory");
  if (topCategoryEl) {
    if (Object.keys(categoryTotals).length > 0) {
      const topCat = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];
      topCategoryEl.textContent = topCat[0];
    } else {
      topCategoryEl.textContent = "Sin datos";
    }
  }
  
  const lastExpenseEl = $("lastExpense");
  if (lastExpenseEl) {
    if (lastExpense) {
      lastExpenseEl.textContent = `${lastExpense.date || "-"} – ${lastExpense.category || "-"}`;
    } else {
      lastExpenseEl.textContent = "Sin gastos";
    }
  }
}

function renderChart() {
  const chartContainer = document.getElementById('expenseChartCanvas');
  if (!chartContainer) return;

  const list = getExpenses();
  
  // Calculate totals by category
  const categoryTotals = {};
  list.forEach(exp => {
    const cat = exp.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const ctx = chartContainer.getContext('2d');

  // Destroy existing chart
  if (expenseChart) {
    expenseChart.destroy();
  }

  // Create new chart
  expenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
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
              return '€' + value;
            }
          }
        }
      }
    }
  });
}

function renderExpenses() {
  const tbody = $("expenseTBody");
  if (!tbody) return;

  const list = getExpenses();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No hay gastos registrados todavía.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date || "-"}</td>
      <td>${e.category || "-"}</td>
      <td>${moneyEUR(e.amount)}</td>
      <td>${e.description || ""}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-del="${e.id}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm('¿Eliminar este gasto?')) {
        deleteExpense(btn.getAttribute("data-del"));
        renderExpenses();
        renderChart();
        renderSummaryCards();
      }
    });
  });
}

// ========== MODAL FUNCTIONS ==========
function openExpenseModal() {
  const modal = $("modalNewExpense");
  if (modal) {
    modal.classList.add('show');
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('[name="date"]').value = today;
  }
}

function closeExpenseModal() {
  const modal = $("modalNewExpense");
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('formNewExpense').reset();
  }
}

function saveNewExpense() {
  const date = document.querySelector('[name="date"]').value;
  const category = document.querySelector('[name="category"]').value;
  const amount = document.querySelector('[name="amount"]').value;
  const description = document.querySelector('[name="description"]').value;

  if (!date || !category || !amount) {
    alert("Completa: fecha, categoría e importe.");
    return;
  }

  addExpense({ date, category, amount, description, paymentMethod: 'Efectivo' });
  
  closeExpenseModal();
  renderExpenses();
  renderChart();
  renderSummaryCards();
}

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  // Initialize AuthManager first
  AuthManager.init();
  
  // Check if logged in
  if (!AuthManager.isLoggedIn()) {
    window.location.href = '../frontPage/frontPage.html';
    return;
  }
  
  // Mark current page as active
  markActivePage();
  
  // Update user info in sidebar
  const user = AuthManager.getCurrentUser();
  const avatarEl = document.getElementById('userMenuBtn');
  const nameEl = document.querySelector('.user-profile span');
  if (avatarEl && user) {
    avatarEl.textContent = user.companyName ? user.companyName.charAt(0).toUpperCase() : 'U';
  }
  if (nameEl && user) {
    nameEl.textContent = user.companyName || user.email;
  }
  
  // Render UI
  renderExpenses();
  renderChart();
  renderSummaryCards();
  
  // Modal event listeners
  const newExpenseBtn = $("newExpenseBtn");
  if (newExpenseBtn) {
    newExpenseBtn.addEventListener('click', openExpenseModal);
  }
  
  const closeModalBtn = $("closeExpenseModal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeExpenseModal);
  }
  
  const cancelBtn = $("cancelExpenseBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeExpenseModal);
  }
  
  const saveBtn = $("saveExpenseBtn");
  if (saveBtn) {
    saveBtn.addEventListener('click', saveNewExpense);
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = $("modalNewExpense");
    if (modal && e.target === modal) {
      closeExpenseModal();
    }
  });
  
  // Sidebar link handling
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        return;
      }
      e.preventDefault();
      window.location.href = href;
    });
  });
});

// Export functions for onclick handlers
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.saveNewExpense = saveNewExpense;

