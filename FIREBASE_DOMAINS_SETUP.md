# Corrigir Erro de Domínio Não Autorizado

## Problema:
```
Firebase: This domain is not authorized for OAuth operations for your Firebase project.
Edit the list of authorized domains from the Firebase console.
Authentication -> Settings -> Authorized domains tab.
```

## Solução - Adicionar Domínios no Firebase Console:

### Passo 1: Aceder ao Firebase Console
1. Ir para: https://console.firebase.google.com/
2. Selecionar o projeto: **upsen-accounting-3109f**

### Passo 2: Adicionar Domínios Autorizados
1. No menu lateral, clicar em **Authentication** (ou "Autenticação")
2. Clicar no separador **Settings** (Configurações)
3. Descer até **Authorized domains** (Domínios autorizados)
4. Clicar em **Add domain** (Adicionar domínio)
5. Adicionar os seguintes domínios:

### Domínios a adicionar:
```
localhost
127.0.0.1
app.github.dev
```

### Para GitHub Codespaces (dynamico):
O domínio do GitHub Codespaces muda frequentemente. Para resolver:
- Adicione: `*.app.github.dev` (se suportado)
- OU adicione manualmente o domínio atual shown no erro

### Para desenvolvimento local (sempre funciona):
- `localhost` - funciona para qualquer porta
- `127.0.0.1` - funciona para qualquer porta

## Nota sobre Google Login:
O login com Google OAuth requer:
1. Em Authentication → Sign-in method
2. Ativar "Google" como provider
3. Configurar o OAuth consent screen

## Alternativa: Usar Email/Password
O login com email e password funciona mesmo sem a autorização de domínio para OAuth.

