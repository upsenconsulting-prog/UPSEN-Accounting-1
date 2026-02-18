# Plano de Correções - UPSEN Accounting

## Problemas Identificados e Correções Aplicadas:

### 1. ✅ auth-system.js - Problema com Role
- **Problema:** O role estava sempre a ser definido como 'user' hardcoded, sem preservar o role do Firestore
- **Correção:** Modificado loadUserData para carregar e preservar o role do Firestore
- **Ficheiro:** public/shared/auth-system.js

### 2. ✅ invoice-issued.js - Problema com monthlyCount
- **Problema:** O elemento monthlyCount usa `<span>0</span>` mas o JS tentava fazer `.textContent` no elemento pai
- **Correção:** Corrigida a função renderSummaryCards para verificar se existe o span
- **Ficheiro:** public/Invoice-issued/invoice-issued.js

### 3. ✅ invoice-issued.html - viewInvoiceModal não exposto
- **Problema:** O modal não estava disponível globalmente para a função viewInvoice()
- **Correção:** Adicionado window.viewInvoiceModal = viewInvoiceModal
- **Ficheiro:** public/Invoice-issued/invoice-issued.html

### 4. ✅ Invoice_recieved.html - viewInvoiceModal não exposto
- **Problema:** O modal não estava disponível globalmente
- **Correção:** Adicionado script para expor ao window
- **Ficheiro:** public/Invoice_recieved/Invoice_recieved.html

### 5. ✅ expense.html - viewExpenseModal não exposto
- **Problema:** O modal não estava disponível globalmente para a função viewExpense()
- **Correção:** Adicionado window.viewExpenseModal = viewExpenseModal
- **Ficheiro:** public/expense/expense.html

### 6. ✅ Firebase Collections - Script de Inicialização
- **Problema:** As coleções não estavam a ser criadas automaticamente
- **Correção:** Criado script init-firebase-collections.js
- **Ficheiro:** public/shared/init-firebase-collections.js (NOVO)

## Ficheiros Editados:
1. public/shared/auth-system.js
2. public/Invoice-issued/invoice-issued.js
3. public/Invoice-issued/invoice-issued.html
4. public/Invoice_recieved/Invoice_recieved.html
5. public/expense/expense.html
6. public/shared/init-firebase-collections.js (NOVO)

