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
  const SIMPLE_INVOICE_STATUS = {
    defaultValue: 'pendiente',
    labels: {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      pagada: 'Pagada'
    },
    aliases: {
      free: 'pendiente',
      emit: 'pendiente',
      paid: 'pagada',
      partial: 'parcial'
    },
    transitions: {
      pendiente: ['pendiente', 'parcial', 'pagada'],
      parcial: ['parcial', 'pagada'],
      pagada: ['pagada']
    }
  };

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
      estado: normalizeInvoiceStatus(invoiceData.estado),
      descripcion: normalizeString(invoiceData.descripcion),
      fecha: normalizeDate(invoiceData.fecha)
    };
  }

  function normalizeInvoiceStatus(value) {
    const raw = normalizeString(value).toLowerCase();
    if (!raw) return SIMPLE_INVOICE_STATUS.defaultValue;
    if (SIMPLE_INVOICE_STATUS.labels[raw]) return raw;
    if (SIMPLE_INVOICE_STATUS.aliases[raw]) return SIMPLE_INVOICE_STATUS.aliases[raw];
    throw new Error('Estado de factura invalido');
  }

  function ensureAllowedInvoiceTransition(currentValue, nextValue) {
    const currentStatus = normalizeInvoiceStatus(currentValue);
    const nextStatus = normalizeInvoiceStatus(nextValue);
    const allowedTransitions = SIMPLE_INVOICE_STATUS.transitions[currentStatus] || [currentStatus];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new Error('Transicion de estado no permitida');
    }
    return nextStatus;
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

  async function ensureUniqueInvoiceNumber(numero, excludeId) {
    const snapshot = await getUserCollection().where('numero', '==', numero).get();
    const duplicate = snapshot.docs.find((doc) => doc.id !== excludeId);
    if (duplicate) {
      throw new Error('Ya existe una factura con ese numero');
    }
  }

  window.InvoiceService = {
    async createInvoice(invoiceData) {
      try {
        const normalizedData = normalizeInvoiceData(invoiceData);
        const validationError = validateInvoiceData(normalizedData);
        if (validationError) {
          return { success: false, message: validationError };
        }
        await ensureUniqueInvoiceNumber(normalizedData.numero);

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
        await ensureUniqueInvoiceNumber(normalizedData.numero, id);
        const currentDoc = await getUserCollection().doc(id).get();
        const currentData = currentDoc.exists ? currentDoc.data() : null;
        if (!currentData) {
          return { success: false, message: 'Factura no encontrada' };
        }
        normalizedData.estado = ensureAllowedInvoiceTransition(currentData.estado, normalizedData.estado);

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
