# TODO - Bug Fixes

## ✅ 1. Fix Google Login (auth/cancelled-popup-request)
- File: `public/shared/auth-system.js`
- Added protection flag to prevent multiple concurrent popup requests
- Reset flag on success and error

## ✅ 2. Clean up Invoice Received Page
- File: `public/Invoice_recieved/Invoice_recieved.html`
- Removed duplicate code at the end of the file (loadUserInfo, confirmLogout, duplicate DOMContentLoaded)

## ✅ 3. Make buttons smaller and minimalist
- File: `public/Invoice_recieved/Invoice_recieved.js` - buttons: Ver, Pagar, Eliminar
- File: `public/Invoice-issued/invoice-issued.js` - buttons: Ver, Pagar, Eliminar
- File: `public/expense/expense.js` - buttons: Ver, Eliminar
- Added `py-1 px-2` classes for smaller padding
- Added `font-size:0.75rem` for smaller text
- Changed text buttons to icon-only buttons (eye, check, trash icons)

## ✅ 4. Email Verification & Account Security
- File: `public/shared/auth-system.js`
- **Register**: 
  - Sends email verification after account creation
  - Signs out user until email is verified
  - Sets `emailVerified: false` in user document
- **Login**: 
  - Checks if email is verified before allowing login
  - Shows error message if not verified
  - Resends verification email if needed
- **Delete Account**: 
  - Deletes from Firestore (user document + all subcollections)
  - Deletes from Firebase Auth
  - Handles `requires-recent-login` error

## ✅ 5. New Function Added
- `AuthService.sendVerificationEmail()` - allows user to resend verification email

## ✅ 6. Email & Password Validation
- File: `public/login.html` & `public/shared/auth-system.js`
- **Email validation**:
  - Client-side: Validates email format with regex
  - Backend: Checks if email is valid format before registration
- **Password strength requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - Visual feedback showing which requirements are met
  - Both client-side and server-side validation

