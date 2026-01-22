// public/shared/store.js
// Store MVP (localStorage) - sem duplicações
// Módulos: Invoices Received, Invoices Issued, Expenses, Budgets (opcional)

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
export function getInvoicesReceived() {
  return read(KEYS.invoicesReceived);
}

export function addInvoiceReceived(invoice) {
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

export function deleteInvoiceReceived(id) {
  const list = getInvoicesReceived().filter((x) => x.id !== id);
  write(KEYS.invoicesReceived, list);
}

// ======================================================
// INVOICES ISSUED
// ======================================================
export function getInvoicesIssued() {
  return read(KEYS.invoicesIssued);
}

export function addInvoiceIssued(invoice) {
  const list = getInvoicesIssued();
  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    customer: invoice.customer ?? "",
    issueDate: invoice.issueDate ?? "",
    dueDate: invoice.dueDate ?? "",
    amount: Number(invoice.amount ?? 0),
    state: invoice.state ?? "Pendiente",
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.invoicesIssued, list);
  return item;
}

export function deleteInvoiceIssued(id) {
  const list = getInvoicesIssued().filter((x) => x.id !== id);
  write(KEYS.invoicesIssued, list);
}

// ======================================================
// EXPENSES
// ======================================================
export function getExpenses() {
  return read(KEYS.expenses);
}

export function addExpense(expense) {
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

export function deleteExpense(id) {
  const list = getExpenses().filter((x) => x.id !== id);
  write(KEYS.expenses, list);
}

// ======================================================
// BUDGETS (opcional - se quiseres ligar depois)
// ======================================================
export function getBudgets() {
  return read(KEYS.budgets);
}

export function addBudget(budget) {
  const list = getBudgets();
  const item = {
    id: uid(),
    period: budget.period ?? "", // ex: "2025-01" ou "2025-Q1"
    name: budget.name ?? "",
    planned: Number(budget.planned ?? 0),
    actual: Number(budget.actual ?? 0),
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  write(KEYS.budgets, list);
  return item;
}

export function deleteBudget(id) {
  const list = getBudgets().filter((x) => x.id !== id);
  write(KEYS.budgets, list);
}

// ======================================================
// DASHBOARD HELPERS (totais simples)
// ======================================================
export function getTotals() {
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
// RESET (para testes)
// ======================================================
export function resetAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
