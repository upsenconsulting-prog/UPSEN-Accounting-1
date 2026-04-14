(function () {
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
            } catch (e) { }
        }

        if (!user) return null;
        return user.uid || user.id || user.userId || null;
    }

    function getClientsCollection() {
        const db = getDb();
        const uid = getCurrentUserId();

        if (!uid) {
            throw new Error('Usuario no autenticado');
        }

        return db.collection('companies').doc(uid).collection('clients');
    }

    function validateNifNie(value) {
        const v = (value || '').trim().toUpperCase();
        if (!v) return false;

        return (
            /^[0-9]{8}[A-Z]$/.test(v) ||
            /^[XYZ][0-9]{7}[A-Z]$/.test(v) ||
            /^[A-Z][0-9]{7}[A-Z0-9]$/.test(v)
        );
    }

    function validateName(value) {
        const v = (value || '').trim();

        if (v.length < 2) return false;

        // Не только цифры и не пустой мусор
        if (/^\d+$/.test(v)) return false;

        return true;
    }

    function validatePhone(value) {
        const v = (value || '').trim();

        // Телефон можно оставить пустым
        if (!v) return true;

        // Разрешаем +, цифры, пробелы, дефисы, скобки
        return /^[+0-9\s\-()]{6,20}$/.test(v);
    }

    function validateCountry(value) {
        const v = (value || '').trim();

        // Страну можно оставить пустой, если хочешь мягкую валидацию
        if (!v) return true;

        if (v.length < 2) return false;

        // Не только цифры
        if (/^\d+$/.test(v)) return false;

        return true;
    }

    function validateEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
    }

    function normalizeClientData(data) {
        return {
            nombre: (data.nombre || '').trim(),
            nif_nie_cif: (data.nif_nie_cif || '').trim().toUpperCase(),
            email: (data.email || '').trim(),
            telefono: (data.telefono || '').trim(),
            direccion_fiscal: (data.direccion_fiscal || '').trim(),
            pais: (data.pais || '').trim(),
            fecha_creacion: data.fecha_creacion || new Date()
        };
    }

    async function getClients() {
        const snapshot = await getClientsCollection().orderBy('fecha_creacion', 'desc').get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async function createClient(payload) {
        try {
            const data = normalizeClientData(payload);

            if (!data.nombre || !data.nif_nie_cif || !data.email) {
                return { success: false, message: 'Faltan campos obligatorios' };
            }

            if (!validateName(data.nombre)) {
                return { success: false, message: 'Nombre inválido o demasiado corto' };
            }

            if (!validateNifNie(data.nif_nie_cif)) {
                return { success: false, message: 'NIF/NIE/CIF inválido' };
            }

            if (!validateEmail(data.email)) {
                return { success: false, message: 'Email inválido' };
            }

            if (!validatePhone(data.telefono)) {
                return { success: false, message: 'Teléfono inválido' };
            }

            if (!validateCountry(data.pais)) {
                return { success: false, message: 'País inválido' };
            }

            const existingByNif = await getClientsCollection()
                .where('nif_nie_cif', '==', data.nif_nie_cif)
                .get();

            if (!existingByNif.empty) {
                return { success: false, message: 'Ya existe un cliente con ese NIF/NIE/CIF' };
            }

            const existingByEmail = await getClientsCollection()
                .where('email', '==', data.email)
                .get();

            if (!existingByEmail.empty) {
                return { success: false, message: 'Ya existe un cliente con ese email' };
            }

            await getClientsCollection().add(data);

            return { success: true };
        } catch (error) {
            console.error('createClient error:', error);
            return { success: false, message: error.message || 'Error creando cliente' };
        }
    }

    async function editClient(id, payload) {
        try {
            if (!id) {
                return { success: false, message: 'ID de cliente no válido' };
            }

            const data = normalizeClientData(payload);

            if (!data.nombre || !data.nif_nie_cif || !data.email) {
                return { success: false, message: 'Faltan campos obligatorios' };
            }

            if (!validateName(data.nombre)) {
                return { success: false, message: 'Nombre inválido o demasiado corto' };
            }

            if (!validateNifNie(data.nif_nie_cif)) {
                return { success: false, message: 'NIF/NIE/CIF inválido' };
            }

            if (!validateEmail(data.email)) {
                return { success: false, message: 'Email inválido' };
            }

            if (!validatePhone(data.telefono)) {
                return { success: false, message: 'Teléfono inválido' };
            }

            if (!validateCountry(data.pais)) {
                return { success: false, message: 'País inválido' };
            }

            const nifMatches = await getClientsCollection()
                .where('nif_nie_cif', '==', data.nif_nie_cif)
                .get();

            const nifConflict = nifMatches.docs.find(doc => doc.id !== id);
            if (nifConflict) {
                return { success: false, message: 'Otro cliente ya usa ese NIF/NIE/CIF' };
            }

            const emailMatches = await getClientsCollection()
                .where('email', '==', data.email)
                .get();

            const emailConflict = emailMatches.docs.find(doc => doc.id !== id);
            if (emailConflict) {
                return { success: false, message: 'Otro cliente ya usa ese email' };
            }

            await getClientsCollection().doc(id).update({
                nombre: data.nombre,
                nif_nie_cif: data.nif_nie_cif,
                email: data.email,
                telefono: data.telefono,
                direccion_fiscal: data.direccion_fiscal,
                pais: data.pais
            });

            return { success: true };
        } catch (error) {
            console.error('editClient error:', error);
            return { success: false, message: error.message || 'Error editando cliente' };
        }
    }

    async function deleteClient(id) {
        try {
            if (!id) {
                return { success: false, message: 'ID de cliente no válido' };
            }

            await getClientsCollection().doc(id).delete();
            return { success: true };
        } catch (error) {
            console.error('deleteClient error:', error);
            return { success: false, message: error.message || 'Error eliminando cliente' };
        }
    }

    window.ClientService = {
        getClients,
        createClient,
        editClient,
        deleteClient,
        validateNifNie,
        validateEmail,
        validateName,
        validatePhone,
        validateCountry
    };
})();
