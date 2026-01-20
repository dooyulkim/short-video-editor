# User Management Implementation Plan

## Overview

A step-by-step development plan to implement Firebase-based user authentication with OAuth (Google, Facebook), replacing anonymous access and enabling persistent user accounts across sessions and devices.

#### Architecture Decision

**Phase 1 (MVP): Firebase Client SDK Auth** ✅

- Use Firebase Authentication Client SDK directly from frontend
- Leverage Firebase-managed OAuth flow (signInWithPopup)
- Firebase handles token management and auto-refresh
- Faster development, zero backend needed for auth
- Ideal for MVP before project management layer

**Phase 2 (Optional Future): Backend Auth Proxy**

- Add backend service for session management
- Enable advanced features: custom claims, account linking, custom auth logic
- Keep Firebase as identity provider, backend manages sessions
- Optional: not required for MVP

#### Steps

1. **Firebase Project Setup** ⬜
   - [ ] Create Firebase project in Firebase Console (free Spark plan)
   - [ ] Install Firebase SDK: `npm install firebase`
   - [ ] Set up folder structure: `src/firebase/` for config and services
   - [ ] Configure environment variables (.env) for dev/staging/prod
   - [ ] Initialize Firebase in app with config
   - **Prompt:**  
     "Create a new Firebase project in Firebase Console (free Spark plan). Install Firebase SDK in the frontend: npm install firebase. Create folder structure: src/firebase/authConfig.ts and src/firebase/authService.ts. Set up environment variables in .env files for dev/staging/prod with Firebase config (apiKey, authDomain, projectId, etc.)."

2. **Firebase Authentication Providers** ⬜
   - [ ] Enable Google authentication provider in Firebase Console
   - [ ] Create Google OAuth app in Google Cloud Console
   - [ ] Configure Google OAuth redirect URLs (dev/staging/prod)
   - [ ] Enable Facebook authentication provider in Firebase Console
   - [ ] Create Facebook OAuth app in Meta Developers
   - [ ] Configure Facebook OAuth redirect URLs (dev/staging/prod)
   - [ ] Test OAuth flows in dev environment
   - **Prompt:**  
     "Enable Google and Facebook authentication providers in Firebase Console. Create OAuth apps:
     - Google: In Google Cloud Console, create OAuth 2.0 credentials (Web application type). Add authorized redirect URIs for dev/staging/prod.
     - Facebook: In Meta Developers, create app, configure OAuth settings, add redirect URIs.
       Configure these in Firebase Console auth settings. Test in dev environment (localhost)."

3. **Auth Service Layer** ⬜
   - [ ] Create `src/firebase/authService.ts`
   - [ ] Implement signInWithGoogle()
   - [ ] Implement signInWithFacebook()
   - [ ] Implement signOut()
   - [ ] Implement getCurrentUser()
   - [ ] Implement onAuthStateChanged listener
   - [ ] Implement getIdToken() for API calls
   - [ ] Add error handling for auth failures
   - **Prompt:**  
     "Create src/firebase/authService.ts with functions:
     - signInWithGoogle(): call signInWithPopup(auth, googleProvider)
     - signInWithFacebook(): call signInWithPopup(auth, facebookProvider)
     - signOut(): call signOut(auth)
     - getCurrentUser(): return auth.currentUser (or null if not authenticated)
     - onAuthStateChanged(callback): subscribe to auth state changes
     - getIdToken(): return auth.currentUser.getIdToken(true) for API calls
     - Handle Firebase auth errors with user-friendly messages

     IMPORTANT: Design as abstraction layer - all Firebase auth logic contained here. Components should ONLY call these service functions, never Firebase directly."

4. **Auth Context/State Management** ⬜
   - [ ] Create `src/context/AuthContext.tsx` (or Redux auth slice)
   - [ ] Set up global auth state (user, loading, error)
   - [ ] Initialize onAuthStateChanged listener at app startup
   - [ ] Expose useAuth hook for component access
   - [ ] Update auth state on login/logout
   - [ ] Persist auth state across refresh (automatic via Firebase)
   - **Prompt:**  
     "Create src/context/AuthContext.tsx with:
     - AuthProvider wrapper component
     - Global state: user (User | null), loading (boolean), error (string | null)
     - Initialize onAuthStateChanged in useEffect to track auth state
     - Expose useAuth() hook for components to access auth state
     - Handle loading state during auth check
     - Update on login/logout

     Alternative: Use Redux with authSlice.ts for larger apps."

5. **Firestore User Collection & Security Rules** ⬜
   - [ ] Enable Firestore in Firebase Console
   - [ ] Create Security Rules for 'users' collection
   - [ ] Deploy Security Rules
   - [ ] Plan user document schema (email, displayName, photoURL, provider, timestamps)
   - **Prompt:**  
     "Enable Firestore in Firebase Console. Create Security Rules:
     - users collection: allow read/write only if auth.uid matches document ID
     - Example rule:
       match /users/{userId} {
       allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       Deploy rules and verify in Firestore console."

6. **Login UI** ⬜
   - [ ] Create login page component with Google/Facebook buttons
   - [ ] Add loading state during sign-in
   - [ ] Add error display for failed sign-ins
   - [ ] Style buttons to match app design
   - [ ] Add 'Sign in with Google' button
   - [ ] Add 'Sign in with Facebook' button
   - [ ] Route to login if user not authenticated
   - **Prompt:**  
     "Create src/pages/LoginPage.tsx with:
     - Google sign-in button: onClick calls signInWithGoogle() from authService
     - Facebook sign-in button: onClick calls signInWithFacebook() from authService
     - Loading spinner during sign-in
     - Error message display if sign-in fails
     - Auto-redirect to dashboard on successful login
     - Show login page only if user is not authenticated (check AuthContext)"

7. **User Profile Firestore Storage** ⬜
   - [ ] Auto-create user document on first login
   - [ ] Store email, displayName, photoURL, provider, timestamps
   - [ ] Handle repeated logins (update updatedAt, don't duplicate)
   - [ ] Add service function to get user profile from Firestore
   - [ ] Add service function to update user profile (future extensibility)
   - **Prompt:**  
     "In authService.ts, add createUserProfile(user) function:
     - On successful login, call createUserProfile with Firebase user object
     - Check if user document exists in Firestore users collection
     - If not exists, create document with ID=uid and fields: email, displayName, photoURL, provider, createdAt, updatedAt
     - If exists, update updatedAt only (no duplicate on re-login)
     - Call after signInWithPopup completes"

8. **User Profile Display** ⬜
   - [ ] Display user displayName in header
   - [ ] Display user photoURL as avatar in header
   - [ ] Add logout button in header/menu
   - [ ] Show user profile information
   - [ ] Update when auth state changes
   - **Prompt:**  
     "In header/navbar component:
     - Get user from useAuth() hook
     - Display user.displayName as text
     - Display user.photoURL as avatar image (with fallback placeholder)
     - Add logout button that calls signOut() and redirects to login
     - Show conditionally only if user is authenticated"

9. **Session Persistence Across Refresh** ⬜
   - [ ] Verify Firebase persists tokens automatically
   - [ ] Test auth state on page refresh (user remains authenticated)
   - [ ] Test auth state on page close/reopen (user remains authenticated)
   - [ ] Test localStorage token persistence disabled for security
   - [ ] Verify token auto-refresh on expiry
   - **Prompt:**  
     "Test session persistence:
     - User logs in
     - Page refresh → onAuthStateChanged should fire immediately
     - User should remain authenticated without re-login
     - Firebase automatically stores token in browser storage (encrypted)
     - Firebase automatically refreshes token before expiry
     - No manual token management needed"

10. **Auth Error Handling** ⬜
    - [ ] Handle Firebase auth errors with user-friendly messages
    - [ ] Map error codes to readable strings
    - [ ] Display auth error in login UI
    - [ ] Handle network errors gracefully
    - [ ] Log errors to console in dev mode
    - **Prompt:**  
      "In authService.ts, add error handler:
      - Wrap signIn calls in try-catch
      - Handle specific Firebase errors: auth/user-cancelled, auth/operation-not-supported, auth/account-exists-with-different-credential
      - Map Firebase error codes to user-friendly messages
      - Return error message to component
      - Log full error to console in dev mode"

11. **App-Level Auth Check** ⬜
    - [ ] Check auth state on app startup
    - [ ] Show loading spinner while auth state initializes
    - [ ] Route to login if user not authenticated
    - [ ] Route to dashboard if user authenticated
    - [ ] Prevent accessing protected pages without auth
    - **Prompt:**  
      "In App.tsx:
      - Get user and loading from useAuth()
      - If loading=true, show loading spinner
      - If user is null, show LoginPage
      - If user is authenticated, show Dashboard and app routes
      - Add ProtectedRoute component for future use"

12. **Firebase Emulator Testing** ⬜
    - [ ] Install firebase-tools globally
    - [ ] Initialize Auth emulator (port 9099)
    - [ ] Update Firebase SDK to use emulator in dev mode
    - [ ] Add npm script: 'emulators:start'
    - [ ] Test sign-in/sign-out against emulator
    - [ ] Test user creation in Firestore
    - [ ] Test session persistence in emulator
    - **Prompt:**  
      "Set up Firebase Emulator Suite:
      - Install: npm install -g firebase-tools
      - Initialize emulators: firebase init emulators (select Auth, Firestore)
      - Configure ports in firebase.json (Auth: 9099)
      - Update authService.ts to connectAuthEmulator(auth, 'localhost:9099') in dev mode
      - Add npm script: 'emulators:start' to firebase.json
      - Test auth flows against emulator (no real OAuth, use test user)"

13. **Error Handling & Monitoring** ⬜
    - [ ] Set up Firebase Analytics tracking for auth events
    - [ ] Track sign-in events (provider, success/failure)
    - [ ] Track sign-out events
    - [ ] Log auth errors to console in dev
    - [ ] Set up Sentry for error reporting (optional)
    - [ ] Monitor Firebase auth quota usage
    - [ ] Create dashboard for auth metrics
    - **Prompt:**  
      "Add Firebase Analytics tracking:
      - Import { logEvent } from 'firebase/analytics'
      - Call logEvent(analytics, 'login', {provider: 'google'}) on successful sign-in
      - Call logEvent(analytics, 'logout') on sign-out
      - Call logEvent(analytics, 'login_failure', {reason: error.code}) on failed sign-in
      - View auth metrics in Firebase Console → Analytics
      - Optional: Set up Sentry for detailed error tracking"

14. **Testing & QA** ⬜
    - [ ] Test Google sign-in flow (real Firebase)
    - [ ] Test Facebook sign-in flow (real Firebase)
    - [ ] Test sign-in with invalid credentials
    - [ ] Test sign-out flow
    - [ ] Test session persistence (page refresh)
    - [ ] Test cross-browser auth state
    - [ ] Test user profile creation and display
    - [ ] Test error messages display
    - [ ] Test emulator-based tests pass
    - **Prompt:**  
      "Write integration tests:
      - Test Google OAuth sign-in (may require manual testing)
      - Test Facebook OAuth sign-in (may require manual testing)
      - Test sign-out and auth state clear
      - Test session persistence across page refresh
      - Test user profile is created on first login
      - Test user profile is displayed in header
      - Test error messages display correctly
      - Test Firebase Emulator auth flows"

#### Progress Tracking

- **Total Steps:** 14
- **Completed:** 0
- **In Progress:** 0
- **Remaining:** 14

**Milestone Breakdown:**

- **M0 (Firebase Setup):** Steps 1-2 ⬜
- **M1 (Auth Implementation):** Steps 3-6 ⬜
- **M2 (Integration):** Steps 7-11 ⬜
- **M3 (Testing & Hardening):** Steps 12-14 ⬜

#### Further Considerations

1. **Client-Side vs Backend Auth:**
   - **Phase 1 (MVP):** Client-side Firebase Auth ✅
     - Simpler, faster, no backend needed for basic auth
     - Firebase handles OAuth flow, token management, refresh
   - **Phase 2 (Optional):** Backend session proxy
     - When needed: custom auth logic, advanced claims, audit logging
     - Backend exchanges Firebase token for session cookie

2. **OAuth Provider Strategy:**
   - Start with Google (most users familiar)
   - Add Facebook for broader coverage
   - Can add more providers later (GitHub, Apple) without code changes

3. **Token Management:**
   - Firebase Client SDK auto-manages ID tokens
   - No manual storage or refresh needed
   - Tokens encrypted by Firebase in browser storage
   - 1 hour expiry with automatic refresh

4. **Security Best Practices:**
   - Never log tokens in console (even in dev)
   - Use HTTPS for all deployments
   - Validate redirect URLs in Firebase Console
   - Keep OAuth credentials in environment variables
   - Use Firebase Security Rules for data access control

5. **User Data Privacy:**
   - Firestore users collection contains supplementary data only
   - Core user data (uid, email, provider) managed by Firebase Auth
   - Users can request data export/deletion via Firebase Admin SDK (future)
   - GDPR compliant (Firebase handles provider compliance)

6. **Multi-Device Support:**
   - Firebase tokens can be used across devices (same user, different login sessions)
   - onAuthStateChanged listener works per-tab/browser
   - User data in Firestore is global (accessible from any device after login)

7. **Future Enhancements:**
   - Email/password auth (optional, lower priority)
   - Multi-factor authentication (future)
   - Account recovery flows (future)
   - Social account linking (future)
   - Custom auth claims for roles/permissions (future)
