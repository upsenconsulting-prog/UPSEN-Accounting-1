/**
 * Store - UPSEN Accounting
 * Sistema de gestão de documentos
 * Dados isolados por empresa (userId)
 */

import AuthManager from './auth.js';

// ===== Utils =====
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// ===== Keys =====
const KEYS = {
  invoicesReceived: 'upsen_invoices_received',
  invoicesIssued: 'upsen_invoices_issued',
  expenses: 'upsen_expenses',
  budgets: 'upsen_budgets',
};

// ======================================================
// INVOICES RECEIVED (Faturas Recebidas)
// ======================================================
export function getInvoicesReceived() {
  return AuthManager.getUserData(KEYS.invoicesReceived);
}

export function addInvoiceReceived(invoice) {
  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? '',
    invoiceDate: invoice.invoiceDate ?? '',
    supplier: invoice.supplier ?? '',
    amount: Number(invoice.amount ?? 0),
    state: invoice.state ?? 'Pendiente',
    description: invoice.description ?? '',
    createdAt: new Date().toISOString(),
  };
  
  AuthManager.addDocument(KEYS.invoicesReceived, item);
  return item;
}

export function deleteInvoiceReceived(id) {
  AuthManager.deleteDocument(KEYS.invoicesReceived, id);
}

export function updateInvoiceReceived(id, updates) {
  return AuthManager.updateDocument(KEYS.invoicesReceived, id, updates);
}

// ======================================================
// INVOICES ISSUED (Faturas Emitidas)
// ======================================================
export function getInvoicesIssued() {
  return AuthManager.getUserData(KEYS.invoicesIssued);
}

export function addInvoiceIssued(invoice) {
  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? '',
    customer: invoice.customer ?? '',
    invoiceDate: invoice.invoiceDate ?? '',
    dueDate: invoice.dueDate ?? '',
    amount: Number(invoice.amount ?? 0),
    state: invoice.state ?? 'Pendiente',
    description: invoice.description ?? '',
    createdAt: new Date().toISOString(),
  };
  
  AuthManager.addDocument(KEYS.invoicesIssued, item);
  return item;
}

export function deleteInvoiceIssued(id) {
  AuthManager.deleteDocument(KEYS.invoicesIssued, id);
}

export function updateInvoiceIssued(id, updates) {
  return AuthManager.updateDocument(KEYS.invoicesIssued, id, updates);
}

// ======================================================
// EXPENSES (Gastos)
// ======================================================
export function getExpenses() {
  return AuthManager.getUserData(KEYS.expenses);
}

export function addExpense(expense) {
  const item = {
    id: uid(),
    date: expense.date ?? '',
    category: expense.category ?? '',
    description: expense.description ?? '',
    amount: Number(expense.amount ?? 0),
    paymentMethod: expense.paymentMethod ?? '',
    createdAt: new Date().toISOString(),
  };
  
  AuthManager.addDocument(KEYS.expenses, item);
  return item;
}

export function deleteExpense(id) {
  AuthManager.deleteDocument(KEYS.expenses, id);
}

export function updateExpense(id, updates) {
  return AuthManager.updateDocument(KEYS.expenses, id, updates);
}

// ======================================================
// BUDGETS (Orçamentos)
// ======================================================
export function getBudgets() {
  return AuthManager.getUserData(KEYS.budgets);
}

export function addBudget(budget) {
  const item = {
    id: uid(),
    number: budget.number ?? '',
    date: budget.date ?? '',
    validity: budget.validity ?? '',
    customer: budget.customer ?? '',
    notes: budget.notes ?? '',
    retention: budget.retention ?? '',
    status: budget.status ?? 'pending',
    tags: budget.tags ?? '',
    items: budget.items ?? [],
    total: Number(budget.total ?? 0),
    period: budget.period ?? '',
    createdAt: new Date().toISOString(),
  };
  
  AuthManager.addDocument(KEYS.budgets, item);
  return item;
}

export function deleteBudget(id) {
  AuthManager.deleteDocument(KEYS.budgets, id);
}

export function updateBudget(id, updates) {
  return AuthManager.updateDocument(KEYS.budgets, id, updates);
}

// ======================================================
// DASHBOARD HELPERS (Resumo)
// ======================================================
export function getTotals() {
  const invoicesReceived = getInvoicesReceived();
  const invoicesIssued = getInvoicesIssued();
  const expenses = getExpenses();
  
  const receivedTotal = invoicesReceived.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const issuedTotal = invoicesIssued.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const expensesTotal = expenses.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  
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
export function sumInvoicesReceivedMonth(year, month) {
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

export function countInvoicesReceivedMonth(year, month) {
  const invoices = getInvoicesReceived();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

export function countInvoicesReceivedPending() {
  const invoices = getInvoicesReceived();
  return invoices.filter(inv => (inv.state || '').toLowerCase() === 'pendiente').length;
}

export function sumInvoicesIssuedMonth(year, month) {
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

export function countInvoicesIssuedMonth(year, month) {
  const invoices = getInvoicesIssued();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

export function countInvoicesIssuedPending() {
  const invoices = getInvoicesIssued();
  return invoices.filter(inv => (inv.state || '').toLowerCase() === 'pendiente').length;
}

export function sumExpensesMonth(year, month) {
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

export function countExpensesMonth(year, month) {
  const expenses = getExpenses();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

export function getTopExpenseCategory(year, month) {
  const expenses = getExpenses();
  const categoryTotals = {};
  
  expenses.forEach(exp => {
    if (!exp.date) return;
    const [y, m, d] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const cat = exp.category || 'Sem categoria';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
    }
  });
  
  if (Object.keys(categoryTotals).length === 0) return '';
  
  const top = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0];
  
  return top ? top[0] : '';
}

export function getExpensesMonth(year, month) {
  const expenses = getExpenses();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });
}

export function getExpensesByCategory(year, month) {
  const expenses = getExpenses();
  const categoryTotals = {};
  
  expenses.forEach(exp => {
    if (!exp.date) return;
    const [y, m] = exp.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const cat = exp.category || 'Sem categoria';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
    }
  });
  
  return categoryTotals;
}

// ======================================================
// BUDGET KPI FUNCTIONS
// ======================================================
export function sumBudgetsMonth(year, month) {
  const budgets = getBudgets();
  return budgets.reduce((sum, budget) => {
    if (!budget.date) return sum;
    const [y, m] = budget.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      return sum + (Number(budget.total) || 0);
    }
    return sum;
  }, 0);
}

export function countBudgetsPending() {
  const budgets = getBudgets();
  return budgets.filter(b => (b.status || '').toLowerCase() === 'pending').length;
}

export function countBudgetsApproved() {
  const budgets = getBudgets();
  return budgets.filter(b => (b.status || '').toLowerCase() === 'approved').length;
}

export function getRecentBudgets(limitCount = 5) {
  const budgets = getBudgets();
  return budgets
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limitCount);
}

// ======================================================
// RESET (para testes)
// ======================================================
export function resetAll() {
  if (!AuthManager.isLoggedIn()) return;
  
  const userId = AuthManager.getCurrentUser().id;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(`${k}_${userId}`));
}

// ======================================================
// EXPORTAR DADOS
// ======================================================
export function exportAllData() {
  return AuthManager.exportUserData();
}

