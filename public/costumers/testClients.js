import { createClient, getClients } from "../../src/services/clients/clientService.js";

async function run() {
  console.log("=== TEST CLIENT VALID ===");
  await createClient({
    nombre: "Mi Empresa SRL",
    nif_nie_cif: "87654321A",  // valid
    direccion_fiscal: "Calle Real 10",
    email: "contacto@empresa.com", // valid
    telefono: "0723456789",
    pais: "España"
  });

  console.log("=== TEST CLIENT INVALID ===");
  await createClient({
    nombre: "Cliente Invalid",
    nif_nie_cif: "INVALID",    // invalid
    direccion_fiscal: "Calle 123",
    email: "bademail@",         // invalid
    telefono: "000",
    pais: "España"
  });

  const clientsList = await getClients();
  console.log("Lista clienti:", clientsList);
}

run();
