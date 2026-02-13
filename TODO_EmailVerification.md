# Plano de Implementação - Verificação de Email

## Tarefa
Adicionar função de verificação de email antes da criação de conta no sistema UPSEN Accounting.

## Alterações feitas:

### 1. login.html ✅
- Adicionar função de validação de email mais rigorosa
- Verificar formato válido do email
- Verificar domínio do email

### 2. auth-system.js ✅
- Adicionar validação de email melhorada na função register
- Retornar mensagem de erro específica se email for inválido

### 3. firebase-integration.js ✅
- Adicionar validação de email consistente com os outros ficheiros

## Validações implementadas:
1. ✅ Verificar campo vazio
2. ✅ Verificar formato válido do email (regex)
3. ✅ Verificar que o domínio tem pelo menos um ponto
4. ✅ Verificar que não tem espaços ou pontos consecutivos
5. ✅ Verificar limite de comprimento (254 caracteres)
6. ✅ Verificar que a parte local não começa/termina com caracteres especiais

## Progresso:
- [x] Atualizar login.html
- [x] Atualizar auth-system.js
- [x] Atualizar firebase-integration.js
- [x] Testar as alterações

