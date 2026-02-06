// budgetPage/script.js - Com dados isolados por usuário

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  const v = Number(n ?? 0);
  return '€' + v.toFixed(2);
}

// ========== DADOS DO USUÁRIO LOGADO ==========
function getUserBudgets() {
  return AuthSystem.getUserData('upsen_budgets') || [];
}

function saveUserBudget(budget) {
  const list = getUserBudgets();
  list.push({
    id: AuthSystem.generateId(),
    number: budget.number || '',
    series: budget.series || 'Presupuestos',
    date: budget.date || '',
    validity: budget.validity || '',
    customer: budget.customer || '',
    notes: budget.notes || '',
    retention: budget.retention || '',
    status: budget.status || 'pending',
    tags: budget.tags || '',
    items: budget.items || [],
    total: Number(budget.total || 0),
    createdAt: new Date().toISOString()
  });
  AuthSystem.saveUserData('upsen_budgets', list);
}

function deleteUserBudget(id) {
  const list = getUserBudgets().filter(b => b.id !== id);
  AuthSystem.saveUserData('upsen_budgets', list);
}

function updateUserBudget(id, updates) {
  const list = getUserBudgets();
  const index = list.findIndex(b => b.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    AuthSystem.saveUserData('upsen_budgets', list);
  }
}

function generateBudgetNumber() {
  const budgets = getUserBudgets();
  if (budgets.length === 0) {
    return "BUD-001";
  }
  const maxNum = budgets.reduce((max, b) => {
    const num = b.number?.replace("BUD-", "") || "0";
    return Math.max(max, parseInt(num, 10));
  }, 0);
  return "BUD-" + String(maxNum + 1).padStart(3, '0');
}

// Generate budget number on load
window.addEventListener('DOMContentLoaded', () => {
  console.log('Budget page loaded');
  const numberInput = $('number');
  if (numberInput) {
    numberInput.value = generateBudgetNumber();
    console.log('Budget number set:', numberInput.value);
  }
});

// Add item button
const addItemBtn = document.getElementById('addItem');
if (addItemBtn) {
  addItemBtn.addEventListener('click', () => {
    console.log('Add item clicked');
    const tbody = document.querySelector('#itemsTable tbody');
    if (!tbody) {
      console.error('Table body not found!');
      return;
    }
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><input type="text" class="form-control desc" placeholder="Artículo"></td>
      <td><input type="number" class="form-control qty" value="1" min="1" oninput="updateTotals()"></td>
      <td><input type="number" class="form-control unit" value="0" step="0.01" oninput="updateTotals()"></td>
      <td class="line-total">0.00</td>
      <td><button type="button" class="btn btn-danger btn-sm remove-btn">X</button></td>
    `;
    tbody.appendChild(newRow);
    updateTotals();
  });
}

// Remove item button
const itemsTable = document.getElementById('itemsTable');
if (itemsTable) {
  itemsTable.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const row = e.target.closest('tr');
      if (row) {
        row.remove();
        updateTotals();
      }
    }
  });
}

// Update totals - GLOBAL FUNCTION
window.updateTotals = function() {
  console.log('updateTotals called');
  const rows = document.querySelectorAll('#itemsTable tbody tr');
  console.log('Number of rows:', rows.length);
  
  let grandTotal = 0;
  rows.forEach((row, index) => {
    const qtyInput = row.querySelector('.qty');
    const unitInput = row.querySelector('.unit');
    const lineTotalCell = row.querySelector('.line-total');
    
    if (qtyInput && unitInput && lineTotalCell) {
      const qty = parseFloat(qtyInput.value) || 0;
      const unit = parseFloat(unitInput.value) || 0;
      const total = qty * unit;
      
      lineTotalCell.textContent = total.toFixed(2);
      grandTotal += total;
      
      console.log(`Row ${index}: qty=${qty}, unit=${unit}, total=${total}`);
    }
  });
  
  const grandTotalEl = document.getElementById('grandTotal');
  if (grandTotalEl) {
    grandTotalEl.textContent = `Total: ${moneyEUR(grandTotal)}`;
    console.log('Grand Total:', grandTotal);
  }
  
  return grandTotal;
};

// New budget button - clear form
const newBudgetBtn = document.getElementById('newBudgetBtn');
if (newBudgetBtn) {
  newBudgetBtn.addEventListener('click', () => {
    console.log('New budget button clicked');
    if (confirm('¿Desea crear un nuevo presupuesto? Se limpiará el formulario.')) {
      clearForm();
    }
  });
}

// Clear form function
function clearForm() {
  $('number').value = generateBudgetNumber();
  $('customer').value = "";
  $('date').value = "";
  $('validity').value = "";
  $('notes').value = "";
  $('tags').value = "";
  $('status').value = "pending";
  
  const tbody = document.querySelector('#itemsTable tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td><input type="text" class="form-control desc" placeholder="Artículo"></td>
        <td><input type="number" class="form-control qty" value="1" min="1" oninput="updateTotals()"></td>
        <td><input type="number" class="form-control unit" value="0" step="0.01" oninput="updateTotals()"></td>
        <td class="line-total">0.00</td>
        <td><button type="button" class="btn btn-danger btn-sm remove-btn">X</button></td>
      </tr>
    `;
  }
  updateTotals();
}

// Save budget
const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    console.log('Save budget clicked');
    const rows = document.querySelectorAll('#itemsTable tbody tr');
    const items = [];
    
    rows.forEach(row => {
      const desc = row.querySelector('.desc')?.value || "";
      const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
      const unit = parseFloat(row.querySelector('.unit')?.value) || 0;
      const total = qty * unit;
      
      if (desc.trim()) {
        items.push({ desc, qty, unit, total });
      }
    });
    
    const data = {
      number: $('number')?.value || generateBudgetNumber(),
      date: ($('date')?.value || "").toString().trim(),
      validity: ($('validity')?.value || "").toString().trim(),
      customer: ($('customer')?.value || "").toString().trim(),
      notes: ($('notes')?.value || "").toString().trim(),
      retention: ($('retention')?.value || "").toString().trim(),
      status: ($('status')?.value || "pending").toString().trim(),
      tags: ($('tags')?.value || "").toString().trim(),
      items,
      total: updateTotals()
    };
    
    console.log('Budget data:', data);
    
    if (!data.date || !data.customer) {
      alert("Por favor complete: fecha y cliente.");
      return;
    }
    
    if (data.items.length === 0) {
      alert("Por favor añada al menos un artículo.");
      return;
    }
    
    saveUserBudget(data);
    alert("Presupuesto guardado correctamente!");
    clearForm();
  });
}

// Cancel button
const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (confirm('¿Desea cancelar y limpiar el formulario?')) {
      clearForm();
    }
  });
}

// ==================== VER PRESUPUESTOS GUARDADOS ====================
let budgetsModal = null;
let viewBudgetModal = null;

const viewBudgetsBtn = document.getElementById('viewBudgetsBtn');
if (viewBudgetsBtn) {
  viewBudgetsBtn.addEventListener('click', () => {
    console.log('View budgets button clicked');
    loadSavedBudgets();
    if (!budgetsModal) {
      budgetsModal = new bootstrap.Modal(document.getElementById('budgetsModal'));
    }
    budgetsModal.show();
  });
}

function loadSavedBudgets() {
  const tbody = $('budgetsTbody');
  if (!tbody) return;
  
  const budgets = getUserBudgets();
  console.log('Loaded budgets:', budgets);
  
  if (budgets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay presupuestos guardados</td></tr>';
    return;
  }
  
  // Sort by date (newest first)
  const sortedBudgets = budgets.sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  
  tbody.innerHTML = sortedBudgets.map(budget => {
    const statusClass = {
      'pending': 'bg-warning',
      'approved': 'bg-success',
      'rejected': 'bg-danger'
    }[budget.status] || 'bg-secondary';
    
    const statusLabel = {
      'pending': 'Pendiente',
      'approved': 'Aprobado',
      'rejected': 'Rechazado'
    }[budget.status] || 'Pendiente';
    
    return `
    <tr>
      <td><strong>${budget.number || '-'}</strong></td>
      <td>${budget.date || '-'}</td>
      <td>${budget.customer || '-'}</td>
      <td><strong>${moneyEUR(budget.total)}</strong></td>
      <td>
        <select class="form-select form-select-sm" onchange="changeBudgetStatus('${budget.id}', this.value)" style="width: auto; display: inline-block;">
          <option value="pending" ${budget.status === 'pending' ? 'selected' : ''}>Pendiente</option>
          <option value="approved" ${budget.status === 'approved' ? 'selected' : ''}>Aprobado</option>
          <option value="rejected" ${budget.status === 'rejected' ? 'selected' : ''}>Rechazado</option>
        </select>
      </td>
      <td>
        <button class="btn btn-primary btn-sm me-1" onclick="viewBudget('${budget.id}')">👁️ Ver</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBudgetPrompt('${budget.id}')">🗑️</button>
      </td>
    </tr>
  `}).join('');
}

// Make functions globally accessible for onclick handlers
window.viewBudget = function(id) {
  const budget = getUserBudgets().find(b => b.id === id);
  if (!budget) return;
  
  const itemsHtml = budget.items?.map(item => `
    <tr>
      <td>${item.desc || ''}</td>
      <td>${item.qty || 0}</td>
      <td>${moneyEUR(item.unit)}</td>
      <td>${moneyEUR(item.total)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Sin artículos</td></tr>';
  
  const statusLabel = {
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'rejected': 'Rechazado'
  }[budget.status] || 'Pendiente';
  
  const content = $('viewBudgetContent');
  content.innerHTML = `
    <div class="row mb-3">
      <div class="col-md-6">
        <strong>Número:</strong> ${budget.number || '-'}
      </div>
      <div class="col-md-6">
        <strong>Fecha:</strong> ${budget.date || '-'}
      </div>
    </div>
    <div class="row mb-3">
      <div class="col-md-6">
        <strong>Cliente:</strong> ${budget.customer || '-'}
      </div>
      <div class="col-md-6">
        <strong>Total:</strong> <span class="fs-4 fw-bold">${moneyEUR(budget.total)}</span>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col-md-6">
        <strong>Estado:</strong> <span class="badge bg-primary">${statusLabel}</span>
      </div>
    </div>
    ${budget.notes ? `<div class="mb-3"><strong>Notas:</strong> ${budget.notes}</div>` : ''}
    ${budget.tags ? `<div class="mb-3"><strong>Etiquetas:</strong> ${budget.tags}</div>` : ''}
    
    <h5 class="mt-4">Artículos</h5>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead class="table-secondary">
          <tr>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Coste unitario</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
    
    <div class="text-muted mt-3 text-end">
      <small>Creado: ${new Date(budget.createdAt || '').toLocaleString()}</small>
    </div>
  `;
  
  if (!viewBudgetModal) {
    viewBudgetModal = new bootstrap.Modal(document.getElementById('viewBudgetModal'));
  }
  viewBudgetModal.show();
};

window.deleteBudgetPrompt = function(id) {
  const budget = getUserBudgets().find(b => b.id === id);
  if (!budget) return;
  
  if (confirm(`¿Está seguro de eliminar el presupuesto ${budget.number}?\n\nEsta acción no se puede deshacer.`)) {
    deleteUserBudget(id);
    loadSavedBudgets();
    alert('Presupuesto eliminado correctamente.');
  }
};

// Change budget status
window.changeBudgetStatus = function(id, newStatus) {
  const budget = getUserBudgets().find(b => b.id === id);
  if (!budget) return;
  
  const statusLabels = {
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'rejected': 'Rechazado'
  };
  
  if (confirm(`¿Cambiar estado de "${budget.number}" a ${statusLabels[newStatus]}?`)) {
    updateUserBudget(id, { status: newStatus });
    loadSavedBudgets();
    alert('Estado actualizado correctamente.');
  }
};
