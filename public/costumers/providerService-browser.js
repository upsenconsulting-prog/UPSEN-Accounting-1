(function() {
  'use strict';

// Firebase compat mode - initialize if not done
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
}

const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);

  const normalizeText = (value) => String(value || '').trim();

  const findDuplicateNif = async (nif, excludeId) => {
    const snapshot = await getUserCollection().where('nif_nie_cif', '==', nif).get();
    return snapshot.docs.some(function(doc) {
      return !excludeId || doc.id !== excludeId;
    });
  };

  const getUserCollection = () => {
    const db = getDb();
    if (!db) throw new Error("Firestore no disponible");
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    return db.collection("companies").doc(user.uid).collection("providers");
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  window.ProviderService = {
    validateNifNie: (value) => /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test(value),
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

    async createProvider(providerData) {
      try {
        const nif = normalizeText(providerData.nif_nie_cif);
        const email = normalizeText(providerData.email);

        if (!this.validateNifNie(nif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (!this.validateEmail(email)) {
          return { success: false, message: 'Email inválido' };
        }
        if (await findDuplicateNif(nif)) {
          return { success: false, message: 'Ya existe un proveedor con ese NIF/NIE/CIF' };
        }

        const timestamp = getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString();
        const docRef = await getUserCollection().add({ 
          ...providerData,
          nif_nie_cif: nif,
          email: email,
          fecha_creacion: timestamp,
          fecha_actualizacion: timestamp
        });
        console.log("Proveedor creado con ID:", docRef.id);
        return { success: true };
      } catch (error) {
        console.error("Error al crear proveedor:", error);
        return { success: false, message: error.message };
      }
    },

    async getProviders() {
      try {
        const snapshot = await getUserCollection().get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer proveedores:", error);
        return [];
      }
    },

    async editProvider(id, providerData) {
      try {
        if (providerData.nif_nie_cif && !this.validateNifNie(providerData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (providerData.email && !this.validateEmail(providerData.email)) {
          return { success: false, message: 'Email inválido' };
        }

        const currentDoc = await getUserCollection().doc(id).get();
        if (!currentDoc.exists) {
          return { success: false, message: 'El proveedor no existe' };
        }

        const nextNif = providerData.nif_nie_cif ? normalizeText(providerData.nif_nie_cif) : normalizeText(currentDoc.data().nif_nie_cif);
        if (nextNif && await findDuplicateNif(nextNif, id)) {
          return { success: false, message: 'Ya existe un proveedor con ese NIF/NIE/CIF' };
        }

        await getUserCollection().doc(id).update({
          ...providerData,
          nif_nie_cif: nextNif,
          email: providerData.email ? normalizeText(providerData.email) : currentDoc.data().email,
          fecha_actualizacion: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
        });
        console.log("Proveedor editado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar proveedor:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteProvider(id) {
      try {
        const user = firebase.auth().currentUser;
        const invoicesRef = getDb().collection("companies").doc(user.uid).collection("invoices");
        const snapshot = await invoicesRef.where("providerId", "==", id).get();

        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar proveedor con facturas asociadas' };
        }
        await getUserCollection().doc(id).delete();
        console.log("Proveedor eliminado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al eliminar proveedor:", error);
        return { success: false, message: error.message };
      }
    }
  };

  console.log('ProviderService loaded as window.ProviderService');
})();
