(function() {
  'use strict';

  const form = document.getElementById('providerForm');
  const providersTbody = document.getElementById('providersTbody');
  const authStatus = document.getElementById('authStatus');
  const clearBtn = document.getElementById('clearBtn');
  const utils = window.PageUtils || {};
  const setMessage = utils.createStatusMessenger ? utils.createStatusMessenger(authStatus) : function(text) {
    if (authStatus) authStatus.textContent = text;
  };
  const getCurrentUserId = utils.getCurrentUserId || function() { return null; };
  const formatCreatedAt = utils.formatCreatedAt || function(value) { return value || '-'; };

  const providerFields = {
    id: document.getElementById('providerId'),
    name: document.getElementById('name'),
    nif: document.getElementById('nif'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    address: document.getElementById('address'),
    country: document.getElementById('country')
  };

  function clearForm() {
    Object.values(providerFields).forEach(field => field.value = '');
    setMessage('Formulario listo para nuevo proveedor.', 'info');
  }

  async function loadProviders() {
    if (!window.ProviderService) {
      setMessage('Servicio de proveedores no inicializado.', 'danger');
      return;
    }

    try {
      const providers = await window.ProviderService.getProviders();
      providersTbody.innerHTML = '';

      if (!providers || providers.length === 0) {
        providersTbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay proveedores registrados.</td></tr>';
        return;
      }

      providers.forEach(provider => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${provider.nombre || '-'} </td>
          <td>${provider.nif_nie_cif || '-'} </td>
          <td>${provider.email || '-'} </td>
          <td>${provider.telefono || '-'} </td>
          <td>${provider.pais || '-'} </td>
          <td>${formatCreatedAt(provider.fecha_creacion)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-provider-id="${provider.id}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-provider-id="${provider.id}" data-action="delete">Borrar</button>
          </td>
        `;

        row.querySelector('[data-action="edit"]').addEventListener('click', function() {
          populateForm(provider.id, provider);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', function() {
          deleteProviderWithCheck(provider.id);
        });

        providersTbody.appendChild(row);
      });

    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setMessage('Error cargando proveedores: ' + (err.message || err), 'danger');
    }
  }

  function populateForm(id, data) {
    providerFields.id.value = id;
    providerFields.name.value = data.nombre || '';
    providerFields.nif.value = data.nif_nie_cif || '';
    providerFields.email.value = data.email || '';
    providerFields.phone.value = data.telefono || '';
    providerFields.address.value = data.direccion_fiscal || '';
    providerFields.country.value = data.pais || '';
    setMessage('Editando proveedor: ' + (data.nombre || '-'), 'info');
  }

  async function saveProvider(event) {
    event.preventDefault();

    if (!window.ProviderService) {
      setMessage('Servicio de proveedores no inicializado.', 'danger');
      return;
    }

    const name = (providerFields.name.value || '').trim();
    const nif = (providerFields.nif.value || '').trim().toUpperCase();
    const email = (providerFields.email.value || '').trim();

    if (!name || !nif || !email) {
      setMessage('Nombre, NIF y email son obligatorios.', 'warning');
      return;
    }

    if (!window.ProviderService.validateNifNie(nif)) {
      setMessage('NIF/NIE/CIF inválido.', 'warning');
      return;
    }

    if (!window.ProviderService.validateEmail(email)) {
      setMessage('Email inválido.', 'warning');
      return;
    }

    const payload = {
      nombre: name,
      nif_nie_cif: nif,
      email: email,
      telefono: (providerFields.phone.value || '').trim(),
      direccion_fiscal: (providerFields.address.value || '').trim(),
      pais: (providerFields.country.value || '').trim()
    };

    try {
      if (providerFields.id.value) {
        const result = await window.ProviderService.editProvider(providerFields.id.value, payload);
        if (!result.success) throw new Error(result.message || 'Error actualizando proveedor');
        setMessage('Proveedor actualizado correctamente.', 'success');
      } else {
        const result = await window.ProviderService.createProvider(payload);
        if (!result.success) throw new Error(result.message || 'Error creando proveedor');
        setMessage('Proveedor creado correctamente.', 'success');
      }

      clearForm();
      loadProviders();
    } catch (err) {
      console.error('Error guardando proveedor:', err);
      setMessage('Error guardando proveedor: ' + (err.message || err), 'danger');
    }
  }

  async function deleteProviderWithCheck(id) {
    if (!confirm('¿Deseas eliminar este proveedor? Esta acción no se puede deshacer.')) return;

    if (!window.ProviderService) {
      setMessage('Servicio de proveedores no inicializado.', 'danger');
      return;
    }

    try {
      const result = await window.ProviderService.deleteProvider(id);
      if (!result.success) {
        setMessage(result.message || 'No se pudo eliminar el proveedor.', 'warning');
        return;
      }

      setMessage('Proveedor eliminado.', 'success');
      loadProviders();
    } catch (err) {
      console.error('Error eliminando proveedor:', err);
      setMessage('Error eliminando proveedor: ' + (err.message || err), 'danger');
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

      loadProviders();
    });

    if (form) form.addEventListener('submit', saveProvider);
    if (clearBtn) clearBtn.addEventListener('click', clearForm);
    
    clearForm();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

