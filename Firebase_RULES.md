# Firebase Rules - UPSEN Accounting

## Rules Ativas (Funcionando)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
  
    match /companies/{companyId} {
      allow read, write: if request.auth != null && request.auth.uid == companyId;
      
      match /{subCollection}/{docId}{
        allow read, write: if request.auth != null && request.auth.uid == companyId;
      }
    }
  }
}
```

## Status do Projeto

| Componente | Status |
|------------|--------|
| Firebase Config | Configurado |
| Auth Rules | Ativas |
| Firestore | Criado |
| Login/Registo | Funcionando |
| CRUD Dados | Implementado |

Projeto Pronto para Producao!

