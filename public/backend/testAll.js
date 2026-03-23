import { createClient, editClient, getClients, deleteClient } from "./clientService.js";
import { createProvider, editProvider, getProviders, deleteProvider } from "./providerService.js";
import { createInvoice } from "./invoiceService.js";

async function runAllTests() {

  // ==============================
  // CLIENTS
  // ==============================
  console.log("=== CREATE CLIENT ===");

  await createClient({
    nombre: "Cliente Test",
    nif_nie_cif: "87654321A",
    direccion_fiscal: "Calle Test 1",
    email: "cliente@test.com",
    telefono: "123456789",
    pais: "España"
  });

  const clients = await getClients();
  const clientId = clients[0].id;

  console.log("Clientes:", clients);


  // ==============================
  // PROVIDERS
  // ==============================
  console.log("=== CREATE PROVIDER ===");

  await createProvider({
    nombre: "Proveedor Test",
    nif_nie_cif: "12345678A",
    direccion_fiscal: "Calle Provider 1",
    email: "provider@test.com",
    telefono: "987654321",
    pais: "España"
  });

  const providers = await getProviders();
  const providerId = providers[0].id;

  console.log("Proveedores:", providers);


  // ==============================
  // CREATE INVOICE
  // ==============================
  console.log("=== CREATE INVOICE ===");

  await createInvoice({
    numero: "FAC-" + Date.now(),
    fecha: "2026-03-19",
    clientId,
    providerId,
    total: 100,
    estado: "pendiente"
  });


  // ==============================
  // EDIT CLIENT
  // ==============================
  console.log("=== EDIT CLIENT ===");

  await editClient(clientId, {
    nombre: "Cliente Modificado",
    email: "modificado@cliente.com"
  });


  // ==============================
  // EDIT PROVIDER
  // ==============================
  console.log("=== EDIT PROVIDER ===");

  await editProvider(providerId, {
    nombre: "Proveedor Modificado",
    email: "modificado@provider.com"
  });


  // ==============================
  // TRY DELETE CLIENT (should FAIL)
  // ==============================
  console.log("=== DELETE CLIENT (SHOULD FAIL) ===");

  await deleteClient(clientId);


  // ==============================
  // TRY DELETE PROVIDER (should FAIL)
  // ==============================
  console.log("=== DELETE PROVIDER (SHOULD FAIL) ===");

  await deleteProvider(providerId);


  // ==============================
  // FINAL STATE
  // ==============================
  console.log("=== FINAL CLIENTS ===");
  console.log(await getClients());

  console.log("=== FINAL PROVIDERS ===");
  console.log(await getProviders());
}

runAllTests();
