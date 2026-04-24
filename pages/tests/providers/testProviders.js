import { createProvider, getProviders } from "../../services/providers/providerService.js";

async function runTest() {
  console.log("=== TEST PROVIDER VALID ===");
  await createProvider({
    nombre: "Proveedor Ejemplo",
    nif_nie_cif: "12345678A", // valid
    direccion_fiscal: "Calle Falsa 123",
    email: "contacto@proveedor.com", // valid
    telefono: "0123456789",
    pais: "España"
  });

  console.log("=== TEST PROVIDER INVALID ===");
  await createProvider({
    nombre: "Proveedor Invalid",
    nif_nie_cif: "ZZZZ",       // invalid
    direccion_fiscal: "Calle 456",
    email: "invalid@",          // invalid
    telefono: "999",
    pais: "España"
  });

  const providers = await getProviders();
  console.log("Lista furnizori:", providers);
}

runTest();
