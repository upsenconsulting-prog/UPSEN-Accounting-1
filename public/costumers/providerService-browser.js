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
    window.ProviderService = null;
    return;
  }

  window.ProviderService = {
    validateNifNie: (value) => /^[0-9]{8}[A-Z]$/i.test(value) || /^[XYZ][0-9]{7}[A-Z]$/i.test(value),
    validateEmail: (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email),

    async createProvider(providerData) {
      try {
        if (!this.validateNifNie(providerData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (!this.validateEmail(providerData.email)) {
          return { success: false, message: 'Email inválido' };
        }

        const docRef = await addDoc(collection(db, "providers"), { ...providerData, fecha_creacion: serverTimestamp() });
        console.log("Proveedor creado con ID:", docRef.id);
        return { success: true };
      } catch (error) {
        console.error("Error al crear proveedor:", error);
        return { success: false, message: error.message };
      }
    },

    async getProviders() {
      try {
        const snapshot = await getDocs(collection(db, "providers"));
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

        const providerRef = doc(db, "providers", id);
        await updateDoc(providerRef, { ...providerData });
        console.log("Proveedor editado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar proveedor:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteProvider(id) {
      try {
        const invoicesRef = collection(db, "invoices");
        const q = query(invoicesRef, where("providerId", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar proveedor con facturas asociadas' };
        }

        await deleteDoc(doc(db, "providers", id));
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

