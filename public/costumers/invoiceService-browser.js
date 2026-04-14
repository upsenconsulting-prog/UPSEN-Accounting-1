(function() {
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
  }

  const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);
  const normalizeString = (value) => (value || '').toString().trim();
  const normalizeDate = (value) => normalizeString(value);
  const isValidIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T00:00:00').getTime());

  const getUserCollection = () => {
    const db = getDb();
    if (!db) throw new Error('Firestore no disponible. Verifique la configuracion.');
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    return db.collection('companies').doc(user.uid).collection('invoices');
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  function normalizeInvoiceData(invoiceData) {
    return {
      numero: normalizeString(invoiceData.numero),
      clientId: normalizeString(invoiceData.clientId),
      providerId: normalizeString(invoiceData.providerId),
      total: Number(invoiceData.total || 0),
      estado: normalizeString(invoiceData.estado || 'pendiente') || 'pendiente',
      descripcion: normalizeString(invoiceData.descripcion),
      fecha: normalizeDate(invoiceData.fecha)
    };
  }

  function validateInvoiceData(invoiceData) {
    if (!invoiceData.numero || !invoiceData.clientId || !invoiceData.providerId) {
      return 'Numero, cliente y proveedor son obligatorios';
    }
    if (!(invoiceData.total > 0)) {
      return 'El total debe ser mayor que cero';
    }
    if (!invoiceData.fecha || !isValidIsoDate(invoiceData.fecha)) {
      return 'La fecha de la factura no es valida';
    }
    return null;
  }

  window.InvoiceService = {
    async createInvoice(invoiceData) {
      try {
        const normalizedData = normalizeInvoiceData(invoiceData);
        const validationError = validateInvoiceData(normalizedData);
        if (validationError) {
          return { success: false, message: validationError };
        }

        const now = getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString();
        const docRef = await getUserCollection().add({
          ...normalizedData,
          createdAt: now,
          updatedAt: now
        });
        console.log('Factura creada con ID:', docRef.id);
        return { success: true, id: docRef.id };
      } catch (error) {
        console.error('Error al crear factura:', error);
        return { success: false, message: error.message };
      }
    },

    async getInvoices() {
      try {
        const snapshot = await getUserCollection().get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer facturas:', error);
        return [];
      }
    },

    async editInvoice(id, invoiceData) {
      try {
        const normalizedData = normalizeInvoiceData(invoiceData);
        const validationError = validateInvoiceData(normalizedData);
        if (validationError) {
          return { success: false, message: validationError };
        }

        await getUserCollection().doc(id).update({
          ...normalizedData,
          updatedAt: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
        });
        console.log('Factura editada:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al editar factura:', error);
        return { success: false, message: error.message };
      }
    },

    async deleteInvoice(id) {
      try {
        await getUserCollection().doc(id).delete();
        console.log('Factura eliminada:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al eliminar factura:', error);
        return { success: false, message: error.message };
      }
    },

    async getInvoicesByClient(clientId) {
      try {
        const snapshot = await getUserCollection().where('clientId', '==', clientId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer facturas por cliente:', error);
        return [];
      }
    },

    async getInvoicesByProvider(providerId) {
      try {
        const snapshot = await getUserCollection().where('providerId', '==', providerId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer facturas por proveedor:', error);
        return [];
      }
    }
  };

  console.log('InvoiceService loaded as window.InvoiceService');
})();
