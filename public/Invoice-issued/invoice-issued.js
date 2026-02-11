// invoice-issued.js - Com Firebase Firestore

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
let issuedChart = null;

// ========== DADOS DO USUÁRIO LOGADO (FIRESTORE) ==========
async function getUserInvoicesIssued() {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    
    const result = await FirestoreService.getAll('invoices_issued');
    // FirestoreService.getAll retorna { success: true, data: [...] } ou array (localStorage)
    if (result && result.success === true && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error('Error getting invoices issued:', error);
    return [];
  }
}

async function saveUserInvoiceIssued(invoice) {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    
    const newInvoice = {
      invoiceNumber: invoice.invoiceNumber || '',
      customer: invoice.customer || '',
      invoiceDate: invoice.invoiceDate || '',
      dueDate: invoice.dueDate || '',
      amount: Number(invoice.amount || 0),
      state: invoice.state || 'Pendiente',
      description: invoice.description || '',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    // Usar create (alias para add)
    await window.FirestoreService.create('invoices_issued', newInvoice);
    return true;
  } catch (error) {
    console.error('Error saving invoice:', error);
    return false;
  }
}

async function deleteUserInvoiceIssued(id) {
  try {
    await FirestoreService.delete('invoices_issued', id);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

async function updateUserInvoiceIssued(id, updates) {
  try {
    await FirestoreService.update('invoices_issued', id, updates);
    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
}

// ========== RENDER FUNCTIONS ==========
async function renderSummaryCards() {
  const list = await getUserInvoicesIssued();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let pendingTotal = 0;
  let overdueTotal = 0;
  let monthlyCount = 0;
  let totalAmount = 0;
  
  list.forEach(inv => {
    const amount = Number(inv.amount || 0);
    totalAmount += amount;
    
    if (inv.state === 'Pendiente') {
      pendingTotal += amount;
    }
    
    // Check if overdue
    if (inv.dueDate && inv.state === 'Pendiente') {
      const dueDate = new Date(inv.dueDate);
      if (dueDate < now) {
        overdueTotal += amount;
      }
    }
    
    // Monthly count
    if (inv.invoiceDate) {
      const [year, month] = inv.invoiceDate.split('-').map(Number);
      if (year === currentYear && month - 1 === currentMonth) {
        monthlyCount++;
      }
    }
  });
  
  const avgAmount = list.length > 0 ? totalAmount / list.length : 0;
  
  // Update DOM
  $('pendingTotal').textContent = moneyEUR(pendingTotal);
  $('overdueTotal').textContent = moneyEUR(overdueTotal);
  $('monthlyCount').textContent = `${monthlyCount} facturas`;
  $('averageAmount').textContent = moneyEUR(avgAmount);
}

async function renderChart() {
  const chartContainer = document.getElementById('issuedChartCanvas');
  if (!chartContainer) return;

  const list = await getUserInvoicesIssued();
  
  // Calculate totals by month (last 6 months)
  const monthlyData = {};
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = 0;
  }
  
  list.forEach(inv => {
    if (inv.invoiceDate) {
      const monthKey = inv.invoiceDate.substring(0, 7);
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += Number(inv.amount || 0);
      }
    }
  });

  const labels = Object.keys(monthlyData).map(k => {
    const [y, m] = k.split('-');
    return `${m}/${y.slice(2)}`;
  });
  const data = Object.values(monthlyData);

  const ctx = chartContainer.getContext('2d');

  if (issuedChart) {
    issuedChart.destroy();
  }

  issuedChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ingresos',
        data: data,
        borderColor: '#2a4d9c',
        backgroundColor: 'rgba(42, 77, 156, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          }
        }
      }
    }
  });
}

async function renderInvoices() {
  const tbody = $('invoiceTbody');
  if (!tbody) return;

  const list = await getUserInvoicesIssued();
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No hay facturas emitidas todavía.
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
      <td>${inv.customer || '-'}</td>
      <td>${formatDate(inv.invoiceDate)}</td>
      <td>${formatDate(inv.dueDate)}</td>
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
        await deleteUserInvoiceIssued(btn.getAttribute('data-del'));
        await renderInvoices();
        await renderChart();
        await renderSummaryCards();
      }
    });
  });

  tbody.querySelectorAll('[data-paid]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await updateUserInvoiceIssued(btn.getAttribute('data-paid'), { state: 'Pagada' });
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
  const saveBtn = $('saveInvoiceIssuedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const form = $('formNewInvoiceIssued');
      if (!form) return;

      const fd = new FormData(form);
      const data = {
        invoiceNumber: String(fd.get('invoiceNumber') || ''),
        customer: String(fd.get('customer') || ''),
        invoiceDate: String(fd.get('invoiceDate') || ''),
        dueDate: String(fd.get('dueDate') || ''),
        amount: String(fd.get('amount') || ''),
        state: String(fd.get('state') || 'Pendiente')
      };

      if (!data.invoiceNumber || !data.customer || !data.invoiceDate || !data.dueDate || !data.amount) {
        alert('Completa todos los campos.');
        return;
      }

      await saveUserInvoiceIssued(data);

      const modal = $('modalNewInvoiceIssued');
      if (modal) modal.classList.remove('show');
      
      form.reset();
      await renderInvoices();
      await renderChart();
      await renderSummaryCards();
    });
  }
});
