# Plano de Correção - Firebase Sync e Auth

## Problemas Identificados

### 1. Estruturas Firebase Inconsistentes
- `auth-system.js` → `users/{uid}/documents/{type}/items/{docId}` ❌
- `firebase-sync.js` → `companies/{uid}/{collection}` ✅
- `firebase-integration.js` → `companies/{uid}/{collection}` ✅

### 2. Ordem de Carregamento de Scripts
- Scripts eram carregados em ordem incorreta
- `firebase-integration.js` era carregado antes de `auth-system.js`

### 3. Problemas de Sessão
- App redirecionava para login inesperadamente
- Sessão não estava a persistir corretamente

### 4. Dados Não Eram Guardados no Firebase
- Funções de sync falhavam silenciosamente
- localStorage não estava a ser populado corretamente

---

## Correções Aplicadas (Por Ordem)

### ✅ Passo 1: auth-system.js
- Padronizado para usar estrutura `companies/{uid}/{collection}`
- Corrigido `loadUserData` para usar collection `companies`
- Corrigido `createUserDocument` para usar collection `companies`
- Corrigido `FirestoreService.add/update/remove` para usar `companies`
- Corrigido `SyncService.syncFromFirebase` para usar `companies`

### ✅ Passo 2: firebase-sync.js
- Atualizado para usar estrutura `companies/{uid}/{collection}`
- Adicionado skip para documentos `_init`

### ✅ Passo 3: init-firebase-collections.js
- Atualizado para usar estrutura `companies/{uid}/{collection}`
- Adicionado sync para budgets

### ✅ Passo 4: HTMLs
- expense.html - ordem corrigida
- frontPage.html - ordem corrigida  
- invoice-issued.html - ordem corrigida
- Invoice_recieved.html - ordem corrigida + scripts adicionados
- budget.html - ordem corrigida + scripts adicionados
- profile.html - ordem corrigida
- settings.html - ordem corrigida + scripts adicionados

### ✅ Passo 5: frontPageDashboard.js
- Adicionado chamada para FirebaseSync.syncAllToLocalStorage ao iniciar
- Dividido em funções: loadDashboardData e renderDashboardContent

---

## Tarefas a Completar

- [x] 1. Atualizar auth-system.js para usar companies/{uid}/{collection}
- [x] 2. Atualizar firebase-sync.js para usar companies/{uid}/{collection}  
- [x] 3. Atualizar init-firebase-collections.js para usar companies/{uid}/{collection}
- [x] 4. Corrigir script loading order em todos os HTMLs
- [x] 5. Adicionar sincronização automática ao iniciar páginas
- [ ] 6. Testar fluxo completo: login → criar dado → navegar → dados persistem

---

## Notas Adicionais

### Estrutura Firebase Usada (Padronizada)
```
companies/{uid}/
  ├── expenses/ (coleção)
  │   └── {docId}
  ├── invoicesIssued/
  │   └── {docId}
  ├── invoicesReceived/
  │   └── {docId}
  └── budgets/
      └── {docId}
```

### Ordem de Scripts (Padrão)
1. Firebase SDKs (app, firestore, auth)
2. firebase-config.js
3. auth-system.js (inicializa Firebase)
4. firebase-sync.js
5. store.js
6. Script específico da página

