import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

export const createInvoice = async ({ clientId, providerId, numero, total, fecha }) => {
  try {
    const docRef = await addDoc(collection(db, "invoices"), {
      clientId,
      providerId,
      numero,
      total,
      fecha: fecha || new Date().toISOString().split("T")[0],
      estado: "pendiente",
      fecha_creacion: serverTimestamp()
    });
    console.log("Factura creada con ID:", docRef.id);
  } catch (error) {
    console.error("Error al crear factura:", error);
  }
};

export const getInvoices = async () => {
  try {
    const snapshot = await getDocs(collection(db, "invoices"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al leer facturas:", error);
    return [];
  }
};
