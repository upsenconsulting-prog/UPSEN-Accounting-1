const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');

admin.initializeApp();

const app = express();
app.use(express.json());

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value, startDate, endDate) {
  const date = parseDate(value);
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function isPendingState(state) {
  return ['pendiente', 'pending', 'parcial', 'partial'].includes(String(state || '').toLowerCase());
}

function isPaidState(state) {
  return ['pagada', 'paid', 'cobrada'].includes(String(state || '').toLowerCase());
}

function isOverdue(item) {
  const dueDate = parseDate(item.dueDate);
  return dueDate && dueDate < new Date() && isPendingState(item.state || item.estado);
}

async function readCollection(uid, collectionName) {
  const snapshot = await admin.firestore().collection('companies').doc(uid).collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function sumAmount(items, fieldName) {
  return items.reduce((sum, item) => sum + Number(item[fieldName] ?? item.amount ?? item.totalAmount ?? 0), 0);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'financial-summary' });
});

app.get('/metrics/financial-summary', async (req, res) => {
  try {
    const uid = String(req.query.uid || '').trim();
    if (!uid) {
      return res.status(400).json({ ok: false, message: 'uid is required' });
    }

    const startDate = parseDate(req.query.startDate) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = parseDate(req.query.endDate) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const [invoicesIssued, invoicesReceived, expenses, budgets] = await Promise.all([
      readCollection(uid, 'invoicesIssued'),
      readCollection(uid, 'invoicesReceived'),
      readCollection(uid, 'expenses'),
      readCollection(uid, 'budgets')
    ]);

    const paidIssued = invoicesIssued.filter((invoice) => isPaidState(invoice.state || invoice.estado) && inRange(invoice.invoiceDate || invoice.fecha, startDate, endDate));
    const periodExpenses = expenses.filter((expense) => inRange(expense.date || expense.fecha, startDate, endDate));
    const pendingIssued = invoicesIssued.filter((invoice) => isPendingState(invoice.state || invoice.estado));
    const pendingReceived = invoicesReceived.filter((invoice) => isPendingState(invoice.state || invoice.estado));
    const overdueIssued = pendingIssued.filter(isOverdue);
    const overdueReceived = pendingReceived.filter(isOverdue);
    const pendingBudgets = budgets.filter((budget) => String(budget.status || '').toLowerCase() === 'pending');

    const revenue = sumAmount(paidIssued, 'totalAmount') || sumAmount(paidIssued, 'amount');
    const expenseTotal = sumAmount(periodExpenses, 'totalAmount') || sumAmount(periodExpenses, 'amount');
    const outstandingAmount = sumAmount(pendingIssued, 'totalAmount') || sumAmount(pendingIssued, 'amount');
    const payableAmount = sumAmount(pendingReceived, 'totalAmount') || sumAmount(pendingReceived, 'amount');
    const overdueAmount = (sumAmount(overdueIssued, 'totalAmount') || sumAmount(overdueIssued, 'amount')) + (sumAmount(overdueReceived, 'totalAmount') || sumAmount(overdueReceived, 'amount'));

    return res.json({
      ok: true,
      uid,
      rangeStart: startDate.toISOString(),
      rangeEnd: endDate.toISOString(),
      revenue,
      expenses: expenseTotal,
      netResult: revenue - expenseTotal,
      outstandingAmount,
      payableAmount,
      pendingDocuments: pendingIssued.length + pendingReceived.length + pendingBudgets.length,
      overdueDocuments: overdueIssued.length + overdueReceived.length,
      overdueAmount,
      accountsReceivable: outstandingAmount,
      accountsPayable: payableAmount,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('financial-summary error', error);
    return res.status(500).json({ ok: false, message: error.message || 'Internal error' });
  }
});

exports.api = functions.https.onRequest(app);
