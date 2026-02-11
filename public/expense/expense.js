// expense.js - Com Firebase Firestore

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

// ========== DADOS DO USUÁRIO LOGADO (FIRESTORE) ==========
async function getUserExpenses() {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    
    const result = await FirestoreService.getAll('expenses');
    // FirestoreService.getAll retorna { success: true, data: [...] } ou array (localStorage)
    if (result && result.success === true && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
}

async function saveUserExpense(expense) {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) {
      console.error('No user logged in');
      return false;
    }
    
    // Verificar se FirestoreService tem create
    if (!window.FirestoreService || typeof window.FirestoreService.create !== 'function') {
      console.error('FirestoreService.create not available!', window.FirestoreService);
      return false;
    }
    
    const newExpense = {
      date: expense.date || '',
      category: expense.category || '',
      amount: Number(expense.amount || 0),
      notes: expense.notes || '',
      paymentMethod: expense.paymentMethod || '',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    // Usar add ou create ( FirestoreService.add )
    await window.FirestoreService.create('expenses', newExpense);
    return true;
  } catch (error) {
    console.error('Error saving expense:', error);
    return false;
  }
}

async function deleteUserExpense(id) {
  try {
    await FirestoreService.delete('expenses', id);
    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
}

// ========== RENDER FUNCTIONS ==========
async function renderSummaryCards() {
  const list = await getUserExpenses();
  
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

async function renderChart() {
  const chartContainer = document.getElementById('expenseChartCanvas');
  if (!chartContainer) return;

  const list = await getUserExpenses();
  
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

async function renderExpenses() {
  const tbody = $("expenseTBody");
  if (!tbody) return;

  const list = await getUserExpenses();
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
    btn.addEventListener("click", async () => {
      if (confirm('¿Eliminar gasto?')) {
        await deleteUserExpense(btn.getAttribute("data-del"));
        await renderExpenses();
        await renderChart();
        await renderSummaryCards();
      }
    });
  });
}


document.addEventListener("DOMContentLoaded", async () => {
  // Mark current page as active
  markActivePage();
  
  // Load data
  await renderExpenses();
  await renderChart();
  await renderSummaryCards();
  
  // O modal é gerido pelo expense.html, não aqui
  // expense.js apenas guarda os dados
  
  // Guardar gasto - chamado pelo botão no HTML
  window.saveExpenseData = async function() {
    const form = $("formNewExpense");
    if (!form) return false;

    const fd = new FormData(form);
    const date = String(fd.get("date") || "");
    const category = String(fd.get("category") || "");
    const amount = String(fd.get("amount") || "");
    const notes = String(fd.get("notes") || "");

    if (!date || !category || !amount) {
      alert("Completa: fecha, categoría e importe.");
      return false;
    }

    const saved = await saveUserExpense({ date, category, amount, notes });
    
    if (saved) {
      form.reset();
      await renderExpenses();
      await renderChart();
      await renderSummaryCards();
      return true;
    }
    return false;
  };
});
