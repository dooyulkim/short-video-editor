# Backend-Managed Projects with OAuth Accounts

## One-Page Summary
- **Title:** Backend-Managed Projects with OAuth Accounts
- **Summary:** Move project creation/load/save from frontend localStorage and file downloads to backend APIs tied to OAuth (Google, Facebook) accounts with MySQL persistence. Unsaved edits remain ephemeral—refresh discards them unless explicitly saved.
- **Target user:** Web video creators who need reliable, account-bound projects across sessions/devices.
- **Problem:** Local-only storage causes loss on refresh/device change and lacks authenticated ownership.
- **Key goals & metrics:**
  - Auth success rate (Google/Facebook) 98% within 7 days post-launch
  - Project save success rate 99% (2xx) with p95 save latency 800 ms
  - Project load success rate 99% with p95 load latency 600 ms
- **Timeline:** M0 Auth + schema (1w); M1 Project CRUD APIs (2w); M2 Frontend integration + QA (2w)
- **Risks / Open questions:** OAuth app approvals/redirects; project payload size; optional soft-delete; token strategy (JWT vs session); manual vs automated import of existing local files.

## Full PRD
### Summary
Introduce backend-managed user accounts (OAuth) and project CRUD over HTTP backed by MySQL. Replace localStorage persistence patterns (timeline state, recent projects, project controls) with authenticated, durable storage. Unsaved edits are lost on refresh unless saved; UI must communicate this.

### Background & Context
- Current state: Projects saved to local JSON downloads; recent projects and timeline state persisted in localStorage.
- Pain points: Data loss on refresh, no identity or ownership, no cross-session continuity.

### Target Users & Personas
Web-based short-form video creators who expect authenticated, reliable project storage tied to their account.

### Problem Statement
Local-only persistence causes loss and prevents authenticated ownership and continuity across sessions/devices.

### Goals & Success Metrics
- Auth success rate 98%; project save success rate 99%; project load success rate 99%.
- p95 save latency 800 ms; p95 load latency 600 ms.
- Zero cross-user data leakage (access control enforced).

### Scope
- **In-scope:** OAuth login (Google, Facebook); account creation on first login; MySQL schema for users/projects; project CRUD/list; ownership enforcement; project import/export via JSON; frontend wiring to new APIs; remove localStorage reliance for projects/recent lists; explicit unsaved-loss rule on refresh.
- **Out-of-scope:** Team sharing/collaboration; autosave/drafts; offline mode; mobile/native clients; granular ACL; asset storage changes.

### User Journeys / Use Cases
1) Sign in via Google/Facebook  account created  empty project list shown.
2) Create project  edit timeline  save  backend stores project; appears in list.
3) Load existing project  timeline restored.
4) Import legacy JSON  create/update backend project.
5) Delete project  removed from list/storage (soft-delete optional).

### Functional Requirements
- **FR1 Auth:** OAuth login with Google and Facebook; create user record on first login; issue session/JWT for API calls; logout endpoint.
- **FR2 Project Create:** POST creates project (name, timeline payload, optional metadata); returns projectId, createdAt, updatedAt, version.
- **FR3 Project Read:** GET by projectId returns timeline payload; enforce ownership.
- **FR4 Project Update:** PUT/PATCH updates payload/metadata; updates updatedAt; version bump.
- **FR5 Project List:** GET paginated list of user projects (id, name, createdAt, updatedAt, optional preview/size) ordered by updatedAt desc.
- **FR6 Project Delete:** DELETE removes project (soft-delete optional); exclude from list by default.
- **FR7 Import/Export:** Upload JSON to create/update project; download JSON for backup/share.
- **FR8 Unsaved rule:** If user refreshes without saving, changes are lost; UI shows unsaved indicator/tooltip before refresh/navigation.
- **FR9 Recent projects:** UI uses backend list; no localStorage dependency for recents.

### Non-functional Requirements
- **Security:** HTTPS; OAuth state/nonce; short-lived access tokens with refresh; owner-only access control; input validation on payload JSON.
- **Performance:** p95 save 800 ms; p95 load 600 ms for typical payloads (<1 MB).
- **Reliability:** MySQL with migrations; daily backups; graceful failures with clear errors.
- **Privacy/Compliance:** Store provider IDs/emails per provider ToS; delete PII on account delete (future scope).

### Data Model (proposed)
- **users**: id (UUID), provider (enum: google, facebook), provider_user_id (string, unique per provider), email, display_name, created_at, updated_at.
- **projects**: id (UUID), user_id (FK users.id), name, payload_json (JSON), version (string), created_at, updated_at, deleted_at (nullable for soft-delete).

### API Endpoints (draft)
- POST /auth/{provider}/start, GET /auth/{provider}/callback
- POST /auth/logout
- GET /projects
- POST /projects
- GET /projects/{project_id}
- PUT /projects/{project_id}
- DELETE /projects/{project_id}
- POST /projects/{project_id}/import (optional) / GET /projects/{project_id}/export

### Implementation Plan (rough estimates, medium confidence)
- **M0 Auth & Schema (1w):** OAuth flows (Google/Facebook), user table/migration, session/JWT issuance, middleware for auth.
- **M1 Project Domain (1.5w):** Project table/migration; service layer for CRUD; payload validation; ownership enforcement; optional soft-delete.
- **M2 API & Docs (0.5w):** FastAPI routers for auth/projects; OpenAPI and docs updates.
- **M3 Frontend Integration (1.5w):** Replace localStorage project persistence with API calls; auth flow UI; adapt timeline load/save to backend; recent list from backend.
- **M4 QA & Hardening (0.5w):** Pytest for auth/projects; frontend tests; OAuth redirect tests; perf checks; error handling.

### Rollout Plan
Dev with test OAuth apps  staging  prod after provider approvals; feature flag for backend persistence; gradual enablement.

### Monitoring & Analytics
Auth success/failure; project save/load latency and error rate; 4xx/5xx counts; DB health; OAuth callback errors.

### Risks & Mitigations
- OAuth app review/redirect issues  start setup early; keep separate staging/prod apps.
- Large payloads  enforce size limits; consider compression or external storage if needed later.
- Data loss by design on refresh without save  clear UX warnings; optional confirm-before-exit.

### Open Questions
- Token strategy: JWT vs server sessions? TTL/refresh approach?
- Soft-delete vs hard-delete?
- Manual-only import for existing local files, or prompt users to import?

### Acceptance Criteria
- New user signs in with Google/Facebook  backend user record created; receives token/session for subsequent API calls.
- Authenticated user creates project  API returns projectId, createdAt, updatedAt, version; project appears in list.
- Project list returns only callers projects, ordered by updatedAt desc.
- Cross-user access is blocked (403/404) for non-owners.
- Loading a saved project restores timeline payload; p95 load 600 ms for typical payloads.
- Saving updates payload and updatedAt; p95 save 800 ms; response returns latest state.
- Deleting a project removes it from list (and marks deleted_at if soft-delete chosen).
- Refresh without save discards unsaved changes; UI surfaces unsaved status before refresh/navigation.
- Import with valid schema creates/updates project; invalid schema returns clear error.
