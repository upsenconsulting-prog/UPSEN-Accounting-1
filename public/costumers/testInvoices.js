import { 
  createClient, getClients, editClient, deleteClient 
} from "../../src/services/clients/clientService.js";
import { 
  createProvider, getProviders, editProvider, deleteProvider 
} from "../../src/services/providers/providerService.js";
import { 
  createInvoice, getInvoices 
} from "../../src/services/invoices/invoiceService.js";

const runAllTests = async () => {
  console.log("=== CREATE CLIENT ===");
  await createClient({
    nombre: "Cliente Test",
    nif_nie_cif: "87654321A",
    direccion_fiscal: "Calle Test 1",
    email: "cliente@test.com",
    telefono: "123456789",
    pais: "España"
  });
  let clients = await getClients();
  console.log("Clientes:", clients);

  console.log("=== CREATE PROVIDER ===");
  await createProvider({
    nombre: "Proveedor Test",
    nif_nie_cif: "12345678A",
    direccion_fiscal: "Calle Provider 1",
    email: "provider@test.com",
    telefono: "987654321",
    pais: "España"
  });
  let providers = await getProviders();
  console.log("Proveedores:", providers);

  console.log("=== CREATE INVOICE ===");
  const clientId = clients[clients.length - 1].id;
  const providerId = providers[providers.length - 1].id;
  await createInvoice({
    clientId,
    providerId,
    numero: "FAC-TEST-001",
    fecha: new Date().toISOString().split("T")[0],
    total: 500,
    estado: "pendiente"
  });
  let invoices = await getInvoices();
  console.log("Facturas:", invoices);

  console.log("=== EDIT CLIENT ===");
  await editClient(clients[0].id, { nombre: "Cliente Modificado", email: "modificado@cliente.com" });

  console.log("=== EDIT PROVIDER ===");
  await editProvider(providers[0].id, { nombre: "Proveedor Modificado", email: "modificado@provider.com" });

  console.log("=== DELETE CLIENT (SHOULD FAIL IF HAS INVOICE) ===");
  const clientToDelete = clients[0].id;
  const hasInvoice = invoices.some(inv => inv.clientId === clientToDelete);
  if (hasInvoice) {
    console.log("No se puede eliminar cliente con facturas asociadas");
  } else {
    await deleteClient(clientToDelete);
  }

  console.log("=== DELETE PROVIDER (SHOULD FAIL IF HAS INVOICE) ===");
  const providerToDelete = providers[0].id;
  const hasInvoiceProvider = invoices.some(inv => inv.providerId === providerToDelete);
  if (hasInvoiceProvider) {
    console.log("No se puede eliminar proveedor con facturas asociadas");
  } else {
    await deleteProvider(providerToDelete);
  }

  console.log("=== FINAL CLIENTS ===");
  clients = await getClients();
  console.log(clients);

  console.log("=== FINAL PROVIDERS ===");
  providers = await getProviders();
  console.log(providers);
};

runAllTests();
