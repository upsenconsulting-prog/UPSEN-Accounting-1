(function() {
  'use strict';

  function getDb() {
    if (window.firebaseDb) {
      return window.firebaseDb;
    }

    if (window.db) {
      return window.db;
    }

    if (window.firebase && typeof window.firebase.firestore === 'function') {
      if (window.firebase.apps && window.firebase.apps.length > 0) {
        const db = window.firebase.firestore();
        window.firebaseDb = db;
        return db;
      }
    }

    throw new Error('Firebase DB no inicializada');
  }

  function getCurrentUserId() {
    let user = null;

    if (window.AuthService && typeof window.AuthService.getCurrentUser === 'function') {
      user = window.AuthService.getCurrentUser();
    }

    if (!user) {
      try {
        const session = localStorage.getItem('upsen_current_user');
        if (session) {
          const data = JSON.parse(session);
          user = data && data.user ? data.user : null;
        }
      } catch (error) {
        user = null;
      }
    }

    if (!user) return null;
    return user.uid || user.id || user.userId || null;
  }

  function getInvoicesCollection() {
    const db = getDb();
    const uid = getCurrentUserId();

    if (!uid) {
      throw new Error('Usuario no autenticado');
    }

    return db.collection('companies').doc(uid).collection('invoices');
  }

  function normalizeInvoiceData(data) {
    return {
      clientId: (data && data.clientId ? data.clientId : '').trim(),
      providerId: (data && data.providerId ? data.providerId : '').trim(),
      numero: (data && data.numero ? data.numero : '').trim(),
      total: Number(data && data.total ? data.total : 0),
      fecha: (data && data.fecha ? data.fecha : '').trim() || new Date().toISOString().split('T')[0],
      estado: (data && data.estado ? data.estado : 'pendiente').trim(),
      descripcion: (data && data.descripcion ? data.descripcion : '').trim()
    };
  }

  function validateInvoiceData(invoiceData) {
    if (!invoiceData.clientId || !invoiceData.providerId || !invoiceData.numero) {
      return 'Numero, cliente y proveedor son obligatorios';
    }

    if (!(invoiceData.total > 0)) {
      return 'El total debe ser mayor que cero';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceData.fecha) || Number.isNaN(new Date(invoiceData.fecha + 'T00:00:00').getTime())) {
      return 'La fecha de la factura no es valida';
    }

    return null;
  }

  async function ensureUniqueNumero(numero, excludeId) {
    const snapshot = await getInvoicesCollection().where('numero', '==', numero).get();
    const conflict = snapshot.docs.find((doc) => doc.id !== excludeId);
    if (conflict) {
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

        await ensureUniqueNumero(normalizedData.numero);
        const docRef = await getInvoicesCollection().add({
          ...normalizedData,
          fecha_creacion: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
        const snapshot = await getInvoicesCollection().get();
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

        await ensureUniqueNumero(normalizedData.numero, id);
        await getInvoicesCollection().doc(id).update({
          ...normalizedData,
          updatedAt: new Date().toISOString()
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
        await getInvoicesCollection().doc(id).delete();
        console.log('Factura eliminada:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al eliminar factura:', error);
        return { success: false, message: error.message };
      }
    },

    async getInvoicesByClient(clientId) {
      try {
        const snapshot = await getInvoicesCollection().where('clientId', '==', clientId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer facturas por cliente:', error);
        return [];
      }
    },

    async getInvoicesByProvider(providerId) {
      try {
        const snapshot = await getInvoicesCollection().where('providerId', '==', providerId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer facturas por proveedor:', error);
        return [];
      }
    }
  };

  console.log('InvoiceService loaded as window.InvoiceService');
})();