# Plano de Correção - Firebase + LocalStorage

## Problemas Identificados:
1. Incompatibilidade entre auth-system.js (coleção `users`) e firebase-integration.js (coleção `companies`)
2. Dados do Firebase não aparecem na dashboard (só localStorage é lido)
3. ~~Falha ao criar nova conta~~

## Tarefas:

### 1. Unificar sistema de autenticação
- [x] Escolher coleção única: `companies` (mais estruturada)
- [x] Atualizar auth-system.js para usar coleção `companies`

### 2. Criar sincronização Firebase ↔ localStorage
- [x] Criar firebase-sync.js com funções de sincronização
- [x] Modificar store.js para usar Firebase como fonte primária
- [x] expense.js agora usa store.js
- [ ] Modificar invoice-issued.js para usar store.js
- [ ] Modificar invoice-received.js para usar store.js
- [x] Sincronização ao fazer login

### 3. Corrigir criação de contas
- [ ] Corrigir register em auth-system.js
- [ ] Testar criação de nova conta

### 4. Dashboard - Carregar dados do Firebase
- [ ] Modificar frontPageDashboard.js para usar store.js
- [x] Dados agora são sincronizados automaticamente
- [x] profile.html agora usa store.js para estatísticas

### 5. Testes
- [ ] Testar login com Google
- [ ] Testar criação de conta
- [ ] Testar adição de despesas/faturas
- [ ] Verificar dados no Firebase Console

## Alterações Realizadas:

### Novo arquivo: public/shared/firebase-sync.js
- Funções para sincronizar dados entre Firebase e localStorage
- Suporte para todas as coleções: expenses, invoicesIssued, invoicesReceived, budgets
- Estrutura de caminhos: `companies/{uid}/{collection}`

### Novo arquivo: public/shared/store.js (atualizado)
- Agora usa Firebase como fonte primária
- localStorage é usado como backup
- Funções síncronas para renderização imediata
- Funções assíncronas para operações com Firebase

### Atualizado: public/expense/expense.html
- Adicionados scripts: firebase-integration.js, firebase-sync.js, store.js

### Atualizado: public/expense/expense.js
- Agora usa store.js para gerenciar dados
- Suporta Firebase + localStorage

### Atualizado: public/profile/profile.html
- Adicionados scripts: firebase-integration.js, firebase-sync.js, store.js
- Corrigido formatDate() para suportar timestamp do Firebase
- loadStats() agora usa store.js para estatísticas

