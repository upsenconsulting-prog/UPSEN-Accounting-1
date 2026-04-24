import { editClient, getClients } from "../../src/services/clients/clientService.js";

async function runTest() {
  const clients = await getClients();
  const id = clients[0].id; // ia primul client din listă

  await editClient(id, { nombre: "Cliente Editado", email: "nuevo@cliente.com" });

  console.log("Modificat client!");
}

runTest();
