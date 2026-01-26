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
      <td>${badge(inv.status)}</td>
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
  // Abrir modal
  const newBtn = $("newInvoiceBtn");
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      const el = $("modalNewInvoiceIssued");
      if (el && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(el).show();
      }
    });
  }

  // Guardar
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
      const status = String(fd.get("status") || "Pendiente");

      if (!invoiceNumber || !customer || !invoiceDate || !dueDate || !amount) {
        alert("Completa todos los campos obligatorios.");
        return;
      }

      addInvoiceIssued({ invoiceNumber, customer, invoiceDate, dueDate, amount, status });

      const el = $("modalNewInvoiceIssued");
      if (el && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(el).hide();
      }

      form.reset();
      renderIssued();
    });
  }

  renderIssued();
});
