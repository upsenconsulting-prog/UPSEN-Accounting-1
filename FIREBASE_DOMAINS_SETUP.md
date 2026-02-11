# Corrigir Erro de Domínio Não Autorizado

## Problema:
```
Firebase: This domain is not authorized for OAuth operations for your Firebase project.
Edit the list of authorized domains from the Firebase console.
Authentication -> Settings -> Authorized domains tab.
```

## Solução - Adicionar Domínio no Firebase Console:

### Passo 1: Aceder ao Firebase Console
1. Ir para: https://console.firebase.google.com/
2. Selecionar o projeto: **upsen-accounting-3109f**

### Passo 2: Adicionar Domínio Autorizado
1. No menu lateral, clicar em **Authentication** (ou "Autenticação")
2. Clicar no separador **Settings** (Configurações)
3. Descer até **Authorized domains** (Domínios autorizados)
4. Clicar em **Add domain** (Adicionar domínio)
5. Adicionar o domínio:
   ```
   glorious-telegram-q7vwp56jpvxpf47w6-5500.app.github.dev
   ```
6. Clicar em **Add**

### Passo 3: Domínios Recomendados (também adicionar):
```
localhost
127.0.0.1
app.github.dev
*.app.github.dev
```

## Nota sobre Google Login:
O login com Google OAuth requer configuração adicional no Firebase:
1. Em Authentication → Sign-in method
2. Ativar "Google" como provider
3. Configurar o OAuth consent screen

## Alternativa: Usar Email/Password
O login com email e password deve funcionar mesmo sem a autorização de domínio. Use os usuários demo:
- `admin@demo.com` / `demo123`
- `test@example.com` / `123456`

Ou crie uma nova conta com email/password através do formulário de registro.

## Para Deploy:
Quando fazer deploy (ex: Vercel, Netlify, GitHub Pages), adicionar o novo domínio ao Firebase Console.

