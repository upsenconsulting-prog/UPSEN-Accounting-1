/**
 * Sistema de Autenticação NOVO e LIMPO - UPSEN Accounting
 * Implementação simples e funcional com localStorage
 */

const Auth = {
  //chave para utilizador atual
  CURRENT_USER_KEY: 'upsen_current_user',
  
  //utilizadores registados
  USERS_KEY: 'upsen_users',
  
  init() {
    //criar utilizadores demo se não existirem
    this.createDemoUsers();
    return this.isLoggedIn();
  },
  
  createDemoUsers() {
    const users = this.getUsers();
    if (users.length === 0) {
      //admin demo
      users.push({
        id: 'demo_admin',
        email: 'admin@demo.com',
        password: this.hash('demo123'),
        name: 'John Smith',
        company: 'John Smith (Demo)',
        role: 'admin'
      });
      
      //teste utilizador
      users.push({
        id: 'test_user',
        email: 'test@example.com',
        password: this.hash('123456'),
        name: 'Test User',
        company: 'Test Company',
        role: 'user'
      });
      
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      console.log('Utilizadores demo criados!');
    }
  },
  
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch {
      return [];
    }
  },
  
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.CURRENT_USER_KEY));
    } catch {
      return null;
    }
  },
  
  isLoggedIn() {
    return this.getCurrentUser() !== null;
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
  
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === this.hash(password));
    
    if (user) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    
    return { success: false, message: 'Email ou password incorretos' };
  },
  
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    return { success: true };
  },
  
  register(name, email, password, company) {
    const users = this.getUsers();
    
    if (users.find(u => u.email === email)) {
      return { success: false, message: 'Email já registado' };
    }
    
    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      password: this.hash(password),
      company,
      role: 'user'
    };
    
    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(newUser));
    
    return { success: true, user: newUser };
  },
  
  switchUser(userId) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    
    return { success: false, message: 'Utilizador não encontrado' };
  },
  
  getAllUsers() {
    return this.getUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      company: u.company
    }));
  },
  
  updateProfile(updates) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false };
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === currentUser.id);
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(users[index]));
    }
    
    return { success: true };
  }
};

//inicializar automaticamente
Auth.init();
window.Auth = Auth;

