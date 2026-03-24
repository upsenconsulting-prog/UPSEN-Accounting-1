(function() {
  'use strict';

  const form = document.getElementById('clientForm');
  const clientsTbody = document.getElementById('clientsTbody');
  const authStatus = document.getElementById('authStatus');
  const clearBtn = document.getElementById('clearBtn');

  const clientFields = {
    id: document.getElementById('clientId'),
    name: document.getElementById('name'),
    nif: document.getElementById('nif'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    address: document.getElementById('address'),
    country: document.getElementById('country')
  };

  function setMessage(text, type) {
    if (!authStatus) return;
    authStatus.textContent = text;
    authStatus.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger', 'alert-warning');
    authStatus.classList.add('alert-' + (type || 'info'));
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
          user = (data && data.user) ? data.user : null;
        }
      } catch(ignore) {}
    }

    if (!user) return null;
    return user.uid || user.id || user.userId || null;
  }

  function getClientsCollection(userId) {
    if (!window.firebaseDb || !userId) return null;
    return window.firebaseDb.collection('companies').doc(userId).collection('clients');
  }

  function validateNifNie(value) {
    if (!value || value.trim().length === 0) return false;
    return /^[0-9]{8}[A-Z]$/i.test(value.trim()) || /^[XYZ][0-9]{7}[A-Z]$/i.test(value.trim());
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }

  function clearForm() {
    Object.values(clientFields).forEach(field => field.value = '');
    setMessage('Formulario listo para nuevo cliente.', 'info');
  }

  async function loadClients() {
    if (!window.BackendClientService) {
      setMessage('Servicio de clientes no inicializado. Comprueba backend (1).', 'danger');
      return;
    }

    try {
      const clients = await window.BackendClientService.getClients();
      clientsTbody.innerHTML = '';

      if (!clients || clients.length === 0) {
        clientsTbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes registrados.</td></tr>';
        return;
      }

      clients.forEach(client => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${client.nombre || '-'} </td>
          <td>${client.nif_nie_cif || '-'} </td>
          <td>${client.email || '-'} </td>
          <td>${client.telefono || '-'} </td>
          <td>${client.pais || '-'} </td>
          <td>${client.fecha_creacion ? new Date(client.fecha_creacion.toDate ? client.fecha_creacion.toDate() : client.fecha_creacion).toLocaleString() : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-client-id="${client.id}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-client-id="${client.id}" data-action="delete">Borrar</button>
          </td>
        `;

        row.querySelector('[data-action="edit"]').addEventListener('click', function() {
          populateForm(client.id, client);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', function() {
          deleteClientWithCheck(client.id);
        });

        clientsTbody.appendChild(row);
      });

    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setMessage('Error cargando clientes: ' + (err.message || err), 'danger');
    }
  }

  function populateForm(id, data) {
    clientFields.id.value = id;
    clientFields.name.value = data.name || '';
    clientFields.nif.value = data.nif_nie_cif || '';
    clientFields.email.value = data.email || '';
    clientFields.phone.value = data.phone || '';
    clientFields.address.value = data.direccion_fiscal || '';
    clientFields.country.value = data.pais || '';
    setMessage('Editando cliente: ' + (data.name || '-') , 'info');
  }

  async function saveClient(event) {
    event.preventDefault();

    if (!window.BackendClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    const name = (clientFields.name.value || '').trim();
    const nif = (clientFields.nif.value || '').trim().toUpperCase();
    const email = (clientFields.email.value || '').trim();

    if (!name || !nif || !email) {
      setMessage('Nombre, NIF y email son obligatorios.', 'warning');
      return;
    }

    if (!window.BackendClientService.validateNifNie(nif)) {
      setMessage('NIF/NIE/CIF inválido.', 'warning');
      return;
    }

    if (!window.BackendClientService.validateEmail(email)) {
      setMessage('Email inválido.', 'warning');
      return;
    }

    const payload = {
      nombre: name,
      nif_nie_cif: nif,
      email: email,
      telefono: (clientFields.phone.value || '').trim(),
      direccion_fiscal: (clientFields.address.value || '').trim(),
      pais: (clientFields.country.value || '').trim()
    };

    try {
      if (clientFields.id.value) {
        const result = await window.BackendClientService.editClient(clientFields.id.value, payload);
        if (!result.success) throw new Error(result.message || 'Error actualizando cliente');
        setMessage('Cliente actualizado correctamente.', 'success');
      } else {
        const result = await window.BackendClientService.createClient(payload);
        if (!result.success) throw new Error(result.message || 'Error creando cliente');
        setMessage('Cliente creado correctamente.', 'success');
      }

      clearForm();
      loadClients();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setMessage('Error guardando cliente: ' + (err.message || err), 'danger');
    }
  }

  async function deleteClientWithCheck(id) {
    if (!confirm('¿Deseas eliminar este cliente? Esta acción no se puede deshacer.')) return;

    if (!window.BackendClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    try {
      const result = await window.BackendClientService.deleteClient(id);
      if (!result.success) {
        setMessage(result.message || 'No se pudo eliminar el cliente.', 'warning');
        return;
      }

      setMessage('Cliente eliminado.', 'success');
      loadClients();
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      setMessage('Error eliminando cliente: ' + (err.message || err), 'danger');
    }
  }

  function init() {
    if (!window.waitForAuth) {
      setMessage('Auth no disponible. Asegúrate de cargar shared/auth-system.js', 'danger');
      return;
    }

    window.waitForAuth(async () => {
      const uid = getCurrentUserId();
      if (!uid) {
        setMessage('No autenticado. Redirigiendo a login...', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
      }

      const user = window.AuthService.getCurrentUser();
      if (user) {
        setMessage('Bienvenido: '+ (user.name || user.email || user.uid), 'success');
      }

      loadClients();
    });

    form.addEventListener('submit', saveClient);
    clearBtn.addEventListener('click', clearForm);
    clearForm();
  }

  document.addEventListener('DOMContentLoaded', init);
})();