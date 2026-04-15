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

function normalizeString(value) {
  return (value ?? "").toString().trim();
}

function normalizeNif(value) {
  return normalizeString(value).toUpperCase();
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  var date = new Date(value + "T00:00:00");
  return !Number.isNaN(date.getTime());
}

function isValidNifNie(value) {
  return /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test(value || "");
}

function isValidVatRate(value) {
  var rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100;
}

function ensureUniqueValue(list, field, value, label, excludeId) {
  if (!value) return;
  var normalizedValue = normalizeString(value).toLowerCase();
  var duplicate = list.find(function(item) {
    if (excludeId && item.id === excludeId) return false;
    return normalizeString(item[field]).toLowerCase() === normalizedValue;
  });
  if (duplicate) throw new Error(label + " duplicado");
}

function validateBudgetItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Presupuesto sin lineas");
  }

  return items.map(function(item) {
    var desc = normalizeString(item.desc || item.description);
    var qty = Number(item.qty ?? item.quantity ?? 0);
    var unit = Number(item.unit ?? item.price ?? 0);
    var total = roundMoney(qty * unit);

    if (!desc) throw new Error("Presupuesto con linea sin descripcion");
    if (!(qty > 0)) throw new Error("Presupuesto con cantidad invalida");
    if (!(unit >= 0)) throw new Error("Presupuesto con precio invalido");

    return {
      desc: desc,
      qty: qty,
      unit: roundMoney(unit),
      total: total
    };
  });
}

window.CalculationEngine = {
  roundMoney: roundMoney,
  calculateLineSubtotal: function(price, quantity) {
    return roundMoney(Number(price || 0) * Number(quantity || 0));
  },
  calculateSubtotalFromLines: function(lines) {
    return roundMoney((lines || []).reduce(function(sum, line) {
      var qty = Number(line.qty ?? line.quantity ?? 0);
      var unit = Number(line.unit ?? line.price ?? 0);
      return sum + (Number(qty) * Number(unit));
    }, 0));
  },
  calculateVatAmount: function(subtotal, vatRate) {
    return roundMoney(Number(subtotal || 0) * (Number(vatRate || 0) / 100));
  },
  calculateInvoiceTotals: function(baseAmount, vatRate) {
    var subtotal = roundMoney(baseAmount);
    var ivaAmount = this.calculateVatAmount(subtotal, vatRate);
    return {
      subtotal: subtotal,
      ivaAmount: ivaAmount,
      totalAmount: roundMoney(subtotal + ivaAmount)
    };
  },
  calculateBudgetTotals: function(lines, retentionRate) {
    var subtotal = this.calculateSubtotalFromLines(lines);
    var retentionAmount = roundMoney(subtotal * (Number(retentionRate || 0) / 100));
    return {
      subtotal: subtotal,
      retentionAmount: retentionAmount,
      totalAmount: roundMoney(subtotal - retentionAmount)
    };
  }
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

  var invoiceNumber = normalizeString(invoice.invoiceNumber);
  var invoiceDate = normalizeString(invoice.invoiceDate);
  var supplier = normalizeString(invoice.supplier);
  var supplierNif = normalizeNif(invoice.supplierNif);
  var amount = roundMoney(invoice.amount);
  var ivaRate = Number(invoice.ivaRate ?? 0);
  var receivedTotals = window.CalculationEngine
    ? window.CalculationEngine.calculateInvoiceTotals(amount, ivaRate)
    : { ivaAmount: roundMoney(amount * (ivaRate / 100)), totalAmount: roundMoney(amount + roundMoney(amount * (ivaRate / 100))) };
  if (!invoiceNumber) throw new Error('Numero de factura obligatorio');
  if (!invoiceDate || !isValidIsoDate(invoiceDate)) throw new Error('Fecha de factura invalida');
  if (!supplier) throw new Error('Proveedor obligatorio');
  if (!supplierNif || !isValidNifNie(supplierNif)) throw new Error('NIF de proveedor invalido');
  if (!(amount > 0)) throw new Error('Importe invalido');
  if (!isValidVatRate(ivaRate)) throw new Error('IVA invalido');
  if (invoice.paymentDate && !isValidIsoDate(invoice.paymentDate)) throw new Error('Fecha de pago invalida');
  ensureUniqueValue(list, 'invoiceNumber', invoiceNumber, 'Numero de factura');

const item = {
    id: uid(),
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceDate,
    supplier: supplier,
    supplierNif: supplierNif,
    amount: amount,
    ivaRate: ivaRate,
    ivaAmount: roundMoney(invoice.ivaAmount ?? receivedTotals.ivaAmount),
    totalAmount: roundMoney(invoice.totalAmount ?? receivedTotals.totalAmount),
    state: invoice.state ?? "Pendiente",
    description: invoice.description ?? "",
    paymentMethod: invoice.paymentMethod ?? null,  // efectivo|tarjeta|transferencia|recibo|cheque|paypal  
    paymentDate: invoice.paymentDate ?? null,     // YYYY-MM-DD
    createdAt: new Date().toISOString(),
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

  var invoiceNumber = normalizeString(invoice.invoiceNumber);
  var customer = normalizeString(invoice.customer);
  var customerNif = normalizeNif(invoice.customerNif);
  var invoiceDate = normalizeString(invoice.invoiceDate);
  var dueDate = normalizeString(invoice.dueDate);
  var amount = roundMoney(invoice.amount);
  var ivaRate = Number(invoice.ivaRate ?? 0);
  var issuedTotals = window.CalculationEngine
    ? window.CalculationEngine.calculateInvoiceTotals(amount, ivaRate)
    : { ivaAmount: roundMoney(amount * (ivaRate / 100)), totalAmount: roundMoney(amount + roundMoney(amount * (ivaRate / 100))) };
  if (!invoiceNumber) throw new Error('Numero de factura obligatorio');
  if (!customer) throw new Error('Cliente obligatorio');
  if (!customerNif || !isValidNifNie(customerNif)) throw new Error('NIF de cliente invalido');
  if (!invoiceDate || !isValidIsoDate(invoiceDate)) throw new Error('Fecha de factura invalida');
  if (!dueDate || !isValidIsoDate(dueDate)) throw new Error('Fecha de vencimiento invalida');
  if (new Date(dueDate + 'T00:00:00') < new Date(invoiceDate + 'T00:00:00')) throw new Error('La fecha de vencimiento no puede ser anterior a la factura');
  if (!(amount > 0)) throw new Error('Importe invalido');
  if (!isValidVatRate(ivaRate)) throw new Error('IVA invalido');
  if (invoice.paymentDate && !isValidIsoDate(invoice.paymentDate)) throw new Error('Fecha de pago invalida');
  ensureUniqueValue(list, 'invoiceNumber', invoiceNumber, 'Numero de factura');

const item = {
    id: uid(),
    invoiceNumber: invoiceNumber,
    customer: customer,
    customerNif: customerNif,
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    amount: amount,
    ivaRate: ivaRate,
    ivaAmount: roundMoney(invoice.ivaAmount ?? issuedTotals.ivaAmount),
    totalAmount: roundMoney(invoice.totalAmount ?? issuedTotals.totalAmount),
    state: invoice.state ?? "Pendiente",
    paymentMethod: invoice.paymentMethod ?? null,  // efectivo|tarjeta|transferencia|recibo|cheque|paypal
    paymentDate: invoice.paymentDate ?? null,     // YYYY-MM-DD
    createdAt: new Date().toISOString(),
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
    var merged = { ...list[index], ...updates };
    var invoiceNumber = normalizeString(merged.invoiceNumber);
    var customer = normalizeString(merged.customer);
    var customerNif = normalizeNif(merged.customerNif);
    var invoiceDate = normalizeString(merged.invoiceDate);
    var dueDate = normalizeString(merged.dueDate);
    var amount = roundMoney(merged.amount);
    var ivaRate = Number(merged.ivaRate ?? 0);
    if (!invoiceNumber) throw new Error('Numero de factura obligatorio');
    if (!customer) throw new Error('Cliente obligatorio');
    if (!customerNif || !isValidNifNie(customerNif)) throw new Error('NIF de cliente invalido');
    if (!invoiceDate || !isValidIsoDate(invoiceDate)) throw new Error('Fecha de factura invalida');
    if (!dueDate || !isValidIsoDate(dueDate)) throw new Error('Fecha de vencimiento invalida');
    if (new Date(dueDate + 'T00:00:00') < new Date(invoiceDate + 'T00:00:00')) throw new Error('La fecha de vencimiento no puede ser anterior a la factura');
    if (!(amount > 0)) throw new Error('Importe invalido');
    if (!isValidVatRate(ivaRate)) throw new Error('IVA invalido');
    if (merged.paymentDate && !isValidIsoDate(merged.paymentDate)) throw new Error('Fecha de pago invalida');
    var issuedTotals = window.CalculationEngine
      ? window.CalculationEngine.calculateInvoiceTotals(amount, ivaRate)
      : { ivaAmount: roundMoney(amount * (ivaRate / 100)), totalAmount: roundMoney(amount + roundMoney(amount * (ivaRate / 100))) };
    ensureUniqueValue(list, 'invoiceNumber', invoiceNumber, 'Numero de factura', id);
    list[index] = {
      ...merged,
      invoiceNumber: invoiceNumber,
      customer: customer,
      customerNif: customerNif,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      amount: amount,
      ivaRate: ivaRate,
      ivaAmount: roundMoney(merged.ivaAmount ?? issuedTotals.ivaAmount),
      totalAmount: roundMoney(merged.totalAmount ?? issuedTotals.totalAmount)
    };
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
    var merged = { ...list[index], ...updates };
    var invoiceNumber = normalizeString(merged.invoiceNumber);
    var invoiceDate = normalizeString(merged.invoiceDate);
    var supplier = normalizeString(merged.supplier);
    var supplierNif = normalizeNif(merged.supplierNif);
    var amount = roundMoney(merged.amount);
    var ivaRate = Number(merged.ivaRate ?? 0);
    if (!invoiceNumber) throw new Error('Numero de factura obligatorio');
    if (!invoiceDate || !isValidIsoDate(invoiceDate)) throw new Error('Fecha de factura invalida');
    if (!supplier) throw new Error('Proveedor obligatorio');
    if (!supplierNif || !isValidNifNie(supplierNif)) throw new Error('NIF de proveedor invalido');
    if (!(amount > 0)) throw new Error('Importe invalido');
    if (!isValidVatRate(ivaRate)) throw new Error('IVA invalido');
    if (merged.paymentDate && !isValidIsoDate(merged.paymentDate)) throw new Error('Fecha de pago invalida');
    var receivedTotals = window.CalculationEngine
      ? window.CalculationEngine.calculateInvoiceTotals(amount, ivaRate)
      : { ivaAmount: roundMoney(amount * (ivaRate / 100)), totalAmount: roundMoney(amount + roundMoney(amount * (ivaRate / 100))) };
    ensureUniqueValue(list, 'invoiceNumber', invoiceNumber, 'Numero de factura', id);
    list[index] = {
      ...merged,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      supplier: supplier,
      supplierNif: supplierNif,
      amount: amount,
      ivaRate: ivaRate,
      ivaAmount: roundMoney(merged.ivaAmount ?? receivedTotals.ivaAmount),
      totalAmount: roundMoney(merged.totalAmount ?? receivedTotals.totalAmount)
    };
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

  var date = normalizeString(expense.date);
  var description = normalizeString(expense.description);
  var amount = roundMoney(expense.amount);
  var ivaRate = Number(expense.ivaRate ?? 0);
  var expenseTotals = window.CalculationEngine
    ? window.CalculationEngine.calculateInvoiceTotals(amount, ivaRate)
    : { ivaAmount: roundMoney(amount * (ivaRate / 100)), totalAmount: roundMoney(amount + roundMoney(amount * (ivaRate / 100))) };
  var supplierNif = normalizeNif(expense.supplierNif);
  if (!date || !isValidIsoDate(date)) throw new Error('Fecha de gasto invalida');
  if (!description) throw new Error('Descripcion de gasto obligatoria');
  if (!(amount >= 0)) throw new Error('Importe de gasto invalido');
  if (!isValidVatRate(ivaRate)) throw new Error('IVA invalido');
  if (supplierNif && !isValidNifNie(supplierNif)) throw new Error('NIF de proveedor invalido');

  const item = {
    id: uid(),
    date: date,
    category: expense.category ?? "",
    description: description,
    amount: amount,
    // Guardar campos adicionais do expense
    ivaRate: ivaRate,
    ivaAmount: roundMoney(expense.ivaAmount ?? expenseTotals.ivaAmount),
    totalAmount: roundMoney(expense.totalAmount ?? expenseTotals.totalAmount),
    notes: expense.notes ?? "",
    paymentMethod: expense.paymentMethod ?? "",
    supplierNif: supplierNif,
    supplierName: expense.supplierName ?? "",
    createdAt: new Date().toISOString(),
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

  var items = validateBudgetItems(budget.items);
  var number = normalizeString(budget.number);
  var date = normalizeString(budget.date);
  var validity = normalizeString(budget.validity);
  var customer = normalizeString(budget.customer);
  var retention = Number(budget.retention || 0);
  if (!number) throw new Error('Numero de presupuesto obligatorio');
  if (!date || !isValidIsoDate(date)) throw new Error('Fecha de presupuesto invalida');
  if (validity && !isValidIsoDate(validity)) throw new Error('Fecha de validez invalida');
  if (validity && new Date(validity + 'T00:00:00') < new Date(date + 'T00:00:00')) throw new Error('La validez no puede ser anterior a la fecha');
  if (!customer) throw new Error('Cliente obligatorio');
  ensureUniqueValue(list, 'number', number, 'Numero de presupuesto');
  var budgetTotals = window.CalculationEngine
    ? window.CalculationEngine.calculateBudgetTotals(items, retention)
    : { totalAmount: roundMoney(items.reduce(function(sum, item) { return sum + item.total; }, 0) - (items.reduce(function(sum, item) { return sum + item.total; }, 0) * (retention / 100))) };

  const item = {
    id: uid(),
    number: number,
    series: budget.series ?? "Presupuestos",
    date: date,
    validity: validity,
    customer: customer,
    notes: budget.notes ?? "",
    retention: retention,
    status: budget.status ?? "pending",
    tags: budget.tags ?? "",
    items: items,
    total: budgetTotals.totalAmount,
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
    var merged = { ...list[index], ...updates };
    var items = validateBudgetItems(merged.items);
    var number = normalizeString(merged.number);
    var date = normalizeString(merged.date);
    var validity = normalizeString(merged.validity);
    var customer = normalizeString(merged.customer);
    var retention = Number(merged.retention || 0);
    if (!number) throw new Error('Numero de presupuesto obligatorio');
    if (!date || !isValidIsoDate(date)) throw new Error('Fecha de presupuesto invalida');
    if (validity && !isValidIsoDate(validity)) throw new Error('Fecha de validez invalida');
    if (validity && new Date(validity + 'T00:00:00') < new Date(date + 'T00:00:00')) throw new Error('La validez no puede ser anterior a la fecha');
    if (!customer) throw new Error('Cliente obligatorio');
    ensureUniqueValue(list, 'number', number, 'Numero de presupuesto', id);
    var budgetTotals = window.CalculationEngine
      ? window.CalculationEngine.calculateBudgetTotals(items, retention)
      : { totalAmount: roundMoney(items.reduce(function(sum, item) { return sum + item.total; }, 0) - (items.reduce(function(sum, item) { return sum + item.total; }, 0) * (retention / 100))) };
    list[index] = {
      ...merged,
      number: number,
      date: date,
      validity: validity,
      customer: customer,
      retention: retention,
      items: items,
      total: budgetTotals.totalAmount
    };
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
