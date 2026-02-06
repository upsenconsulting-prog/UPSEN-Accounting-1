// Invoice_recieved.js - Com dados isolados por usuário

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

// ========== DADOS DO USUÁRIO LOGADO ==========
function getUserInvoicesReceived() {
  return AuthSystem.getUserData('upsen_invoices_received') || [];
}

function saveUserInvoiceReceived(invoice) {
  const list = getUserInvoicesReceived();
  list.push({
    id: AuthSystem.generateId(),
    invoiceNumber: invoice.invoiceNumber || '',
    supplier: invoice.supplier || '',
    invoiceDate: invoice.invoiceDate || '',
    amount: Number(invoice.amount || 0),
    state: invoice.state || 'Pendiente',
    description: invoice.description || '',
    createdAt: new Date().toISOString()
  });
  AuthSystem.saveUserData('upsen_invoices_received', list);
}

function deleteUserInvoiceReceived(id) {
  const list = getUserInvoicesReceived().filter(i => i.id !== id);
  AuthSystem.saveUserData('upsen_invoices_received', list);
}

function updateUserInvoiceReceived(id, updates) {
  const list = getUserInvoicesReceived();
  const index = list.findIndex(i => i.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    AuthSystem.saveUserData('upsen_invoices_received', list);
  }
}

// ========== RENDER FUNCTIONS ==========
function renderSummaryCards() {
  const list = getUserInvoicesReceived();
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

function renderChart() {
  const chartContainer = document.getElementById('receivedChartCanvas');
  if (!chartContainer) return;

  const list = getUserInvoicesReceived();
  
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

function renderInvoices() {
  const tbody = $('invoiceTBody');
  if (!tbody) return;

  const list = getUserInvoicesReceived();
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
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar factura?')) {
        deleteUserInvoiceReceived(btn.getAttribute('data-del'));
        renderInvoices();
        renderChart();
        renderSummaryCards();
      }
    });
  });

  tbody.querySelectorAll('[data-paid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateUserInvoiceReceived(btn.getAttribute('data-paid'), { state: 'Pagada' });
      renderInvoices();
      renderSummaryCards();
    });
  });
}


document.addEventListener('DOMContentLoaded', () => {
  markActivePage();
  
  // Guardar nova factura
  const saveBtn = $('saveInvoiceReceivedBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
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

      saveUserInvoiceReceived(data);

      const modal = $('modalNewInvoiceReceived');
      if (modal) modal.classList.remove('show');
      
      form.reset();
      renderInvoices();
      renderChart();
      renderSummaryCards();
    });
  }

  renderInvoices();
  renderChart();
  renderSummaryCards();
});
