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
  var data = localStorage.getItem(userKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  
  // Não fazer fallback para chaves globais - cada utilizador tem dados separados
  return [];
}

// Write to localStorage - usa APENAS chave única por utilizador
function write(key, data) {
  var userKey = getUserDataKey(key);
  localStorage.setItem(userKey, JSON.stringify(data));
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
    createdAt: new Date().toISOString(),
  };
  
  list.push(item);
  write(KEYS.expenses, list);
  
  // Salvar no Firebase se disponível
  if (isFirebaseReady()) {
    try {
      await window.FirebaseSync.saveToFirebaseAndLocalStorage('expenses', item);
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
    list[index] = { ...list[index], ...updates };
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
