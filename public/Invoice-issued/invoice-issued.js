import { getInvoicesIssued, addInvoiceIssued, deleteInvoiceIssued } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function badge(status) {
  const s = (status || "").toLowerCase();
  if (s === "pagada") return `<span class="status-badge status-paid">Pagada</span>`;
  if (s === "vencida") return `<span class="status-badge status-overdue">Vencida</span>`;
  return `<span class="status-badge status-pending">Pendiente</span>`;
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
let issuedChart = null;

function renderSummaryCards() {
  const list = getInvoicesIssued();
  
  // Calculate totals
  let pendingTotal = 0;
  let overdueTotal = 0;
  let monthlyCount = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  list.forEach(inv => {
    const state = (inv.state || "").toLowerCase();
    const amount = Number(inv.amount || 0);
    
    if (state === "pendiente") pendingTotal += amount;
    if (state === "vencida") overdueTotal += amount;
    
    const dateField = inv.invoiceDate || inv.issueDate;
    if (dateField) {
      const [year, month] = dateField.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyCount++;
      }
    }
  });
  
  const averageAmount = list.length > 0 
    ? list.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / list.length 
    : 0;
  
  const pendingEl = $("pendingTotal");
  if (pendingEl) pendingEl.textContent = moneyEUR(pendingTotal);
  
  const overdueEl = $("overdueTotal");
  if (overdueEl) overdueEl.textContent = moneyEUR(overdueTotal);
  
  const monthlyEl = $("monthlyCount");
  if (monthlyEl) monthlyEl.textContent = `${monthlyCount}`;
  
  const averageEl = $("averageAmount");
  if (averageEl) averageEl.textContent = moneyEUR(averageAmount);
}

function renderChart() {
  const chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  const list = getInvoicesIssued();
  
  const paid = list.filter(inv => (inv.state || "").toLowerCase() === "pagada")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const pending = list.filter(inv => (inv.state || "").toLowerCase() === "pendiente")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const overdue = list.filter(inv => (inv.state || "").toLowerCase() === "vencida")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const ctx = chartContainer.getContext('2d');

  if (issuedChart) {
    issuedChart.destroy();
  }

  issuedChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pagadas', 'Pendientes', 'Vencidas'],
      datasets: [{
        data: [paid, pending, overdue],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderIssued() {
  const tbody = $("invoiceTbody");
  if (!tbody) return;

  const list = getInvoicesIssued();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No hay facturas emitidas registradas todavía.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((inv) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.customer || "-"}</td>
      <td>${inv.invoiceDate || inv.issueDate || "-"}</td>
      <td>${inv.dueDate || "-"}</td>
      <td>${moneyEUR(inv.amount)}</td>
      <td>${badge(inv.state)}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-del="${inv.id}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm('¿Eliminar esta factura?')) {
        deleteInvoiceIssued(btn.getAttribute("data-del"));
        renderIssued();
        renderChart();
        renderSummaryCards();
      }
    });
  });
}

// ========== MODAL FUNCTIONS ==========
function openInvoiceModal() {
  const modal = $("modalNewInvoiceIssued");
  if (modal) {
    modal.classList.add('show');
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('[name="invoiceDate"]').value = today;
    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.querySelector('[name="dueDate"]').value = dueDate.toISOString().split('T')[0];
  }
}

function closeInvoiceModal() {
  const modal = $("modalNewInvoiceIssued");
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('formNewInvoiceIssued').reset();
  }
}

function saveInvoice() {
  const form = $("formNewInvoiceIssued");
  if (!form) return;

  const fd = new FormData(form);
  const invoiceNumber = String(fd.get("invoiceNumber") || "");
  const customer = String(fd.get("customer") || "");
  const invoiceDate = String(fd.get("invoiceDate") || "");
  const dueDate = String(fd.get("dueDate") || "");
  const amount = String(fd.get("amount") || "");
  const state = String(fd.get("state") || "Pendiente");

  if (!invoiceNumber || !customer || !invoiceDate || !dueDate || !amount) {
    alert("Completa todos los campos obligatorios.");
    return;
  }

  addInvoiceIssued({ invoiceNumber, customer, invoiceDate, dueDate, amount, state });
  
  closeInvoiceModal();
  renderIssued();
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
  renderIssued();
  renderChart();
  renderSummaryCards();
  
  // Modal event listeners
  const newBtn = $("newInvoiceBtn");
  if (newBtn) {
    newBtn.addEventListener("click", openInvoiceModal);
  }
  
  const closeBtn = $("closeInvoiceIssuedModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeInvoiceModal);
  }
  
  const cancelBtn = $("cancelInvoiceIssuedBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeInvoiceModal);
  }
  
  const saveBtn = $("saveInvoiceIssuedBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveInvoice);
  }
  
  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    const modal = $("modalNewInvoiceIssued");
    if (modal && e.target === modal) {
      closeInvoiceModal();
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
window.openInvoiceModal = openInvoiceModal;
window.closeInvoiceModal = closeInvoiceModal;
window.saveInvoice = saveInvoice;

