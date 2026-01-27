import { getExpenses, addExpense, deleteExpense } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return `€${v.toFixed(2)}`;
}

// Chart instance
let expenseChart = null;

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

  const list = getExpenses();
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
      deleteExpense(btn.getAttribute("data-del"));
      renderExpenses();
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
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

      addExpense({ date, category, amount, notes });

      // fechar modal - usar classe .show
      const el = $("modalNewExpense");
      if (el) {
        el.classList.remove("show");
      }

      form.reset();
      renderExpenses();
      renderChart();
    });
  }

  renderExpenses();
  renderChart();
});
