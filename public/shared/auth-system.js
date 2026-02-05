/**
 * ============================================
 * SISTEMA DE AUTENTICAÇÃO UPSEN ACCOUNTING
 * ============================================
 * Sistema unificado e profissional
 * Pronto para integração com Firebase
 * Dados isolados por usuário
 * 
 * @version 1.0.0
 * @author UPSEN
 */

const AuthSystem = {
  // ==================== CONSTANTES ====================
  CURRENT_USER_KEY: 'upsen_current_user',
  USERS_KEY: 'upsen_users',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
  
  // ==================== INICIALIZAÇÃO ====================
  init() {
    this.createDemoUsers();
    this.cleanExpiredSessions();
    return this.isLoggedIn();
  },
  
  // ==================== UTILITÁRIOS ====================
  hash(str) {
    if (!str) return '';
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
  
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch {
      return [];
    }
  },
  
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },
  
  // ==================== DEMO USERS ====================
  createDemoUsers() {
    const users = this.getUsers();
    if (users.length === 0) {
      // Admin Demo
      users.push({
        id: 'demo_admin',
        email: 'admin@demo.com',
        password: this.hash('demo123'),
        name: 'Administrador',
        company: 'UPSEN Demo',
        phone: '+351 123 456 789',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        settings: {
          currency: 'EUR',
          language: 'pt',
          theme: 'light',
          notifications: true
        }
      });
      
      // Test User
      users.push({
        id: 'test_user',
        email: 'test@example.com',
        password: this.hash('123456'),
        name: 'Utilizador Teste',
        company: 'Empresa Teste',
        phone: '+351 000 000 000',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        settings: {
          currency: 'EUR',
          language: 'pt',
          theme: 'light',
          notifications: true
        }
      });
      
      this.saveUsers(users);
      this.initUserData('demo_admin');
      this.initUserData('test_user');
      this.createDemoData('demo_admin');
      
      console.log('✅ Sistema UPSEN: Utilizadores demo criados');
      console.log('   → admin@demo.com / demo123');
      console.log('   → test@example.com / 123456');
    }
  },
  
  // ==================== DADOS DO USUÁRIO ====================
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
  
  createDemoData(userId) {
    // Verificar se já existem dados
    const existingData = localStorage.getItem(`upsen_invoices_received_${userId}`);
    if (existingData && existingData !== '[]') return;
    
    const demoInvoices = [
      { id: this.generateId(), invoiceNumber: 'FR-2025-001', supplier: 'Fornecedor ABC', invoiceDate: '2025-01-15', amount: 1500, state: 'Pago', description: 'Serviços de consultoria', createdAt: new Date().toISOString() },
      { id: this.generateId(), invoiceNumber: 'FR-2025-002', supplier: 'Fornecedor XYZ', invoiceDate: '2025-01-20', amount: 2300, state: 'Pendiente', description: 'Material de escritório', createdAt: new Date().toISOString() },
      { id: this.generateId(), invoiceNumber: 'FR-2025-003', supplier: 'Fornecedor DEF', invoiceDate: '2025-02-05', amount: 850, state: 'Pendiente', description: 'Equipamentos', createdAt: new Date().toISOString() }
    ];
    
    const demoIssued = [
      { id: this.generateId(), invoiceNumber: 'FV-2025-001', customer: 'Cliente S.A.', invoiceDate: '2025-01-10', dueDate: '2025-02-10', amount: 5000, state: 'Pago', description: 'Projeto de desenvolvimento', createdAt: new Date().toISOString() },
      { id: this.generateId(), invoiceNumber: 'FV-2025-002', customer: 'Cliente B', invoiceDate: '2025-01-25', dueDate: '2025-02-25', amount: 3200, state: 'Pendiente', description: 'Manutenção mensal', createdAt: new Date().toISOString() },
      { id: this.generateId(), invoiceNumber: 'FV-2025-003', customer: 'Cliente C', invoiceDate: '2025-02-01', dueDate: '2025-03-01', amount: 7500, state: 'Pendiente', description: 'Licenciamento anual', createdAt: new Date().toISOString() }
    ];
    
    const demoExpenses = [
      { id: this.generateId(), date: '2025-01-05', category: 'Material', description: 'Material de escritório', amount: 150, paymentMethod: 'Transferência', createdAt: new Date().toISOString() },
      { id: this.generateId(), date: '2025-01-12', category: 'Transportes', description: 'Combustível', amount: 80, paymentMethod: 'Dinheiro', createdAt: new Date().toISOString() },
      { id: this.generateId(), date: '2025-01-20', category: 'Serviços', description: 'Manutenção', amount: 350, paymentMethod: 'Transferência', createdAt: new Date().toISOString() },
      { id: this.generateId(), date: '2025-02-01', category: 'Renda', description: 'Escritório', amount: 1200, paymentMethod: 'Transferência', createdAt: new Date().toISOString() },
      { id: this.generateId(), date: '2025-02-15', category: 'Serviços', description: 'Internet e telecomunicações', amount: 89, paymentMethod: 'Débito direto', createdAt: new Date().toISOString() }
    ];
    
    const demoBudgets = [
      { id: this.generateId(), number: 'ORC-2025-001', series: 'Presupuestos', customer: 'Cliente Principal', date: '2025-01-15', validity: '2025-02-15', total: 8000, status: 'pending', notes: 'Projeto completo', items: [], createdAt: new Date().toISOString() },
      { id: this.generateId(), number: 'ORC-2025-002', series: 'Presupuestos', customer: 'Novo Cliente', date: '2025-01-28', validity: '2025-02-28', total: 4500, status: 'approved', notes: 'Orçamento aprovado', items: [], createdAt: new Date().toISOString() },
      { id: this.generateId(), number: 'ORC-2025-003', series: 'Presupuestos', customer: 'Empresa XYZ', date: '2025-02-10', validity: '2025-03-10', total: 12500, status: 'pending', notes: 'Aguardando aprovação', items: [], createdAt: new Date().toISOString() }
    ];
    
    localStorage.setItem(`upsen_invoices_received_${userId}`, JSON.stringify(demoInvoices));
    localStorage.setItem(`upsen_invoices_issued_${userId}`, JSON.stringify(demoIssued));
    localStorage.setItem(`upsen_expenses_${userId}`, JSON.stringify(demoExpenses));
    localStorage.setItem(`upsen_budgets_${userId}`, JSON.stringify(demoBudgets));
  },
  
  // ==================== ACESSO AOS DADOS ====================
  getUserData(key) {
    const user = this.getCurrentUser();
    if (!user) return [];
    
    try {
      const data = localStorage.getItem(`${key}_${user.id}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveUserData(key, data) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    localStorage.setItem(`${key}_${user.id}`, JSON.stringify(data));
    return true;
  },
  
  // ==================== AUTENTICAÇÃO ====================
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim() && u.password === this.hash(password));
    
    if (user) {
      // Atualizar último login
      const users = this.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index].lastLogin = new Date().toISOString();
        this.saveUsers(users);
      }
      
      // Salvar sessão
      const sessionUser = { ...user, password: undefined }; // Não salvar password
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
        user: sessionUser,
        loginTime: Date.now()
      }));
      
      return { success: true, user: sessionUser };
    }
    
    return { success: false, message: 'Email ou password incorretos' };
  },
  
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    return { success: true, message: 'Sessão encerrada' };
  },
  
  register(name, email, password, company, phone = '') {
    const users = this.getUsers();
    
    // Verificar se email já existe
    if (users.find(u => u.email === email.toLowerCase().trim())) {
      return { success: false, message: 'Este email já está registado' };
    }
    
    // Validar password
    if (password.length < 6) {
      return { success: false, message: 'Password deve ter pelo menos 6 caracteres' };
    }
    
    // Criar novo usuário
    const newUser = {
      id: this.generateId(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: this.hash(password),
      company: company.trim(),
      phone: phone.trim(),
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      settings: {
        currency: 'EUR',
        language: 'pt',
        theme: 'light',
        notifications: true
      }
    };
    
    users.push(newUser);
    this.saveUsers(users);
    this.initUserData(newUser.id);
    
    // Fazer login automático
    const sessionUser = { ...newUser, password: undefined };
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
      user: sessionUser,
      loginTime: Date.now()
    }));
    
    return { success: true, user: sessionUser, message: 'Conta criada com sucesso' };
  },
  
  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.CURRENT_USER_KEY);
      if (!session) return null;
      
      const sessionData = JSON.parse(session);
      
      // Verificar timeout
      if (Date.now() - sessionData.loginTime > this.SESSION_TIMEOUT) {
        this.logout();
        return null;
      }
      
      return sessionData.user;
    } catch {
      return null;
    }
  },
  
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },
  
  cleanExpiredSessions() {
    // Limpar sessões expiradas
    try {
      const session = localStorage.getItem(this.CURRENT_USER_KEY);
      if (session) {
        const sessionData = JSON.parse(session);
        if (Date.now() - sessionData.loginTime > this.SESSION_TIMEOUT) {
          localStorage.removeItem(this.CURRENT_USER_KEY);
        }
      }
    } catch {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  },
  
  // ==================== GESTÃO DE PERFIL ====================
  updateProfile(updates) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: 'Não está logado' };
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      const allowedUpdates = ['name', 'company', 'phone', 'settings'];
      const filteredUpdates = {};
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });
      
      users[index] = { ...users[index], ...filteredUpdates };
      this.saveUsers(users);
      
      // Atualizar sessão
      const sessionUser = { ...users[index], password: undefined };
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
        user: sessionUser,
        loginTime: Date.now()
      }));
      
      return { success: true, message: 'Perfil atualizado' };
    }
    
    return { success: false, message: 'Utilizador não encontrado' };
  },
  
  changePassword(currentPassword, newPassword) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: 'Não está logado' };
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index === -1) return { success: false, message: 'Utilizador não encontrado' };
    
    // Verificar password atual
    if (users[index].password !== this.hash(currentPassword)) {
      return { success: false, message: 'Password atual incorreta' };
    }
    
    // Validar nova password
    if (newPassword.length < 6) {
      return { success: false, message: 'Nova password deve ter pelo menos 6 caracteres' };
    }
    
    // Atualizar password
    users[index].password = this.hash(newPassword);
    this.saveUsers(users);
    
    return { success: true, message: 'Password alterada com sucesso' };
  },
  
  // ==================== MULTI-USER ====================
  getAllUsers() {
    return this.getUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      company: u.company,
      role: u.role,
      lastLogin: u.lastLogin
    }));
  },
  
  switchUser(userId) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
      // Atualizar último login
      const index = users.findIndex(u => u.id === userId);
      users[index].lastLogin = new Date().toISOString();
      this.saveUsers(users);
      
      const sessionUser = { ...user, password: undefined };
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
        user: sessionUser,
        loginTime: Date.now()
      }));
      
      return { success: true, user: sessionUser };
    }
    
    return { success: false, message: 'Utilizador não encontrado' };
  },
  
  // ==================== EXPORTAÇÃO ====================
  exportUserData() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    return {
      profile: user,
      invoicesReceived: this.getUserData('upsen_invoices_received'),
      invoicesIssued: this.getUserData('upsen_invoices_issued'),
      expenses: this.getUserData('upsen_expenses'),
      budgets: this.getUserData('upsen_budgets'),
      exportedAt: new Date().toISOString()
    };
  },
  
  // ==================== FIREBASE PREPARATION ====================
  isUsingFirebase() {
    return false; // Preparado para futura integração
  },
  
  getFirebaseConfig() {
    // Retornar configuração Firebase quando disponível
    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  },
  
  async enableFirebase(config) {
    // Método reservado para integração futura
    console.log('Firebase integration reserved for future version');
    return { success: false, message: 'Em breve' };
  }
};

// ==================== INICIALIZAÇÃO AUTOMÁTICA ====================
AuthSystem.init();

// Expor globalmente
window.AuthSystem = AuthSystem;
window.Auth = AuthSystem; // Alias para compatibilidade

