// budgetPage/script.js - Com sincronização através do store.js (unificado)

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  return 'EUR ' + Number(n || 0).toFixed(2);
}

function getBudgetStatusValue(budget) {
  if (window.StatusEngine && typeof window.StatusEngine.normalizeStatusValue === 'function') {
    return window.StatusEngine.normalizeStatusValue('budget', budget && budget.status);
  }
  return (budget && budget.status) || 'pending';
}

function getBudgetStatusLabel(budget) {
  var status = getBudgetStatusValue(budget);
  if (window.StatusEngine && typeof window.StatusEngine.getStatusLabel === 'function') {
    return window.StatusEngine.getStatusLabel('budget', status);
  }
  return status;
}

function getBudgetStatusClass(budget) {
  var status = getBudgetStatusValue(budget);
  if (status === 'approved') return 'badge-paid';
  if (status === 'rejected') return 'badge-late';
  return 'badge-pending';
}

// ========== ID DO USUÁRIO ==========
// Use the global getUserId from store.js
const getUserId = window.getUserId;
// ========== Usa store.js unificado ==========
// Todas as operações passam pelo store.js que maneja localStorage E Firebase

async function getUserBudgets() {
  // Usar store.js que já faz sync automático com Firebase
  if (window.getBudgets) {
    return await window.getBudgets();
  }
  
  // Fallback se store.js não disponível
  try {
    const data = localStorage.getItem('upsen_budgets_' + getUserId());
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

async function saveUserBudget(budget) {
  // Usar store.js para adicionar (já faz Firebase + localStorage)
  if (window.addBudget) {
    return await window.addBudget(budget);
  }
  
  // Fallback
  const budgets = await getUserBudgets();
  const newBudget = {
    id: generateId(),
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
  };
  
  budgets.push(newBudget);
  localStorage.setItem('upsen_budgets_' + getUserId(), JSON.stringify(budgets));
  return newBudget;
}

async function deleteUserBudget(id) {
  // Usar store.js para eliminar
  if (window.deleteBudget) {
    return await window.deleteBudget(id);
  }
  
  // Fallback
  const budgets = await getUserBudgets();
  const filtered = budgets.filter(b => b.id !== id);
  localStorage.setItem('upsen_budgets_' + getUserId(), JSON.stringify(filtered));
}

async function updateUserBudget(id, updates) {
  // Usar store.js para atualizar
  if (window.updateBudget) {
    return await window.updateBudget(id, updates);
  }
  
  // Fallback
  const budgets = await getUserBudgets();
  const index = budgets.findIndex(b => b.id === id);
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...updates };
    localStorage.setItem('upsen_budgets_' + getUserId(), JSON.stringify(budgets));
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function generateBudgetNumber() {
  return 'BUD-' + Date.now().toString().slice(-6);
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  // Inicialização básica da UI
  if ($('number')) $('number').value = generateBudgetNumber();
  if ($('date')) $('date').value = new Date().toISOString().split('T')[0];

  // Função para aguardar o Auth e sincronizar
  function checkAndInit() {
    if (window.getBudgetsSync && window.FirebaseSync) {
      console.log('[Budgets] Store e Sync prontos, aguardando Auth...');
      
      // Usar o sistema central de Auth
      if (typeof window.waitForAuth === 'function') {
        window.waitForAuth(function() {
          console.log('[Budgets] Auth pronto, sincronizando...');
          window.FirebaseSync.syncCollectionToLocalStorage('budgets').then(function() {
            loadSavedBudgets();
          });
        });
      } else {
        // Fallback se waitForAuth não estiver disponível
        setTimeout(() => {
          loadSavedBudgets();
        }, 2000);
      }
    } else {
      // Tentar novamente em breve se os scripts ainda não carregaram
      setTimeout(checkAndInit, 500);
    }
  }

  checkAndInit();

  // Listener para atualizações em tempo real (vindo do store.js/firebase-sync.js)
  window.addEventListener('dataUpdated-budgets', function() {
    console.log('[Budgets] Dados atualizados via Realtime Sync, recarregando lista...');
    loadSavedBudgets();
  });

  // Configurar cálculos em tempo real para o formulário
  const formInputs = ['retention', 'grandTotal']; // IDs para monitorar
  document.querySelector('#itemsTable').addEventListener('input', updateTotals);
  
  const retentionInput = $('retention');
  if (retentionInput) {
    retentionInput.addEventListener('input', updateTotals);
  }
});

// Helper para marcar página ativa (consistência com sidebar)
function markActivePage() {
  const currentPage = window.location.href;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.href === currentPage) link.parentElement.classList.add('active');
  });
}

// ========== ITENS DO ORÇAMENTO ==========
const addItemBtn = document.getElementById('addItem');
if (addItemBtn) {
  addItemBtn.addEventListener('click', () => {
    const tbody = document.querySelector('#itemsTable tbody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = '<td><input type="text" class="form-control desc" placeholder="Artículo"></td>' +
      '<td><input type="number" class="form-control qty" value="1" min="1" oninput="updateTotals()"></td>' +
      '<td><input type="number" class="form-control unit" value="0" step="0.01" oninput="updateTotals()"></td>' +
      '<td class="line-total">0.00</td>' +
      '<td><button type="button" class="btn btn-danger btn-sm remove-btn">X</button></td>';
    tbody.appendChild(newRow);
    updateTotals();
  });
}

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

window.updateTotals = function() {
  const rows = document.querySelectorAll('#itemsTable tbody tr');
  const lines = [];
  let retentionRate = parseFloat($('retention')?.value) || 0;
  
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
    const unit = parseFloat(row.querySelector('.unit')?.value) || 0;
    const total = window.CalculationEngine
      ? window.CalculationEngine.calculateLineSubtotal(unit, qty)
      : qty * unit;
    
    const lineTotalEl = row.querySelector('.line-total');
    if (lineTotalEl) lineTotalEl.textContent = total.toFixed(2);
    lines.push({ qty, unit });
  });
  
  // Aplicar retenção se houver
  const totals = window.CalculationEngine
    ? window.CalculationEngine.calculateBudgetTotals(lines, retentionRate)
    : {
        totalAmount: lines.reduce((sum, line) => sum + (line.qty * line.unit), 0) - (lines.reduce((sum, line) => sum + (line.qty * line.unit), 0) * (retentionRate / 100))
      };
  
  const grandTotalEl = document.getElementById('grandTotal');
  if (grandTotalEl) {
    grandTotalEl.textContent = 'Total: ' + moneyEUR(totals.totalAmount);
  }
  
  return totals.totalAmount;
};

// ========== FORMULÁRIO ==========
function clearForm() {
  const numberInput = $('number');
  if (numberInput) {
    numberInput.value = generateBudgetNumber();
  }
  const customerInput = $('customer');
  if (customerInput) {
    customerInput.value = '';
  }
  const dateInput = $('date');
  if (dateInput) {
    dateInput.value = '';
  }
  const validityInput = $('validity');
  if (validityInput) {
    validityInput.value = '';
  }
  const notesInput = $('notes');
  if (notesInput) {
    notesInput.value = '';
  }
  const tagsInput = $('tags');
  if (tagsInput) {
    tagsInput.value = '';
  }
  const statusSelect = $('status');
  if (statusSelect) {
    statusSelect.value = 'pending';
  }
  
  const tbody = document.querySelector('#itemsTable tbody');
  if (tbody) {
    tbody.innerHTML = '<tr>' +
      '<td><input type="text" class="form-control desc" placeholder="Artículo"></td>' +
      '<td><input type="number" class="form-control qty" value="1" min="1" oninput="updateTotals()"></td>' +
      '<td><input type="number" class="form-control unit" value="0" step="0.01" oninput="updateTotals()"></td>' +
      '<td class="line-total">0.00</td>' +
      '<td><button type="button" class="btn btn-danger btn-sm remove-btn">X</button></td></tr>';
  }
  updateTotals();
}

const newBudgetBtn = document.getElementById('newBudgetBtn');
if (newBudgetBtn) {
  newBudgetBtn.addEventListener('click', () => {
    if (confirm('¿Desea crear un nuevo presupuesto?')) {
      clearForm();
    }
  });
}

const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const rows = document.querySelectorAll('#itemsTable tbody tr');
    const items = [];
    
    rows.forEach(row => {
      const desc = row.querySelector('.desc')?.value || '';
      const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
      const unit = parseFloat(row.querySelector('.unit')?.value) || 0;
      
      if (desc.trim()) {
        items.push({ desc, qty, unit, total: qty * unit });
      }
    });
    
    const data = {
      number: $('number')?.value || generateBudgetNumber(),
      date: ($('date')?.value || '').toString().trim(),
      validity: ($('validity')?.value || '').toString().trim(),
      customer: ($('customer')?.value || '').toString().trim(),
      notes: ($('notes')?.value || '').toString().trim(),
      retention: ($('retention')?.value || '').toString().trim(),
      status: ($('status')?.value || 'pending').toString().trim(),
      tags: ($('tags')?.value || '').toString().trim(),
      items,
      total: updateTotals()
    };
    
    if (!data.date || !data.customer) {
      alert('Por favor complete: fecha y cliente.');
      return;
    }
    
    if (data.items.length === 0) {
      alert('Por favor añada al menos un artículo.');
      return;
    }
    
    try {
      await saveUserBudget(data);
      alert('Presupuesto guardado correctamente!');
      clearForm();
    } catch (error) {
      alert(error && error.message ? error.message : 'Error guardando presupuesto.');
      return;
    }
    
    // Atualizar lista se modal estiver aberto
    if (window.loadSavedBudgets) {
      window.loadSavedBudgets();
    }
  });
}

const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (confirm('¿Desea cancelar y limpiar el formulario?')) {
      clearForm();
    }
  });
}

// ========== VER ORÇAMENTOS ==========
let budgetsModal = null;
let viewBudgetModal = null;

const viewBudgetsBtn = document.getElementById('viewBudgetsBtn');
if (viewBudgetsBtn) {
  viewBudgetsBtn.addEventListener('click', async () => { // Tornar o listener assíncrono
    await window.loadSavedBudgets(); // Aguardar o carregamento dos orçamentos
    if (!budgetsModal) {
      budgetsModal = new bootstrap.Modal(document.getElementById('budgetsModal'));
    }
    budgetsModal.show(); // Exibir o modal somente após os orçamentos serem carregados
  });
}

window.loadSavedBudgets = async function() {
  const tbody = $('budgetsTbody');
  if (!tbody) return;
  
  const budgets = await getUserBudgets();
  
  if (budgets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay presupuestos guardados</td></tr>';
    return;
  }
  
  const sortedBudgets = [...budgets].sort((a, b) => 
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  
  tbody.innerHTML = sortedBudgets.map(budget => {
    const statusClass = getBudgetStatusClass(budget);
    const statusLabel = getBudgetStatusLabel(budget);
    
    return `
      <tr>
        <td><strong>${budget.number || '-'}</strong></td>
        <td>${budget.date || '-'}</td>
        <td class="td-client">${budget.customer || '-'}</td>
        <td><strong>${moneyEUR(budget.total)}</strong></td>
        <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
        <td class="text-end">
          <button class="btn btn-info btn-sm me-1" onclick="viewBudget('${budget.id}')" title="Ver">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteBudgetPrompt('${budget.id}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
};

window.viewBudget = async function(id) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;
  
  const itemsHtml = (budget.items || []).map(item => `
    <tr>
      <td>${item.desc || ''}</td>
      <td>${item.qty}</td>
      <td>${moneyEUR(item.unit)}</td>
      <td>${moneyEUR(item.total)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Sin artículos</td></tr>';
  
  const statusLabel = getBudgetStatusLabel(budget);
  
  const content = $('viewBudgetContent');
  content.innerHTML = `
    <div class="row mb-3">
      <div class="col-md-6"><strong>Número:</strong> ${budget.number || '-'}</div>
      <div class="col-md-6"><strong>Fecha:</strong> ${budget.date || '-'}</div>
    </div>
    <div class="row mb-3">
      <div class="col-md-6"><strong>Cliente:</strong> ${budget.customer || '-'}</div>
      <div class="col-md-6"><strong>Total:</strong> <span class="fs-4 fw-bold">${moneyEUR(budget.total)}</span></div>
    </div>
    <div class="row mb-3">
      <div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">${statusLabel}</span></div>
    </div>
    ${budget.notes ? `<div class="mb-3"><strong>Notas:</strong> ${budget.notes}</div>` : ''}
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
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
    <div class="text-muted mt-3 text-end">
      <small>Creado: ${new Date(budget.createdAt || '').toLocaleString()}</small>
    </div>`;
  
  if (!viewBudgetModal) {
    viewBudgetModal = new bootstrap.Modal(document.getElementById('viewBudgetModal'));
  }
  viewBudgetModal.show();
};

window.deleteBudgetPrompt = async function(id) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;
  
  if (confirm('¿Está seguro de eliminar el presupuesto ' + budget.number + '?')) {
    await deleteUserBudget(id);
    window.loadSavedBudgets();
    alert('Presupuesto eliminado correctamente.');
  }
};

window.changeBudgetStatus = async function(id, newStatus) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;
  
  const targetLabel = getBudgetStatusLabel({ status: newStatus });
  
  if (confirm('¿Cambiar estado de "' + budget.number + '" a ' + targetLabel + '?')) {
    try {
      await updateUserBudget(id, { status: newStatus });
      window.loadSavedBudgets();
      alert('Estado actualizado correctamente.');
    } catch (error) {
      alert(error && error.message ? error.message : 'No se pudo actualizar el estado.');
    }
  }
};

window.changeBudgetStatus = async function(id, newStatus) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;

  const targetLabel = getBudgetStatusLabel({ status: newStatus });

  if (confirm('¿Cambiar estado de "' + budget.number + '" a ' + targetLabel + '?')) {
    try {
      await updateUserBudget(id, { status: newStatus });
      window.loadSavedBudgets();
      alert('Estado actualizado correctamente.');
    } catch (error) {
      alert(error && error.message ? error.message : 'No se pudo actualizar el estado.');
    }
  }
};

window.changeBudgetStatus = async function(id, newStatus) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;

  const targetLabel = getBudgetStatusLabel({ status: newStatus });

  if (confirm('Â¿Cambiar estado de "' + budget.number + '" a ' + targetLabel + '?')) {
    try {
      await updateUserBudget(id, { status: newStatus });
      window.loadSavedBudgets();
      alert('Estado actualizado correctamente.');
    } catch (error) {
      alert(error && error.message ? error.message : 'No se pudo actualizar el estado.');
    }
  }
};
