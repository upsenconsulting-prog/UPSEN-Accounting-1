(function() {
  'use strict';

// Firebase compat mode - initialize if not done
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
}

const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);

  const SIMPLE_STATES = ['pendiente', 'pagada', 'parcial', 'vencida'];

  const normalizeState = (value) => {
    const state = String(value || 'pendiente').trim().toLowerCase();
    return SIMPLE_STATES.includes(state) ? state : 'pendiente';
  };

  const normalizeDate = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const getInvoiceNumberField = (data) => data.numero || data.invoiceNumber || '';

  const ensurePositiveTotal = (value) => {
    const total = Number(value);
    return Number.isFinite(total) && total > 0 ? total : null;
  };

  const findDuplicateInvoiceNumber = async (numero, excludeId) => {
    const query = await getUserCollection().where('numero', '==', numero).get();
    return query.docs.some(function(doc) {
      return !excludeId || doc.id !== excludeId;
    });
  };

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
        const numero = getInvoiceNumberField(invoiceData).trim();
        const total = ensurePositiveTotal(invoiceData.total);
        if (!numero) {
          return { success: false, message: 'El número de factura es obligatorio' };
        }
        if (total === null) {
          return { success: false, message: 'El total debe ser mayor que cero' };
        }
        if (await findDuplicateInvoiceNumber(numero)) {
          return { success: false, message: 'Ya existe una factura con ese número' };
        }

        const timestamp = getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString();
        const payload = {
          ...invoiceData,
          numero,
          total,
          estado: normalizeState(invoiceData.estado),
          fecha: normalizeDate(invoiceData.fecha),
          fecha_creacion: timestamp,
          fecha_actualizacion: timestamp,
          stateHistory: [{ state: normalizeState(invoiceData.estado), previousState: null, changedAt: new Date().toISOString() }]
        };

        const docRef = await getUserCollection().add(payload);
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
        const currentDoc = await getUserCollection().doc(id).get();
        if (!currentDoc.exists) {
          return { success: false, message: 'La factura no existe' };
        }

        const current = currentDoc.data() || {};
        const numero = getInvoiceNumberField(invoiceData).trim() || current.numero || current.invoiceNumber;
        const total = invoiceData.total !== undefined ? ensurePositiveTotal(invoiceData.total) : ensurePositiveTotal(current.total);
        if (!numero) {
          return { success: false, message: 'El número de factura es obligatorio' };
        }
        if (total === null) {
          return { success: false, message: 'El total debe ser mayor que cero' };
        }
        if (numero !== current.numero && await findDuplicateInvoiceNumber(numero, id)) {
          return { success: false, message: 'Ya existe una factura con ese número' };
        }

        const nextState = normalizeState(invoiceData.estado || current.estado);
        const previousState = normalizeState(current.estado);
        const nextHistory = Array.isArray(current.stateHistory) ? current.stateHistory.slice() : [];
        if (nextState !== previousState) {
          nextHistory.push({ state: nextState, previousState, changedAt: new Date().toISOString() });
        }

        await getUserCollection().doc(id).update({
          ...invoiceData,
          numero,
          total,
          estado: nextState,
          fecha: normalizeDate(invoiceData.fecha || current.fecha),
          fecha_actualizacion: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString(),
          stateHistory: nextHistory
        });
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
