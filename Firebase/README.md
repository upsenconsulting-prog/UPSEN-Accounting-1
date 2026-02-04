# Firebase Integration - UPSEN Accounting

## 📋 Visão Geral

Este projeto inclui uma integração completa com Firebase para autenticação e base de dados Firestore. O sistema é **híbrido** - funciona tanto com Firebase (online) como com localStorage (fallback offline).

---

## 🚀 Modo de Desenvolvimento Local (Recomendado)

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Fazer Login no Firebase

```bash
firebase login
```

### 3. Iniciar os Emulators

```bash
cd Firebase
firebase emulators:start
```

Isto vai iniciar:
- **Auth**: http://localhost:9099
- **Firestore**: http://localhost:8080
- **UI**: http://localhost:4000

### 4. Aceder à Aplicação

Abra o browser e aceda a:
```
http://localhost:4000
```

Aqui pode:
- Ver e gerir utilizadores criados
- Ver documentos na Firestore
- Ver logs de autenticação

### 5. Credenciais do Utilizador Demo

```
Email: admin@demo.com
Password: demo123
```

---

## ☁️ Modo de Produção (Firebase Cloud)

### 1. Criar Projeto no Firebase Console

1. Aceda a: https://console.firebase.google.com/
2. Clique em "Criar novo projeto"
3. Nome: `upsen-accounting`
4. Ativar **Authentication** (Email/Password)
5. Ativar **Firestore Database**

### 2. Obter Credenciais

1. No Firebase Console, vá a **Configurações do Projeto**
2. Em "As suas apps", clique no ícone web (`</>`)
3. Registe a app e copie a configuração

### 3. Atualizar Configuração

Edite `public/shared/firebase-config.js`:

```javascript
// Mude USE_EMULATORS para false
const USE_EMULATORS = false;

// Substitua com as suas credenciais reais
const firebaseConfig = {
  apiKey: "SUA-API-KEY",
  authDomain: "upsen-accounting.firebaseapp.com",
  projectId: "upsen-accounting",
  storageBucket: "upsen-accounting.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Fazer Deploy (Opcional)

```bash
firebase deploy
```

---

## 📁 Estrutura de Dados

### Firestore

```
users/
  └─ {userId}/
      ├─ invoices_received/
      │    └─ {documentId}
      ├─ invoices_issued/
      │    └─ {documentId}
      ├─ expenses/
      │    └─ {documentId}
      └─ budgets/
           └─ {documentId}
```

### localStorage (Fallback)

```
auth_users              - Lista de utilizadores
currentUser            - Utilizador atual logado
upsen_invoices_received_{userId}
upsen_invoices_issued_{userId}
upsen_expenses_{userId}
upsen_budgets_{userId}
```

---

## 👤 Utilizadores e Empresas

- **Cada conta é uma empresa**
- **John Smith** é o utilizador demo (admin)
- Dados de cada empresa são isolados
- Não é possível ver dados de outras empresas

---

## 🔧 Funcionalidades Implementadas

### Authentication
- ✅ Login/Logout
- ✅ Registo de novas empresas
- ✅ Recuperação de password
- ✅ Fallback offline

### Firestore
- ✅ CRUD de documentos
- ✅ Dados por empresa (subcollections)
- ✅ Sincronização automática
- ✅ Backup localStorage

### Dashboard
- ✅ KPIs em tempo real
- ✅ Gráficos
- ✅ Resumo mensal

---

## 📝 Scripts Disponíveis

### Firebase Setup (Criar demo user)
```bash
cd Firebase
node setup-demo-user.js
```

### Iniciar Emulators
```bash
firebase emulators:start
```

---

## ⚠️ Notas Importantes

1. **Não exclua o utilizador John Smith** - É o administrador do sistema
2. **Dados são isolados por empresa** - Cada utilizador vê apenas os seus dados
3. **Firebase Emulators são só para desenvolvimento** - Não use em produção
4. **Faça backup regularmente** - Os dados em emulators são perdidos ao reiniciar

---

## 📞 Suporte

Para dúvidas sobre:
- **Firebase**: https://firebase.google.com/docs
- **Firebase CLI**: https://firebase.google.com/docs/cli
- **Emulators**: https://firebase.google.com/docs/emulator-suite

