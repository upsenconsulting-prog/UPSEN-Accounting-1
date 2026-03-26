(function() {
  'use strict';

// Firebase compat mode - initialize if not done
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
}

const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);

  const getUserCollection = () => {
    const db = getDb();
    if (!db) throw new Error("Firestore no disponible. Verifique la configuración.");
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    return db.collection("companies").doc(user.uid).collection("invoices");
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  window.InvoiceService = {
    async createInvoice(invoiceData) {
      try {
        const docRef = await getUserCollection().add({
          ...invoiceData,
          estado: invoiceData.estado || "pendiente",
          fecha: invoiceData.fecha || new Date().toISOString().split("T")[0],
          fecha_creacion: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
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
        const snapshot = await getUserCollection().get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas:", error);
        return [];
      }
    },

    async editInvoice(id, invoiceData) {
      try {
        await getUserCollection().doc(id).update({ ...invoiceData });
        console.log("Factura editada:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar factura:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteInvoice(id) {
      try {
        await getUserCollection().doc(id).delete();
        console.log("Factura eliminada:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al eliminar factura:", error);
        return { success: false, message: error.message };
      }
    },

    async getInvoicesByClient(clientId) {
      try {
        const snapshot = await getUserCollection().where("clientId", "==", clientId).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas por cliente:", error);
        return [];
      }
    },

    async getInvoicesByProvider(providerId) {
      try {
        const snapshot = await getUserCollection().where("providerId", "==", providerId).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer facturas por proveedor:", error);
        return [];
      }
    }
  };

  console.log('InvoiceService loaded as window.InvoiceService');
})();
