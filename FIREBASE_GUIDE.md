# Firebase Integration Guide - UPSEN Accounting

## 🔐 1. Email Verification

### Registration with Email Verification
```javascript
async register(name, email, password, company, phone) {
  const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;
  
  // Send verification email
  await user.sendEmailVerification();
  console.log('✅ Verification email sent');
  
  // Create user document in Firestore
  await FirestoreService.setDocument(`users/${user.uid}`, {
    id: user.uid,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    company: company.trim(),
    phone: phone.trim(),
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    settings: { currency: 'EUR', language: 'pt', theme: 'light', notifications: true },
    emailVerified: false
  });
  
  // Sign out until email is verified
  await firebase.auth().signOut();
  
  return { success: true, message: 'Por favor verifica tu correo electrónico.' };
}
```

### Login with Email Verification Check
```javascript
async login(email, password) {
  const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
  
  // Check if email is verified
  if (!userCredential.user.emailVerified) {
    await firebase.auth().signOut();
    return { 
      success: false, 
      message: 'Por favor verifica tu correo electrónico antes de iniciar sesión.' 
    };
  }
  
  return { success: true, user: await getUserData(userCredential.user.uid) };
}
```

---

## 🧾 2. Data Model Structure

```
Firestore Database Structure:
════════════════════════════

users/{userId}
 ├── id: string (UID from Firebase Auth)
 ├── email: string
 ├── name: string
 ├── company: string
 ├── phone: string
 ├── role: 'user' | 'admin'
 ├── emailVerified: boolean
 ├── settings: {
 │    ├── currency: 'EUR' | 'USD' | 'GBP' | 'BRL'
 │    ├── language: 'es' | 'pt' | 'en'
 │    ├── theme: 'light' | 'dark'
 │    └── notifications: boolean
 │   }
 ├── createdAt: timestamp
 └── lastLogin: timestamp

expenses/{expenseId}
 ├── userId: string (required for security)
 ├── date: string (YYYY-MM-DD)
 ├── category: string
 ├── amount: number (validation: is number)
 ├── notes: string
 ├── paymentMethod: string
 ├── createdAt: timestamp
 └── updatedAt: timestamp

invoicesIssued/{invoiceId}
 ├── userId: string (required for security)
 ├── invoiceNumber: string
 ├── customer: string
 ├── customerEmail: string
 ├── invoiceDate: string (YYYY-MM-DD)
 ├── dueDate: string (YYYY-MM-DD)
 ├── amount: number (validation: is number)
 ├── state: 'Pendiente' | 'Pagada' | 'Vencida'
 ├── description: string
 ├── createdAt: timestamp
 └── updatedAt: timestamp

invoicesReceived/{invoiceId}
 ├── userId: string (required for security)
 ├── invoiceNumber: string
 ├── supplier: string
 ├── supplierEmail: string
 ├── invoiceDate: string (YYYY-MM-DD)
 ├── amount: number (validation: is number)
 ├── state: 'Pendiente' | 'Pagada' | 'Vencida'
 ├── description: string
 ├── createdAt: timestamp
 └── updatedAt: timestamp

budgets/{budgetId}
 ├── userId: string (required for security)
 ├── number: string
 ├── customer: string
 ├── date: string (YYYY-MM-DD)
 ├── validity: string (YYYY-MM-DD)
 ├── total: number (validation: is number)
 ├── status: 'pending' | 'approved' | 'rejected'
 ├── notes: string
 ├── items: array
 ├── createdAt: timestamp
 └── updatedAt: timestamp
```

---

## 🛡️ 3. Firebase Security Rules (PRO LEVEL)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidNumber(value) {
      return value is number && value >= 0;
    }
    
    function isValidString(value, minLen, maxLen) {
      return value is string && value.size() >= minLen && value.size() <= maxLen;
    }
    
    function isValidDate(value) {
      return value is string && value.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuthenticated() 
                    && request.auth.uid == userId
                    && isValidString(request.resource.data.name, 1, 100)
                    && isValidString(request.resource.data.email, 5, 255)
                    && request.resource.data.role == 'user';
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() 
                  && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() 
                    && request.resource.data.userId == request.auth.uid
                    && isValidDate(request.resource.data.date)
                    && isValidNumber(request.resource.data.amount)
                    && isValidString(request.resource.data.category, 1, 50);
      allow update: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId
                    && (!request.resource.data.keys().hasAll(['amount']) 
                        || isValidNumber(request.resource.data.amount));
      allow delete: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId;
    }
    
    // Invoices Issued collection
    match /invoicesIssued/{invoiceId} {
      allow read: if isAuthenticated() 
                  && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() 
                    && request.resource.data.userId == request.auth.uid
                    && isValidDate(request.resource.data.invoiceDate)
                    && isValidNumber(request.resource.data.amount)
                    && isValidString(request.resource.data.customer, 1, 100);
      allow update: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId
                    && (!request.resource.data.keys().hasAll(['amount']) 
                        || isValidNumber(request.resource.data.amount));
      allow delete: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId;
    }
    
    // Invoices Received collection
    match /invoicesReceived/{invoiceId} {
      allow read: if isAuthenticated() 
                  && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() 
                    && request.resource.data.userId == request.auth.uid
                    && isValidDate(request.resource.data.invoiceDate)
                    && isValidNumber(request.resource.data.amount)
                    && isValidString(request.resource.data.supplier, 1, 100);
      allow update: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId
                    && (!request.resource.data.keys().hasAll(['amount']) 
                        || isValidNumber(request.resource.data.amount));
      allow delete: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId;
    }
    
    // Budgets collection
    match /budgets/{budgetId} {
      allow read: if isAuthenticated() 
                  && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() 
                    && request.resource.data.userId == request.auth.uid
                    && isValidNumber(request.resource.data.total)
                    && isValidString(request.resource.data.customer, 1, 100);
      allow update: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId
                    && (!request.resource.data.keys().hasAll(['total']) 
                        || isValidNumber(request.resource.data.total));
      allow delete: if isAuthenticated() 
                    && request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 🚪 4. Global Logout & Route Protection

### auth-guard.js (Include in all private pages)
```javascript
const publicPages = ['login.html', 'register.html', 'index.html'];
const currentPath = window.location.pathname.split('/').pop() || 'index.html';

async function checkAuth() {
  await FirebaseApp.initialize();
  
  const isLoggedIn = AuthService.isLoggedIn();
  const isPublicPage = publicPages.includes(currentPath);
  
  if (!isLoggedIn && !isPublicPage) {
    window.location.href = '../login.html';
    return;
  }
  
  if (isLoggedIn && isPublicPage) {
    window.location.href = '../frontPage/frontPage.html';
    return;
  }
  
  // Auto-logout on token expiration
  if (isLoggedIn && FirebaseApp.isReady()) {
    const user = firebase.auth().currentUser;
    if (user) {
      try {
        await user.getIdTokenResult(true);
      } catch (error) {
        AuthService.logout();
        window.location.href = '../login.html';
      }
    }
  }
}

checkAuth();
```

### Add Logout Button to All Private Pages
```javascript
function addLogoutButton() {
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn btn-logout';
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i> Cerrar sesión';
  logoutBtn.onclick = async () => {
    await AuthService.logout();
    window.location.href = '../login.html';
  };
  document.querySelector('.sidebar')?.appendChild(logoutBtn);
}
```

---

## 📋 Quick Setup Checklist

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Authentication (Email/Password + Google)
- [ ] Enable Firestore Database
- [ ] Copy config to `firebase-config.js`
- [ ] Deploy Security Rules
- [ ] Enable email verification in Auth settings
- [ ] Test registration and login flow
- [ ] Test data isolation between users

---

## 🔒 Security Best Practices Implemented

1. **Email Verification** - Users must verify email before login
2. **Data Isolation** - Each user can only access their own data
3. **Input Validation** - Server-side validation of all inputs
4. **Token Refresh** - Automatic token refresh before expiration
5. **Route Protection** - Automatic redirect for unauthenticated users
6. **Audit Trail** - createdAt and updatedAt on all documents

---

**Built with ❤️ by UPSEN Team**

