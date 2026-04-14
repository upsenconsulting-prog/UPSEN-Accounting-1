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

  function normalizeClient(c) {
    return {
      id: c.id,
      nombre: c.nombre || c.name || '',
      nif_nie_cif: c.nif_nie_cif || c.nif || '',
      email: c.email || '',
      telefono: c.telefono || c.phone || '',
      direccion_fiscal: c.direccion_fiscal || c.address || '',
      pais: c.pais || c.country || '',
      fecha_creacion: c.fecha_creacion || c.createdAt || null
    };
  }

  function setMessage(text, type) {
    if (!authStatus) return;
    authStatus.textContent = text;
    authStatus.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger', 'alert-warning');
    authStatus.classList.add('alert-' + (type || 'info'));
  }

  function clearForm() {
    Object.values(clientFields).forEach(f => f.value = '');
    setMessage('Formulario listo para nuevo cliente.', 'info');
  }

  function safe(v) {
    return (v || '').toString().replace(/</g, '&lt;');
  }

  async function loadClients() {
    if (!window.ClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    try {
      const clients = await window.ClientService.getClients();
      clientsTbody.innerHTML = '';

      if (!clients || clients.length === 0) {
        clientsTbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes registrados.</td></tr>';
        return;
      }

      clients.forEach(raw => {
        const client = normalizeClient(raw);

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${safe(client.nombre)}</td>
          <td>${safe(client.nif_nie_cif)}</td>
          <td>${safe(client.email)}</td>
          <td>${safe(client.telefono)}</td>
          <td>${safe(client.pais)}</td>
          <td>${client.fecha_creacion ? new Date(client.fecha_creacion.toDate ? client.fecha_creacion.toDate() : client.fecha_creacion).toLocaleString() : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-id="${client.id}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-id="${client.id}" data-action="delete">Borrar</button>
          </td>
        `;

        row.querySelector('[data-action="edit"]').addEventListener('click', function() {
          populateForm(client);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', function() {
          deleteClient(client.id);
        });

        clientsTbody.appendChild(row);
      });
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setMessage('Error cargando clientes: ' + (err.message || err), 'danger');
    }
  }

  function populateForm(client) {
    clientFields.id.value = client.id || '';
    clientFields.name.value = client.nombre || '';
    clientFields.nif.value = client.nif_nie_cif || '';
    clientFields.email.value = client.email || '';
    clientFields.phone.value = client.telefono || '';
    clientFields.address.value = client.direccion_fiscal || '';
    clientFields.country.value = client.pais || '';
    setMessage('Editando cliente: ' + (client.nombre || '-'), 'info');
  }

  async function saveClient(event) {
    event.preventDefault();

    if (!window.ClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    const payload = {
      nombre: (clientFields.name.value || '').trim(),
      nif_nie_cif: (clientFields.nif.value || '').trim().toUpperCase(),
      email: (clientFields.email.value || '').trim(),
      telefono: (clientFields.phone.value || '').trim(),
      direccion_fiscal: (clientFields.address.value || '').trim(),
      pais: (clientFields.country.value || '').trim()
    };

    if (!payload.nombre || !payload.nif_nie_cif || !payload.email) {
      setMessage('Nombre, NIF y email son obligatorios.', 'warning');
      return;
    }

    try {
      let result;

      if (clientFields.id.value) {
        result = await window.ClientService.editClient(clientFields.id.value, payload);
      } else {
        result = await window.ClientService.createClient(payload);
      }

      if (!result.success) {
        throw new Error(result.message || 'Error guardando cliente');
      }

      setMessage('Cliente guardado correctamente.', 'success');
      clearForm();
      loadClients();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setMessage('Error guardando cliente: ' + (err.message || err), 'danger');
    }
  }

  async function deleteClient(id) {
    if (!confirm('¿Deseas eliminar este cliente?')) return;

    try {
      const result = await window.ClientService.deleteClient(id);
      if (!result.success) {
        throw new Error(result.message || 'No se pudo eliminar el cliente');
      }

      setMessage('Cliente eliminado correctamente.', 'success');
      loadClients();
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      setMessage('Error eliminando cliente: ' + (err.message || err), 'danger');
    }
  }

  function init() {
    if (!window.waitForAuth) {
      setMessage('Auth no disponible todavía.', 'danger');
      return;
    }

    form.addEventListener('submit', saveClient);
    clearBtn.addEventListener('click', clearForm);
    clearForm();

    window.waitForAuth(function() {
      setMessage('Sistema listo. Cargando clientes...', 'info');
      loadClients();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
