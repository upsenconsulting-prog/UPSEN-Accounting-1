# TODO - Correção do Sistema de Autenticação UPSEN

## Problemas Identificados:
1. Erro "email-already-in-use" - não verifica se email existe antes de criar conta
2. Login falha se email não verificado - não oferece opção de reenviar verificação
3. Site entra na frontPage sem autenticação real - auto-login de teste e falta verificação

## Plano de Correção:

### Fase 1: Corrigir auth-system.js ✅ CONCLUÍDO
- [x] 1.1 Adicionar função checkEmailExists(email) para verificar se email existe no Firebase
- [x] 1.2 Modificar register() para verificar email existente antes de criar conta
- [x] 1.3 Adicionar função resendVerificationEmail()
- [x] 1.4 Melhorar loadUserData() para carregar todos os dados do utilizador corretamente
- [x] 1.5 Adicionar função deleteAccount() e updateUserData() para gestão de conta

### Fase 2: Corrigir frontPage.js ✅ CONCLUÍDO
- [x] 2.1 Remover auto-login de teste
- [x] 2.2 Adicionar verificação real de sessão AuthSystem
- [x] 2.3 Redirecionar para login se não estiver autenticado
- [x] 2.4 Mostrar dados do utilizador logado no menu

### Fase 3: Corrigir login.html ✅ CONCLUÍDO
- [x] 3.1 Adicionar botão para reenviar email de verificação
- [x] 3.2 Melhorar mensagens de erro quando email não verificado
- [x] 3.3 Adicionar formulário para solicitar novo código de verificação

### Fase 4: Melhorar armazenamento de dados do utilizador ✅ CONCLUÍDO
- [x] 4.1 Garantir que todos os dados são salvos corretamente no Firestore
- [x] 4.2 Adicionar campos: profilePhoto, companyData, preferences
- [x] 4.3 Criar estrutura de dados por utilizador (utilizadores/{uid})

## STATUS: CORREÇÕES APLICADAS

