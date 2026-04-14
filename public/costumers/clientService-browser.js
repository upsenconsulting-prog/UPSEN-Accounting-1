(function() {
  'use strict';

  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0 && window.FIREBASE_CONFIG) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }

  const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);
  const normalizeString = (value) => (value || '').toString().trim();
  const normalizeEmail = (value) => normalizeString(value).toLowerCase();
  const normalizeNif = (value) => normalizeString(value).toUpperCase();
  const normalizePhone = (value) => normalizeString(value).replace(/\s+/g, '');

  const getUserCollection = () => {
    const db = getDb();
    if (!db) throw new Error('Firestore no disponible');

    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    return db.collection('companies').doc(user.uid).collection('clients');
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  const normalizeClientData = (clientData) => ({
    nombre: normalizeString(clientData.nombre),
    nif_nie_cif: normalizeNif(clientData.nif_nie_cif),
    email: normalizeEmail(clientData.email),
    telefono: normalizePhone(clientData.telefono),
    direccion_fiscal: normalizeString(clientData.direccion_fiscal),
    pais: normalizeString(clientData.pais)
  });

  async function findDuplicateClient(clientData, excludeId) {
    const normalized = normalizeClientData(clientData);
    const snapshot = await getUserCollection().get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((client) => {
        if (excludeId && client.id === excludeId) return false;

        const sameNif = normalized.nif_nie_cif && normalizeNif(client.nif_nie_cif) === normalized.nif_nie_cif;
        const sameEmail = normalized.email && normalizeEmail(client.email) === normalized.email;
        return sameNif || sameEmail;
      }) || null;
  }

  window.ClientService = {
    validateNifNie: (value) => /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test(value),
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

    async createClient(clientData) {
      try {
        const normalizedData = normalizeClientData(clientData);

        if (!this.validateNifNie(normalizedData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF invÃ¡lido' };
        }

        if (!this.validateEmail(normalizedData.email)) {
          return { success: false, message: 'Email invÃ¡lido' };
        }

        const duplicate = await findDuplicateClient(normalizedData);
        if (duplicate) {
          return { success: false, message: 'Ya existe un cliente con el mismo NIF/NIE/CIF o email' };
        }

        const docRef = await getUserCollection().add({
          ...normalizedData,
          fecha_creacion: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
        });

        console.log('Cliente creado con ID:', docRef.id);
        return { success: true };
      } catch (error) {
        console.error('Error al crear cliente:', error);
        return { success: false, message: error.message };
      }
    },

    async getClients() {
      try {
        const snapshot = await getUserCollection().get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer clientes:', error);
        return [];
      }
    },

    async editClient(id, clientData) {
      try {
        const normalizedData = normalizeClientData(clientData);

        if (normalizedData.nif_nie_cif && !this.validateNifNie(normalizedData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF invÃ¡lido' };
        }

        if (normalizedData.email && !this.validateEmail(normalizedData.email)) {
          return { success: false, message: 'Email invÃ¡lido' };
        }

        const duplicate = await findDuplicateClient(normalizedData, id);
        if (duplicate) {
          return { success: false, message: 'Ya existe otro cliente con el mismo NIF/NIE/CIF o email' };
        }

        await getUserCollection().doc(id).update({ ...normalizedData });
        console.log('Cliente editado:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al editar cliente:', error);
        return { success: false, message: error.message };
      }
    },

    async deleteClient(id) {
      try {
        const user = firebase.auth().currentUser;
        const invoicesRef = getDb().collection('companies').doc(user.uid).collection('invoices');
        const snapshot = await invoicesRef.where('clientId', '==', id).get();

        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar cliente con facturas asociadas' };
        }

        await getUserCollection().doc(id).delete();
        console.log('Cliente eliminado:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return { success: false, message: error.message };
      }
    }
  };

  console.log('ClientService loaded as window.ClientService');
})();
