import { useEffect, useState } from "react";
import { createClient, getClients } from "./clientService";

function App() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    // Fetch lista de clienți fără a crea automat
    const fetchClients = async () => {
      const clientsList = await getClients();
      setClients(clientsList);
    };

    fetchClients();
  }, []);

  // Funcție pentru test: adaugă un client nou (poți rula manual în consolă)
  const addTestClient = async () => {
    await createClient({
      nombre: "Mi Empresa SRL",
      nif_nie_cif: "87654321",
      direccion_fiscal: "Calle Real 10",
      email: "contacto@empresa.com",
      telefono: "0723456789",
      pais: "España"
    });
    const clientsList = await getClients();
    setClients(clientsList);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Clientes App</h1>
      <button onClick={addTestClient}>Añadir Cliente de Test</button>
      <ul>
        {clients.map(client => (
          <li key={client.id}>
            {client.nombre} - {client.email} - {client.pais}
          </li>
        ))}
      </ul>
    </div>
  );
}

<button onClick={async () => {
  await createProvider({
    nombre: "Proveedor Ejemplo",
    nif_nie_cif: "12345678A",
    direccion_fiscal: "Calle Falsa 123",
    email: "contacto@proveedor.com",
    telefono: "0123456789",
    pais: "España"
  });
  alert("Furnizor adăugat!");
}}>
  Adaugă Furnizor de Test
</button>


export default App;
