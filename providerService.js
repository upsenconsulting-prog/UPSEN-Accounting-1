// providerService.js
import { db } from "./firebase.js";
import { doc, updateDoc } from "firebase/firestore";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

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


// Creează un furnizor
export const createProvider = async (providerData) => {
  // Validări
  if (!validateNifNie(providerData.nif_nie_cif)) {
    console.error("NIF/NIE invalid:", providerData.nif_nie_cif);
    return;
  }
  if (!validateEmail(providerData.email)) {
    console.error("Email invalid:", providerData.email);
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "providers"), {
      ...providerData,
      fecha_creacion: serverTimestamp()
    });
    console.log("Proveedor creado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
  }
};


// Listează toți furnizorii
export const getProviders = async () => {
  try {
    const snapshot = await getDocs(collection(db, "providers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer proveedores:", error);
    return [];
  }
};

export const editProvider = async (id, updatedData) => {
  const providerRef = doc(db, "providers", id);
  await updateDoc(providerRef, updatedData);
  console.log("Proveedor editado:", id);
};