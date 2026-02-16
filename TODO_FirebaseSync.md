# Plano de Correção - Firebase + LocalStorage

## Problemas Identificados:
1. Incompatibilidade entre auth-system.js (coleção `users`) e firebase-integration.js (coleção `companies`)
2. Dados do Firebase não aparecem na dashboard (só localStorage é lido)
3. Falha ao criar nova conta

## Tarefas:

### 1. Unificar sistema de autenticação
- [ ] Escolher coleção única: `companies` (mais estruturada)
- [ ] Atualizar auth-system.js para usar coleção `companies`

### 2. Criar sincronização Firebase ↔ localStorage
- [ ] Modificar expense.js para salvar no Firebase E localStorage
- [ ] Modificar invoice-issued.js para salvar no Firebase E localStorage  
- [ ] Modificar invoice-received.js para salvar no Firebase E localStorage
- [ ] Criar função de sync ao fazer login

### 3. Corrigir criação de contas
- [ ] Corrigir register em auth-system.js
- [ ] Testar criação de nova conta

### 4. Dashboard - Carregar dados do Firebase
- [ ] Modificar frontPageDashboard.js para buscar dados do Firebase
- [ ] Sincronizar dados do Firebase para localStorage no login

### 5. Testes
- [ ] Testar login com Google
- [ ] Testar criação de conta
- [ ] Testar adição de despesas/faturas
- [ ] Verificar dados no Firebase Console

