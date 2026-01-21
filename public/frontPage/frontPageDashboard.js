import {
    sumInvoicesReceivedMonth,
    countInvoicesReceivedMonth,
    countInvoicesReceivedPending
} from "../shared/store.js";

function formatEUR(n) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n ||0);
}
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const totalReceived = sumInvoicesReceivedMonth(y, m);
  const countReceived = countInvoicesReceivedMonth(y, m);
  const pendingReceived = countInvoicesReceivedPending();

  // IDs que vamos criar no HTML (muito simples)
  const elReceivedTotal = document.getElementById("kpi-received-total");
  const elReceivedCount = document.getElementById("kpi-received-count");
  const elPending = document.getElementById("kpi-received-pending");

  if (elReceivedTotal) elReceivedTotal.textContent = formatEUR(totalReceived);
  if (elReceivedCount) elReceivedCount.textContent = String(countReceived);
  if (elPending) elPending.textContent = String(pendingReceived);
});