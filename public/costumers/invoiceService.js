import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "./firebase.js";

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

const getInvoicesCollection = () => {
  const userId = getCurrentUserId();
  if (userId) {
    return collection(db, "companies", userId, "invoices");
  }

  return collection(db, "invoices");
};

const getInvoiceDocRef = (id) => {
  const userId = getCurrentUserId();
  return userId
    ? doc(db, "companies", userId, "invoices", id)
    : doc(db, "invoices", id);
};

const normalizeInvoice = (invoiceData = {}) => ({
  clientId: (invoiceData.clientId || '').trim(),
  providerId: (invoiceData.providerId || '').trim(),
  numero: (invoiceData.numero || '').trim(),
  total: Number(invoiceData.total || 0),
  fecha: (invoiceData.fecha || '').trim() || new Date().toISOString().split("T")[0],
  estado: (invoiceData.estado || 'pendiente').trim(),
  descripcion: (invoiceData.descripcion || '').trim()
});

const validateInvoice = (invoiceData) => {
  if (!invoiceData.clientId || !invoiceData.providerId || !invoiceData.numero) {
    return "Numero, cliente y proveedor son obligatorios";
  }

  if (!(invoiceData.total > 0)) {
    return "El total debe ser mayor que cero";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceData.fecha) || Number.isNaN(new Date(invoiceData.fecha + 'T00:00:00').getTime())) {
    return "La fecha de la factura no es valida";
  }

  return null;
};

export const createInvoice = async ({ clientId, providerId, numero, total, fecha, estado, descripcion }) => {
  try {
    const invoiceData = normalizeInvoice({ clientId, providerId, numero, total, fecha, estado, descripcion });
    const validationError = validateInvoice(invoiceData);
    if (validationError) {
      console.error(validationError);
      return;
    }

    const invoicesRef = getInvoicesCollection();
    const duplicateSnapshot = await getDocs(query(invoicesRef, where("numero", "==", invoiceData.numero)));
    if (!duplicateSnapshot.empty) {
      console.error("Ya existe una factura con ese numero");
      return;
    }

    const docRef = await addDoc(invoicesRef, {
      ...invoiceData,
      fecha_creacion: serverTimestamp()
    });
    console.log("Factura creada con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear factura:", error);
  }
};

export const getInvoices = async () => {
  try {
    const snapshot = await getDocs(getInvoicesCollection());
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer facturas:", error);
    return [];
  }
};

export const editInvoice = async (id, invoiceData) => {
  try {
    const normalized = normalizeInvoice(invoiceData);
    const validationError = validateInvoice(normalized);
    if (validationError) {
      console.error(validationError);
      return;
    }

    const invoicesRef = getInvoicesCollection();
    const duplicateSnapshot = await getDocs(query(invoicesRef, where("numero", "==", normalized.numero)));
    const conflict = duplicateSnapshot.docs.find(entry => entry.id !== id);
    if (conflict) {
      console.error("Ya existe otra factura con ese numero");
      return;
    }

    await updateDoc(getInvoiceDocRef(id), {
      ...normalized
    });
    console.log("Factura editada:", id);
  } catch (error) {
    console.error("Error al editar factura:", error);
  }
};

export const deleteInvoice = async (id) => {
  try {
    await deleteDoc(getInvoiceDocRef(id));
    console.log("Factura eliminada:", id);
  } catch (error) {
    console.error("Error al eliminar factura:", error);
  }
};

export const getInvoicesByClient = async (clientId) => {
  try {
    const snapshot = await getDocs(query(getInvoicesCollection(), where("clientId", "==", clientId)));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer facturas por cliente:", error);
    return [];
  }
};

export const getInvoicesByProvider = async (providerId) => {
  try {
    const snapshot = await getDocs(query(getInvoicesCollection(), where("providerId", "==", providerId)));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer facturas por proveedor:", error);
    return [];
  }
};
