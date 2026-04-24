import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "./firebase.js";

// Validări inline
const validateNifNie = (value) => /^[0-9]{8}[A-Z]$/i.test(value) || /^[XYZ][0-9]{7}[A-Z]$/i.test(value);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const createClient = async (clientData) => {
  if (!validateNifNie(clientData.nif_nie_cif)) {
    console.error("NIF/NIE invalid:", clientData.nif_nie_cif);
    return;
  }
  if (!validateEmail(clientData.email)) {
    console.error("Email invalid:", clientData.email);
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "clients"), { ...clientData, fecha_creacion: serverTimestamp() });
    console.log("Cliente creado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear cliente:", error);
  }
};

export const getClients = async () => {
  try {
    const snapshot = await getDocs(collection(db, "clients"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer clientes:", error);
    return [];
  }
};

export const editClient = async (id, clientData) => {
  if (clientData.nif_nie_cif && !validateNifNie(clientData.nif_nie_cif)) return console.error("NIF/NIE invalid:", clientData.nif_nie_cif);
  if (clientData.email && !validateEmail(clientData.email)) return console.error("Email invalid:", clientData.email);

  try {
    const clientRef = doc(db, "clients", id);
    await updateDoc(clientRef, { ...clientData });
    console.log("Cliente editado:", id);
  } catch (error) {
    console.error("Error al editar cliente:", error);
  }
};

export const deleteClient = async (id) => {
  try {
    const invoicesRef = collection(db, "invoices");
    const q = query(invoicesRef, where("clientId", "==", id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return console.log("No se puede eliminar cliente con facturas asociadas");

    await deleteDoc(doc(db, "clients", id));
    console.log("Cliente eliminado:", id);
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
  }
};
