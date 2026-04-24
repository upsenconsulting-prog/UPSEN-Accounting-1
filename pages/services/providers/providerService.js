import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../firebase.js";

const validateNifNie = (value) => /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test((value || '').trim());
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

const getCurrentUserId = () => {
  try {
    const authUser = window?.AuthService?.getCurrentUser?.();
    if (authUser) {
      return authUser.uid || authUser.id || authUser.userId || null;
    }

    const session = localStorage.getItem('upsen_current_user');
    if (!session) return null;

    const data = JSON.parse(session);
    const user = data && data.user ? data.user : null;
    return user ? (user.uid || user.id || user.userId || null) : null;
  } catch (error) {
    return null;
  }
};

const getProvidersCollection = () => {
  const userId = getCurrentUserId();
  if (userId) {
    return collection(db, "companies", userId, "providers");
  }

  return collection(db, "providers");
};

const getInvoicesCollection = () => {
  const userId = getCurrentUserId();
  if (userId) {
    return collection(db, "companies", userId, "invoices");
  }

  return collection(db, "invoices");
};

const getProviderDocRef = (id) => {
  const userId = getCurrentUserId();
  return userId
    ? doc(db, "companies", userId, "providers", id)
    : doc(db, "providers", id);
};

const normalizeProvider = (providerData = {}) => ({
  nombre: (providerData.nombre || '').trim(),
  nif_nie_cif: (providerData.nif_nie_cif || '').trim().toUpperCase(),
  email: (providerData.email || '').trim().toLowerCase(),
  telefono: (providerData.telefono || '').trim(),
  direccion_fiscal: (providerData.direccion_fiscal || '').trim(),
  pais: (providerData.pais || '').trim(),
  fecha_creacion: providerData.fecha_creacion || serverTimestamp()
});

export const createProvider = async (providerData) => {
  const normalized = normalizeProvider(providerData);

  if (!normalized.nombre || !normalized.nif_nie_cif || !normalized.email) {
    return console.error("Faltan campos obligatorios");
  }

  if (!validateNifNie(normalized.nif_nie_cif)) return console.error("NIF/NIE/CIF invalid:", normalized.nif_nie_cif);
  if (!validateEmail(normalized.email)) return console.error("Email invalid:", normalized.email);

  try {
    const providersRef = getProvidersCollection();
    const nifSnapshot = await getDocs(query(providersRef, where("nif_nie_cif", "==", normalized.nif_nie_cif)));
    if (!nifSnapshot.empty) return console.error("Ya existe un proveedor con ese NIF/NIE/CIF");

    const emailSnapshot = await getDocs(query(providersRef, where("email", "==", normalized.email)));
    if (!emailSnapshot.empty) return console.error("Ya existe un proveedor con ese email");

    const docRef = await addDoc(providersRef, normalized);
    console.log("Proveedor creado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
  }
};

export const getProviders = async () => {
  try {
    const snapshot = await getDocs(getProvidersCollection());
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer proveedores:", error);
    return [];
  }
};

export const editProvider = async (id, providerData) => {
  const normalized = normalizeProvider(providerData);

  if (normalized.nif_nie_cif && !validateNifNie(normalized.nif_nie_cif)) return console.error("NIF/NIE/CIF invalid:", normalized.nif_nie_cif);
  if (normalized.email && !validateEmail(normalized.email)) return console.error("Email invalid:", normalized.email);

  try {
    const providersRef = getProvidersCollection();

    if (normalized.nif_nie_cif) {
      const nifSnapshot = await getDocs(query(providersRef, where("nif_nie_cif", "==", normalized.nif_nie_cif)));
      const nifConflict = nifSnapshot.docs.find(entry => entry.id !== id);
      if (nifConflict) return console.error("Otro proveedor ya usa ese NIF/NIE/CIF");
    }

    if (normalized.email) {
      const emailSnapshot = await getDocs(query(providersRef, where("email", "==", normalized.email)));
      const emailConflict = emailSnapshot.docs.find(entry => entry.id !== id);
      if (emailConflict) return console.error("Otro proveedor ya usa ese email");
    }

    const providerRef = getProviderDocRef(id);
    await updateDoc(providerRef, {
      nombre: normalized.nombre,
      nif_nie_cif: normalized.nif_nie_cif,
      email: normalized.email,
      telefono: normalized.telefono,
      direccion_fiscal: normalized.direccion_fiscal,
      pais: normalized.pais
    });
    console.log("Proveedor editado:", id);
  } catch (error) {
    console.error("Error al editar proveedor:", error);
  }
};

export const deleteProvider = async (id) => {
  try {
    const invoicesRef = getInvoicesCollection();
    const q = query(invoicesRef, where("providerId", "==", id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return console.log("No se puede eliminar proveedor con facturas asociadas");

    await deleteDoc(getProviderDocRef(id));
    console.log("Proveedor eliminado:", id);
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
  }
};
