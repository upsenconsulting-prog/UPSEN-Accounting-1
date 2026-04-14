 /**
 * Sistema de Autenticação - UPSEN Accounting
 * Versão simples com localStorage - funciona instantaneamente!
 */

const AuthManager = {
  currentUser: null,
  
  init() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        return true;
      } catch {
        localStorage.removeItem('currentUser');
      }
    }
    
    this.createDemoUser();
    return false;
  },
  
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === this.hash(password));
    
    if (user) {
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.initUserData(user.id);
      return { success: true, user };
    }
    
    return { success: false, message: 'Email ou password incorretos' };
  },
  
  register(companyName, email, password, phone) {
    const users = this.getUsers();
    
    if (users.find(u => u.email === email)) {
      return { success: false, message: 'Este email já está registado' };
    }
    
    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      companyName,
      email,
      password: this.hash(password),
      phone,
      role: 'admin',
      createdAt: new Date().toISOString(),
      settings: {
        currency: 'EUR',
        language: 'es',
        theme: 'light'
      }
    };
    
    users.push(newUser);
    localStorage.setItem('auth_users', JSON.stringify(users));
    this.currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    this.initUserData(newUser.id);
    
    return { success: true, user: newUser };
  },
  
  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.reload();
  },
  
  getCurrentUser() {
    return this.currentUser;
  },
  
  isLoggedIn() {
    return this.currentUser !== null;
  },
  
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem('auth_users')) || [];
    } catch {
      return [];
    }
  },
  
  initUserData(userId) {
    const dataKeys = [
      'upsen_invoices_received',
      'upsen_invoices_issued',
      'upsen_expenses',
      'upsen_budgets'
    ];
    
    dataKeys.forEach(key => {
      const userDataKey = `${key}_${userId}`;
      if (!localStorage.getItem(userDataKey)) {
        localStorage.setItem(userDataKey, '[]');
      }
    });
  },
  
  getUserData(key) {
    if (!this.currentUser) return [];
    
    const userDataKey = `${key}_${this.currentUser.id}`;
    try {
      return JSON.parse(localStorage.getItem(userDataKey)) || [];
    } catch {
      return [];
    }
  },
  
  saveUserData(key, data) {
    if (!this.currentUser) return;
    
    const userDataKey = `${key}_${this.currentUser.id}`;
    localStorage.setItem(userDataKey, JSON.stringify(data));
  },
  
  addDocument(key, docData) {
    if (!this.currentUser) return null;
    
    const newDoc = {
      ...docData,
      id: docData.id || this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    const userDataKey = `${key}_${this.currentUser.id}`;
    const currentData = this.getUserData(key);
    currentData.push(newDoc);
    localStorage.setItem(userDataKey, JSON.stringify(currentData));
    
    return newDoc;
  },
  
  deleteDocument(key, docId) {
    if (!this.currentUser) return false;
    
    const userDataKey = `${key}_${this.currentUser.id}`;
    const currentData = this.getUserData(key);
    const filteredData = currentData.filter(doc => doc.id !== docId);
    localStorage.setItem(userDataKey, JSON.stringify(filteredData));
    
    return true;
  },
  
  updateDocument(key, docId, updates) {
    if (!this.currentUser) return null;
    
    const userDataKey = `${key}_${this.currentUser.id}`;
    const currentData = this.getUserData(key);
    const index = currentData.findIndex(doc => doc.id === docId);
    
    if (index !== -1) {
      currentData[index] = { ...currentData[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(userDataKey, JSON.stringify(currentData));
      return currentData[index];
    }
    
    return null;
  },
  
  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },
  
  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  },
  
  createDemoUser() {
    const users = this.getUsers();
    
    if (users.length === 0) {
      // John Smith (administrador)
      const demoUser = {
        id: 'demo_admin',
        companyName: 'John Smith (Demo)',
        email: 'admin@demo.com',
        password: this.hash('demo123'),
        phone: '+351 123 456 789',
        role: 'admin',
        createdAt: new Date().toISOString(),
        settings: {
          currency: 'EUR',
          language: 'es',
          theme: 'light'
        }
      };
      
      // Test user (para testes)
      const testUser = {
        id: 'test_user',
        companyName: 'Test User',
        email: 'test@example.com',
        password: this.hash('123456'),
        phone: '+351 000 000 000',
        role: 'admin',
        createdAt: new Date().toISOString(),
        settings: {
          currency: 'EUR',
          language: 'es',
          theme: 'light'
        }
      };
      
      users.push(demoUser);
      users.push(testUser);
      localStorage.setItem('auth_users', JSON.stringify(users));
      
      this.initUserData(demoUser.id);
      this.initUserData(testUser.id);
      
      this.createDemoData(demoUser.id);
      this.createDemoData(testUser.id);
      
      console.log('Utilizadores demo criados:');
      console.log('  - admin@demo.com / demo123');
      console.log('  - test@example.com / 123456');
    }
  },
  
  createDemoData(userId) {
    const demoInvoices = [
      { id: 'inv_1', invoiceNumber: 'FR-2025-001', supplier: 'Fornecedor ABC', invoiceDate: '2025-01-15', amount: 1500, state: 'Pago', description: 'Serviços de consultoria' },
      { id: 'inv_2', invoiceNumber: 'FR-2025-002', supplier: 'Fornecedor XYZ', invoiceDate: '2025-01-20', amount: 2300, state: 'Pendiente', description: 'Material de escritório' },
      { id: 'inv_3', invoiceNumber: 'FR-2025-003', supplier: 'Fornecedor DEF', invoiceDate: '2025-02-05', amount: 850, state: 'Pendiente', description: 'Equipamentos' }
    ];
    
    const demoIssued = [
      { id: 'iss_1', invoiceNumber: 'FV-2025-001', customer: 'Cliente S.A.', invoiceDate: '2025-01-10', dueDate: '2025-02-10', amount: 5000, state: 'Pago', description: 'Projeto de desenvolvimento' },
      { id: 'iss_2', invoiceNumber: 'FV-2025-002', customer: 'Cliente B', invoiceDate: '2025-01-25', dueDate: '2025-02-25', amount: 3200, state: 'Pendiente', description: 'Manutenção mensal' },
      { id: 'iss_3', invoiceNumber: 'FV-2025-003', customer: 'Cliente C', invoiceDate: '2025-02-01', dueDate: '2025-03-01', amount: 7500, state: 'Pendiente', description: 'Licenciamento anual' }
    ];
    
    const demoExpenses = [
      { id: 'exp_1', date: '2025-01-05', category: 'Material', description: 'Material de escritório', amount: 150, paymentMethod: 'Transferência' },
      { id: 'exp_2', date: '2025-01-12', category: 'Transportes', description: 'Combustível', amount: 80, paymentMethod: 'Dinheiro' },
      { id: 'exp_3', date: '2025-01-20', category: 'Serviços', description: 'Manutenção', amount: 350, paymentMethod: 'Transferência' },
      { id: 'exp_4', date: '2025-02-01', category: 'Renda', description: 'Escritório', amount: 1200, paymentMethod: 'Transferência' },
      { id: 'exp_5', date: '2025-02-15', category: 'Serviços', description: 'Internet e telecomunicações', amount: 89, paymentMethod: 'Débito direto' }
    ];
    
    const demoBudgets = [
      { id: 'bud_1', number: 'ORC-2025-001', customer: 'Cliente Principal', date: '2025-01-15', validity: '2025-02-15', total: 8000, status: 'pending', notes: 'Projeto completo' },
      { id: 'bud_2', number: 'ORC-2025-002', customer: 'Novo Cliente', date: '2025-01-28', validity: '2025-02-28', total: 4500, status: 'approved', notes: 'Orçamento aprovado' },
      { id: 'bud_3', number: 'ORC-2025-003', customer: 'Empresa XYZ', date: '2025-02-10', validity: '2025-03-10', total: 12500, status: 'pending', notes: 'Aguardando aprovação' }
    ];
    
    localStorage.setItem(`upsen_invoices_received_${userId}`, JSON.stringify(demoInvoices));
    localStorage.setItem(`upsen_invoices_issued_${userId}`, JSON.stringify(demoIssued));
    localStorage.setItem(`upsen_expenses_${userId}`, JSON.stringify(demoExpenses));
    localStorage.setItem(`upsen_budgets_${userId}`, JSON.stringify(demoBudgets));
  },
  
  async updateProfile(updates) {
    if (!this.currentUser) return { success: false, message: 'Não está logado' };
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === this.currentUser.id);
    
    if (index !== -1) {
      users[index] = {
        ...users[index],
        companyName: updates.companyName || users[index].companyName,
        phone: updates.phone || users[index].phone,
        settings: {
          ...users[index].settings,
          ...updates.settings
        }
      };
      
      localStorage.setItem('auth_users', JSON.stringify(users));
      this.currentUser = users[index];
      localStorage.setItem('currentUser', JSON.stringify(users[index]));
    }
    
    return { success: true };
  },
  
  async changePassword(currentPassword, newPassword) {
    if (!this.currentUser) return { success: false, message: 'Não está logado' };
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === this.currentUser.id);
    
    if (index === -1) return { success: false, message: 'Utilizador não encontrado' };
    
    if (users[index].password !== this.hash(currentPassword)) {
      return { success: false, message: 'Password atual incorreta' };
    }
    
    users[index].password = this.hash(newPassword);
    localStorage.setItem('auth_users', JSON.stringify(users));
    
    return { success: true };
  },
  
  async exportUserData() {
    if (!this.currentUser) return null;
    
    return {
      user: this.currentUser,
      invoicesReceived: this.getUserData('upsen_invoices_received'),
      invoicesIssued: this.getUserData('upsen_invoices_issued'),
      expenses: this.getUserData('upsen_expenses'),
      budgets: this.getUserData('upsen_budgets'),
      exportedAt: new Date().toISOString()
    };
  },
  
  async deleteAccount() {
    if (!this.currentUser) return { success: false };
    
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== this.currentUser.id);
    localStorage.setItem('auth_users', JSON.stringify(filtered));
    
    const dataKeys = ['upsen_invoices_received', 'upsen_invoices_issued', 'upsen_expenses', 'upsen_budgets'];
    
    dataKeys.forEach(key => {
      localStorage.removeItem(`${key}_${this.currentUser.id}`);
    });
    
    this.logout();
    return { success: true };
  },
  
  isUsingFirebase() {
    return false;
  }
};

// Inicializar automaticamente
AuthManager.createDemoUser();
window.AuthManager = AuthManager;

