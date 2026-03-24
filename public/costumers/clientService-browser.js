(function() {
  'use strict';

  // Load Firebase if not already (but assuming shared/firebase-config.js loads it)
  // This is for Firebase v9 modular, exposed as compat globals via shared config

// Firebase compat mode - initialize if not done
if (typeof firebase === 'undefined' || !firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
const firestore = firebase.firestore();
const dbCollection = collection;
const db = firestore;

  if (!db) {
    console.error('Firestore db not available. Ensure shared/firebase-config.js is loaded.');
    window.ClientService = null;
    return;
  }

  // Validation functions
  window.ClientService = {
    validateNifNie: (value) => /^[0-9]{8}[A-Z]$/i.test(value) || /^[XYZ][0-9]{7}[A-Z]$/i.test(value),
    validateEmail: (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email),

    async createClient(clientData) {
      try {
        if (!this.validateNifNie(clientData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (!this.validateEmail(clientData.email)) {
          return { success: false, message: 'Email inválido' };
        }

        const docRef = await addDoc(collection(db, "clients"), { ...clientData, fecha_creacion: serverTimestamp() });
        console.log("Cliente creado con ID:", docRef.id);
        return { success: true };
      } catch (error) {
        console.error("Error al crear cliente:", error);
        return { success: false, message: error.message };
      }
    },

    async getClients() {
      try {
        const snapshot = await getDocs(collection(db, "clients"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error("Error al leer clientes:", error);
        return [];
      }
    },

    async editClient(id, clientData) {
      try {
        if (clientData.nif_nie_cif && !this.validateNifNie(clientData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (clientData.email && !this.validateEmail(clientData.email)) {
          return { success: false, message: 'Email inválido' };
        }

        const clientRef = doc(db, "clients", id);
        await updateDoc(clientRef, { ...clientData });
        console.log("Cliente editado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar cliente:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteClient(id) {
      try {
        const invoicesRef = collection(db, "invoices");
        const q = query(invoicesRef, where("clientId", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar cliente con facturas asociadas' };
        }

        await deleteDoc(doc(db, "clients", id));
        console.log("Cliente eliminado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        return { success: false, message: error.message };
      }
    }
  };

  console.log('ClientService loaded as window.ClientService');
})();

