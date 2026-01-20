# Backend-Managed Projects with OAuth Accounts

## One-Page Summary

- **Title:** Backend-Managed Projects with OAuth Accounts
- **Summary:** Move project creation/load/save from frontend localStorage and file downloads to backend APIs tied to OAuth (Google, Facebook) accounts with Firebase/Firestore persistence. Unsaved edits remain ephemeral—refresh discards them unless explicitly saved.
- **Target user:** Web video creators who need reliable, account-bound projects across sessions/devices.
- **Problem:** Local-only storage causes loss on refresh/device change and lacks authenticated ownership.
- **Key goals & metrics:**
  - Auth success rate (Google/Facebook) 98% within 7 days post-launch
  - Project save success rate 99% (2xx) with p95 save latency 800 ms
  - Project load success rate 99% with p95 load latency 600 ms
- **Timeline:** M0 Auth + schema (1w); M1 Project CRUD APIs (2w); M2 Frontend integration + QA (2w)
- **Risks / Open questions:** OAuth app approvals/redirects; project payload size; optional soft-delete; Firebase security rules complexity; manual vs automated import of existing local files.

## Full PRD

### Summary

Introduce backend-managed user accounts (OAuth) and project CRUD over HTTP backed by Firebase/Firestore. Replace localStorage persistence patterns (timeline state, recent projects, project controls) with authenticated, durable storage. Unsaved edits are lost on refresh unless saved; UI must communicate this.

### Background & Context

- Current state: Projects saved to local JSON downloads; recent projects and timeline state persisted in localStorage.
- Pain points: Data loss on refresh, no identity or ownership, no cross-session continuity.

### Target Users & Personas

Web-based short-form video creators who expect authenticated, reliable project storage tied to their account.

### Problem Statement

Local-only persistence causes loss and prevents authenticated ownership and continuity across sessions/devices.

### Goals & Success Metrics

- Auth success rate 98%; project save success rate 99%; project load success rate 99%.
- p95 save latency 800 ms; p95 load latency 600 ms.
- Zero cross-user data leakage (access control enforced via Firebase Security Rules).

### Scope

- **In-scope:** Firebase Authentication (Google, Facebook); Firestore collections for users/projects; project CRUD/list; ownership enforcement via Security Rules; project import/export via JSON; frontend wiring to Firebase SDK via abstraction layer; remove localStorage reliance for projects/recent lists; explicit unsaved-loss rule on refresh.
- **Out-of-scope:** Team sharing/collaboration; autosave/drafts; offline mode; mobile/native clients; granular ACL beyond owner-only; asset storage changes (Firebase Storage considered for future); backend API proxy (can be added later without breaking changes).

### User Journeys / Use Cases

1. Sign in via Google/Facebook → Firebase user created → empty project list shown.
2. Create project → edit timeline → save → Firestore stores project; appears in list.
3. Load existing project → timeline restored from Firestore.
4. Import legacy JSON → create/update Firestore document.
5. Delete project → removed from list/storage (soft-delete optional via deleted field).

### Functional Requirements

- **FR1 Auth:** Firebase Authentication with Google and Facebook providers; user record auto-created on first login; Firebase ID tokens for API calls; signOut for logout.
- **FR2 Project Create:** POST creates Firestore document (name, timeline payload, optional metadata); returns projectId, createdAt, updatedAt, version.
- **FR3 Project Read:** GET by projectId returns timeline payload from Firestore; enforce ownership via Security Rules.
- **FR4 Project Update:** PUT/PATCH updates document fields; updates updatedAt; version bump.
- **FR5 Project List:** GET paginated list of user projects (id, name, createdAt, updatedAt, optional preview/size) ordered by updatedAt desc using Firestore queries.
- **FR6 Project Delete:** DELETE removes document or sets deleted field (soft-delete optional); Security Rules exclude from queries by default.
- **FR7 Import/Export:** Upload JSON to create/update Firestore document; download JSON for backup/share.
- **FR8 Unsaved rule:** If user refreshes without saving, changes are lost; UI shows unsaved indicator/tooltip before refresh/navigation.
- **FR9 Recent projects:** UI uses Firestore queries; no localStorage dependency for recents.

### Non-functional Requirements

- **Security:** HTTPS; Firebase Authentication built-in state/nonce handling; Firebase ID tokens (1 hour expiry with auto-refresh); owner-only access control via Firestore Security Rules; input validation on payload JSON.
- **Performance:** p95 save 800 ms; p95 load 600 ms for typical payloads (<1 MB); Firestore document size limit 1 MB enforced.
- **Reliability:** Firestore automatic replication and backups; graceful failures with clear errors; Firebase Status monitoring.
- **Privacy/Compliance:** Firebase handles provider IDs/emails per provider ToS; support user data export and deletion via Firebase Admin SDK (future scope).

### Data Model (Firestore Collections)

- **users (collection)**:
  - Document ID: Firebase UID
  - Fields: email (string), displayName (string), photoURL (string), provider (string: 'google' | 'facebook'), createdAt (timestamp), updatedAt (timestamp)
  - Note: Firebase Auth handles core user data; this collection stores supplementary info

- **projects (collection)**:
  - Document ID: auto-generated Firestore ID
  - Fields:
    - userId (string, indexed) - Firebase UID of owner
    - name (string)
    - payloadJson (map/object) - timeline data
    - version (string)
    - createdAt (timestamp)
    - updatedAt (timestamp)
    - deleted (boolean, default false) - for soft-delete
  - Indexes: userId + updatedAt (desc) for efficient querying

### Firebase Security Rules (draft)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /projects/{projectId} {
      allow read: if request.auth != null &&
                     resource.data.userId == request.auth.uid &&
                     (!resource.data.deleted || resource.data.deleted == false);
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null &&
                               resource.data.userId == request.auth.uid;
    }
  }
}
```

### API Endpoints (draft)

**Phase 1 (MVP): Direct Firebase SDK** ✅

- No custom backend API needed
- Firebase Authentication handles OAuth flows client-side
- Firestore Client SDK handles all CRUD operations
- All operations go through frontend service layer (src/firebase/firestoreService.js)

**Phase 2 (Optional Future): Backend API Proxy**

- Backend API endpoints mirror service layer interface:
  - POST /api/auth/login - Exchange Firebase token for session
  - GET /api/projects - List user projects
  - POST /api/projects - Create project (with server-side validation)
  - GET /api/projects/{project_id} - Get project
  - PUT /api/projects/{project_id} - Update project
  - DELETE /api/projects/{project_id} - Delete project
  - POST /api/projects/import - Import from JSON
  - GET /api/projects/{project_id}/export - Export to JSON
- Backend uses Firebase Admin SDK
- Frontend service layer updated to call backend instead of Firebase directly
- Zero changes to UI components (abstraction layer pays off)

### Implementation Plan (rough estimates, medium confidence)

- **M0 Firebase Setup & Auth (1w):**
  - Firebase project creation (free Spark plan)
  - Enable Google & Facebook authentication providers
  - Initialize Firestore database
  - Set up Security Rules
  - Frontend Firebase SDK integration for auth flows
  - Environment-based configuration (dev/staging/prod)
- **M1 Project Domain (1.5w):**
  - Define Firestore collections and indexes
  - Implement project service layer (src/firebase/firestoreService.js) with abstraction
  - Client-side payload validation (schema, size limits)
  - Security Rules implementation and testing
  - Soft-delete logic (deleted field)
- **M2 Frontend Integration (1.5w):**
  - Replace localStorage project persistence with service layer calls
  - Firebase Auth UI integration (login/logout)
  - Adapt timeline load/save to use service layer
  - Recent list from Firestore queries via service layer
  - Handle offline states and errors
  - Unsaved changes warning
  - Import/export UI
- **M3 QA & Hardening (0.5w):**
  - Security Rules unit tests (Firebase Emulator)
  - Frontend integration tests
  - Auth flow testing
  - Performance checks (document size limits)
  - Error handling validation
  - Firebase quota monitoring setup

### Rollout Plan

Dev with Firebase Emulator → staging Firebase project → prod Firebase project; feature flag for backend persistence; gradual enablement.

### Monitoring & Analytics

- Firebase Authentication metrics (sign-in success/failure)
- Firestore read/write/delete counts and latency (Firebase Console)
- Document size monitoring
- Security Rules violations
- Firebase quota usage (free tier limits: 50K reads/day, 20K writes/day, 1 GiB storage)
- Optional: Firebase Performance Monitoring for client-side metrics

### Risks & Mitigations

- **OAuth app review/redirect issues** → Start Firebase Auth provider setup early; test redirect URLs in dev/staging.
- **Large payloads** → Enforce 1 MB Firestore document limit; consider chunking or Firebase Storage for large assets if needed.
- **Free tier limits** → Monitor quota usage; upgrade to Blaze (pay-as-you-go) if needed; typical usage should stay within free tier for MVP.
- **Data loss by design on refresh without save** → Clear UX warnings; optional confirm-before-exit.
- **Security Rules complexity** → Use Firebase Emulator for testing; start with simple owner-only rules.
- **Client-side vs server-side architecture** → **DECISION: Start with direct Firebase SDK for MVP**
  - Faster to market, lower complexity, leverages Firebase strengths
  - Design service layer abstraction to enable backend proxy later
  - Migration path: backend API mirrors service layer interface
  - Frontend components never call Firebase directly (only via service layer)

### Open Questions

- ~~Client-side Firestore SDK vs backend API layer with Firebase Admin SDK?~~ **DECIDED: Client-side for MVP, backend optional for Phase 2**
- Soft-delete (deleted field) vs hard-delete (document removal)? **RECOMMEND: Soft-delete for MVP (easier recovery)**
- Manual-only import for existing local files, or prompt users to import on first login? **RECOMMEND: Manual with optional first-login prompt**
- Firebase Storage for large video assets in future phases? **Yes, plan for Phase 3 when asset storage becomes bottleneck**
- Enable Firestore offline persistence for better UX? **Future - adds complexity with conflict resolution**

### Acceptance Criteria

- New user signs in with Google/Facebook → Firebase Auth user created; Firestore user document created; receives ID token for subsequent calls.
- Authenticated user creates project → Firestore document created with projectId, createdAt, updatedAt, version; project appears in list query.
- Project list query returns only caller's projects (userId match), ordered by updatedAt desc, excluding deleted projects.
- Cross-user access is blocked by Security Rules (permission denied error).
- Loading a saved project reads Firestore document and restores timeline payload; p95 load ≤600 ms for typical payloads.
- Saving updates Firestore document fields and updatedAt; p95 save ≤800 ms; client receives latest state.
- Deleting a project either removes document or sets deleted=true; excluded from list queries.
- Refresh without save discards unsaved changes; UI surfaces unsaved status before refresh/navigation.
- Import with valid schema creates/updates Firestore document; invalid schema returns clear error.
- Firebase free tier limits are monitored and not exceeded during normal usage.
