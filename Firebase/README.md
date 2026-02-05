# Firebase Configuration - UPSEN Accounting

## Development (Firebase Emulators)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Start emulators:
```bash
firebase emulators:start
```

4. Open emulator UI:
- Aceda a: http://localhost:4000
- Auth: http://localhost:4000/auth
- Firestore: http://localhost:4000/firestore

## Production (Firebase Cloud)

1. Create project at: https://console.firebase.google.com

2. Enable Authentication:
- Email/Password provider

3. Enable Firestore Database:
- Create in test mode for development

4. Copy your config to `public/shared/firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR-API-KEY",
  authDomain: "YOUR-PROJECT.firebaseapp.com",
  projectId: "YOUR-PROJECT",
  storageBucket: "YOUR-PROJECT.appspot.com",
  messagingSenderId: "YOUR-SENDER-ID",
  appId: "YOUR-APP-ID"
};

const USE_EMULATORS = false;
```

## Data Structure

```
users/{userId}/
  - Company data (email, companyName, settings)
  
users/{userId}/invoices_received/
users/{userId}/invoices_issued/
users/{userId}/expenses/
users/{userId}/budgets/
```

## Demo User

- Email: admin@demo.com
- Password: demo123

## Deploy to Firebase Hosting

```bash
firebase deploy --project upsen-accounting
```

