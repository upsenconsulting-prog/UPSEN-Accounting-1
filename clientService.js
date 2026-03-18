import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { doc, updateDoc } from "firebase/firestore";

// Funcții de validare
export const validateNifNie = (value) => {
  const nifRegex = /^[0-9]{8}[A-Z]$/i;          // NIF
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/i;    // NIE
  return nifRegex.test(value) || nieRegex.test(value);
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


export const editClient = async (id, clientData) => {
  try {
    const clientRef = doc(db, "clients", id);
    await updateDoc(clientRef, {
      ...clientData
    });
    console.log("Cliente editado:", id);
  } catch (error) {
    console.error("Error al editar cliente:", error);
  }
};

// Funcție pentru a crea un client
export const createClient = async (clientData) => {
  // Validări
  if (!validateNifNie(clientData.nif_nie_cif)) {
    console.error("NIF/NIE invalid:", clientData.nif_nie_cif);
    return;
  }
  if (!validateEmail(clientData.email)) {
    console.error("Email invalid:", clientData.email);
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "clients"), {
      ...clientData,
      fecha_creacion: serverTimestamp()
    });
    console.log("Cliente creado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear cliente:", error);
  }
};


// Funcție pentru a lista toți clienții
export const getClients = async () => {
  try {
    const snapshot = await getDocs(collection(db, "clients"));
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return clients;
  } catch (error) {
    console.error("Error al leer clientes:", error);
    return [];
  }
};
