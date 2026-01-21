import { getInvoicesIssued, addInvoiceIssued, deleteInvoiceIssued } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function parseEuroToNumber(str) {
  if (typeof str !== "string") return Number(str || 0);
  const s = str.replace("€", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

function renderIssued() {
  const tbody = $("invoiceTbody");
  if (!tbody) return;

  const items = getInvoicesIssued();
  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No hay facturas emitidas registradas.
        </td>
      </tr>`;
    return;
  }

  items.forEach((inv) => {
    const statusClass =
      inv.state === "Pagada" ? "status-paid" :
      inv.state === "Pendiente" ? "status-pending" :
      inv.state === "Vencida" ? "status-overdue" : "status-pending";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.invoiceNumber || "-"}</td>
      <td>${inv.customer || "-"}</td>
      <td>${inv.invoiceDate || "-"}</td>
      <td>${inv.dueDate || "-"}</td>
      <td>${formatEUR(inv.amount ?? 0)}</td>
      <td><span class="status-badge ${statusClass}">${inv.state || "Pendiente"}</span></td>
      <td>
        <button class="btn" style="padding:4px 8px;font-size:12px;">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Importa as linhas hardcoded do template para o store 1x
  const tbody = $("invoiceTbody");
  if (tbody) {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const hasSeed = localStorage.getItem("upsen_issued_seeded");

    if (!hasSeed && rows.length) {
      rows.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 6) return;

        const number = tds[0].textContent.trim();
        const customer = tds[1].textContent.trim();
        const invDate = tds[2].textContent.trim();
        const dueDate = tds[3].textContent.trim();
        const amount = parseEuroToNumber(tds[4].textContent.trim());
        const state = tr.querySelector(".status-badge")?.textContent?.trim() || "Pendiente";

        addInvoiceIssued({
          invoiceNumber: number,
          invoiceDate: invDate,
          customer,
          amount,
          state,
        });

        // guardamos dueDate como extra (não estava no store base)
        // Se quiseres 100%: adiciona dueDate no store também.
        const issued = getInvoicesIssued();
        const latest = issued[0];
        if (latest && latest.invoiceNumber === number) {
          latest.dueDate = dueDate;
          localStorage.setItem("upsen_invoices_issued_v1", JSON.stringify(issued));
        }
      });

      localStorage.setItem("upsen_issued_seeded", "true");
    }
  }

  renderIssued();
});
