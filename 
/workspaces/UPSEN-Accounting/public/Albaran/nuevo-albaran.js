const clientes = ["Cliente A", "Cliente B", "Cliente C"];
const clientesDropdown = document.getElementById("clientesDropdown");
clientes.forEach(c => {
  const option = document.createElement("option");
  option.textContent = c;
  clientesDropdown.appendChild(option);
});

function format(num) {
  return num.toFixed(2) + " €";
}

function calcularTotales() {
  let baseTotal = 0;
  let ivaTotal = 0;
  let retencion = parseFloat(document.getElementById("retencionSelect").value) || 0;

  document.querySelectorAll("#tablaConceptos tbody tr").forEach(row => {
    const qty = parseFloat(row.querySelector(".qty").value) || 0;
    const price = parseFloat(row.querySelector(".price").value) || 0;
    const desc = parseFloat(row.querySelector(".desc").value) || 0;
    const iva = parseFloat(row.querySelector(".iva").value) || 0;

    const base = qty * price * (1 - desc/100);
    const ivaCalc = base * iva/100;
    const subtotal = base + ivaCalc;

    row.querySelector(".base").value = format(base);
    row.querySelector(".subtotal").textContent = format(subtotal);

    baseTotal += base;
    ivaTotal += ivaCalc;
  });

  const retencionAmount = baseTotal * retencion/100;
  const totalFinal = baseTotal + ivaTotal - retencionAmount;

  document.getElementById("baseTotal").textContent = format(baseTotal);
  document.getElementById("ivaTotal").textContent = format(ivaTotal);
  document.getElementById("retencionTotal").textContent = format(retencionAmount);
  document.getElementById("totalFinal").textContent = format(totalFinal);
}

function addConcepto() {
  const tbody = document.querySelector("#tablaConceptos tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><input type="text" class="form-control"></td>
    <td class="text-center"><input type="number" class="form-control qty" value="1"></td>
    <td class="text-end"><input type="number" class="form-control price" value="0" step="0.01"></td>
    <td class="text-center"><input type="number" class="form-control desc" value="0"></td>
    <td class="text-center">
      <select class="form-select iva">
        <option>0</option>
        <option>10</option>
        <option selected>21</option>
      </select>
    </td>
    <td class="text-end"><input type="text" class="form-control base bg-light" readonly></td>
    <td class="text-end subtotal">0.00 €</td>
    <td class="text-center">
      <button class="btn btn-sm btn-danger removeBtn">X</button>
    </td>
  `;

  tbody.appendChild(row);

  row.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", calcularTotales);
  });

  row.querySelector(".removeBtn").addEventListener("click", e => {
    e.target.closest("tr").remove();
    calcularTotales();
  });

  calcularTotales();
}

document.getElementById("addConceptBtn").addEventListener("click", addConcepto);
document.getElementById("retencionSelect").addEventListener("change", calcularTotales);
addConcepto();