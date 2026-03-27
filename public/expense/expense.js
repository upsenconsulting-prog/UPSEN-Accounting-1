// ====== Storage helpers ======
const EXPENSES_KEY = 'ff_expenses_v1';

function loadExpenses() {
    try {
        const raw = localStorage.getItem(EXPENSES_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error loading expenses', e);
        return [];
    }
}

function saveExpensesToStorage(expenses) {
    try {
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
        console.error('Error saving expenses', e);
    }
}

// ====== Core state ======
let expenses = loadExpenses();
let expenseChart = null;

// ====== Utils ======
function formatCurrency(value) {
    if (isNaN(value)) return '€0,00';
    return value.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR'
    });
}

function parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

// ====== Save new expense ======
function saveExpense() {
    const form = document.getElementById('formNewExpense');
    if (!form) return;

    const date = form.date.value || todayISO();
    const category = form.category.value.trim();
    const supplierName = form.supplierName.value.trim();
    const supplierNif = form.supplierNif.value.trim();
    const base = parseFloat(form.base.value.replace(',', '.'));
    const ivaPercent = parseFloat(form.iva.value);
    const notes = form.notes.value.trim();

    if (!category || isNaN(base)) {
        alert('Por favor, rellena al menos la categoría y la base imponible.');
        return;
    }

    const ivaAmount = +(base * ivaPercent / 100).toFixed(2);
    const total = +(base + ivaAmount).toFixed(2);

    const expense = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        date,
        category,
        supplierName,
        supplierNif,
        base,
        ivaPercent,
        ivaAmount,
        total,
        notes,
        createdAt: new Date().toISOString()
    };

    expenses.push(expense);
    saveExpensesToStorage(expenses);

    renderExpenses();
    renderSummaryCards();
    renderChart();

    const modalEl = document.getElementById('modalNewExpense');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
    }

    form.reset();
    form.date.value = todayISO();
    alert('Gasto guardado correctamente.');
}

// ====== Delete expense ======
function deleteExpense(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    expenses = expenses.filter(e => e.id !== id);
    saveExpensesToStorage(expenses);
    renderExpenses();
    renderSummaryCards();
    renderChart();
}

// ====== View expense ======
function openViewExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    const container = document.getElementById('viewExpenseContent');
    if (!container) return;

    container.innerHTML = `
        <div class="mb-2"><strong>Fecha:</strong> ${exp.date}</div>
        <div class="mb-2"><strong>Categoría:</strong> ${exp.category}</div>
        <div class="mb-2"><strong>Proveedor:</strong> ${exp.supplierName || '-'}</div>
        <div class="mb-2"><strong>NIF Proveedor:</strong> ${exp.supplierNif || '-'}</div>
        <div class="mb-2"><strong>Base imponible:</strong> ${formatCurrency(exp.base)}</div>
        <div class="mb-2"><strong>IVA:</strong> ${exp.ivaPercent}% (${formatCurrency(exp.ivaAmount)})</div>
        <div class="mb-2"><strong>Total:</strong> ${formatCurrency(exp.total)}</div>
        <div class="mb-2"><strong>Notas:</strong> ${exp.notes || '-'}</div>
    `;

    const modalEl = document.getElementById('viewExpenseModal');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// ====== Render table ======
function renderExpenses() {
    const tbody = document.getElementById('expenseTBody');
    if (!tbody) return;

    if (!expenses.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--muted);">
                    No hay gastos registrados.
                </td>
            </tr>
        `;
        return;
    }

    const rows = expenses
        .slice()
        .sort((a, b) => (a.date > b.date ? -1 : 1))
        .map(exp => `
            <tr>
                <td>${exp.date}</td>
                <td>${exp.category}</td>
                <td>${formatCurrency(exp.base)}</td>
                <td>${exp.ivaPercent}%</td>
                <td>${formatCurrency(exp.ivaAmount)}</td>
                <td>${formatCurrency(exp.total)}</td>
                <td>${exp.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary me-1" onclick="openViewExpense('${exp.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense('${exp.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `)
        .join('');

    tbody.innerHTML = rows;
}

// ====== Summary cards ======
function renderSummaryCards() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyTotal = 0;
    let monthlyIVA = 0;
    let totalExpenses = 0;
    let totalIVA = 0;
    let ytdExpenses = 0;
    let ytdIVA = 0;

    const byCategory = {};
    let lastExpense = null;

    expenses.forEach(exp => {
        const d = parseDate(exp.date);
        if (!d) return;

        totalExpenses += exp.total;
        totalIVA += exp.ivaAmount;

        if (d.getFullYear() === currentYear) {
            ytdExpenses += exp.total;
            ytdIVA += exp.ivaAmount;
        }

        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            monthlyTotal += exp.total;
            monthlyIVA += exp.ivaAmount;
        }

        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.total;

        if (!lastExpense || d > parseDate(lastExpense.date)) {
            lastExpense = exp;
        }
    });

    // Top category
    let topCategory = 'Sin datos';
    let topAmount = 0;
    Object.entries(byCategory).forEach(([cat, amount]) => {
        if (amount > topAmount) {
            topAmount = amount;
            topCategory = cat;
        }
    });

    const elMonthlyTotal = document.getElementById('monthlyTotal');
    const elMonthlyIVA = document.getElementById('monthlyIVA');
    const elTopCategory = document.getElementById('topCategory');
    const elLastExpense = document.getElementById('lastExpense');
    const elTotalExpenses = document.getElementById('totalExpenses');
    const elTotalIVA = document.getElementById('totalIVA');
    const elYtdExpenses = document.getElementById('ytdExpenses');
    const elYtdIVA = document.getElementById('ytdIVA');

    if (elMonthlyTotal) elMonthlyTotal.textContent = formatCurrency(monthlyTotal);
    if (elMonthlyIVA) elMonthlyIVA.textContent = formatCurrency(monthlyIVA);
    if (elTopCategory) elTopCategory.textContent = topCategory;
    if (elLastExpense) {
        if (lastExpense) {
            elLastExpense.textContent = `${formatCurrency(lastExpense.total)} · ${lastExpense.date}`;
        } else {
            elLastExpense.textContent = 'Sin gastos';
        }
    }
    if (elTotalExpenses) elTotalExpenses.textContent = formatCurrency(totalExpenses);
    if (elTotalIVA) elTotalIVA.textContent = formatCurrency(totalIVA);
    if (elYtdExpenses) elYtdExpenses.textContent = formatCurrency(ytdExpenses);
    if (elYtdIVA) elYtdIVA.textContent = formatCurrency(ytdIVA);
}

// ====== Chart ======
function renderChart() {
    const canvas = document.getElementById('expenseChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const byCategory = {};
    expenses.forEach(exp => {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.total;
    });

    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);

    if (expenseChart) {
        expenseChart.destroy();
    }

    if (!labels.length) {
        return;
    }

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#F1F5F9' : '#1F2937';

    expenseChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#0f6c69', '#b86313', '#0958b2', '#314057',
                    '#16a34a', '#f97316', '#3b82f6', '#6366f1'
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });
}

// ====== CSV Import (Option A, async-safe) ======
async function importExpensesFromCSV(csvText) {
    // Very simple CSV parser: expects header row and columns:
    // date,category,base,ivaPercent,notes,supplierName,supplierNif
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return 0;

    const header = lines[0].split(';').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);

    function idx(name) {
        const i = header.indexOf(name.toLowerCase());
        return i === -1 ? null : i;
    }

    const idxDate = idx('date') ?? idx('fecha');
    const idxCategory = idx('category') ?? idx('categoría') ?? idx('categoria');
    const idxBase = idx('base') ?? idx('base imponible');
    const idxIVA = idx('iva') ?? idx('iva%') ?? idx('iva %');
    const idxNotes = idx('notes') ?? idx('notas');
    const idxSupplierName = idx('suppliername') ?? idx('proveedor');
    const idxSupplierNif = idx('suppliernif') ?? idx('nif') ?? idx('cif');

    let importedCount = 0;

    rows.forEach(line => {
        const cols = line.split(';');
        if (!cols.length) return;

        const date = idxDate != null ? (cols[idxDate] || '').trim() : todayISO();
        const category = idxCategory != null ? (cols[idxCategory] || '').trim() : 'Sin categoría';
        const baseStr = idxBase != null ? (cols[idxBase] || '').replace(',', '.').trim() : '0';
        const ivaStr = idxIVA != null ? (cols[idxIVA] || '').replace(',', '.').trim() : '21';
        const notes = idxNotes != null ? (cols[idxNotes] || '').trim() : '';
        const supplierName = idxSupplierName != null ? (cols[idxSupplierName] || '').trim() : '';
        const supplierNif = idxSupplierNif != null ? (cols[idxSupplierNif] || '').trim() : '';

        const base = parseFloat(baseStr);
        const ivaPercent = parseFloat(ivaStr);

        if (isNaN(base)) return;

        const ivaAmount = +(base * (isNaN(ivaPercent) ? 21 : ivaPercent) / 100).toFixed(2);
        const total = +(base + ivaAmount).toFixed(2);

        expenses.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
            date: date || todayISO(),
            category,
            supplierName,
            supplierNif,
            base,
            ivaPercent: isNaN(ivaPercent) ? 21 : ivaPercent,
            ivaAmount,
            total,
            notes,
            createdAt: new Date().toISOString()
        });

        importedCount++;
    });

    if (importedCount > 0) {
        saveExpensesToStorage(expenses);
    }

    return importedCount;
}

// ====== Export ======
function exportExpenses(format) {
    format = (format || 'pdf').toLowerCase();

    if (format === 'csv') {
        exportExpensesAsCSV();
    } else if (format === 'excel') {
        exportExpensesAsCSV(); // basic CSV for Excel
    } else {
        exportExpensesAsPDF();
    }
}

function exportExpensesFallback(format) {
    exportExpenses(format);
}

function exportExpensesAsCSV() {
    if (!expenses.length) {
        alert('No hay gastos para exportar.');
        return;
    }

    const header = [
        'Fecha',
        'Categoría',
        'Proveedor',
        'NIF Proveedor',
        'Base',
        'IVA%',
        'IVA€',
        'Total',
        'Notas'
    ];

    const lines = expenses.map(e => [
        e.date,
        e.category,
        e.supplierName || '',
        e.supplierNif || '',
        e.base.toString().replace('.', ','),
        e.ivaPercent,
        e.ivaAmount.toString().replace('.', ','),
        e.total.toString().replace('.', ','),
        (e.notes || '').replace(/;/g, ',')
    ].join(';'));

    const csv = [header.join(';'), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'gastos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportExpensesAsPDF() {
    if (!expenses.length) {
        alert('No hay gastos para exportar.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('No se pudo cargar jsPDF.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Listado de gastos', 14, 16);

    doc.setFontSize(10);
    let y = 24;

    expenses.forEach((e, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(
            `${index + 1}. ${e.date} - ${e.category} - ${formatCurrency(e.total)}`,
            14,
            y
        );
        y += 6;
    });

    doc.save('gastos.pdf');
}

// ====== Init on load ======
document.addEventListener('DOMContentLoaded', () => {
    expenses = loadExpenses();
    renderExpenses();
    renderSummaryCards();
    renderChart();
});
