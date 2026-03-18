import { createClient, getClients, editClient } from "./clientService.js";
import { createProvider, getProviders, editProvider } from "./providerService.js";

async function testClientes() {
  console.log("\n=== TEST CLIENTES ===");

  // 1. Crear cliente válido
  await createClient({
    nombre: "Mi Empresa SRL",
    nif_nie_cif: "87654321A",  // NIF válido
    direccion_fiscal: "Calle Real 10",
    email: "contacto@empresa.com", // email válido
    telefono: "0723456789",
    pais: "España"
  });

  // 2. Crear cliente inválido
  await createClient({
    nombre: "Cliente Inválido",
    nif_nie_cif: "INVALID",   // NIF/NIE inválido
    direccion_fiscal: "Calle 123",
    email: "malemail@",        // email inválido
    telefono: "000",
    pais: "España"
  });

  // 3. Editar cliente existente
  const clientes = await getClients();
  if (clientes.length > 0) {
    const id = clientes[0].id;
    await editClient(id, {
      nombre: "Cliente Modificado",
      email: "modificado@cliente.com"
    });
    console.log("Cliente editado con éxito:", id);
  }

  console.log("Lista de clientes:", await getClients());
}

async function testProveedores() {
  console.log("\n=== TEST PROVEEDORES ===");

  // 1. Crear proveedor válido
  await createProvider({
    nombre: "Proveedor Ejemplo",
    nif_nie_cif: "12345678A",  // NIF válido
    direccion_fiscal: "Calle Falsa 123",
    email: "contacto@proveedor.com", // email válido
    telefono: "0123456789",
    pais: "España"
  });

  // 2. Crear proveedor inválido
  await createProvider({
    nombre: "Proveedor Inválido",
    nif_nie_cif: "ZZZZ",       // NIF/NIE inválido
    direccion_fiscal: "Calle 456",
    email: "malemail@",          // email inválido
    telefono: "999",
    pais: "España"
  });

  // 3. Editar proveedor existente
  const proveedores = await getProviders();
  if (proveedores.length > 0) {
    const id = proveedores[0].id;
    await editProvider(id, {
      nombre: "Proveedor Modificado",
      email: "modificado@proveedor.com"
    });
    console.log("Proveedor editado con éxito:", id);
  }

  console.log("Lista de proveedores:", await getProviders());
}

// Ejecutar todos los tests
async function runAllTests() {
  await testClientes();
  await testProveedores();
}

runAllTests();
