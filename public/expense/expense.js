// Funções do store.js já estão disponíveis globalmente via window

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
  const list = window.getExpenses();
  
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

  const list = window.getExpenses();
  
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

  const list = window.getExpenses();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
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
      <td>
        <span>${e.notes || ""}</span>
        <button class="btn btn-sm btn-outline-danger" data-del="${e.id}" style="float:right;">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.deleteExpense(btn.getAttribute("data-del"));
      renderExpenses();
      renderChart();
      renderSummaryCards();
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
  // Mark current page as active
  markActivePage();
  
  // Guardar gasto
  const saveBtn = $("saveExpenseBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const form = $("formNewExpense");
      if (!form) return;

      const fd = new FormData(form);
      const date = String(fd.get("date") || "");
      const category = String(fd.get("category") || "");
      const amount = String(fd.get("amount") || "");
      const notes = String(fd.get("notes") || "");

      if (!date || !category || !amount) {
        alert("Completa: fecha, categoría e importe.");
        return;
      }

      window.addExpense({ date, category, amount, notes });

      // fechar modal - usar classe .show
      const el = $("modalNewExpense");
      if (el) {
        el.classList.remove("show");
      }

      form.reset();
      renderExpenses();
      renderChart();
      renderSummaryCards();
    });
  }

  renderExpenses();
  renderChart();
  renderSummaryCards();
});

