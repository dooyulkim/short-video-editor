# User Management with OAuth Accounts

## One-Page Summary

- **Title:** User Management with OAuth Authentication
- **Summary:** Implement Firebase Authentication with OAuth providers (Google, Facebook) to create authenticated user accounts, replacing anonymous/localStorage-based access. Users sign in once and maintain persistent authentication across sessions.
- **Target user:** Web video creators who want authenticated accounts tied to their identity across devices.
- **Problem:** Anonymous/localStorage-based access lacks authentication, account persistence, and user identity.
- **Key goals & metrics:**
  - Auth success rate (Google/Facebook) 98% within 7 days post-launch
  - OAuth sign-in latency p95 ≤2 seconds
  - Session persistence across page refresh 99% success rate
- **Timeline:** 1 week (Firebase setup + OAuth providers + UI integration)
- **Risks / Open questions:** OAuth app approvals; redirect URL configuration; session management; logout handling.

## Full PRD

### Summary

Implement Firebase Authentication with Google and Facebook OAuth providers. Users authenticate once and receive persistent Firebase ID tokens for subsequent authenticated requests. User profiles stored in Firestore with supplementary info (displayName, photoURL, provider, timestamps).

### Background & Context

- Current state: Anonymous/localStorage-based access with no authentication layer.
- Pain points: No user identity, no account persistence across devices, security vulnerabilities from client-side only design.

### Target Users & Personas

Web-based video creators who expect authenticated, account-bound access with multi-device support.

### Problem Statement

Lack of authentication creates security gaps, prevents account ownership, and limits cross-device continuity.

### Goals & Success Metrics

- Auth success rate 98% (Google/Facebook combined)
- OAuth sign-in latency p95 ≤2 seconds
- Session persistence across page refresh 99% success rate
- Zero authentication bypass vulnerabilities

### Scope

- **In-scope:** Firebase Authentication (Google, Facebook OAuth); Firebase ID token management; user profile storage in Firestore; login/logout UI; session persistence; onAuthStateChanged listener for auth state management; user profile display (displayName, photoURL); environment-based OAuth configuration (dev/staging/prod); secure credential management.
- **Out-of-scope:** Social login (Twitter, GitHub, etc.); phone auth; multi-factor authentication; social linking (multi-login per user); account recovery flows; email verification; role-based access control.

### User Journeys / Use Cases

1. User arrives at app → Login screen shown → Clicks "Sign in with Google/Facebook" → OAuth consent flow → Firebase auth token received → User profile created in Firestore → Redirected to app dashboard.
2. User signs out → Calls signOut → Auth state clears → Returns to login screen.
3. User refreshes page → onAuthStateChanged fires → User remains authenticated if token valid → Dashboard shown.
4. User switches device → Logs in again → Receives new auth token → Full access to account data.

### Functional Requirements

- **FR1 Auth Providers:** Support Google and Facebook OAuth providers via Firebase Authentication; configuration via Firebase Console.
- **FR2 Sign-In Flow:** signInWithPopup opens OAuth consent → receives Firebase auth token (1 hour expiry) → auto-refresh on expiry.
- **FR3 Auth State:** onAuthStateChanged listener tracks auth state globally (authenticated vs unauthenticated); Context/Redux stores current user.
- **FR4 Sign-Out:** signOut clears auth token and user state → returns to login screen.
- **FR5 User Profile:** Auto-create Firestore document on first login (email, displayName, photoURL, provider, createdAt, updatedAt); update profile on subsequent logins.
- **FR6 Token Management:** Firebase SDK auto-refreshes ID tokens before expiry; persists tokens in browser storage (encrypted by Firebase).
- **FR7 Login UI:** Login screen with Google and Facebook buttons; loading states; error messages; redirect to dashboard on success.
- **FR8 Session Persistence:** User remains authenticated across page refresh if token valid; no re-authentication required.
- **FR9 Logout UI:** Logout button in header/menu; clear user context after signOut.
- **FR10 Auth State Context:** Global auth state (Context/Redux) accessible to all components; prevents prop-drilling.

### Non-functional Requirements

- **Security:** HTTPS required; Firebase handles OAuth state/nonce/PKCE; ID tokens signed/verified; secure credential handling; redirect URL validation; no credentials in logs.
- **Performance:** Auth state available within 500ms of page load; sign-in flow <2 seconds p95; token refresh transparent.
- **Reliability:** Firebase Auth handles provider outages gracefully; auto-retry on transient failures; clear error messages.
- **Privacy/Compliance:** Firebase stores provider IDs/emails per OAuth provider ToS; no tracking cookies beyond Firebase; GDPR-compliant data handling.

### Data Model (Firestore)

- **users (collection)**:
  - Document ID: Firebase UID (immutable)
  - Fields:
    - email (string) - from Firebase Auth user
    - displayName (string) - from OAuth provider
    - photoURL (string) - from OAuth provider
    - provider (string: 'google' | 'facebook') - which OAuth provider was used
    - createdAt (timestamp) - first login
    - updatedAt (timestamp) - last login/profile update
  - Note: Core user data (email, uid, provider) managed by Firebase Auth; this collection stores supplementary/custom fields

### Firebase Security Rules (draft)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firebase Configuration (draft)

**Environment Variables (.env):**

```
VITE_FIREBASE_API_KEY=<dev-key>
VITE_FIREBASE_AUTH_DOMAIN=<dev-auth-domain>
VITE_FIREBASE_PROJECT_ID=<dev-project>
VITE_FIREBASE_STORAGE_BUCKET=<dev-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<dev-sender>
VITE_FIREBASE_APP_ID=<dev-app-id>
VITE_FIREBASE_EMULATOR_AUTH_HOST=localhost:9099  # dev only
```

**OAuth Redirect URLs (Firebase Console):**

- Development: http://localhost:5173
- Staging: https://staging.yourdomain.com
- Production: https://yourdomain.com

### Implementation Plan (rough estimates)

- **Week 1:**
  - Day 1: Firebase project creation; enable Google & Facebook authentication in Firebase Console
  - Day 1-2: Configure OAuth apps (Google Cloud Console, Facebook App Center); set redirect URLs
  - Day 2: Frontend Firebase SDK setup; initialize with environment config
  - Day 2-3: Implement signInWithPopup, onAuthStateChanged, signOut
  - Day 3: Create auth context/Redux store for global state
  - Day 3-4: Build login UI (Google/Facebook buttons, loading, errors)
  - Day 4: Build profile display (header with user info, logout button)
  - Day 4: Firestore users collection schema and Security Rules
  - Day 5: Auto-create user profile on first login
  - Day 5: Session persistence testing (refresh, multi-tab)
  - Day 5: Error handling and edge cases
  - Day 5-6: QA and Firebase Emulator testing

### Rollout Plan

Dev with Firebase Emulator → staging Firebase project → production Firebase project; feature flag for auth requirement; gradual enforcement.

### Monitoring & Analytics

- Firebase Authentication metrics (sign-in success/failure by provider)
- OAuth provider-specific errors (Google, Facebook)
- Session persistence success rate
- Auth state loading time
- Token refresh frequency
- Logout frequency
- Geographic sign-in patterns

### Risks & Mitigations

- **OAuth app review delays** → Start Firebase Auth provider setup immediately; test redirect URLs early in dev environment; have contingency single-provider if one is delayed.
- **Redirect URL misconfiguration** → Carefully document all deployment URLs (dev/staging/prod); use environment variables; test each environment before deployment.
- **Session state sync across tabs** → onAuthStateChanged automatically fires on all tabs; browser storage is shared; no special handling needed.
- **Token expiry handling** → Firebase SDK auto-refreshes tokens; no manual intervention needed; transparent to frontend.
- **CORS issues with OAuth providers** → Use signInWithPopup (pop-up based, no CORS issues); avoid signInWithRedirect for simpler UX.
- **User profile migration** → Start with Firestore user collection; optional batch import of legacy user data if migrating from previous system.

### Open Questions

- Single OAuth provider (Google) or multiple (Google + Facebook)? **DECIDED: Start with Google + Facebook for broader coverage**
- Auto-create user profile or manual? **DECIDED: Auto-create on first login (better UX)**
- Email verification required? **No - delegated to OAuth provider (they already verify)**
- Custom login page or Firebase UI widget? **Custom for consistency with app design**

### Acceptance Criteria

- New user clicks "Sign in with Google" → OAuth consent shown → User grant consent → Firebase auth token received → Redirected to dashboard.
- New user logs in → Firestore user document auto-created with email, displayName, photoURL, provider, timestamps.
- User can see their profile (displayName, photoURL) in header after login.
- User clicks logout → Auth token cleared → Redirected to login screen.
- User refreshes page → onAuthStateChanged fires → User remains authenticated → Dashboard shown immediately (no re-login).
- Cross-browser/multi-tab: User logs in one tab → Other tabs receive auth state update via onAuthStateChanged.
- Invalid OAuth credentials returned by provider → Clear error message shown.
- Firebase free tier limits maintained (free tier supports unlimited users).
