import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "./firebase.js";

// Validări inline
const validateNifNie = (value) => /^[0-9]{8}[A-Z]$/i.test(value) || /^[XYZ][0-9]{7}[A-Z]$/i.test(value);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const createProvider = async (providerData) => {
  if (!validateNifNie(providerData.nif_nie_cif)) return console.error("NIF/NIE invalid:", providerData.nif_nie_cif);
  if (!validateEmail(providerData.email)) return console.error("Email invalid:", providerData.email);

  try {
    const docRef = await addDoc(collection(db, "providers"), { ...providerData, fecha_creacion: serverTimestamp() });
    console.log("Proveedor creado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
  }
};

export const getProviders = async () => {
  try {
    const snapshot = await getDocs(collection(db, "providers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer proveedores:", error);
    return [];
  }
};

export const editProvider = async (id, providerData) => {
  if (providerData.nif_nie_cif && !validateNifNie(providerData.nif_nie_cif)) return console.error("NIF/NIE invalid:", providerData.nif_nie_cif);
  if (providerData.email && !validateEmail(providerData.email)) return console.error("Email invalid:", providerData.email);

  try {
    const providerRef = doc(db, "providers", id);
    await updateDoc(providerRef, { ...providerData });
    console.log("Proveedor editado:", id);
  } catch (error) {
    console.error("Error al editar proveedor:", error);
  }
};

export const deleteProvider = async (id) => {
  try {
    const invoicesRef = collection(db, "invoices");
    const q = query(invoicesRef, where("providerId", "==", id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return console.log("No se puede eliminar proveedor con facturas asociadas");

    await deleteDoc(doc(db, "providers", id));
    console.log("Proveedor eliminado:", id);
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
  }
};
