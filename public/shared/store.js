// ===== Expenses =====
const STORAGE_KEYS = {
  ...(typeof STORAGE_KEYS !== "undefined" ? STORAGE_KEYS : {}),
  expenses: "upsen_expenses_v1",
  invoicesIssued: "upsen_invoices_issued_v1",
};

function readKey(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

function writeKey(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getExpenses() {
  return readKey(STORAGE_KEYS.expenses);
}

export function addExpense(data) {
  const items = getExpenses();
  const exp = {
    id: uid("exp"),
    description: (data.description || "").trim(),
    supplier: (data.supplier || "").trim(),
    expenseDate: data.expenseDate || "",
    category: (data.category || "").trim(),
    amount: Number(data.amount || 0),
    createdAt: new Date().toISOString(),
  };
  items.unshift(exp);
  writeKey(STORAGE_KEYS.expenses, items);
  return exp;
}

export function deleteExpense(id) {
  const items = getExpenses().filter((x) => x.id !== id);
  writeKey(STORAGE_KEYS.expenses, items);
}

// ===== Invoice Issued =====
export function getInvoicesIssued() {
  return readKey(STORAGE_KEYS.invoicesIssued);
}

export function addInvoiceIssued(data) {
  const items = getInvoicesIssued();
  const inv = {
    id: uid("invI"),
    invoiceNumber: (data.invoiceNumber || "").trim(),
    invoiceDate: data.invoiceDate || "",
    customer: (data.customer || "").trim(),
    amount: Number(data.amount || 0),
    state: data.state || "Borrador",
    createdAt: new Date().toISOString(),
  };
  items.unshift(inv);
  writeKey(STORAGE_KEYS.invoicesIssued, items);
  return inv;
}

export function deleteInvoiceIssued(id) {
  const items = getInvoicesIssued().filter((x) => x.id !== id);
  writeKey(STORAGE_KEYS.invoicesIssued, items);
}

// ===== Analytics extras (para o dashboard) =====
export function sumExpensesMonth(year, monthIndex) {
  return getExpenses()
    .filter((e) => e.expenseDate && new Date(e.expenseDate).getFullYear() === year && new Date(e.expenseDate).getMonth() === monthIndex)
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
}

export function sumInvoicesIssuedMonth(year, monthIndex) {
  return getInvoicesIssued()
    .filter((i) => i.invoiceDate && new Date(i.invoiceDate).getFullYear() === year && new Date(i.invoiceDate).getMonth() === monthIndex)
    .reduce((acc, i) => acc + Number(i.amount || 0), 0);
}

// ===============================
// EXPENSES (Gastos)
// ===============================
const EXPENSES_KEY = "upsen_expenses_v1";

export function getExpenses() {
  try {
    return JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addExpense(data) {
  const items = getExpenses();

  const exp = {
    id: `exp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    expenseDate: (data.expenseDate || "").trim(),
    category: (data.category || "").trim(),
    description: (data.description || "").trim(),
    supplier: (data.supplier || "").trim(),
    amount: Number(data.amount || 0),
    createdAt: new Date().toISOString(),
  };

  items.unshift(exp);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(items));
  return exp;
}

export function deleteExpense(id) {
  const items = getExpenses().filter((x) => x.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(items));
}


// ===============================
// INVOICES ISSUED (Facturas emitidas)
// ===============================
const ISSUED_KEY = "upsen_invoices_issued_v1";

export function getInvoicesIssued() {
  try {
    return JSON.parse(localStorage.getItem(ISSUED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addInvoiceIssued(data) {
  const items = getInvoicesIssued();

  const inv = {
    id: `invI_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    invoiceNumber: (data.invoiceNumber || "").trim(),
    customer: (data.customer || "").trim(),
    invoiceDate: (data.invoiceDate || "").trim(),
    dueDate: (data.dueDate || "").trim(),
    amount: Number(data.amount || 0),
    state: (data.state || "Pendiente").trim(),
    createdAt: new Date().toISOString(),
  };

  items.unshift(inv);
  localStorage.setItem(ISSUED_KEY, JSON.stringify(items));
  return inv;
}

export function deleteInvoiceIssued(id) {
  const items = getInvoicesIssued().filter((x) => x.id !== id);
  localStorage.setItem(ISSUED_KEY, JSON.stringify(items));
}


// ===============================
// ANALYTICS (para Dashboard)
// ===============================
export function sumExpensesMonth(year, monthIndex) {
  return getExpenses()
    .filter((e) => {
      if (!e.expenseDate) return false;
      const d = new Date(e.expenseDate);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    })
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
}

export function sumInvoicesIssuedMonth(year, monthIndex) {
  return getInvoicesIssued()
    .filter((i) => {
      if (!i.invoiceDate) return false;
      const d = new Date(i.invoiceDate);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    })
    .reduce((acc, i) => acc + Number(i.amount || 0), 0);
}
