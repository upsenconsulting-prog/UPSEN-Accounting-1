// Funções do store.js já estão disponíveis globalmente via window

function $(id) {
  return document.getElementById(id);
}

function badge(status) {
  const s = (status || "").toLowerCase();
  if (s === "pagada") return `<span class="status-badge status-paid">Pagada</span>`;
  if (s === "vencida") return `<span class="status-badge status-overdue">Vencida</span>`;
  return `<span class="status-badge status-pending">Pendiente</span>`;
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return `€${v.toFixed(2)}`;
}

// ========== MARK ACTIVE PAGE ==========
function markActivePage() {
  const currentPage = window.location.href;
  const links = document.querySelectorAll('.sidebar-link');
  
  links.forEach(link => {
    link.parentElement.classList.remove('active');
    if (link.href === currentPage) {
      link.parentElement.classList.add('active');
    }
  });
}

// Chart instance
let issuedChart = null;

function renderSummaryCards() {
  const list = window.getInvoicesIssued();
  
  // Calculate totals
  let pendingTotal = 0;
  let overdueTotal = 0;
  let monthlyCount = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Monthly count - support both invoiceDate and issueDate (legacy)
  list.forEach(inv => {
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
    
    // Monthly count - support both field names
    const dateField = inv.invoiceDate || inv.issueDate;
    if (dateField) {
      const [year, month] = dateField.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyCount++;
      }
    }
  });
  
  // Calculate average
  const averageAmount = list.length > 0 
    ? list.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / list.length 
    : 0;
  
  // Update DOM
  const pendingEl = $("pendingTotal");
  if (pendingEl) pendingEl.textContent = moneyEUR(pendingTotal);
  
  const overdueEl = $("overdueTotal");
  if (overdueEl) overdueEl.textContent = moneyEUR(overdueTotal);
  
  const monthlyEl = $("monthlyCount");
  if (monthlyEl) monthlyEl.textContent = `${monthlyCount} facturas`;
  
  const averageEl = $("averageAmount");
  if (averageEl) averageEl.textContent = moneyEUR(averageAmount);
}

function renderChart() {
  const chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  const list = window.getInvoicesIssued();
  
  // Calculate totals by state
  const paid = list.filter(inv => (inv.state || "").toLowerCase() === "pagada")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const pending = list.filter(inv => (inv.state || "").toLowerCase() === "pendiente")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const overdue = list.filter(inv => (inv.state || "").toLowerCase() === "vencida")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const ctx = chartContainer.getContext('2d');

  // Destroy existing chart
  if (issuedChart) {
    issuedChart.destroy();
  }

  // Create new chart
  issuedChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pagadas', 'Pendientes', 'Vencidas'],
      datasets: [{
        data: [paid, pending, overdue],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderIssued() {
  const tbody = $("invoiceTbody");
  if (!tbody) return;

  const list = window.getInvoicesIssued();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No hay facturas emitidas registradas todavía.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((inv) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.customer || "-"}</td>
      <td>${inv.invoiceDate || inv.issueDate || "-"}</td>
      <td>${inv.dueDate || "-"}</td>
      <td>${moneyEUR(inv.amount)}</td>
      <td>${badge(inv.state)}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-del="${inv.id}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.deleteInvoiceIssued(btn.getAttribute("data-del"));
      renderIssued();
      renderChart();
      renderSummaryCards();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Mark current page as active
  markActivePage();
  
  const modalEl = $("modalNewInvoiceIssued");
  
  // Abrir modal - usando classes .show
  const newBtn = $("newInvoiceBtn");
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      if (modalEl) {
        modalEl.classList.add("show");
      }
    });
  }

  // Fechar modal com botão X
  const closeBtn = $("closeInvoiceIssuedModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modalEl) {
        modalEl.classList.remove("show");
      }
    });
  }

  // Fechar modal com Cancelar
  const cancelBtn = $("cancelInvoiceIssuedBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (modalEl) {
        modalEl.classList.remove("show");
      }
    });
  }

  // Fechar modal ao clicar fora
  window.addEventListener("click", (e) => {
    if (e.target === modalEl) {
      modalEl.classList.remove("show");
    }
  });

  // Guardar nova factura
  const saveBtn = $("saveInvoiceIssuedBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const form = $("formNewInvoiceIssued");
      if (!form) return;

      const fd = new FormData(form);
      const invoiceNumber = String(fd.get("invoiceNumber") || "");
      const customer = String(fd.get("customer") || "");
      const invoiceDate = String(fd.get("invoiceDate") || "");
      const dueDate = String(fd.get("dueDate") || "");
      const amount = String(fd.get("amount") || "");
      const state = String(fd.get("state") || "Pendiente");

      if (!invoiceNumber || !customer || !invoiceDate || !dueDate || !amount) {
        alert("Completa todos los campos obligatorios.");
        return;
      }

      window.addInvoiceIssued({ invoiceNumber, customer, invoiceDate, dueDate, amount, state });

      if (modalEl) {
        modalEl.classList.remove("show");
      }

      form.reset();
      renderIssued();
      renderChart();
      renderSummaryCards();
    });
  }

  renderIssued();
  renderChart();
  renderSummaryCards();
});

// Export functions
function exportToCSV(invoices) {
  const headers = ['Número', 'Cliente', 'Fecha', 'Vence', 'Importe', 'Estado'];
  const rows = invoices.map(inv => [
    inv.invoiceNumber || '',
    inv.customer || '',
    inv.invoiceDate || inv.issueDate || '',
    inv.dueDate || '',
    Number(inv.amount || 0).toFixed(2),
    inv.state || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  downloadFile(csvContent, 'facturas_emitidas.csv', 'text/csv');
}

function exportToExcel(invoices) {
  // Create a simple XML-based Excel file
  const headers = ['Número', 'Cliente', 'Fecha', 'Vence', 'Importe', 'Estado'];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Facturas">\n';
  xml += '<Table>\n';
  
  // Header row
  xml += '<Row>\n';
  headers.forEach(h => {
    xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>\n`;
  });
  xml += '</Row>\n';
  
  // Data rows
  invoices.forEach(inv => {
    xml += '<Row>\n';
    xml += `<Cell><Data ss:Type="String">${inv.invoiceNumber || ''}</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="String">${inv.customer || ''}</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="String">${inv.invoiceDate || inv.issueDate || ''}</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="String">${inv.dueDate || ''}</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="Number">${Number(inv.amount || 0).toFixed(2)}</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="String">${inv.state || ''}</Data></Cell>\n`;
    xml += '</Row>\n';
  });
  
  xml += '</Table>\n</Worksheet>\n</Workbook>';
  
  downloadFile(xml, 'facturas_emitidas.xls', 'application/vnd.ms-excel');
}

function exportToPDF(invoices) {
  const rows = invoices.map(inv => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;">${inv.invoiceNumber || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;">${inv.customer || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;">${inv.invoiceDate || inv.issueDate || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;">${inv.dueDate || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right;">€${Number(inv.amount || 0).toFixed(2)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${inv.state || '-'}</td>
    </tr>
  `).join('');
  
  const total = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facturas Emitidas</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2a4d9c; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2a4d9c; color: white; padding: 10px; text-align: left; }
        .total { margin-top: 20px; font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Facturas Emitidas</h1>
      <p>Fecha de exportación: ${new Date().toLocaleDateString()}</p>
      <p>Total de facturas: ${invoices.length}</p>
      
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Vence</th>
            <th style="text-align:right;">Importe</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="padding:20px;text-align:center;">Sin datos</td></tr>'}
        </tbody>
      </table>
      
      <p class="total">Total: €${total.toFixed(2)}</p>
      
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFilteredInvoices() {
  const modalExport = document.getElementById('modalExport');
  const period = document.getElementById('exportPeriod')?.value || 'all';
  const state = document.getElementById('exportState')?.value || 'all';
  
  let list = window.getInvoicesIssued();
  
  // Filter by state
  if (state !== 'all') {
    list = list.filter(inv => (inv.state || '').toLowerCase() === state.toLowerCase());
  }
  
  // Filter by period
  const now = new Date();
  if (period !== 'all') {
    list = list.filter(inv => {
      const dateField = inv.invoiceDate || inv.issueDate;
      if (!dateField) return false;
      const invDate = new Date(dateField);
      const diffTime = Math.abs(now - invDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (period === 'month') return diffDays <= 30;
      if (period === 'quarter') return diffDays <= 90;
      if (period === 'year') return diffDays <= 365;
      return true;
    });
  }
  
  return list;
}

// Handle export confirmation
document.getElementById('confirmExportBtn')?.addEventListener('click', function() {
  const format = document.getElementById('exportFormat')?.value;
  const invoices = getFilteredInvoices();
  
  if (invoices.length === 0) {
    alert('No hay facturas para exportar con los filtros seleccionados.');
    return;
  }
  
  switch (format) {
    case 'csv':
      exportToCSV(invoices);
      break;
    case 'excel':
      exportToExcel(invoices);
      break;
    case 'pdf':
      exportToPDF(invoices);
      break;
  }
  
  const modalExport = document.getElementById('modalExport');
  if (modalExport) {
    modalExport.classList.remove('show');
  }
});

