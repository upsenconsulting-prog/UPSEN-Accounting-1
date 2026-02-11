// budgetPage/script.js - Com sincronização Firestore + localStorage

function $(id) {
  return document.getElementById(id);
}

function moneyEUR(n) {
  return '€' + Number(n || 0).toFixed(2);
}

// ========== ID DO USUÁRIO ==========
function getUserId() {
  const user = window.AuthSystem?.getCurrentUser?.() || window.Auth?.getCurrentUser?.();
  return user?.uid || user?.id || 'unknown';
}

function getDataKey() {
  const userId = getUserId();
  return 'upsen_budgets_' + userId;
}

// ========== FIRESTORE SYNC ==========
async function loadBudgetsFromFirestore() {
  if (!window.USE_FIREBASE || !window.firebaseDb) return [];
  
  const userId = getUserId();
  if (userId === 'unknown') return [];
  
  try {
    const snapshot = await window.firebaseDb
      .collection('companies').doc(userId)
      .collection('budgets')
      .orderBy('createdAt', 'desc')
      .get();
    
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem(getDataKey(), JSON.stringify(docs));
      console.log('Carregados', docs.length, 'orçamentos do Firestore');
      return docs;
    }
  } catch (error) {
    console.warn('Erro ao carregar do Firestore:', error.message);
  }
  return [];
}

async function saveBudgetToFirestore(data) {
  if (!window.USE_FIREBASE || !window.firebaseDb) return null;
  
  const userId = getUserId();
  if (userId === 'unknown') return null;
  
  try {
    const docRef = await window.firebaseDb
      .collection('companies').doc(userId)
      .collection('budgets')
      .add(data);
    return docRef.id;
  } catch (error) {
    console.warn('Erro ao guardar no Firestore:', error.message);
    return null;
  }
}

async function deleteBudgetFromFirestore(id) {
  if (!window.USE_FIREBASE || !window.firebaseDb) return false;
  
  const userId = getUserId();
  if (userId === 'unknown') return false;
  
  try {
    await window.firebaseDb
      .collection('companies').doc(userId)
      .collection('budgets').doc(id)
      .delete();
    return true;
  } catch (error) {
    console.warn('Erro ao eliminar do Firestore:', error.message);
    return false;
  }
}

async function updateBudgetInFirestore(id, data) {
  if (!window.USE_FIREBASE || !window.firebaseDb) return false;
  
  const userId = getUserId();
  if (userId === 'unknown') return false;
  
  try {
    await window.firebaseDb
      .collection('companies').doc(userId)
      .collection('budgets').doc(id)
      .update({ ...data, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.warn('Erro ao atualizar no Firestore:', error.message);
    return false;
  }
}

// ========== DADOS LOCAIS ==========
async function getUserBudgets() {
  if (window.USE_FIREBASE && window.firebaseDb) {
    const fromFirestore = await loadBudgetsFromFirestore();
    if (fromFirestore.length > 0) {
      return fromFirestore;
    }
  }
  
  try {
    const data = localStorage.getItem(getDataKey());
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

async function saveUserBudget(budget) {
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
  localStorage.setItem(getDataKey(), JSON.stringify(budgets));
  
  await saveBudgetToFirestore(newBudget);
  
  return newBudget;
}

async function deleteUserBudget(id) {
  const budgets = await getUserBudgets();
  const filtered = budgets.filter(b => b.id !== id);
  localStorage.setItem(getDataKey(), JSON.stringify(filtered));
  
  await deleteBudgetFromFirestore(id);
}

async function updateUserBudget(id, updates) {
  const budgets = await getUserBudgets();
  const index = budgets.findIndex(b => b.id === id);
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...updates };
    localStorage.setItem(getDataKey(), JSON.stringify(budgets));
    await updateBudgetInFirestore(id, updates);
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
window.addEventListener('DOMContentLoaded', () => {
  const numberInput = $('number');
  if (numberInput) {
    numberInput.value = generateBudgetNumber();
  }
});

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
  let grandTotal = 0;
  
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
    const unit = parseFloat(row.querySelector('.unit')?.value) || 0;
    const total = qty * unit;
    
    row.querySelector('.line-total').textContent = total.toFixed(2);
    grandTotal += total;
  });
  
  const grandTotalEl = document.getElementById('grandTotal');
  if (grandTotalEl) {
    grandTotalEl.textContent = 'Total: ' + moneyEUR(grandTotal);
  }
  
  return grandTotal;
};

// ========== FORMULÁRIO ==========
function clearForm() {
  $('number').value = generateBudgetNumber();
  $('customer').value = '';
  $('date').value = '';
  $('validity').value = '';
  $('notes').value = '';
  $('tags').value = '';
  $('status').value = 'pending';
  
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
    
    await saveUserBudget(data);
    alert('Presupuesto guardado correctamente!');
    clearForm();
    
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
  viewBudgetsBtn.addEventListener('click', () => {
    window.loadSavedBudgets();
    if (!budgetsModal) {
      budgetsModal = new bootstrap.Modal(document.getElementById('budgetsModal'));
    }
    budgetsModal.show();
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
  
  const sortedBudgets = budgets.sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  
  tbody.innerHTML = sortedBudgets.map(budget => {
    const statusClass = { pending: 'bg-warning', approved: 'bg-success', rejected: 'bg-danger' }[budget.status] || 'bg-secondary';
    const statusLabel = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[budget.status] || 'Pendiente';
    
    return '<tr><td><strong>' + (budget.number || '-') + '</strong></td>' +
      '<td>' + (budget.date || '-') + '</td>' +
      '<td>' + (budget.customer || '-') + '</td>' +
      '<td><strong>' + moneyEUR(budget.total) + '</strong></td>' +
      '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td><button class="btn btn-primary btn-sm me-1" onclick="viewBudget(\'' + budget.id + '\')">👁️ Ver</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteBudgetPrompt(\'' + budget.id + '\')">🗑️</button></td></tr>';
  }).join('');
};

window.viewBudget = async function(id) {
  const budgets = await getUserBudgets();
  const budget = budgets.find(b => b.id === id);
  if (!budget) return;
  
  const itemsHtml = budget.items?.map(item => 
    '<tr><td>' + (item.desc || '') + '</td>' +
    '<td>' + item.qty + '</td>' +
    '<td>' + moneyEUR(item.unit) + '</td>' +
    '<td>' + moneyEUR(item.total) + '</td></tr>'
  ).join('') || '<tr><td colspan="4" class="text-center">Sin artículos</td></tr>';
  
  const statusLabel = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[budget.status] || 'Pendiente';
  
  const content = $('viewBudgetContent');
  content.innerHTML = '<div class="row mb-3">' +
    '<div class="col-md-6"><strong>Número:</strong> ' + (budget.number || '-') + '</div>' +
    '<div class="col-md-6"><strong>Fecha:</strong> ' + (budget.date || '-') + '</div>' +
    '<div class="row mb-3"><div class="col-md-6"><strong>Cliente:</strong> ' + (budget.customer || '-') + '</div>' +
    '<div class="col-md-6"><strong>Total:</strong> <span class="fs-4 fw-bold">' + moneyEUR(budget.total) + '</span></div>' +
    '<div class="row mb-3"><div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">' + statusLabel + '</span></div>' +
    (budget.notes ? '<div class="mb-3"><strong>Notas:</strong> ' + budget.notes + '</div>' : '') +
    '<h5 class="mt-4">Artículos</h5><div class="table-responsive"><table class="table table-bordered"><thead class="table-secondary"><tr><th>Descripción</th><th>Cantidad</th><th>Coste unitario</th><th>Total</th></tr></thead><tbody>' + itemsHtml + '</tbody></table></div>' +
    '<div class="text-muted mt-3 text-end"><small>Creado: ' + new Date(budget.createdAt || '').toLocaleString() + '</small></div>';
  
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
  
  const statusLabels = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
  
  if (confirm('¿Cambiar estado de "' + budget.number + '" a ' + statusLabels[newStatus] + '?')) {
    await updateUserBudget(id, { status: newStatus });
    window.loadSavedBudgets();
    alert('Estado actualizado correctamente.');
  }
};
