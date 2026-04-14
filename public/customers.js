(function () {
  'use strict';

  const form = document.getElementById('clientForm');
  const clientsTbody = document.getElementById('clientsTbody');
  const authStatus = document.getElementById('authStatus');
  const clearBtn = document.getElementById('clearBtn');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const countryDropdown = document.getElementById('countryDropdown');
  const countryToggle = document.getElementById('countryToggle');
  const countryEmpty = document.getElementById('countryEmpty');
  let isSaving = false;

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

  function sanitizeName(value) {
    return (value || '')
      .replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-žА-Яа-яЁёЇїІіЄє\s'-]/g, '')
      .replace(/\s{2,}/g, ' ');
  }

  function sanitizePhone(value) {
    const input = (value || '').toString();
    const hasLeadingPlus = input.trim().startsWith('+');
    const digitsOnly = input.replace(/\D/g, '');
    return (hasLeadingPlus ? '+' : '') + digitsOnly;
  }

  function getCountryOptions() {
    return Array.from(document.querySelectorAll('[data-country-value]'));
  }

  function getAllowedCountries() {
    return getCountryOptions()
      .map((option) => option.getAttribute('data-country-value'))
      .filter((value) => value);
  }

  function openCountryDropdown() {
    if (countryDropdown) countryDropdown.classList.remove('d-none');
  }

  function closeCountryDropdown() {
    if (countryDropdown) countryDropdown.classList.add('d-none');
  }

  function filterCountryOptions() {
    if (!countryDropdown || !clientFields.country) return;

    const query = (clientFields.country.value || '').trim().toLowerCase();
    let visibleCount = 0;

    getCountryOptions().forEach((option) => {
      const value = (option.getAttribute('data-country-value') || '').toLowerCase();
      const matches = !query || value.includes(query);
      option.classList.toggle('d-none', !matches);
      if (matches) visibleCount += 1;
    });

    if (countryEmpty) {
      countryEmpty.classList.toggle('d-none', visibleCount !== 0);
    }
  }

  function setupInputRestrictions() {
    if (clientFields.name) {
      clientFields.name.addEventListener('input', function () {
        const sanitized = sanitizeName(this.value);
        if (this.value !== sanitized) this.value = sanitized;
      });
    }

    if (clientFields.phone) {
      clientFields.phone.addEventListener('input', function () {
        const sanitized = sanitizePhone(this.value);
        if (this.value !== sanitized) this.value = sanitized;
      });
    }
  }

  function setupCountryCombobox() {
    if (!clientFields.country || !countryDropdown) return;

    clientFields.country.addEventListener('focus', function () {
      filterCountryOptions();
      openCountryDropdown();
    });

    clientFields.country.addEventListener('input', function () {
      filterCountryOptions();
      openCountryDropdown();
    });

    clientFields.country.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeCountryDropdown();
    });

    if (countryToggle) {
      countryToggle.addEventListener('click', function () {
        if (countryDropdown.classList.contains('d-none')) {
          filterCountryOptions();
          openCountryDropdown();
          clientFields.country.focus();
        } else {
          closeCountryDropdown();
        }
      });
    }

    getCountryOptions().forEach((option) => {
      option.addEventListener('click', function () {
        clientFields.country.value = option.getAttribute('data-country-value') || '';
        closeCountryDropdown();
      });
    });

    document.addEventListener('click', function (event) {
      const wrapper = clientFields.country.closest('.country-combobox');
      if (wrapper && !wrapper.contains(event.target)) closeCountryDropdown();
    });
  }

  function getCurrentUserId() {
    let user = null;

    if (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function') {
      user = window.AuthService.getCurrentUser();
    }

    if (!user) {
      try {
        const session = localStorage.getItem('upsen_current_user');
        if (session) {
          const data = JSON.parse(session);
          user = (data && data.user) ? data.user : null;
        }
      } catch (ignore) {}
    }

    if (!user) return null;
    return user.uid || user.id || user.userId || null;
  }

  function clearForm() {
    Object.values(clientFields).forEach((field) => {
      field.value = '';
    });
    closeCountryDropdown();
    filterCountryOptions();
    setMessage('Formulario listo para nuevo cliente.', 'info');
  }

  async function loadClients() {
    if (!window.ClientService) {
      setMessage('Servicio de clientes no inicializado. Comprueba backend (1).', 'danger');
      return;
    }

    try {
      const clients = await window.ClientService.getClients();
      clientsTbody.innerHTML = '';

      if (!clients || clients.length === 0) {
        clientsTbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes registrados.</td></tr>';
        return;
      }

      clients.forEach((client) => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${client.nombre || '-'}</td>
          <td>${client.nif_nie_cif || '-'}</td>
          <td>${client.email || '-'}</td>
          <td>${client.telefono || '-'}</td>
          <td>${client.pais || '-'}</td>
          <td>${client.fecha_creacion ? new Date(client.fecha_creacion.toDate ? client.fecha_creacion.toDate() : client.fecha_creacion).toLocaleString() : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-client-id="${client.id}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-client-id="${client.id}" data-action="delete">Borrar</button>
          </td>
        `;

        row.querySelector('[data-action="edit"]').addEventListener('click', function () {
          populateForm(client.id, client);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', function () {
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
    clientFields.name.value = sanitizeName(data.nombre || data.name || '');
    clientFields.nif.value = data.nif_nie_cif || '';
    clientFields.email.value = data.email || '';
    clientFields.phone.value = sanitizePhone(data.telefono || data.phone || '');
    clientFields.address.value = data.direccion_fiscal || '';
    clientFields.country.value = data.pais || '';
    filterCountryOptions();
    setMessage('Editando cliente: ' + (data.nombre || data.name || '-'), 'info');
  }

  async function saveClient(event) {
    event.preventDefault();

    if (!window.ClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    if (isSaving) {
      setMessage('Ya se esta enviando este cliente. Espera un momento.', 'warning');
      return;
    }

    const rawName = (clientFields.name.value || '').trim();
    const name = sanitizeName(rawName).trim();
    const nif = (clientFields.nif.value || '').trim().toUpperCase();
    const email = (clientFields.email.value || '').trim();
    const phone = sanitizePhone(clientFields.phone.value).trim();
    const country = (clientFields.country.value || '').trim();
    const allowedCountries = getAllowedCountries();

    clientFields.name.value = name;
    clientFields.phone.value = phone;

    if (!name || !nif || !email) {
      setMessage('Nombre, NIF y email son obligatorios.', 'warning');
      return;
    }

    if (rawName !== name) {
      setMessage('El nombre solo puede contener letras.', 'warning');
      return;
    }

    if (!window.ClientService.validateNifNie(nif)) {
      setMessage('NIF/NIE/CIF invalido.', 'warning');
      return;
    }

    if (!window.ClientService.validateEmail(email)) {
      setMessage('Email invalido.', 'warning');
      return;
    }

    if (country && !allowedCountries.includes(country)) {
      setMessage('Selecciona un pais valido de la lista.', 'warning');
      return;
    }

    const payload = {
      nombre: name,
      nif_nie_cif: nif,
      email: email,
      telefono: phone,
      direccion_fiscal: (clientFields.address.value || '').trim(),
      pais: country
    };

    try {
      isSaving = true;
      if (submitBtn) submitBtn.disabled = true;

      if (clientFields.id.value) {
        const result = await window.ClientService.editClient(clientFields.id.value, payload);
        if (!result.success) throw new Error(result.message || 'Error actualizando cliente');
        setMessage('Cliente actualizado correctamente.', 'success');
      } else {
        const result = await window.ClientService.createClient(payload);
        if (!result.success) throw new Error(result.message || 'Error creando cliente');
        setMessage('Cliente creado correctamente.', 'success');
      }

      clearForm();
      loadClients();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setMessage('Error guardando cliente: ' + (err.message || err), 'danger');
    } finally {
      isSaving = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function deleteClientWithCheck(id) {
    if (!confirm('Deseas eliminar este cliente? Esta accion no se puede deshacer.')) return;

    if (!window.ClientService) {
      setMessage('Servicio de clientes no inicializado.', 'danger');
      return;
    }

    try {
      const result = await window.ClientService.deleteClient(id);
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
      setMessage('Auth no disponible. Asegurate de cargar shared/auth-system.js', 'danger');
      return;
    }

    window.waitForAuth(async () => {
      const uid = getCurrentUserId();
      if (!uid) {
        setMessage('No autenticado. Redirigiendo a login...', 'warning');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
        return;
      }

      const user = window.AuthService.getCurrentUser();
      if (user) {
        setMessage('Bienvenido: ' + (user.name || user.email || user.uid), 'success');
      }

      loadClients();
    });

    form.addEventListener('submit', saveClient);
    clearBtn.addEventListener('click', clearForm);
    setupInputRestrictions();
    setupCountryCombobox();
    clearForm();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
