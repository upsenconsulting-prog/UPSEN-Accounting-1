(function() {
  'use strict';

  // Elements
  const form = document.getElementById('invoiceForm');
  const invoicesTbody = document.getElementById('invoicesTbody');
  const authStatus = document.getElementById('authStatus');
  const clearBtn = document.getElementById('clearInvoiceBtn');
  const clientSelect = document.getElementById('clientSelect');
  const providerSelect = document.getElementById('providerSelect');

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

  function clearForm() {
    document.getElementById('invoiceId').value = '';
    document.getElementById('numero').value = '';
    document.getElementById('fecha').value = '';
    document.getElementById('clientSelect').value = '';
    document.getElementById('providerSelect').value = '';
    document.getElementById('total').value = '';
    document.getElementById('estado').value = 'draft';
    document.getElementById('descripcion').value = '';
    setMessage('Formulario listo para nueva factura.', 'info');
  }

  async function loadClients() {
    if (window.ClientService) {
      try {
        const clients = await window.ClientService.getClients();
        clientSelect.innerHTML = '<option value="">Seleccionar cliente...</option>';
        clients.forEach(client => {
          const option = document.createElement('option');
          option.value = client.id;
          option.textContent = `${client.nombre} (${client.nif_nie_cif})`;
          clientSelect.appendChild(option);
        });
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    }
  }

  async function loadProviders() {
    if (window.ProviderService) {
      try {
        const providers = await window.ProviderService.getProviders();
        providerSelect.innerHTML = '<option value="">Seleccionar proveedor...</option>';
        providers.forEach(provider => {
          const option = document.createElement('option');
          option.value = provider.id;
          option.textContent = `${provider.nombre} (${provider.nif_nie_cif})`;
          providerSelect.appendChild(option);
        });
      } catch (err) {
        console.error('Error loading providers:', err);
      }
    }
  }

  async function loadInvoices() {
    if (!window.InvoiceService) {
      setMessage('Servicio de facturas no inicializado.', 'danger');
      return;
    }

    try {
      const invoices = await window.InvoiceService.getInvoices();
      invoicesTbody.innerHTML = '';

      if (!invoices || invoices.length === 0) {
        invoicesTbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay facturas registradas.</td></tr>';
        return;
      }

      invoices.forEach(invoice => {
        const row = document.createElement('tr');
        const normalizedEstado = (invoice.estado || 'draft').toLowerCase();
        const estadoBadge = normalizedEstado === 'paid' ? 'badge-success' :
                           normalizedEstado === 'sent' ? 'badge-warning' : 'badge-danger';
        const estadoText = normalizedEstado === 'paid' ? 'Paid' :
                          normalizedEstado === 'sent' ? 'Sent' : 'Draft';

        // Get client and provider names
        const clientName = invoice.client ? `${invoice.client.nombre} (${invoice.client.nif_nie_cif})` : 'N/A';
        const providerName = invoice.provider ? `${invoice.provider.nombre} (${invoice.provider.nif_nie_cif})` : 'N/A';

        row.innerHTML = `
          <td>${invoice.numero || '-'}</td>
          <td>${invoice.clientId ? clientName : '-'}</td>
          <td>${invoice.providerId ? providerName : '-'}</td>
          <td>${invoice.fecha ? new Date(invoice.fecha).toLocaleDateString() : '-'}</td>
          <td>€${parseFloat(invoice.total || 0).toFixed(2)}</td>
          <td><span class="badge ${estadoBadge}">${estadoText}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-invoice-id="${invoice.id}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-invoice-id="${invoice.id}" data-action="delete">Borrar</button>
          </td>
        `;

        row.querySelector('[data-action="edit"]').addEventListener('click', () => populateForm(invoice));
        row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteInvoiceWithCheck(invoice.id));

        invoicesTbody.appendChild(row);
      });
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      setMessage('Error cargando facturas: ' + (err.message || err), 'danger');
    }
  }

  function populateForm(invoice) {
    document.getElementById('invoiceId').value = invoice.id;
    document.getElementById('numero').value = invoice.numero || '';
    document.getElementById('fecha').value = invoice.fecha ? invoice.fecha.split('T')[0] : '';
    document.getElementById('clientSelect').value = invoice.clientId || '';
    document.getElementById('providerSelect').value = invoice.providerId || '';
    document.getElementById('total').value = invoice.total || '';
    document.getElementById('estado').value = invoice.estado || 'draft';
    document.getElementById('descripcion').value = invoice.descripcion || '';
    setMessage('Editando factura: ' + (invoice.numero || ''), 'info');
    // Switch to new tab
    const newTab = new bootstrap.Tab(document.getElementById('new-tab'));
    newTab.show();
  }

  async function saveInvoice(event) {
    event.preventDefault();

    if (!window.InvoiceService) {
      setMessage('Servicio de facturas no inicializado.', 'danger');
      return;
    }

    const numero = document.getElementById('numero').value.trim();
    const clientId = document.getElementById('clientSelect').value;
    const providerId = document.getElementById('providerSelect').value;
    const total = parseFloat(document.getElementById('total').value) || 0;
    const estado = document.getElementById('estado').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const fecha = document.getElementById('fecha').value;

    if (!numero || !clientId || !providerId || total <= 0) {
      setMessage('Número, cliente, proveedor y total son obligatorios.', 'warning');
      return;
    }

    const payload = {
      numero,
      clientId,
      providerId,
      total,
      estado,
      descripcion,
      fecha
    };

    try {
      let result;
      if (document.getElementById('invoiceId').value) {
        result = await window.InvoiceService.editInvoice(document.getElementById('invoiceId').value, payload);
        if (!result.success) throw new Error(result.message);
        setMessage('Factura actualizada correctamente.', 'success');
      } else {
        result = await window.InvoiceService.createInvoice(payload);
        if (!result.success) throw new Error(result.message);
        setMessage('Factura creada correctamente.', 'success');
      }

      clearForm();
      loadInvoices();
    } catch (err) {
      console.error('Error guardando factura:', err);
      setMessage('Error guardando factura: ' + (err.message || err), 'danger');
    }
  }

  async function deleteInvoiceWithCheck(id) {
    if (!confirm('¿Deseas eliminar esta factura? Esta acción no se puede deshacer.')) return;

    if (!window.InvoiceService) {
      setMessage('Servicio de facturas no inicializado.', 'danger');
      return;
    }

    try {
      const result = await window.InvoiceService.deleteInvoice(id);
      if (!result.success) {
        setMessage(result.message || 'No se pudo eliminar la factura.', 'warning');
        return;
      }

      setMessage('Factura eliminada.', 'success');
      loadInvoices();
    } catch (err) {
      console.error('Error eliminando factura:', err);
      setMessage('Error eliminando factura: ' + (err.message || err), 'danger');
    }
  }

  function init() {
    if (!window.waitForAuth) {
      setMessage('Auth no disponible.', 'danger');
      return;
    }

    window.waitForAuth(async () => {
      const uid = getCurrentUserId();
      if (!uid) {
        setMessage('No autenticado. Redirigiendo...', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
      }

      const user = window.AuthService.getCurrentUser();
      if (user) {
        setMessage(`Bienvenido: ${user.name || user.email || user.uid}`, 'success');
      }

      // Load dropdowns and list
      await Promise.all([loadClients(), loadProviders()]);
      loadInvoices();
    });

    form.addEventListener('submit', saveInvoice);
    clearBtn.addEventListener('click', clearForm);
    
    clearForm();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
