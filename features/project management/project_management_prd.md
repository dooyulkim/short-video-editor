# Backend-Managed Projects with Firestore

## One-Page Summary

- **Title:** Backend-Managed Projects with Firestore
- **Summary:** Move project creation/load/save from frontend localStorage and file downloads to Firestore backend APIs tied to authenticated user accounts (prerequisite: User Management feature). Unsaved edits remain ephemeral—refresh discards them unless explicitly saved.
- **Target user:** Authenticated web video creators who need reliable, account-bound projects across sessions/devices.
- **Problem:** Local-only storage causes loss on refresh/device change; no persistent project ownership.
- **Key goals & metrics:**
  - Project save success rate 99% (2xx) with p95 save latency 800 ms
  - Project load success rate 99% with p95 load latency 600 ms
  - List projects success rate 99% with pagination support
- **Timeline:** M0 Schema + Security Rules (1w); M1 Project CRUD service layer (1w); M2 Frontend integration + QA (1.5w)
- **Prerequisites:** User Management feature (user authentication) must be completed first
- **Risks / Open questions:** Project payload size; soft-delete vs hard-delete; import/export strategy; pagination performance at scale.

## Full PRD

### Summary

Implement Firestore-based project storage with CRUD operations and ownership enforcement via Security Rules. Projects tied to authenticated users (Firebase UID). Requires User Management feature to be completed first for authentication layer.

### Background & Context

- Current state: Projects saved to local JSON downloads; recent projects and timeline state persisted in localStorage.
- Prerequisite: User Management feature (Firebase Authentication with OAuth) must be implemented first.
- Pain points: Data loss on refresh, no persistent project ownership, no cross-device continuity.

### Target Users & Personas

Web-based short-form video creators who expect authenticated, reliable project storage tied to their account.

### Problem Statement

Local-only persistence causes loss and prevents persistent project ownership across sessions/devices. Assumes authenticated user accounts already exist (User Management feature prerequisite).

### Goals & Success Metrics

- Auth success rate 98%; project save success rate 99%; project load success rate 99%.
- p95 save latency 800 ms; p95 load latency 600 ms.
- Zero cross-user data leakage (access control enforced via Firebase Security Rules).

### Scope

- **In-scope:** Firestore project collections and schema; project CRUD/list operations; ownership enforcement via Security Rules; project import/export via JSON; frontend service layer abstraction for all Firestore project calls; remove localStorage reliance for projects/recent lists; explicit unsaved-loss rule on refresh.
- **Out-of-scope:** User authentication (User Management feature handles this); team sharing/collaboration; autosave/drafts; offline mode; granular ACL beyond owner-only; asset storage changes (Firebase Storage considered for future); backend API proxy (can be added later without breaking changes).

### User Journeys / Use Cases

1. Sign in via Google/Facebook → Firebase user created → empty project list shown.
2. Create project → edit timeline → save → Firestore stores project; appears in list.
3. Load existing project → timeline restored from Firestore.
4. Import legacy JSON → create/update Firestore document.
5. Delete project → removed from list/storage (soft-delete optional via deleted field).

### Functional Requirements

- **FR1 Project Create:** POST creates Firestore document (name, timeline payload, optional metadata) tied to authenticated userId; returns projectId, createdAt, updatedAt, version.
- **FR2 Project Read:** GET by projectId returns timeline payload from Firestore; enforce ownership via Security Rules.
- **FR3 Project Update:** PUT/PATCH updates document fields; updates updatedAt; version bump.
- **FR4 Project List:** GET paginated list of user projects (id, name, createdAt, updatedAt, optional preview/size) ordered by updatedAt desc using Firestore queries.
- **FR5 Project Delete:** DELETE removes document or sets deleted field (soft-delete optional); Security Rules exclude from queries by default.
- **FR6 Import/Export:** Upload JSON to create/update Firestore document; download JSON for backup/share.
- **FR7 Unsaved rule:** If user refreshes without saving, changes are lost; UI shows unsaved indicator/tooltip before refresh/navigation.
- **FR8 Recent projects:** UI uses Firestore queries; no localStorage dependency for recents.
- **FR9 Ownership Enforcement:** Security Rules ensure users can only CRUD their own projects (userId match); cross-user access is denied.

### Non-functional Requirements

- **Security:** HTTPS; Firebase Authentication built-in state/nonce handling; Firebase ID tokens (1 hour expiry with auto-refresh); owner-only access control via Firestore Security Rules; input validation on payload JSON.
- **Performance:** p95 save 800 ms; p95 load 600 ms for typical payloads (<1 MB); Firestore document size limit 1 MB enforced.
- **Reliability:** Firestore automatic replication and backups; graceful failures with clear errors; Firebase Status monitoring.
- **Privacy/Compliance:** Firebase handles provider IDs/emails per provider ToS; support user data export and deletion via Firebase Admin SDK (future scope).

### Data Model (Firestore Collections)

- **projects (collection)**:
  - Document ID: auto-generated Firestore ID
  - Fields:
    - userId (string, indexed) - Firebase UID of owner (from User Management)
    - name (string)
    - payloadJson (map/object) - timeline data
    - version (string)
    - createdAt (timestamp)
    - updatedAt (timestamp)
    - deleted (boolean, default false) - for soft-delete
  - Indexes: userId + updatedAt (desc) for efficient querying
  - Note: Users collection managed by User Management feature; projects collection tied to userId

### Firebase Security Rules (draft)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

Note: Users collection rules managed by User Management feature.

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

- **M0 Firestore & Schema (1w):**
  - Define Firestore projects collection schema and indexes
  - Implement project Security Rules
  - Test Security Rules with Firebase Emulator
  - Environment-based Firestore configuration (dev/staging/prod)

- **M1 Project Service Layer (1w):**
  - Implement project service layer (`src/firebase/firestoreProjectService.ts`) with abstraction
  - createProject(userId, name, payloadJson, version)
  - getProject(projectId)
  - updateProject(projectId, updates)
  - deleteProject(projectId)
  - listProjects(userId, limit, startAfter)
  - Client-side payload validation (schema, size limits)
  - Error handling for Firestore operations
  - Soft-delete logic (deleted field)

- **M2 Frontend Integration (1.5w):**
  - Replace localStorage project persistence with service layer calls
  - Adapt timeline load/save to use service layer
  - Recent list from Firestore queries via service layer
  - Handle offline states and errors
  - Unsaved changes warning
  - Import/export UI
  - Loading states and error handling
  - Pagination support for project lists

- **M3 QA & Hardening (0.5w):**
  - Security Rules unit tests (Firebase Emulator)
  - Frontend integration tests
  - Project CRUD operation testing
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

- **Large payloads** → Enforce 1 MB Firestore document limit; consider chunking or Firebase Storage for large assets if needed.
- **Free tier limits exceeded** → Monitor quota usage; upgrade to Blaze (pay-as-you-go) if needed; typical usage should stay within free tier for MVP.
- **Data loss by design on refresh without save** → Clear UX warnings; optional confirm-before-exit.
- **Security Rules complexity** → Use Firebase Emulator for testing; coordinate with User Management feature rules.
- **Pagination performance at scale** → Test with large project lists; Firestore indexes handle ordering efficiently.
- **Soft-delete vs hard-delete decision** → Start with soft-delete for recovery and audit trail; can add hard-delete cleanup task later.
- **Service layer abstraction** → Design carefully to enable future backend API migration without component changes.

Note: Authentication-related risks (OAuth approval, redirect URLs) handled by User Management feature.

### Open Questions

- Soft-delete (deleted field) vs hard-delete (document removal)? **RECOMMEND: Soft-delete for MVP (easier recovery)**
- Manual-only import for existing local files, or prompt users to import on first login? **RECOMMEND: Manual with optional first-login prompt**
- Firebase Storage for large video assets in future phases? **Yes, plan for Phase 3 when asset storage becomes bottleneck**
- Enable Firestore offline persistence for better UX? **Future - adds complexity with conflict resolution**

Note: Authentication-related questions (OAuth strategy, token management) addressed in User Management feature.

### Acceptance Criteria

- Authenticated user (from User Management feature) creates project → Firestore document created with projectId, createdAt, updatedAt, version; project appears in list query.
- Project list query returns only caller's projects (userId match), ordered by updatedAt desc, excluding deleted projects.
- Cross-user access is blocked by Security Rules (permission denied error).
- Loading a saved project reads Firestore document and restores timeline payload; p95 load ≤600 ms for typical payloads.
- Saving updates Firestore document fields and updatedAt; p95 save ≤800 ms; client receives latest state.
- Deleting a project either removes document or sets deleted=true; excluded from list queries.
- Refresh without save discards unsaved changes; UI surfaces unsaved status before refresh/navigation.
- Import with valid schema creates/updates Firestore document; invalid schema returns clear error.
- Firebase free tier limits are monitored and not exceeded during normal usage.
- Service layer abstraction is complete; no Firebase Firestore calls in UI components (all via firestoreProjectService).
