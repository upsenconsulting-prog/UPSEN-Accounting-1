// public/shared/store.js
// Store MVP (localStorage) - sem duplicações
// Módulos: Invoices Received, Invoices Issued, Expenses, Budgets
//所有函数都暴露在window对象上，以便在传统<script>标签中使用

// ===== Utils =====
function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function read(key) {
  return safeParse(localStorage.getItem(key), []);
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  // crypto.randomUUID() é o ideal, mas nem todos os browsers antigos suportam
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// ===== Keys =====
const KEYS = {
  invoicesReceived: "upsen_invoices_received",
  invoicesIssued: "upsen_invoices_issued",
  expenses: "upsen_expenses",
  budgets: "upsen_budgets",
};

// ======================================================
// INVOICES RECEIVED
// ======================================================
function getInvoicesReceived() {
  return read(KEYS.invoicesReceived);
}

function addInvoiceReceived(invoice) {
  const list = getInvoicesReceived();
  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    supplier: invoice.supplier ?? "",
    amount: Number(invoice.amount ?? 0),
    state: invoice.state ?? "Pendiente",
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.invoicesReceived, list);
  return item;
}

function deleteInvoiceReceived(id) {
  const list = getInvoicesReceived().filter((x) => x.id !== id);
  write(KEYS.invoicesReceived, list);
}

// ======================================================
// INVOICES ISSUED
// ======================================================
function getInvoicesIssued() {
  return read(KEYS.invoicesIssued);
}

function addInvoiceIssued(invoice) {
  const list = getInvoicesIssued();
  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    customer: invoice.customer ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    dueDate: invoice.dueDate ?? "",
    amount: Number(invoice.amount ?? 0),
    state: invoice.state ?? "Pendiente",
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.invoicesIssued, list);
  return item;
}

function deleteInvoiceIssued(id) {
  const list = getInvoicesIssued().filter((x) => x.id !== id);
  write(KEYS.invoicesIssued, list);
}

// ======================================================
// EXPENSES
// ======================================================
function getExpenses() {
  return read(KEYS.expenses);
}

function addExpense(expense) {
  const list = getExpenses();
  const item = {
    id: uid(),
    date: expense.date ?? "",
    category: expense.category ?? "",
    description: expense.description ?? "",
    amount: Number(expense.amount ?? 0),
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.expenses, list);
  return item;
}

function deleteExpense(id) {
  const list = getExpenses().filter((x) => x.id !== id);
  write(KEYS.expenses, list);
}

// ======================================================
// BUDGETS - Para presupuestos/budgets
// ======================================================
function getBudgets() {
  return read(KEYS.budgets);
}

function addBudget(budget) {
  const list = getBudgets();
  const item = {
    id: uid(),
    number: budget.number ?? "",
    series: budget.series ?? "Presupuestos",
    date: budget.date ?? "",
    validity: budget.validity ?? "",
    customer: budget.customer ?? "",
    notes: budget.notes ?? "",
    retention: budget.retention ?? "",
    status: budget.status ?? "pending",
    tags: budget.tags ?? "",
    items: budget.items ?? [],
    total: Number(budget.total ?? 0),
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.budgets, list);
  return item;
}

function updateBudget(id, updates) {
  const list = getBudgets();
  const index = list.findIndex((x) => x.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    write(KEYS.budgets, list);
  }
}

function deleteBudget(id) {
  const list = getBudgets().filter((x) => x.id !== id);
  write(KEYS.budgets, list);
}

// ======================================================
// DASHBOARD HELPERS (totais simples)
// ======================================================
function getTotals() {
  const receivedTotal = getInvoicesReceived().reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const issuedTotal = getInvoicesIssued().reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const expensesTotal = getExpenses().reduce((s, x) => s + (Number(x.amount) || 0), 0);

  return {
    receivedTotal,
    issuedTotal,
    expensesTotal,
    profit: issuedTotal - expensesTotal,
  };
}

// ======================================================
// DASHBOARD KPI FUNCTIONS
// ======================================================
function sumInvoicesReceivedMonth(year, month) {
  const invoices = getInvoicesReceived();
  return invoices.reduce((sum, inv) => {
    if (!inv.invoiceDate) return sum;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(inv.amount) || 0);
    }
    return sum;
  }, 0);
}

function countInvoicesReceivedMonth(year, month) {
  const invoices = getInvoicesReceived();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesReceivedPending() {
  const invoices = getInvoicesReceived();
  return invoices.filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumInvoicesIssuedMonth(year, month) {
  const invoices = getInvoicesIssued();
  return invoices.reduce((sum, inv) => {
    if (!inv.invoiceDate) return sum;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(inv.amount) || 0);
    }
    return sum;
  }, 0);
}

function countInvoicesIssuedMonth(year, month) {
  const invoices = getInvoicesIssued();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesIssuedPending() {
  const invoices = getInvoicesIssued();
  return invoices.filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumExpensesMonth(year, month) {
  const expenses = getExpenses();
  return expenses.reduce((sum, exp) => {
    if (!exp.date) return sum;
    const [y, m, d] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(exp.amount) || 0);
    }
    return sum;
  }, 0);
}

function countExpensesMonth(year, month) {
  const expenses = getExpenses();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function getTopExpenseCategory(year, month) {
  const expenses = getExpenses();
  const categoryTotals = {};
  
  expenses.forEach(exp => {
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

function getExpensesMonth(year, month) {
  const expenses = getExpenses();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });
}

function getExpensesByCategory(year, month) {
  const expenses = getExpenses();
  const categoryTotals = {};
  
  expenses.forEach(exp => {
    if (!exp.date) return;
    const [y, m] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const cat = exp.category || "Sin categoría";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
    }
  });
  
  return categoryTotals;
}

// ======================================================
// RESET (para testes)
// ======================================================
function resetAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ======================================================
// EXPOR TODAS AS FUNÇÕES PARA window (para uso em scripts tradicionais)
// ======================================================
window.getInvoicesReceived = getInvoicesReceived;
window.addInvoiceReceived = addInvoiceReceived;
window.deleteInvoiceReceived = deleteInvoiceReceived;
window.getInvoicesIssued = getInvoicesIssued;
window.addInvoiceIssued = addInvoiceIssued;
window.deleteInvoiceIssued = deleteInvoiceIssued;
window.getExpenses = getExpenses;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.getBudgets = getBudgets;
window.addBudget = addBudget;
window.updateBudget = updateBudget;
window.deleteBudget = deleteBudget;
window.getTotals = getTotals;
window.sumInvoicesReceivedMonth = sumInvoicesReceivedMonth;
window.countInvoicesReceivedMonth = countInvoicesReceivedMonth;
window.countInvoicesReceivedPending = countInvoicesReceivedPending;
window.sumInvoicesIssuedMonth = sumInvoicesIssuedMonth;
window.countInvoicesIssuedMonth = countInvoicesIssuedMonth;
window.countInvoicesIssuedPending = countInvoicesIssuedPending;
window.sumExpensesMonth = sumExpensesMonth;
window.countExpensesMonth = countExpensesMonth;
window.getTopExpenseCategory = getTopExpenseCategory;
window.getExpensesMonth = getExpensesMonth;
window.getExpensesByCategory = getExpensesByCategory;
window.resetAll = resetAll;
