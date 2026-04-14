(function() {
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
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
    return db.collection('companies').doc(user.uid).collection('providers');
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  const normalizeProviderData = (providerData) => ({
    nombre: normalizeString(providerData.nombre),
    nif_nie_cif: normalizeNif(providerData.nif_nie_cif),
    email: normalizeEmail(providerData.email),
    telefono: normalizePhone(providerData.telefono),
    direccion_fiscal: normalizeString(providerData.direccion_fiscal),
    pais: normalizeString(providerData.pais)
  });

  async function findDuplicateProvider(providerData, excludeId) {
    const normalized = normalizeProviderData(providerData);
    const snapshot = await getUserCollection().get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((provider) => {
        if (excludeId && provider.id === excludeId) return false;

        const sameNif = normalized.nif_nie_cif && normalizeNif(provider.nif_nie_cif) === normalized.nif_nie_cif;
        const sameEmail = normalized.email && normalizeEmail(provider.email) === normalized.email;
        return sameNif || sameEmail;
      }) || null;
  }

  window.ProviderService = {
    validateNifNie: (value) => /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test(value),
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

    async createProvider(providerData) {
      try {
        const normalizedData = normalizeProviderData(providerData);

        if (!this.validateNifNie(normalizedData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF invalido' };
        }
        if (!this.validateEmail(normalizedData.email)) {
          return { success: false, message: 'Email invalido' };
        }

        const duplicate = await findDuplicateProvider(normalizedData);
        if (duplicate) {
          return { success: false, message: 'Ya existe un proveedor con el mismo NIF/NIE/CIF o email' };
        }

        const now = getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString();
        const docRef = await getUserCollection().add({
          ...normalizedData,
          createdAt: now,
          updatedAt: now
        });
        console.log('Proveedor creado con ID:', docRef.id);
        return { success: true };
      } catch (error) {
        console.error('Error al crear proveedor:', error);
        return { success: false, message: error.message };
      }
    },

    async getProviders() {
      try {
        const snapshot = await getUserCollection().get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al leer proveedores:', error);
        return [];
      }
    },

    async editProvider(id, providerData) {
      try {
        const normalizedData = normalizeProviderData(providerData);

        if (normalizedData.nif_nie_cif && !this.validateNifNie(normalizedData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF invalido' };
        }
        if (normalizedData.email && !this.validateEmail(normalizedData.email)) {
          return { success: false, message: 'Email invalido' };
        }

        const duplicate = await findDuplicateProvider(normalizedData, id);
        if (duplicate) {
          return { success: false, message: 'Ya existe otro proveedor con el mismo NIF/NIE/CIF o email' };
        }

        await getUserCollection().doc(id).update({
          ...normalizedData,
          updatedAt: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
        });
        console.log('Proveedor editado:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al editar proveedor:', error);
        return { success: false, message: error.message };
      }
    },

    async deleteProvider(id) {
      try {
        const user = firebase.auth().currentUser;
        const invoicesRef = getDb().collection('companies').doc(user.uid).collection('invoices');
        const snapshot = await invoicesRef.where('providerId', '==', id).get();

        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar proveedor con facturas asociadas' };
        }
        await getUserCollection().doc(id).delete();
        console.log('Proveedor eliminado:', id);
        return { success: true };
      } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        return { success: false, message: error.message };
      }
    }
  };

  console.log('ProviderService loaded as window.ProviderService');
})();
