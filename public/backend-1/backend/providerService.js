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

  function getProvidersCollection() {
    const db = getDb();
    const uid = getCurrentUserId();

    if (!uid) {
      throw new Error('Usuario no autenticado');
    }

    return db.collection('companies').doc(uid).collection('providers');
  }

  function validateNifNie(value) {
    const normalized = (value || '').trim().toUpperCase();
    if (!normalized) return false;

    return (
      /^[0-9]{8}[A-Z]$/.test(normalized) ||
      /^[XYZ][0-9]{7}[A-Z]$/.test(normalized) ||
      /^[ABCDEFGHJNPQRSW][0-9]{7}[0-9A-J]$/.test(normalized)
    );
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }

  function normalizeProviderData(data) {
    return {
      nombre: (data && data.nombre ? data.nombre : '').trim(),
      nif_nie_cif: (data && data.nif_nie_cif ? data.nif_nie_cif : '').trim().toUpperCase(),
      email: (data && data.email ? data.email : '').trim(),
      telefono: (data && data.telefono ? data.telefono : '').trim(),
      direccion_fiscal: (data && data.direccion_fiscal ? data.direccion_fiscal : '').trim(),
      pais: (data && data.pais ? data.pais : '').trim(),
      fecha_creacion: data && data.fecha_creacion ? data.fecha_creacion : new Date()
    };
  }

  async function getProviders() {
    const snapshot = await getProvidersCollection().orderBy('fecha_creacion', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async function createProvider(payload) {
    try {
      const data = normalizeProviderData(payload);

      if (!data.nombre || !data.nif_nie_cif || !data.email) {
        return { success: false, message: 'Faltan campos obligatorios' };
      }

      if (!validateNifNie(data.nif_nie_cif)) {
        return { success: false, message: 'NIF/NIE/CIF inválido' };
      }

      if (!validateEmail(data.email)) {
        return { success: false, message: 'Email inválido' };
      }

      const existingByNif = await getProvidersCollection()
        .where('nif_nie_cif', '==', data.nif_nie_cif)
        .get();

      if (!existingByNif.empty) {
        return { success: false, message: 'Ya existe un proveedor con ese NIF/NIE/CIF' };
      }

      const existingByEmail = await getProvidersCollection()
        .where('email', '==', data.email)
        .get();

      if (!existingByEmail.empty) {
        return { success: false, message: 'Ya existe un proveedor con ese email' };
      }

      await getProvidersCollection().add(data);

      return { success: true };
    } catch (error) {
      console.error('createProvider error:', error);
      return { success: false, message: error.message || 'Error creando proveedor' };
    }
  }

  async function editProvider(id, payload) {
    try {
      if (!id) {
        return { success: false, message: 'ID de proveedor no válido' };
      }

      const data = normalizeProviderData(payload);

      if (!data.nombre || !data.nif_nie_cif || !data.email) {
        return { success: false, message: 'Faltan campos obligatorios' };
      }

      if (!validateNifNie(data.nif_nie_cif)) {
        return { success: false, message: 'NIF/NIE/CIF inválido' };
      }

      if (!validateEmail(data.email)) {
        return { success: false, message: 'Email inválido' };
      }

      const nifMatches = await getProvidersCollection()
        .where('nif_nie_cif', '==', data.nif_nie_cif)
        .get();

      const nifConflict = nifMatches.docs.find(doc => doc.id !== id);
      if (nifConflict) {
        return { success: false, message: 'Otro proveedor ya usa ese NIF/NIE/CIF' };
      }

      const emailMatches = await getProvidersCollection()
        .where('email', '==', data.email)
        .get();

      const emailConflict = emailMatches.docs.find(doc => doc.id !== id);
      if (emailConflict) {
        return { success: false, message: 'Otro proveedor ya usa ese email' };
      }

      await getProvidersCollection().doc(id).update({
        nombre: data.nombre,
        nif_nie_cif: data.nif_nie_cif,
        email: data.email,
        telefono: data.telefono,
        direccion_fiscal: data.direccion_fiscal,
        pais: data.pais
      });

      return { success: true };
    } catch (error) {
      console.error('editProvider error:', error);
      return { success: false, message: error.message || 'Error editando proveedor' };
    }
  }

  async function deleteProvider(id) {
    try {
      if (!id) {
        return { success: false, message: 'ID de proveedor no válido' };
      }

      await getProvidersCollection().doc(id).delete();
      return { success: true };
    } catch (error) {
      console.error('deleteProvider error:', error);
      return { success: false, message: error.message || 'Error eliminando proveedor' };
    }
  }

  const service = {
    getProviders,
    createProvider,
    editProvider,
    deleteProvider,
    validateNifNie,
    validateEmail
  };

  window.BackendProviderService = service;
  window.ProviderService = window.ProviderService || service;

  console.log('BackendProviderService loaded');
})();