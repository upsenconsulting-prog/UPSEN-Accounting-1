// Invoice_recieved.js - Com Firebase Firestore

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return `€${v.toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// ========== MARK ACTIVE PAGE ==========
function markActivePage() {
  const currentPage = window.location.href;
  const links = document.querySelectorAll('.sidebar-link');
  
  links.forEach(link => {
    link.parentElement.classList.remove('active');
    if (link.href === currentPage) {
      link.parentElement.classList.add('active');
    }
  });
}

// Chart instance
let receivedChart = null;

// ========== DADOS DO USUÁRIO LOGADO (FIRESTORE) ==========
async function getUserInvoicesReceived() {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    
    const result = await FirestoreService.getAll('invoices_received');
    // FirestoreService.getAll retorna { success: true, data: [...] } ou array (localStorage)
    if (result && result.success === true && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error('Error getting invoices received:', error);
    return [];
  }
}

async function saveUserInvoiceReceived(invoice) {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    
    const newInvoice = {
      invoiceNumber: invoice.invoiceNumber || '',
      supplier: invoice.supplier || '',
      invoiceDate: invoice.invoiceDate || '',
      amount: Number(invoice.amount || 0),
      state: invoice.state || 'Pendiente',
      description: invoice.description || '',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    // Usar create (alias para add)
    await window.FirestoreService.create('invoices_received', newInvoice);
    return true;
  } catch (error) {
    console.error('Error saving invoice:', error);
    return false;
  }
}

async function deleteUserInvoiceReceived(id) {
  try {
    await FirestoreService.delete('invoices_received', id);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

async function updateUserInvoiceReceived(id, updates) {
  try {
    await FirestoreService.update('invoices_received', id, updates);
    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
}

// ========== RENDER FUNCTIONS ==========
async function renderSummaryCards() {
  const list = await getUserInvoicesReceived();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let pendingTotal = 0;
  let paidTotal = 0;
  let monthlyTotal = 0;
  let overdueCount = 0;
  
  list.forEach(inv => {
    const amount = Number(inv.amount || 0);
    
    if (inv.state === 'Pendiente') {
      pendingTotal += amount;
      
      // Check if overdue (assume due date is 30 days after invoice date)
      if (inv.invoiceDate) {
        const invoiceDate = new Date(inv.invoiceDate);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        if (dueDate < now) {
          overdueCount++;
        }
      }
    } else if (inv.state === 'Pagada') {
      paidTotal += amount;
    }
    
    // Monthly total
    if (inv.invoiceDate) {
      const [year, month] = inv.invoiceDate.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyTotal += amount;
      }
    }
  });
  
  // Update DOM
  $('pendingTotal').textContent = moneyEUR(pendingTotal);
  $('paidTotal').textContent = moneyEUR(paidTotal);
  $('monthlyTotal').textContent = moneyEUR(monthlyTotal);
  $('overdueCount').textContent = overdueCount;
}

async function renderChart() {
  const chartContainer = document.getElementById('receivedChartCanvas');
  if (!chartContainer) return;

  const list = await getUserInvoicesReceived();
  
  // Calculate totals by supplier
  const supplierTotals = {};
  list.forEach(inv => {
    const supplier = inv.supplier || 'Sin proveedor';
    supplierTotals[supplier] = (supplierTotals[supplier] || 0) + Number(inv.amount || 0);
  });

  const labels = Object.keys(supplierTotals);
  const data = Object.values(supplierTotals);

  const ctx = chartContainer.getContext('2d');

  if (receivedChart) {
    receivedChart.destroy();
  }

  receivedChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: [
          '#2a4d9c', '#3a6cd6', '#1abc9c', '#e74c3c', '#f39c12',
          '#9b59b6', '#3498db', '#1abc9c', '#e67e22', '#34495e'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

async function renderInvoices() {
  const tbody = $('invoiceTBody');
  if (!tbody) return;

  const list = await getUserInvoicesReceived();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No hay facturas recibidas todavía.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((inv) => {
    let statusClass = 'status-pending';
    let statusText = 'Pendiente';
    
    if (inv.state === 'Pagada') {
      statusClass = 'status-paid';
      statusText = 'Pagada';
    } else if (inv.state === 'Vencida') {
      statusClass = 'status-overdue';
      statusText = 'Vencida';
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inv.invoiceNumber || '-'}</td>
      <td>${inv.supplier || '-'}</td>
      <td>${formatDate(inv.invoiceDate)}</td>
      <td>${moneyEUR(inv.amount)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary" data-view="${inv.id}">Ver</button>
        <button class="btn btn-sm btn-outline-success" data-paid="${inv.id}" title="Marcar como pagada">✓</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${inv.id}" title="Eliminar">X</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Eliminar factura?')) {
        await deleteUserInvoiceReceived(btn.getAttribute('data-del'));
        await renderInvoices();
        await renderChart();
        await renderSummaryCards();
      }
    });
  });

  tbody.querySelectorAll('[data-paid]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await updateUserInvoiceReceived(btn.getAttribute('data-paid'), { state: 'Pagada' });
      await renderInvoices();
      await renderSummaryCards();
    });
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  markActivePage();
  
  // Load data
  await renderInvoices();
  await renderChart();
  await renderSummaryCards();
  
  // Guardar nova factura
  const saveBtn = $('saveInvoiceReceivedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const form = $('formNewInvoiceReceived');
      if (!form) return;

       const fd = new FormData(form);
      const data = {
        invoiceNumber: String(fd.get('invoiceNumber') || ''),
        supplier: String(fd.get('supplier') || ''),
        invoiceDate: String(fd.get('invoiceDate') || ''),
        amount: String(fd.get('amount') || ''),
        state: String(fd.get('state') || 'Pendiente')
      };

      if (!data.invoiceNumber || !data.supplier || !data.invoiceDate || !data.amount) {
        alert('Completa todos los campos.');
        return;
      }

      await saveUserInvoiceReceived(data);

      const modal = $('modalNewInvoiceReceived');
      if (modal) modal.classList.remove('show');
      
      form.reset();
      await renderInvoices();
      await renderChart();
      await renderSummaryCards();
    });
  }
});
