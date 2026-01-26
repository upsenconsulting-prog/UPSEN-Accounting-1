import { getExpenses, addExpense, deleteExpense } from "../shared/store.js";

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return `€${v.toFixed(2)}`;
}

function renderExpenses() {
  const tbody = $("expenseTBody");
  if (!tbody) return;

  const list = getExpenses();
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No hay gastos registrados todavía.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date || "-"}</td>
      <td>${e.category || "-"}</td>
      <td>${moneyEUR(e.amount)}</td>
      <td>
        <span>${e.notes || ""}</span>
        <button class="btn btn-sm btn-outline-danger" data-del="${e.id}" style="float:right;">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteExpense(btn.getAttribute("data-del"));
      renderExpenses();
    });
  });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Abrir modal
  const newExpenseBtn = $("newExpenseBtn");
  if (newExpenseBtn) {
    newExpenseBtn.addEventListener("click", () => {
      const el = $("modalNewExpense");
      if (el && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(el).show();
      }
    });
  }

  // Guardar gasto
  const saveBtn = $("saveExpenseBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const form = $("formNewExpense");
      if (!form) return;

      const fd = new FormData(form);
      const date = String(fd.get("date") || "");
      const category = String(fd.get("category") || "");
      const amount = String(fd.get("amount") || "");
      const notes = String(fd.get("notes") || "");

      if (!date || !category || !amount) {
        alert("Completa: fecha, categoría e importe.");
        return;
      }

      addExpense({ date, category, amount, notes });

      // fechar modal
      const el = $("modalNewExpense");
      if (el && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(el).hide();
      }

      form.reset();
      renderExpenses();
    });
  }

  renderExpenses();
});
