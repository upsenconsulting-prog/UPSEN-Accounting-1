# Plano de Correção - Problema de Autenticação Google

## Problema Identificado:
Quando o utilizador faz login com Google:
1. O login é bem-sucedido no Firebase Auth
2. Mas os dados do utilizador não são carregados corretamente na página de configurações
3. O alerta "Inicia sesión primero" aparece mesmo com login efetuado

## Causa Raiz:
A função `getUser()` em settings.html verifica apenas:
- `window.AuthService.getCurrentUser()` - pode não estar definido
- `localStorage.getItem('upsen_current_user')` - pode não ter sido guardado corretamente

O problema está em `loadUserData()` que não está a salvar corretamente no localStorage após login com Google.

## Plano de Correção:

### 1. Corrigir auth-system.js
- [ ] Modificar `loginWithGoogle()` para garantir que os dados são salvos no localStorage ANTES de resolver a promise
- [ ] Adicionar chamada explícita a `saveSession()` após login com Google
- [ ] Garantir que `loadUserData()` termina completamente antes de redirecionar

### 2. Corrigir settings.html
- [ ] Melhorar a função `getUser()` para usar `AuthService.getCurrentUser()` corretamente
- [ ] Adicionar verificação do Firebase Auth state diretamente
- [ ] Adicionar fallback para verificar localStorage primeiro

### 3. Adicionar logging para debug
- [ ] Adicionar console.log em pontos críticos para identificar o problema
- [ ] Mostrar mensagem de debug na página de configurações

### 4. Testar fluxo completo
- [ ] Login com Google
- [ ] Verificar dados na página de configurações
- [ ] Verificar dados no Firestore

