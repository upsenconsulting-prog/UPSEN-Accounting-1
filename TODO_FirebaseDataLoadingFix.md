# Firebase Data Loading Fix - TODO

## Problem
Data loading errors occur when entering pages because getUserId() returns 'unknown' or 'demo' before AuthService finishes initializing Firebase and loading user data.

## Solution Plan

### 1. Update auth-system.js ✅
- [x] Add global isAuthReady flag
- [x] Add waitForAuth() function that pages can call
- [x] Set isAuthReady = true after user data is loaded

### 2. Update frontPageDashboard.js ✅
- [x] Add waitForAuth() call before initDashboard()
- [x] Ensure data is loaded after auth is ready

### 3. Update expense.js ✅
- [x] Add waitForAuth() call before render functions
- [x] Ensure data is loaded after auth is ready

### 4. Update invoice-issued.js ✅
- [x] Add waitForAuth() call before render functions
- [x] Ensure data is loaded after auth is ready

### 5. Update invoice-recieved.js ✅
- [x] Add waitForAuth() call before render functions
- [x] Ensure data is loaded after auth is ready

### 6. Update budgetPage/script.js - NOT NEEDED
- Budget page loads data on button click, not on page load
- By the time user clicks, auth will be ready

