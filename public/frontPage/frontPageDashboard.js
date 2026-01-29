
import {
  sumInvoicesReceivedMonth,
  countInvoicesReceivedMonth,
  countInvoicesReceivedPending,
  sumInvoicesIssuedMonth,
  countInvoicesIssuedMonth,
  countInvoicesIssuedPending,
  sumExpensesMonth,
  countExpensesMonth,
  getTotals
} from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

// ========== MARK ACTIVE PAGE ==========
function markActivePage() {
  const currentPage = window.location.href;
  const links = document.querySelectorAll('.sidebar-link');
  
  links.forEach(link => {
    // Remove active class from all
    link.parentElement.classList.remove('active');
    
    // Add active class if href matches current page
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

  // Totals
  const totals = getTotals();

  // Update DOM
  const elReceivedTotal = $("kpi-received-total");
  const elReceivedCount = $("kpi-received-count");
  const elPending = $("kpi-received-pending");

  if (elReceivedTotal) elReceivedTotal.textContent = formatEUR(totalReceived);
  if (elReceivedCount) elReceivedCount.textContent = String(countReceived);
  if (elPending) elPending.textContent = String(pendingReceived);

  // Create/update issued KPIs if elements don't exist
  if (!$("kpi-issued-total")) {
    createIssuedKPIs();
  }
  if (!$("kpi-expenses-total")) {
    createExpensesKPIs();
  }

  // Update issued elements
  const elIssuedTotal = $("kpi-issued-total");
  const elIssuedCount = $("kpi-issued-count");
  const elIssuedPending = $("kpi-issued-pending");
  const elExpensesTotal = $("kpi-expenses-total");
  const elExpensesCount = $("kpi-expenses-count");

  if (elIssuedTotal) elIssuedTotal.textContent = formatEUR(totalIssued);
  if (elIssuedCount) elIssuedCount.textContent = String(countIssued);
  if (elIssuedPending) elIssuedPending.textContent = String(pendingIssued);
  if (elExpensesTotal) elExpensesTotal.textContent = formatEUR(totalExpenses);
  if (elExpensesCount) elExpensesCount.textContent = String(countExpenses);
}

function createIssuedKPIs() {
  const tableBody = document.querySelector("#kpi-received-table tbody");
  if (!tableBody) return;

  const row = document.createElement("tr");
  row.id = "kpi-issued-row";
  row.innerHTML = `
    <td>
      <p><strong>Total emitido (mes actual):</strong> <span id="kpi-issued-total">0,00 €</span></p>
      <p><strong>Nº facturas emitidas (mes actual):</strong> <span id="kpi-issued-count">0</span></p>
      <p><strong>Pendientes (emitidas):</strong> <span id="kpi-issued-pending">0</span></p>
    </td>
  `;
  tableBody.appendChild(row);
}

function createExpensesKPIs() {
  const tableBody = document.querySelector("#kpi-received-table tbody");
  if (!tableBody) return;

  // Check if already exists
  if ($("kpi-expenses-row")) return;

  const row = document.createElement("tr");
  row.id = "kpi-expenses-row";
  row.innerHTML = `
    <td>
      <p><strong>Total gastos (mes actual):</strong> <span id="kpi-expenses-total">0,00 €</span></p>
      <p><strong>Nº gastos (mes actual):</strong> <span id="kpi-expenses-count">0</span></p>
    </td>
  `;
  tableBody.appendChild(row);
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

  // Render KPIs
  renderDashboardKPIs();

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

