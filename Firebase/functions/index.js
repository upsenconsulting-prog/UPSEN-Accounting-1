"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function normalizeString(value) {
  return String(value ?? "").trim();
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return {
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    start,
    end,
  };
}

function normalizeInvoiceState(value) {
  const raw = normalizeString(value).toLowerCase();
  if (!raw) return "draft";
  const aliases = {
    draft: "draft",
    borrador: "draft",
    pendiente: "draft",
    free: "draft",
    sent: "sent",
    enviado: "sent",
    enviada: "sent",
    emit: "sent",
    partial: "sent",
    parcial: "sent",
    overdue: "sent",
    vencida: "sent",
    paid: "paid",
    pagada: "paid",
  };
  return aliases[raw] || "draft";
}

function normalizeFinancialStatus(value) {
  const raw = normalizeString(value).toLowerCase();
  if (!raw) return null;
  const aliases = {
    all: "all",
    pending: "pending",
    pendiente: "pending",
    open: "pending",
    unpaid: "pending",
    sent: "pending",
    emit: "pending",
    issued: "pending",
    ausgestellt: "pending",
    paid: "paid",
    pagada: "paid",
    bezahlt: "paid",
    overdue: "overdue",
    vencida: "overdue",
    vencido: "overdue",
    ueberfaellig: "overdue",
    uberfaellig: "overdue",
    draft: "draft",
    borrador: "draft",
  };
  return aliases[raw] || null;
}

function parseStatusFilter(rawValue) {
  if (rawValue == null || rawValue === "") return [];
  const values = String(rawValue)
    .split(",")
    .map((value) => normalizeFinancialStatus(value))
    .filter(Boolean);

  if (!values.length) {
    throw new Error("Parametro de estado invalido");
  }

  if (values.includes("all")) return [];
  return Array.from(new Set(values));
}

function getDocumentAmount(item) {
  return roundMoney(item && (item.totalAmount ?? item.total ?? item.amount) || 0);
}

function getDocumentDate(item) {
  const directDate = normalizeString(item && (item.invoiceDate || item.date));
  if (isValidIsoDate(directDate)) return directDate;

  const createdAt = item && item.createdAt;
  if (typeof createdAt === "string" && createdAt.length >= 10) {
    const isoDate = createdAt.slice(0, 10);
    if (isValidIsoDate(isoDate)) return isoDate;
  }

  return "";
}

function isInvoiceOverdue(item, todayIso) {
  if (normalizeInvoiceState(item && item.state) === "paid") return false;
  const dueDate = normalizeString(item && item.dueDate);
  return Boolean(dueDate && isValidIsoDate(dueDate) && dueDate < todayIso);
}

function getFinancialState(item, todayIso) {
  if (isInvoiceOverdue(item, todayIso)) return "overdue";
  const state = normalizeInvoiceState(item && item.state);
  if (state === "paid") return "paid";
  if (state === "sent") return "pending";
  return "draft";
}

function matchesDateRange(item, range) {
  if (!range.start && !range.end) return true;
  const documentDate = getDocumentDate(item);
  if (!documentDate) return false;
  if (range.start && documentDate < range.start) return false;
  if (range.end && documentDate > range.end) return false;
  return true;
}

function matchesInvoiceStatus(item, statuses, todayIso) {
  if (!statuses.length) return true;
  return statuses.includes(getFinancialState(item, todayIso));
}

function matchesExpenseStatus(statuses) {
  return statuses.length === 0;
}

function ensureValidRange(start, end) {
  if (start && !isValidIsoDate(start)) {
    throw new Error("Parametro start invalido");
  }
  if (end && !isValidIsoDate(end)) {
    throw new Error("Parametro end invalido");
  }
  if (start && end && start > end) {
    throw new Error("El rango de fechas es invalido");
  }
  return {
    start: start || null,
    end: end || null,
  };
}

async function resolveUserId(req) {
  const authHeader = normalizeString(req.headers.authorization);
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const idToken = authHeader.slice(7).trim();
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  }

  const fallbackUserId = normalizeString(req.query.userId || req.headers["x-user-id"]);
  if (fallbackUserId && process.env.FUNCTIONS_EMULATOR === "true") {
    return fallbackUserId;
  }

  throw new Error("UNAUTHENTICATED");
}

async function getCompanyDocuments(userId, collectionName) {
  const snapshot = await db
    .collection("companies")
    .doc(userId)
    .collection(collectionName)
    .get();

  const items = [];
  snapshot.forEach((doc) => {
    if (doc.id === "_init") return;
    items.push({
      id: doc.id,
      ...doc.data(),
    });
  });
  return items;
}

function buildFinancialSummary(payload) {
  const todayIso = payload.todayIso;
  const activeRange = payload.range;
  const monthlyRange = payload.monthlyRange;
  const statuses = payload.statuses;

  const issuedFiltered = payload.invoicesIssued.filter((invoice) =>
    matchesDateRange(invoice, activeRange) &&
    matchesInvoiceStatus(invoice, statuses, todayIso)
  );

  const receivedFiltered = payload.invoicesReceived.filter((invoice) =>
    matchesDateRange(invoice, activeRange) &&
    matchesInvoiceStatus(invoice, statuses, todayIso)
  );

  const expensesFiltered = payload.expenses.filter((expense) =>
    matchesDateRange(expense, activeRange) &&
    matchesExpenseStatus(statuses)
  );

  const monthlyIssued = payload.invoicesIssued.filter((invoice) =>
    matchesDateRange(invoice, monthlyRange)
  );

  const monthlyReceived = payload.invoicesReceived.filter((invoice) =>
    matchesDateRange(invoice, monthlyRange)
  );

  const monthlyExpenses = payload.expenses.filter((expense) =>
    matchesDateRange(expense, monthlyRange)
  );

  const openReceivables = issuedFiltered.filter((invoice) =>
    getFinancialState(invoice, todayIso) === "pending"
  );

  const openPayables = receivedFiltered.filter((invoice) =>
    getFinancialState(invoice, todayIso) === "pending"
  );

  const overdueIssued = issuedFiltered.filter((invoice) =>
    getFinancialState(invoice, todayIso) === "overdue"
  );

  return {
    generatedAt: new Date().toISOString(),
    range: {
      start: activeRange.start,
      end: activeRange.end,
    },
    filters: {
      status: statuses,
      sourceCollections: ["invoicesIssued", "invoicesReceived", "expenses"],
      statusAppliedTo: ["invoicesIssued", "invoicesReceived"],
    },
    income: roundMoney(issuedFiltered.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0)),
    expenses: roundMoney(
      receivedFiltered.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0) +
      expensesFiltered.reduce((sum, expense) => sum + getDocumentAmount(expense), 0)
    ),
    pending: {
      to_receive: roundMoney(openReceivables.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0)),
      to_pay: roundMoney(openPayables.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0)),
    },
    overdue: {
      count: overdueIssued.length,
      amount: roundMoney(overdueIssued.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0)),
    },
    monthly: {
      month: monthlyRange.month,
      income: roundMoney(monthlyIssued.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0)),
      expenses: roundMoney(
        monthlyReceived.reduce((sum, invoice) => sum + getDocumentAmount(invoice), 0) +
        monthlyExpenses.reduce((sum, expense) => sum + getDocumentAmount(expense), 0)
      ),
    },
    documents: {
      issued_invoices: issuedFiltered.length,
      received_invoices: receivedFiltered.length,
      expenses: expensesFiltered.length,
      open_receivables: openReceivables.length,
      open_payables: openPayables.length,
      overdue_issued_invoices: overdueIssued.length,
    },
  };
}

exports.financialSummary = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({
      error: "method_not_allowed",
      message: "Use GET para este endpoint.",
    });
    return;
  }

  try {
    const userId = await resolveUserId(req);
    const range = ensureValidRange(
      normalizeString(req.query.start),
      normalizeString(req.query.end)
    );
    const statuses = parseStatusFilter(req.query.status);
    const monthlyRange = getCurrentMonthRange();
    const todayIso = getTodayIsoDate();

    const [invoicesIssued, invoicesReceived, expenses] = await Promise.all([
      getCompanyDocuments(userId, "invoicesIssued"),
      getCompanyDocuments(userId, "invoicesReceived"),
      getCompanyDocuments(userId, "expenses"),
    ]);

    const summary = buildFinancialSummary({
      invoicesIssued,
      invoicesReceived,
      expenses,
      statuses,
      range,
      monthlyRange,
      todayIso,
    });

    res.status(200).json(summary);
  } catch (error) {
    if (error && error.message === "UNAUTHENTICATED") {
      res.status(401).json({
        error: "unauthenticated",
        message: "Autenticacion requerida. Envia un Firebase ID token.",
      });
      return;
    }

    if (
      error &&
      typeof error.message === "string" &&
      (
        error.message.includes("Parametro") ||
        error.message.includes("rango")
      )
    ) {
      res.status(400).json({
        error: "invalid_request",
        message: error.message,
      });
      return;
    }

    logger.error("financialSummary failed", error);
    res.status(500).json({
      error: "internal_error",
      message: "No se pudo calcular el resumen financiero.",
    });
  }
});
