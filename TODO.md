# UPSEN Accounting - Firebase Integration

## ✅ Firebase Integration Implementada

O sistema está configurado para funcionar com **localStorage** (dados guardados no browser). O Firebase pode ser adicionado mais tarde para sincronização na cloud.

---

## 👤 Como Aceder (Demo)

**O sistema já está a funcionar!** Basta fazer login com:

```
Email: admin@demo.com
Password: demo123
```

**Passos:**
1. Abra o site: `public/frontPage/frontPage.html`
2. Faça login com as credenciais acima
3. Os dados demo (John Smith) serão carregados automaticamente

---

## 📋 Funcionalidades Disponíveis

### Sistema Atual (localStorage)
- ✅ Login/Registo de empresas
- ✅ Faturas Recebidas
- ✅ Faturas Emitidas
- ✅ Gastos
- ✅ Orçamentos
- ✅ Dashboard com KPIs
- ✅ Dados isolados por empresa

### Firebase (Opcional - Para Later)
O sistema está preparado para Firebase. Quando quiser ativar:
1. Instalar Firebase CLI: `npm install -g firebase-tools`
2. Iniciar emulators: `firebase emulators:start`
3. Atualizar configuração em `public/shared/firebase-config.js`

---

## 📁 Estrutura de Dados (localStorage)

```
auth_users              - Lista de empresas
currentUser            - Empresa atual logada
upsen_invoices_received_{userId}
upsen_invoices_issued_{userId}
upsen_expenses_{userId}
upsen_budgets_{userId}
```

---

## ⚠️ Notas

- **Dados são guardados no browser** - Não serão perdidos ao fechar
- **Para limpar dados**: Clique em "Eliminar conta" nas definições
- **John Smith** é o utilizador admin e não deve ser eliminado
- **Firebase pode ser adicionado** quando quiser sincronização na cloud

