(function() {
  'use strict';

  // Load Firebase if not already (but assuming shared/firebase-config.js loads it)
  // This is for Firebase v9 modular, exposed as compat globals via shared config

// Firebase compat mode - initialize if not done
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0 && window.FIREBASE_CONFIG) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}

const getDb = () => window.firebaseDb || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 ? firebase.firestore() : null);

  const getUserCollection = () => {
    const db = getDb();
    if (!db) throw new Error("Firestore no disponible");
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    return db.collection("companies").doc(user.uid).collection("clients");
  };

  const getFieldValue = () => {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue : null;
  };

  // Validation functions
  window.ClientService = { 
    validateNifNie: (value) => /^(?:[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J])$/i.test(value),
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

    async createClient(clientData) {
      try {
        if (!this.validateNifNie(clientData.nif_nie_cif)) {
          return { success: false, message: 'NIF/NIE/CIF inválido' };
        }
        if (!this.validateEmail(clientData.email)) {
          return { success: false, message: 'Email inválido' };
        }

        const docRef = await getUserCollection().add({ 
          ...clientData, 
          fecha_creacion: getFieldValue() ? getFieldValue().serverTimestamp() : new Date().toISOString()
        });
        console.log("Cliente creado con ID:", docRef.id);
        return { success: true };
      } catch (error) {
        console.error("Error al crear cliente:", error);
        return { success: false, message: error.message };
      }
    },

    async getClients() {
      try {
        const snapshot = await getUserCollection().get();
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

        await getUserCollection().doc(id).update({ ...clientData });
        console.log("Cliente editado:", id);
        return { success: true };
      } catch (error) {
        console.error("Error al editar cliente:", error);
        return { success: false, message: error.message };
      }
    },

    async deleteClient(id) {
      try {
        const user = firebase.auth().currentUser;
        const invoicesRef = getDb().collection("companies").doc(user.uid).collection("invoices");
        const snapshot = await invoicesRef.where("clientId", "==", id).get();
        
        if (!snapshot.empty) {
          return { success: false, message: 'No se puede eliminar cliente con facturas asociadas' };
        }
        await getUserCollection().doc(id).delete();
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
