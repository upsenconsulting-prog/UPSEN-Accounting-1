const btnFilter = document.getElementById('btnFilter');
const filterCard = document.getElementById('filterCard');
btnFilter.addEventListener('click', () => {
  filterCard.classList.toggle('d-none');
});

const btnNewInvoice = document.getElementById('btnNewInvoice');
btnNewInvoice.addEventListener('click', () => {
  const modal = new bootstrap.Modal(document.getElementById('modalNewInvoice'));
  modal.show();
});

const btnNewInvoiceOCR = document.getElementById('btnNewInvoiceOCR');
btnNewInvoiceOCR.addEventListener('click', () => {
  const modal = new bootstrap.Modal(document.getElementById('modalNewInvoiceOCR'));
  modal.show();
});

const clients = [
  { id: 1, name: 'Client A' },
  { id: 2, name: 'Client B' },
  { id: 3, name: 'Client C' }
];

const suppliers = [
  { id: 1, name: 'Office Supplies AG' },
  { id: 2, name: 'IT Services GmbH' },
  { id: 3, name: 'Electrical Supplier AG' },
  { id: 4, name: 'Cleaning Service Ltd.' }
];

document.getElementById('saveInvoiceBtn').addEventListener('click', () => {
  const form = document.getElementById('formNewInvoice');
  const formData = new FormData(form);
  let inv = {};
  formData.forEach((value, key) => {
    inv[key] = value;
  });

  if (!inv.clientId) {
    alert('Please select a client.');
    return;
  }

  const validClient = clients.find(c => c.id == inv.clientId);
  if (!validClient) {
    alert('Selected client is not valid.');
    return;
  }

  if (!inv.paymentMethodIssued) {
    alert('Please select a payment method.');
    return;
  }

  let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
  invoices.push(inv);
  localStorage.setItem('invoices', JSON.stringify(invoices));
  updateTable();
  bootstrap.Modal.getInstance(document.getElementById('modalNewInvoice')).hide();
  form.reset();
});

document.getElementById('saveReceivedInvoiceBtn').addEventListener('click', () => {
  const form = document.getElementById('formNewInvoiceReceived');
  const formData = new FormData(form);
  let inv = {};
  formData.forEach((value, key) => {
    inv[key] = value;
  });

  if (!inv.supplierId) {
    alert('Please select a supplier.');
    return;
  }

  const validSupplier = suppliers.find(s => s.id == inv.supplierId);
  if (!validSupplier) {
    alert('Selected supplier is invalid.');
    return;
  }

  if (!inv.paymentMethodReceived) {
    alert('Please select a payment method.');
    return;
  }

  let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
  invoices.push(inv);
  localStorage.setItem('invoices', JSON.stringify(invoices));
  updateTable();
  bootstrap.Modal.getInstance(document.getElementById('modalNewInvoiceReceived')).hide();
  form.reset();
});

document.getElementById('saveOCRBtn').addEventListener('click', () => {
  const form = document.getElementById('formOCRInvoice');
  const fileInput = form.elements['ocrFile'];
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file');
    return;
  }
  let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
  invoices.push({
    invoiceNumber: 'OCR-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    amount: 0,
    ocrFileName: file.name
  });
  localStorage.setItem('invoices', JSON.stringify(invoices));
  updateTable();
  bootstrap.Modal.getInstance(document.getElementById('modalNewInvoiceOCR')).hide();
  form.reset();
});

document.getElementById('btnDownloadPDF').addEventListener('click', () => {
  alert('Download as PDF - Not implemented yet');
});

document.getElementById('applyFilter').addEventListener('click', () => {
  updateTable();
  filterCard.classList.add('d-none');
});

function updateTable() {
  const tbody = document.getElementById('invoiceTbody');
  let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
  tbody.innerHTML = '';

  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          There are no invoices for the selected period.
        </td>
      </tr>`;
    return;
  }

  invoices.forEach(inv => {
    const tr = document.createElement('tr');

    const supplierName = suppliers.find(s => s.id == inv.supplierId)?.name || '';
    const clientName = clients.find(c => c.id == inv.clientId)?.name || '';

    tr.innerHTML = `
      <td>${inv.invoiceNumber || ''}</td>
      <td>${inv.state || ''}</td>
      <td>${inv.invoiceDate || inv.date || ''}</td>
      <td>${supplierName || clientName || ''}</td>
      <td>${inv.amount || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateTable();
});