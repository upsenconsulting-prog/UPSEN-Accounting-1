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

## Financial Metrics Endpoint

Backend endpoint for dashboard metrics:

```text
GET /metrics/financial-summary
```

Supported query params:

- `start=YYYY-MM-DD`
- `end=YYYY-MM-DD`
- `status=pending,paid,overdue`

Authentication:

- Production: `Authorization: Bearer <firebase-id-token>`
- Emulator fallback: `x-user-id: <uid>` or `?userId=<uid>`

Example:

```text
/metrics/financial-summary?start=2025-01-01&end=2025-01-31&status=pending
```

Response shape:

```json
{
  "generatedAt": "2026-04-22T10:00:00.000Z",
  "range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "filters": {
    "status": ["pending"]
  },
  "income": 0,
  "expenses": 0,
  "pending": {
    "to_receive": 0,
    "to_pay": 0
  },
  "overdue": {
    "count": 0,
    "amount": 0
  },
  "monthly": {
    "month": "2026-04",
    "income": 0,
    "expenses": 0
  },
  "documents": {
    "issued_invoices": 0,
    "received_invoices": 0,
    "expenses": 0,
    "open_receivables": 0,
    "open_payables": 0,
    "overdue_issued_invoices": 0
  }
}
```
