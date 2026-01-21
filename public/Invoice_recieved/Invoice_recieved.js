// public/Invoice_recieved/Invoice_recieved.js
import {
  getInvoicesRecieved,
  addInvoiceRecieved,
  deleteInvoiceRecieved,
} from "../shared/store.js";

// ====== Helpers UI ======
function $(id) {
  return document.getElementById(id);
}

function formatEUR(n) {
  const value = Number(n || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function renderTable() {
  const tbody = $("invoiceTbody");
  if (!tbody) return;

  const invoices = getInvoicesRecieved();
  tbody.innerHTML = "";

  if (!invoices.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No hay facturas para el período seleccionado.<br/>
          Puedes cambiar el período usando el selector en la parte superior derecha.
        </td>
      </tr>
    `;
    return;
  }

  invoices.forEach((inv) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.state || "-"}</td>
      <td>${inv.invoiceDate || "-"}</td>
      <td>${inv.supplier || "-"}</td>
      <td>${formatEUR(inv.amount ?? 0)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger" data-del="${inv.id}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Delete handlers
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteInvoiceRecieved(id);
      renderTable();
    });
  });
}

// ====== Modal bootstrap helpers ======
function openModalById(modalId) {
  const el = $(modalId);
  if (!el) {
    alert(`No encuentro el modal #${modalId} en el HTML.`);
    return null;
  }

  if (window.bootstrap?.Modal) {
    const instance = window.bootstrap.Modal.getOrCreateInstance(el);
    instance.show();
    return instance;
  }

  // fallback simples (caso bootstrap falhe)
  el.classList.add("show");
  el.style.display = "block";
  el.removeAttribute("aria-hidden");
  return null;
}

function closeModalById(modalId) {
  const el = $(modalId);
  if (!el) return;

  if (window.bootstrap?.Modal) {
    const instance = window.bootstrap.Modal.getOrCreateInstance(el);
    instance.hide();
    return;
  }

  el.classList.remove("show");
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

// ====== Main ======
document.addEventListener("DOMContentLoaded", () => {
  // Toggle filtro
  const btnFilter = $("btnFilter");
  const filterCard = $("filterCard");
  if (btnFilter && filterCard) {
    btnFilter.addEventListener("click", () => {
      filterCard.classList.toggle("d-none");
    });
  }

  // Abrir modal Nueva Factura
  const btnNew = document.getElementById("btnNewInvoice");
if (btnNew) {
  btnNew.addEventListener("click", () => {
    const modalEl = document.getElementById("modalNewInvoice");
    if (!modalEl) {
      alert("No encuentro el modal #modalNewInvoice en el HTML.");
      return;
    }
    window.bootstrap?.Modal.getOrCreateInstance(modalEl).show();
  });
}

const saveBtn = document.getElementById("saveInvoiceBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const form = document.getElementById("formNewInvoice");
    if (!form) return;

    const fd = new FormData(form);

    const invoiceNumber = (fd.get("invoiceNumber") || "").toString();
    const invoiceDate = (fd.get("invoiceDate") || "").toString();
    const supplier = (fd.get("supplier") || "").toString();
    const amount = (fd.get("amount") || "").toString();
    const state = (fd.get("state") || "Pendiente").toString();

    if (!invoiceNumber || !invoiceDate || !supplier || !amount) {
      alert("Completa: número, fecha, proveedor e importe.");
      return;
    }

    addInvoiceRecieved({ invoiceNumber, invoiceDate, supplier, amount, state });

    form.reset();
    window.bootstrap?.Modal.getOrCreateInstance(document.getElementById("modalNewInvoice")).hide();
    renderTable();
  });
}


  // Abrir modal OCR (mock)
  const btnNewOCR = $("btnNewInvoiceOCR");
  if (btnNewOCR) {
    btnNewOCR.addEventListener("click", () => {
      openModalById("modalNewInvoiceOCR");
    });
  }


  // Upload OCR (mock)
  const saveOCRBtn = $("saveOCRBtn");
  if (saveOCRBtn) {
    saveOCRBtn.addEventListener("click", () => {
      const form = $("formOCRInvoice");
      if (!form) return;

      const fileInput = form.elements["ocrFile"];
      const file = fileInput?.files?.[0];

      if (!file) {
        alert("Selecciona un archivo primero.");
        return;
      }

      addInvoiceRecieved({
        invoiceNumber: "OCR-" + Date.now(),
        invoiceDate: new Date().toISOString().slice(0, 10),
        supplier: "",
        amount: 0,
        state: "Pendiente",
        ocrFileName: file.name,
      });

      form.reset();
      closeModalById("modalNewInvoiceOCR");
      renderTable();
    });
  }

  // Render inicial
  renderTable();
});

window.addEventListener("load", () => {
  document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "auto";
});

