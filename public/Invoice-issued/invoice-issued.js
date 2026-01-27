import { getInvoicesIssued, addInvoiceIssued, deleteInvoiceIssued } from "../shared/store.js";

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

// Chart instance
let issuedChart = null;

function renderChart() {
  const chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  const list = getInvoicesIssued();
  
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

  const list = getInvoicesIssued();
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
      <td>${inv.invoiceDate || "-"}</td>
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
      deleteInvoiceIssued(btn.getAttribute("data-del"));
      renderIssued();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
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

      addInvoiceIssued({ invoiceNumber, customer, invoiceDate, dueDate, amount, state });

      if (modalEl) {
        modalEl.classList.remove("show");
      }

      form.reset();
      renderIssued();
      renderChart();
    });
  }

  renderIssued();
  renderChart();
});
