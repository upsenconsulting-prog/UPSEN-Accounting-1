// public/Invoice_recieved/Invoice_recieved.js
import {
  getInvoicesReceived,
  addInvoiceReceived,
  deleteInvoiceReceived
} from "../shared/store.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`[Invoice_recieved] Elemento não encontrado: #${id}`);
  return el;
}

// ---------- Period helper ----------
function getQuarterPeriod(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return "";
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return "";
  const q = Math.ceil(m / 3);
  return `${y}-${q}Q`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// ---------- Filters ----------
function getFilters() {
  // Period selector é apenas visual - não filtra
  const period = $("periodSelect")?.value?.trim() || "";

  const form = $("filterForm");
  const state = form?.elements?.["state"]?.value?.trim() || "";
  const dateFrom = form?.elements?.["dateFrom"]?.value?.trim() || "";
  const dateTo = form?.elements?.["dateTo"]?.value?.trim() || "";

  return { period, state, dateFrom, dateTo };
}

function applyAllFilters(invoices) {
  const { state, dateFrom, dateTo } = getFilters();
  let list = [...invoices];

  // state
  if (state) list = list.filter(inv => (inv.state || "").toLowerCase() === state.toLowerCase());

  // date range
  const fromD = parseDate(dateFrom);
  const toD = parseDate(dateTo);

  if (fromD) list = list.filter(inv => {
    const d = parseDate(inv.invoiceDate);
    return d ? d >= fromD : false;
  });

  if (toD) list = list.filter(inv => {
    const d = parseDate(inv.invoiceDate);
    return d ? d <= toD : false;
  });

  return list;
}

// ---------- Render ----------
function renderTable() {
  const tbody = $("invoiceTbody");
  if (!tbody) return;

  const all = getInvoicesReceived().map(inv => ({
    ...inv,
    period: inv.period || getQuarterPeriod(inv.invoiceDate)
  }));

  const invoices = applyAllFilters(all);

  tbody.innerHTML = "";

  if (!invoices.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No hay facturas para el período/filtro seleccionado.
        </td>
      </tr>`;
    return;
  }

  invoices.forEach(inv => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.state || "-"}</td>
      <td>${inv.invoiceDate || "-"}</td>
      <td>${inv.supplier || "-"}</td>
      <td>${Number(inv.amount ?? 0).toFixed(2)} €</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger" data-del="${inv.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteInvoiceReceived(btn.getAttribute("data-del"));
      renderTable();
      renderChart();
      renderSummaryCards();
    });
  });
}

// ---------- PDF (print-to-PDF MVP) ----------
function downloadPDF() {
  const all = getInvoicesReceived().map(inv => ({
    ...inv,
    period: inv.period || getQuarterPeriod(inv.invoiceDate)
  }));
  const invoices = applyAllFilters(all);

  const rows = invoices.map(inv => `
    <tr>
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.state || "-"}</td>
      <td>${inv.invoiceDate || "-"}</td>
      <td>${inv.supplier || "-"}</td>
      <td style="text-align:right">${Number(inv.amount ?? 0).toFixed(2)} €</td>
    </tr>
  `).join("");

  const period = $("periodSelect")?.value || "-";

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head>
      <title>Facturas recibidas - ${period}</title>
      <style>
        body{font-family:Arial;padding:24px}
        h2{margin:0 0 10px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:10px;font-size:13px}
        th{background:#f4f6fb;text-align:left}
      </style>
    </head>
    <body>
      <h2>Registro de facturas recibidas</h2>
      <div>Período: <b>${period}</b> · Total: <b>${invoices.length}</b></div>

      <table>
        <thead>
          <tr>
            <th>Nº</th><th>Estado</th><th>Fecha</th><th>Proveedor</th><th style="text-align:right">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5">Sin datos</td></tr>`}
        </tbody>
      </table>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

// ---------- Summary Cards ----------
function renderSummaryCards() {
  const all = getInvoicesReceived().map(inv => ({
    ...inv,
    period: inv.period || getQuarterPeriod(inv.invoiceDate)
  }));
  const invoices = applyAllFilters(all);
  
  // Calculate totals
  let pendingTotal = 0;
  let overdueTotal = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let monthlyCount = 0;
  
  invoices.forEach(inv => {
    const state = (inv.state || "").toLowerCase();
    const amount = Number(inv.amount || 0);
    
    // Pending total
    if (state === "pendiente") {
      pendingTotal += amount;
    }
    
    // Overdue total
    if (state === "vencida") {
      overdueTotal += amount;
    }
    
    // Monthly count
    if (inv.invoiceDate) {
      const [year, month] = inv.invoiceDate.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyCount++;
      }
    }
  });
  
  // Calculate average
  const averageAmount = invoices.length > 0 
    ? invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / invoices.length 
    : 0;
  
  // Update DOM
  const pendingEl = $("pendingTotal");
  if (pendingEl) pendingEl.textContent = `€${pendingTotal.toFixed(2)}`;
  
  const overdueEl = $("overdueTotal");
  if (overdueEl) overdueEl.textContent = `€${overdueTotal.toFixed(2)}`;
  
  const monthlyEl = $("monthlyCount");
  if (monthlyEl) monthlyEl.textContent = `${monthlyCount} facturas`;
  
  const averageEl = $("averageAmount");
  if (averageEl) averageEl.textContent = `€${averageAmount.toFixed(2)}`;
}

// ---------- Chart ----------
let receivedChart = null;

function renderChart() {
  const chartContainer = document.getElementById('receivedChartCanvas');
  if (!chartContainer) return;

  const all = getInvoicesReceived().map(inv => ({
    ...inv,
    period: inv.period || getQuarterPeriod(inv.invoiceDate)
  }));
  const invoices = applyAllFilters(all);
  
  // Calculate totals by supplier (top 5)
  const supplierTotals = {};
  invoices.forEach(inv => {
    const supplier = inv.supplier || "Sin proveedor";
    supplierTotals[supplier] = (supplierTotals[supplier] || 0) + Number(inv.amount || 0);
  });

  // Sort by amount and get top 5
  const sortedSuppliers = Object.entries(supplierTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = sortedSuppliers.length ? sortedSuppliers.map(([name]) => name) : ['Sem dados'];
  const data = sortedSuppliers.length ? sortedSuppliers.map(([, amount]) => amount) : [0];

  const ctx = chartContainer.getContext('2d');

  // Destroy existing chart
  if (receivedChart) {
    receivedChart.destroy();
  }

  // Create new chart
  receivedChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Gastos por proveedor',
        data: data,
        backgroundColor: [
          '#2a4d9c', '#3a6cd6', '#1abc9c', '#e74c3c', '#f39c12'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          }
        }
      }
    }
  });
}

// ---------- OCR (mock) ----------
function saveOCRMock() {
  const form = $("formNewInvoiceOCR");
  if (!form) return;

  const fileInput = form.elements["ocrFile"];
  const file = fileInput?.files?.[0];

  if (!file) {
    alert("Selecciona un archivo primero.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  addInvoiceReceived({
    invoiceNumber: "OCR-" + Date.now(),
    invoiceDate: today,
    supplier: file.name.replace(/\.[^/.]+$/, ""),
    amount: 0,
    state: "Pendiente",
    period: getQuarterPeriod(today)
  });

  form.reset();
  
  // Fechar modal - usar classe .show
  const modalEl = document.getElementById("modalNewInvoiceOCR");
  if (modalEl) {
    modalEl.classList.remove("show");
  }
  
  renderTable();
  renderChart();
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  // botão aplicar filtros
  const applyFilter = document.getElementById("applyFilter");
  if (applyFilter) {
    applyFilter.addEventListener("click", function() {
      renderTable();
      renderChart();
      renderSummaryCards();
    });
  }

  // período
  $("periodSelect")?.addEventListener("change", function() {
    renderTable();
    renderChart();
    renderSummaryCards();
  });

  // salvar nova fatura
  $("saveInvoiceBtn")?.addEventListener("click", () => {
    const form = $("formNewInvoice");
    if (!form) return;

    const fd = new FormData(form);
    const invoiceNumber = (fd.get("invoiceNumber") || "").toString().trim();
    const invoiceDate = (fd.get("invoiceDate") || "").toString().trim();
    const supplier = (fd.get("supplier") || "").toString().trim();
    const amountStr = (fd.get("amount") || "").toString().trim();

    if (!invoiceNumber || !invoiceDate || !supplier || !amountStr) {
      alert("Por favor completa: número, fecha, proveedor y importe.");
      return;
    }

    addInvoiceReceived({
      invoiceNumber,
      invoiceDate,
      supplier,
      amount: Number(amountStr),
      state: "Pendiente",
      period: getQuarterPeriod(invoiceDate)
    });

    form.reset();
    
    // Fechar modal - usar classe .show
    const modalEl = document.getElementById("modalNewInvoice");
    if (modalEl) {
      modalEl.classList.remove("show");
    }
    
    renderTable();
    renderChart();
    renderSummaryCards();
  });

  // OCR
  $("saveOCRBtn")?.addEventListener("click", function() {
    saveOCRMock();
    renderSummaryCards();
  });

  // PDF
  $("btnDownload")?.addEventListener("click", downloadPDF);

  renderTable();
  renderChart();
  renderSummaryCards();
});
