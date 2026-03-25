(function() {
  'use strict';

// Firebase compat mode - initialize if not done
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
const firestore = firebase.firestore();
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } = firestore;
const db = firestore;

  if (!db) {
    console.error('Firestore db not available.');
    window.InvoiceService = null;
    return;
  }

  window.InvoiceService = {
    async createInvoice(invoiceData) {
      try {
        const docRef = await addDoc(collection(db, "invoices"), {
          ...invoiceData,
          estado: invoiceData.estado || "pendiente",
          fecha: invoiceData.fecha || new Date().toISOString().split("T")[0],
          fecha_creacion: serverTimestamp()
        });
        console.log("Factura creada con ID:", docRef.id);
        return { success: true, id: docRef.id };
      } catch (error) {
        console.error("Error al crear factura:", error);
        return { success: false, message: error.message };
      }
    },

    async getInvoices() {
      try {
        const snapshot = await getDocs(collection(db, "invoices"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas:", error);
        return [];
      }
    },

    async editInvoice(id, invoiceData) {
      try {
        const invoiceRef = doc(db, "invoices", id);
        await updateDoc(invoiceRef, { ...invoiceData });
        console.log("Factura editada:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar factura:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteInvoice(id) {
      try {
        await deleteDoc(doc(db, "invoices", id));
        console.log("Factura eliminada:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al eliminar factura:", error);
        return { success: false, message: error.message };
      }
    },

    async getInvoicesByClient(clientId) {
      try {
        const q = query(collection(db, "invoices"), where("clientId", "==", clientId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas por cliente:", error);
        return [];
      }
    },

    async getInvoicesByProvider(providerId) {
      try {
        const q = query(collection(db, "invoices"), where("providerId", "==", providerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas por proveedor:", error);
        return [];
      }
    }
  };

  console.log('InvoiceService loaded as window.InvoiceService');
})();

