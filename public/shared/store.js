// public/shared/store.js
// Store com Firebase como fonte primária e localStorage como backup
// Requer: firebase-sync.js deve ser carregado antes deste arquivo
// Módulos: Invoices Received, Invoices Issued, Expenses, Budgets

// ===== Utils =====
function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  // crypto.randomUUID() é o ideal, mas nem todos os browsers antigos suportam
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function toTrimmedString(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : (fallback ?? 0);
}

function parseDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatusValue(value, allowedValues, fallback) {
  const text = toTrimmedString(value);
  if (!text) return fallback;
  const lowered = text.toLowerCase();
  const match = (allowedValues || []).find(function(option) {
    return String(option).toLowerCase() === lowered;
  });
  return match || fallback;
}

function stateHistoryEntry(state, previousState) {
  return {
    state: state,
    previousState: previousState ?? null,
    changedAt: new Date().toISOString()
  };
}

function appendStateHistory(currentHistory, nextState, previousState) {
  const history = Array.isArray(currentHistory) ? currentHistory.slice() : [];
  history.push(stateHistoryEntry(nextState, previousState));
  return history;
}

function isWithinDateRange(dateValue, startDate, endDate) {
  const parsed = parseDateValue(dateValue);
  if (!parsed) return false;
  if (startDate && parsed < startDate) return false;
  if (endDate && parsed > endDate) return false;
  return true;
}

function getDateRangeBounds(options) {
  const filters = options || {};
  if (filters.startDate || filters.endDate) {
    return {
      startDate: parseDateValue(filters.startDate),
      endDate: parseDateValue(filters.endDate)
    };
  }

  if (filters.month !== undefined && filters.year !== undefined) {
    const startDate = new Date(filters.year, filters.month, 1);
    const endDate = new Date(filters.year, filters.month + 1, 0, 23, 59, 59, 999);
    return { startDate: startDate, endDate: endDate };
  }

  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  };
}

function getInvoiceValue(invoice) {
  return toNumber(invoice && (invoice.totalAmount ?? invoice.amount), 0);
}

function getExpenseValue(expense) {
  return toNumber(expense && (expense.totalAmount ?? expense.amount), 0);
}

function isPendingState(state) {
  return ['pendiente', 'pending', 'parcial', 'partial'].includes(String(state || '').toLowerCase());
}

function isPaidState(state) {
  return ['pagada', 'paid', 'cobrada'].includes(String(state || '').toLowerCase());
}

function isOverdueState(item) {
  const dueDate = parseDateValue(item && item.dueDate);
  if (!dueDate) return false;
  const state = String(item && (item.state || item.estado) || '').toLowerCase();
  return isPendingState(state) && dueDate < new Date();
}

function calculateLineSubtotal(line) {
  const quantity = toNumber(line && (line.quantity ?? line.qty), 0);
  const price = toNumber(line && (line.price ?? line.unit), 0);
  return quantity * price;
}

function calculateTaxableAmount(lines) {
  return (Array.isArray(lines) ? lines : []).reduce(function(sum, line) {
    return sum + calculateLineSubtotal(line);
  }, 0);
}

function calculateVAT(amount, vatRate) {
  return toNumber(amount, 0) * (toNumber(vatRate, 0) / 100);
}

function calculateInvoiceTotal(lines, vatRate) {
  const taxableAmount = calculateTaxableAmount(lines);
  const vatAmount = calculateVAT(taxableAmount, vatRate);
  return {
    taxableAmount: taxableAmount,
    vatAmount: vatAmount,
    totalAmount: taxableAmount + vatAmount
  };
}

function calculateBudgetTotals(lines, retentionRate) {
  const subtotal = calculateTaxableAmount(lines);
  const retentionAmount = subtotal * (toNumber(retentionRate, 0) / 100);
  return {
    subtotal: subtotal,
    retentionAmount: retentionAmount,
    totalAmount: subtotal - retentionAmount
  };
}

function calculateFinancialSummary(options) {
  const filters = options || {};
  const range = getDateRangeBounds(filters);
  const issued = getInvoicesIssuedSync();
  const received = getInvoicesReceivedSync();
  const expenses = getExpensesSync();
  const budgets = getBudgetsSync();

  const revenueInvoices = issued.filter(function(invoice) {
    return isPaidState(invoice.state) && isWithinDateRange(invoice.invoiceDate, range.startDate, range.endDate);
  });
  const expenseItems = expenses.filter(function(expense) {
    return isWithinDateRange(expense.date, range.startDate, range.endDate);
  });

  const pendingIssued = issued.filter(function(invoice) { return isPendingState(invoice.state); });
  const pendingReceived = received.filter(function(invoice) { return isPendingState(invoice.state); });
  const overdueIssued = pendingIssued.filter(isOverdueState);
  const overdueReceived = pendingReceived.filter(isOverdueState);
  const pendingBudgets = budgets.filter(function(budget) {
    return String(budget.status || '').toLowerCase() === 'pending';
  });

  const revenue = revenueInvoices.reduce(function(sum, invoice) { return sum + getInvoiceValue(invoice); }, 0);
  const expensesTotal = expenseItems.reduce(function(sum, expense) { return sum + getExpenseValue(expense); }, 0);
  const outstandingAmount = pendingIssued.reduce(function(sum, invoice) { return sum + getInvoiceValue(invoice); }, 0);
  const payableAmount = pendingReceived.reduce(function(sum, invoice) { return sum + getInvoiceValue(invoice); }, 0);
  const overdueAmount = overdueIssued.reduce(function(sum, invoice) { return sum + getInvoiceValue(invoice); }, 0) + overdueReceived.reduce(function(sum, invoice) { return sum + getInvoiceValue(invoice); }, 0);

  return {
    rangeStart: range.startDate ? range.startDate.toISOString() : null,
    rangeEnd: range.endDate ? range.endDate.toISOString() : null,
    revenue: revenue,
    expenses: expensesTotal,
    netResult: revenue - expensesTotal,
    outstandingAmount: outstandingAmount,
    payableAmount: payableAmount,
    pendingDocuments: pendingIssued.length + pendingReceived.length + pendingBudgets.length,
    overdueDocuments: overdueIssued.length + overdueReceived.length,
    overdueAmount: overdueAmount,
    accountsReceivable: outstandingAmount,
    accountsPayable: payableAmount,
    paidInvoices: issued.filter(function(invoice) { return isPaidState(invoice.state); }).length,
    generatedAt: new Date().toISOString()
  };
}

window.StatusEngine = {
  normalizeStatusValue: normalizeStatusValue,
  isPendingState: isPendingState,
  isPaidState: isPaidState,
  isOverdueState: isOverdueState
};

window.CalculationEngine = {
  calculateLineSubtotal: calculateLineSubtotal,
  calculateTaxableAmount: calculateTaxableAmount,
  calculateVAT: calculateVAT,
  calculateInvoiceTotal: calculateInvoiceTotal,
  calculateBudgetTotals: calculateBudgetTotals,
  calculateFinancialSummary: calculateFinancialSummary
};

window.DashboardSummary = {
  getFinancialSummary: calculateFinancialSummary
};

// ===== Keys =====
const KEYS = {
  invoicesReceived: "upsen_invoices_received",
  invoicesIssued: "upsen_invoices_issued",
  expenses: "upsen_expenses",
  budgets: "upsen_budgets",
};

// Tentar obter userId para chaves unique por utilizador
function getCurrentUserId() {
  // Primeiro verificar Firebase Auth (prioridade máxima)
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser.uid;
  }
  
  // Verificar AuthService
  try {
    var auth = window.AuthService || window.Auth;
    if (auth && auth.getCurrentUser) {
      var user = auth.getCurrentUser();
      if (user) {
        return user.uid || user.id;
      }
    }
  } catch (e) {}
  
  // Fallback para sessão localStorage
  try {
    var session = localStorage.getItem('upsen_current_user');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.user) {
        return data.user.uid || data.user.id;
      }
    }
  } catch (e) {}
  return null;
}

// Obter chave única para o utilizador atual
function getUserDataKey(baseKey) {
  var userId = getCurrentUserId();
  if (userId) {
    return baseKey + '_' + userId;
  }
  return baseKey;
}

// Ler de localStorage - usa APENAS chave única por utilizador
function read(key) {
  // Primeiro tentar chave do utilizador atual
  var userKey = getUserDataKey(key);
  try {
    var data = localStorage.getItem(userKey);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  } catch (e) {
    console.warn('[Store] Acesso ao localStorage bloqueado ou falhou:', e);
    return [];
  }
  
  // Não fazer fallback para chaves globais - cada utilizador tem dados separados
  return [];
}

// Write to localStorage - usa APENAS chave única por utilizador
function write(key, data) {
  var userKey = getUserDataKey(key);
  try {
    localStorage.setItem(userKey, JSON.stringify(data));
  } catch (e) {
    console.warn('[Store] Escrita no localStorage bloqueada ou falhou:', e);
  }
}

// ===== Firebase Helper =====
function isFirebaseReady() {
  return window.FirebaseSync && window.FirebaseSync.isFirebaseReady();
}

function getFirebaseUserId() {
  if (window.FirebaseSync) {
    return window.FirebaseSync.getUserId();
  }
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser.uid;
  }
  return null;
}

async function ensureDataFromFirebase(collectionName, key) {
  // Se Firebase não está pronto, usar apenas localStorage
  if (!isFirebaseReady()) {
    console.log(`[Store] Firebase não pronto, usando localStorage para ${collectionName}`);
    return read(key);
  }

  // Tentar obter do Firebase primeiro
  try {
    const firebaseData = await window.FirebaseSync.syncCollectionToLocalStorage(collectionName);
    if (firebaseData && firebaseData.length > 0) {
      console.log(`[Store] Dados carregados do Firebase para ${collectionName}: ${firebaseData.length}`);
      return firebaseData;
    }
  } catch (e) {
    console.warn(`[Store] Erro ao carregar do Firebase:`, e);
  }

  // Fallback para localStorage
  return read(key);
}

// ======================================================
// INVOICES RECEIVED
// ======================================================
async function getInvoicesReceived() {
  return ensureDataFromFirebase('invoicesReceived', KEYS.invoicesReceived);
}

function getInvoicesReceivedSync() {
  return read(KEYS.invoicesReceived);
}

async function addInvoiceReceived(invoice) {
  // Obter lista atual
  let list = await getInvoicesReceived();
  if (!list || !Array.isArray(list)) {
    list = [];
  }

  // Campos Veri*Factu
  const verifactuFields = {
    series: invoice.series ?? "R",
    supplierNif: invoice.supplierNif ?? "",
    verifactuHash: invoice.verifactuHash ?? "",
    previousHash: invoice.previousHash ?? "",
    verifactuTimestamp: invoice.verifactuTimestamp ?? "",
    verifactuRegistered: invoice.verifactuRegistered ?? false,
    verifactuStatus: invoice.verifactuStatus ?? "draft"
  };

  const createdAt = new Date().toISOString();
  const state = invoice.state ?? "Pendiente";

  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    supplier: invoice.supplier ?? "",
    supplierNif: invoice.supplierNif ?? "",
    amount: Number(invoice.amount ?? 0),
    ivaRate: Number(invoice.ivaRate ?? 0),
    ivaAmount: Number(invoice.ivaAmount ?? 0),
    totalAmount: Number(invoice.totalAmount ?? 0),
    state: state,
    description: invoice.description ?? "",
    paymentMethod: invoice.paymentMethod ?? null,  // efectivo|tarjeta|transferencia|recibo|cheque|paypal  
    paymentDate: invoice.paymentDate ?? null,     // YYYY-MM-DD
    createdAt: createdAt,
    updatedAt: createdAt,
    stateHistory: [stateHistoryEntry(state, null)],
    ...verifactuFields
  };
  
  list.push(item);
  
  // Salvar no localStorage
  write(KEYS.invoicesReceived, list);
  
  // Salvar no Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.saveToFirebaseAndLocalStorage('invoicesReceived', item);
    } catch (e) {
      console.warn('[Store] Erro ao salvar invoice received no Firebase:', e);
    }
  }
  
  return item;
}

async function deleteInvoiceReceived(id) {
  let list = await getInvoicesReceived();
  list = list.filter((x) => x.id !== id);
  write(KEYS.invoicesReceived, list);
  
  // Remover do Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.deleteFromFirebaseAndLocalStorage('invoicesReceived', id);
    } catch (e) {
      console.warn('[Store] Erro ao remover invoice received do Firebase:', e);
    }
  }
}

// ======================================================
// INVOICES ISSUED
// ======================================================
async function getInvoicesIssued() {
  return ensureDataFromFirebase('invoicesIssued', KEYS.invoicesIssued);
}

function getInvoicesIssuedSync() {
  return read(KEYS.invoicesIssued);
}

async function addInvoiceIssued(invoice) {
  let list = await getInvoicesIssued();
  if (!list || !Array.isArray(list)) {
    list = [];
  }

  // Campos Veri*Factu
  const verifactuFields = {
    series: invoice.series ?? "A",
    verifactuHash: invoice.verifactuHash ?? "",
    previousHash: invoice.previousHash ?? "",
    verifactuTimestamp: invoice.verifactuTimestamp ?? "",
    verifactuRegistered: invoice.verifactuRegistered ?? false,
    verifactuStatus: invoice.verifactuStatus ?? "draft" // draft, registered, error
  };

  const createdAt = new Date().toISOString();
  const state = invoice.state ?? "Pendiente";

  const item = {
    id: uid(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    customer: invoice.customer ?? "",
    customerNif: invoice.customerNif ?? "",
    invoiceDate: invoice.invoiceDate ?? "",
    dueDate: invoice.dueDate ?? "",
    amount: Number(invoice.amount ?? 0),
    ivaRate: Number(invoice.ivaRate ?? 0),
    ivaAmount: Number(invoice.ivaAmount ?? 0),
    totalAmount: Number(invoice.totalAmount ?? 0),
    state: state,
    paymentMethod: invoice.paymentMethod ?? null,  // efectivo|tarjeta|transferencia|recibo|cheque|paypal
    paymentDate: invoice.paymentDate ?? null,     // YYYY-MM-DD
    createdAt: createdAt,
    updatedAt: createdAt,
    stateHistory: [stateHistoryEntry(state, null)],
    ...verifactuFields
  };
  
  list.push(item);
  write(KEYS.invoicesIssued, list);
  
  // Salvar no Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.saveToFirebaseAndLocalStorage('invoicesIssued', item);
    } catch (e) {
      console.warn('[Store] Erro ao salvar invoice issued no Firebase:', e);
    }
  }
  
  return item;
}

async function deleteInvoiceIssued(id) {
  let list = await getInvoicesIssued();
  list = list.filter((x) => x.id !== id);
  write(KEYS.invoicesIssued, list);
  
  // Remover do Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.deleteFromFirebaseAndLocalStorage('invoicesIssued', id);
    } catch (e) {
      console.warn('[Store] Erro ao remover invoice issued do Firebase:', e);
    }
  }
}

// Função para atualizar fatura emitida (usada pelo Veri*Factu)
async function updateInvoiceIssued(id, updates) {
  let list = getInvoicesIssuedSync();
  const index = list.findIndex((x) => x.id === id);
  if (index !== -1) {
    const previous = list[index];
    const merged = { ...previous, ...updates, updatedAt: new Date().toISOString() };
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'state') && updates.state !== previous.state) {
      merged.stateHistory = appendStateHistory(previous.stateHistory, updates.state, previous.state);
    }
    list[index] = merged;
    write(KEYS.invoicesIssued, list);
    
    // Atualizar no Firebase se disponível
    if (isFirebaseReady()) {
      try {
        await window.FirebaseSync.updateInFirebaseAndLocalStorage('invoicesIssued', id, updates);
      } catch (e) {
        console.warn('[Store] Erro ao atualizar invoice issued no Firebase:', e);
      }
    }
    return list[index];
  }
  return null;
}

// Função para atualizar fatura recebida (usada pelo Veri*Factu)
async function updateInvoiceReceived(id, updates) {
  let list = getInvoicesReceivedSync();
  const index = list.findIndex((x) => x.id === id);
  if (index !== -1) {
    const previous = list[index];
    const merged = { ...previous, ...updates, updatedAt: new Date().toISOString() };
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'state') && updates.state !== previous.state) {
      merged.stateHistory = appendStateHistory(previous.stateHistory, updates.state, previous.state);
    }
    list[index] = merged;
    write(KEYS.invoicesReceived, list);
    
    // Atualizar no Firebase se disponível
    if (isFirebaseReady()) {
      try {
        await window.FirebaseSync.updateInFirebaseAndLocalStorage('invoicesReceived', id, updates);
      } catch (e) {
        console.warn('[Store] Erro ao atualizar invoice received no Firebase:', e);
      }
    }
    return list[index];
  }
  return null;
}

// ======================================================
// EXPENSES
// ======================================================
async function getExpenses() {
  return ensureDataFromFirebase('expenses', KEYS.expenses);
}

function getExpensesSync() {
  return read(KEYS.expenses);
}

async function addExpense(expense) {
  let list = await getExpenses();
  if (!list || !Array.isArray(list)) {
    list = [];
  }

  const item = {
    id: uid(),
    date: expense.date ?? "",
    category: expense.category ?? "",
    description: expense.description ?? "",
    amount: Number(expense.amount ?? 0),
    // Guardar campos adicionais do expense
    ivaRate: Number(expense.ivaRate ?? 0),
    ivaAmount: Number(expense.ivaAmount ?? 0),
    totalAmount: Number(expense.totalAmount ?? 0),
    notes: expense.notes ?? "",
    paymentMethod: expense.paymentMethod ?? "",
    supplierNif: expense.supplierNif ?? "",
    supplierName: expense.supplierName ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Adicionar à lista apenas uma vez
  list.push(item);
  
  // Salvar APENAS no localStorage aqui - NÃO duplicar
  write(KEYS.expenses, list);
  console.log('[Store] Despesa adicionada ao localStorage:', item.id);
  
  // Salvar no Firebase se disponível (apenas para backup, não para localStorage)
  if (isFirebaseReady()) {
    try {
      // Passar true para indicar que o localStorage já foi atualizado pelo store.js
      await window.FirebaseSync.saveToFirebaseAndLocalStorage('expenses', item, true);
    } catch (e) {
      console.warn('[Store] Erro ao salvar expense no Firebase:', e);
    }
  }
  
  return item;
}

async function deleteExpense(id) {
  let list = await getExpenses();
  list = list.filter((x) => x.id !== id);
  write(KEYS.expenses, list);
  
  // Remover do Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.deleteFromFirebaseAndLocalStorage('expenses', id);
    } catch (e) {
      console.warn('[Store] Erro ao remover expense do Firebase:', e);
    }
  }
}

// ======================================================
// BUDGETS - Para presupuestos/budgets
// ======================================================
async function getBudgets() {
  return ensureDataFromFirebase('budgets', KEYS.budgets);
}

function getBudgetsSync() {
  return read(KEYS.budgets);
}

async function addBudget(budget) {
  let list = await getBudgets();
  if (!list || !Array.isArray(list)) {
    list = [];
  }

  const createdAt = new Date().toISOString();
  const status = budget.status ?? "pending";

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
    status: status,
    createdAt: createdAt,
    updatedAt: createdAt,
    stateHistory: [stateHistoryEntry(status, null)],
  };
  
  list.push(item);
  write(KEYS.budgets, list);
  
  // Salvar no Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.saveToFirebaseAndLocalStorage('budgets', item);
    } catch (e) {
      console.warn('[Store] Erro ao salvar budget no Firebase:', e);
    }
  }
  
  return item;
}

async function updateBudget(id, updates) {
  let list = await getBudgets();
  const index = list.findIndex((x) => x.id === id);
  if (index !== -1) {
    const previous = list[index];
    const merged = { ...previous, ...updates, updatedAt: new Date().toISOString() };
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'status') && updates.status !== previous.status) {
      merged.stateHistory = appendStateHistory(previous.stateHistory, updates.status, previous.status);
    }
    list[index] = merged;
    write(KEYS.budgets, list);
    
    // Atualizar no Firebase se disponível
    if (isFirebaseReady()) {
      try {
        await window.FirebaseSync.updateInFirebaseAndLocalStorage('budgets', id, updates);
      } catch (e) {
        console.warn('[Store] Erro ao atualizar budget no Firebase:', e);
      }
    }
  }
}

async function deleteBudget(id) {
  let list = await getBudgets();
  list = list.filter((x) => x.id !== id);
  write(KEYS.budgets, list);
  
  // Remover do Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.deleteFromFirebaseAndLocalStorage('budgets', id);
    } catch (e) {
      console.warn('[Store] Erro ao remover budget do Firebase:', e);
    }
  }
}

// ======================================================
// DASHBOARD HELPERS (totais simples) - Versão Síncrona
// ======================================================
function getTotals() {
  const receivedTotal = getInvoicesReceivedSync().reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const issuedTotal = getInvoicesIssuedSync().reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const expensesTotal = getExpensesSync().reduce((s, x) => s + (Number(x.amount) || 0), 0);

  return {
    receivedTotal,
    issuedTotal,
    expensesTotal,
    profit: issuedTotal - expensesTotal,
  };
}

function getFinancialSummary(options) {
  return calculateFinancialSummary(options);
}

// Versão Assíncrona (para uso com await)
async function getTotalsAsync() {
  const receivedTotal = (await getInvoicesReceived()).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const issuedTotal = (await getInvoicesIssued()).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const expensesTotal = (await getExpenses()).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  return {
    receivedTotal,
    issuedTotal,
    expensesTotal,
    profit: issuedTotal - expensesTotal,
  };
}

// ======================================================
// DASHBOARD KPI FUNCTIONS - Versão Síncrona
// ======================================================
function sumInvoicesReceivedMonth(year, month) {
  const invoices = getInvoicesReceivedSync();
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
  const invoices = getInvoicesReceivedSync();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesReceivedPending() {
  const invoices = getInvoicesReceivedSync();
  return invoices.filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumInvoicesIssuedMonth(year, month) {
  const invoices = getInvoicesIssuedSync();
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
  const invoices = getInvoicesIssuedSync();
  return invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const [y, m] = inv.invoiceDate.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function countInvoicesIssuedPending() {
  const invoices = getInvoicesIssuedSync();
  return invoices.filter(inv => (inv.state || "").toLowerCase() === "pendiente").length;
}

function sumExpensesMonth(year, month) {
  const expenses = getExpensesSync();
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
  const expenses = getExpensesSync();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  }).length;
}

function getTopExpenseCategory(year, month) {
  const expenses = getExpensesSync();
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
  const expenses = getExpensesSync();
  return expenses.filter(exp => {
    if (!exp.date) return false;
    const [y, m, d] = exp.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });
}

function getExpensesByCategory(year, month) {
  const expenses = getExpensesSync();
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
window.getInvoicesReceivedSync = getInvoicesReceivedSync;

window.getInvoicesIssued = getInvoicesIssued;
window.addInvoiceIssued = addInvoiceIssued;
window.deleteInvoiceIssued = deleteInvoiceIssued;
window.getInvoicesIssuedSync = getInvoicesIssuedSync;
window.updateInvoiceIssued = updateInvoiceIssued;
window.updateInvoiceReceived = updateInvoiceReceived;

window.getExpenses = getExpenses;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.getExpensesSync = getExpensesSync;

window.getBudgets = getBudgets;
window.addBudget = addBudget;
window.updateBudget = updateBudget;
window.deleteBudget = deleteBudget;
window.getBudgetsSync = getBudgetsSync;

window.getTotals = getTotals;
window.getTotalsAsync = getTotalsAsync;
window.getFinancialSummary = getFinancialSummary;

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

// Funções auxiliares
window.isFirebaseReady = isFirebaseReady;
window.getFirebaseUserId = getFirebaseUserId;
window.getUserId = getCurrentUserId;

// ========== REALTIME SYNC LISTENERS ==========
// Escuta eventos do Firebase Sync e recarrega os dados automaticamente
function setupRealtimeListeners() {
  var collections = ['expenses', 'invoicesIssued', 'invoicesReceived', 'budgets'];
  
  collections.forEach(function(collection) {
    var eventName = 'dataSync-' + collection;
    
    window.addEventListener(eventName, function(e) {
      console.log('[Store] Evento de sync recebido para ' + collection + ':', e.detail);
      
      // Atualizar o localStorage com os novos dados
      var userId = getCurrentUserId();
      var baseKey = 'upsen_' + collection.toLowerCase();
      var userKey = userId ? baseKey + '_' + userId : baseKey;
      try {
        localStorage.setItem(userKey, JSON.stringify(e.detail.data));
      } catch(err) {
        console.warn('Erro ao salvar sync no localStorage:', err);
      }
      
      // Disparar evento específico para a página renderizar novamente
      window.dispatchEvent(new CustomEvent('dataUpdated-' + collection));
    });
  });
  
  console.log('[Store] Realtime listeners configurados');
}

// Iniciar listeners quando o store carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupRealtimeListeners);
} else {
  setupRealtimeListeners();
}

console.log('✅ Store carregado com Realtime Sync listeners!');
