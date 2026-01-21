import { getExpenses, addExpense, deleteExpense } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function parseEuroToNumber(str) {
  // aceita "€120,00" ou "120,00" ou "120.00"
  if (typeof str !== "string") return Number(str || 0);
  const s = str.replace("€", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

function renderExpenses() {
  const tbody = $("expenseTBody");
  if (!tbody) return;

  const items = getExpenses();
  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No hay gastos registrados.
        </td>
      </tr>`;
    return;
  }

  items.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.expenseDate || "-"}</td>
      <td>${e.category || "-"}</td>
      <td>${formatEUR(e.amount ?? 0)}</td>
      <td>${e.description || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // ⚙️ Se ainda tens linhas hardcoded no HTML, vamos "importá-las" 1x para o store
  // Assim não perdes o que já estava no template.
  const tbody = $("expenseTBody");
  if (tbody) {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const hasSeed = localStorage.getItem("upsen_expenses_seeded");

    if (!hasSeed && rows.length) {
      rows.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 4) return;

        addExpense({
          expenseDate: tds[0].textContent.trim(),
          category: tds[1].textContent.trim(),
          amount: parseEuroToNumber(tds[2].textContent.trim()),
          description: tds[3].textContent.trim(),
          supplier: "", // não existe na tua tabela atual
        });
      });

      localStorage.setItem("upsen_expenses_seeded", "true");
    }
  }

  renderExpenses();

  // Se tens botão/modal de "novo gasto", depois ligamos — por enquanto garantimos lista dinâmica.
});
