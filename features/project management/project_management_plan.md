## Features

### Backend-Managed Projects with Firestore

A step-by-step development plan to implement Firestore-based project persistence with CRUD operations, ownership enforcement, and project management features, replacing localStorage and file-based project management. Assumes User Management feature (Firebase Authentication) is already implemented. Each step includes a Copilot-ready prompt for implementation.

**Prerequisite:** User Management feature (OAuth authentication with Google/Facebook) must be completed first.

#### Architecture Decision

**Phase 1 (MVP): Direct Firebase SDK** ✅

- Use Firebase Firestore Client SDK directly from frontend
- Leverage Firebase Security Rules for ownership/access control
- Assumes authenticated user context from User Management feature
- Faster development, lower costs, built-in scaling
- Ideal for validating product-market fit

**Phase 2 (Optional Future): Backend Proxy**

- Add FastAPI/Express backend as optional proxy layer
- Use Firebase Admin SDK on backend
- Enable advanced features: rate limiting, complex validation, AI processing
- Migration path: frontend calls backend API instead of Firestore directly

**Implementation Note:** Design frontend service layer to abstract Firestore calls, making future backend migration easier.

#### Steps

1. **Firestore Database & Security Rules** ⬜
   - [ ] Enable Firestore in Firebase Console (if not already enabled by User Management)
   - [ ] Create Security Rules for 'projects' collection
   - [ ] Deploy Security Rules
   - [ ] Create composite index: userId + updatedAt (desc)
   - **Prompt:**  
     "Enable Firestore in Firebase Console (if not already). Create Security Rules for 'projects' collection:
     - projects: allow read if userId matches auth.uid and deleted is false; allow create if userId matches auth.uid; allow update/delete if userId matches auth.uid.
       Deploy Security Rules and create composite index for projects: userId + updatedAt (desc)."

2. **Firestore Service Layer** ⬜
   - [ ] Create `src/firebase/firestoreProjectService.js`
   - [ ] Implement createProject(userId, name, payloadJson, version)
   - [ ] Implement getProject(projectId)
   - [ ] Implement updateProject(projectId, updates)
   - [ ] Implement deleteProject(projectId) with soft-delete
   - [ ] Implement listProjects(userId, limit, startAfter) with pagination
   - [ ] Ensure abstraction layer design (no direct Firebase calls in components)
   - **Prompt:**  
     "Create src/firebase/firestoreProjectService.js with functions:
     - createProject(userId, name, payloadJson, version): add document to 'projects' collection with userId, name, payloadJson, version, createdAt, updatedAt, deleted=false
     - getProject(projectId): fetch document by ID
     - updateProject(projectId, updates): update fields and set updatedAt
     - deleteProject(projectId): set deleted=true (soft-delete)
     - listProjects(userId, limit, startAfter): query projects where userId matches, deleted=false, ordered by updatedAt desc, with pagination support
       Use Firestore SDK (collection, doc, addDoc, getDoc, updateDoc, query, where, orderBy, limit).

     IMPORTANT: Design as abstraction layer - all Firestore logic contained in this service. Frontend components should ONLY call these service functions, never Firebase directly. This enables future migration to backend API without changing component code."

3. **Project List Integration** ⬜
   - [ ] Call listProjects(userId) from firestoreProjectService on page load
   - [ ] Display projects in UI (id, name, createdAt, updatedAt)
   - [ ] Order by updatedAt desc
   - [ ] Add loading state
   - [ ] Add error handling
   - [ ] Add 'New Project' button
   - [ ] Remove all localStorage logic for recent projects
   - **Prompt:**  
     "Replace localStorage-based project list with Firestore:
     - On projects page load, call listProjects(userId) from firestoreProjectService
     - Get userId from authenticated user context (User Management feature)
     - Display projects in UI (id, name, createdAt, updatedAt)
     - Order by updatedAt desc to show recent projects first
     - Add loading state and error handling
     - Add 'New Project' button
     - Remove all localStorage logic for recent projects."

4. **Project Create & Save** ⬜
   - [ ] Implement 'New Project' using createProject()
   - [ ] Implement 'Save Project' using updateProject()
   - [ ] Show success/error toast notifications
   - [ ] Update local state with projectId and timestamps
   - [ ] Add 'unsaved changes' indicator
   - [ ] Remove file download save logic
   - [ ] Remove localStorage persistence
   - **Prompt:**  
     "Replace project save logic with Firestore:
     - On 'New Project', call createProject(userId, name, emptyPayload, version='1.0')
     - On 'Save Project', call updateProject(projectId, {payloadJson, updatedAt, version})
     - Show success/error toast notifications
     - Update local state with returned projectId and timestamps
     - Add 'unsaved changes' indicator when timeline is modified but not saved
     - Remove file download save logic and localStorage persistence."

5. **Project Load** ⬜
   - [ ] Call getProject(projectId) on project selection
   - [ ] Load payloadJson into timeline state
   - [ ] Show loading spinner during fetch
   - [ ] Handle errors (not found, permission denied)
   - [ ] Remove localStorage load logic
   - **Prompt:**  
     "Replace project load logic with Firestore:
     - On project selection from list, call getProject(projectId)
     - Load payloadJson into timeline state
     - Show loading spinner during fetch
     - Handle errors (project not found, permission denied)
     - Remove localStorage load logic."

6. **Project Delete** ⬜
   - [ ] Add delete button/action to project list items
   - [ ] Show confirmation dialog before delete
   - [ ] Call deleteProject(projectId) to set deleted=true
   - [ ] Remove project from UI list after successful delete
   - [ ] Add undo option (optional)
   - **Prompt:**  
     "Add project delete functionality:
     - Add delete button/action to project list items
     - Show confirmation dialog before delete
     - Call deleteProject(projectId) to set deleted=true
     - Remove project from UI list after successful delete
     - Add undo option (optional) within short timeframe."

7. **Project Import/Export** ⬜
   - [ ] Add 'Export JSON' button that downloads project as JSON
   - [ ] Add 'Import JSON' button with file picker
   - [ ] Validate JSON schema (name, payloadJson, version)
   - [ ] Enforce payload size limit (warn >500KB, block >1MB)
   - [ ] Show preview of imported data
   - [ ] Handle validation errors with clear messages
   - [ ] Add optional first-login import prompt for localStorage projects
   - **Prompt:**  
     "Implement project import/export:
     - Export: Add 'Export JSON' button that downloads current project as JSON file (payloadJson + metadata)
     - Import: Add 'Import JSON' button with file picker
       - Validate JSON schema (check required fields: name, payloadJson, version)
       - Enforce payload size limit (warn if >500KB, block if >1MB)
       - Show preview of imported data
       - Call createProject or updateProject with imported payload
       - Handle validation errors with clear messages
       - Allow users to import legacy localStorage projects on first login (optional prompt with instructions)."

8. **Unsaved Changes Warning** ⬜
   - [ ] Track timeline modifications in state (isDirty flag)
   - [ ] Show visual indicator when unsaved changes exist
   - [ ] Add beforeunload event listener to warn on refresh/close
   - [ ] Show warning modal on navigation away from editor
   - [ ] Clear isDirty flag after successful save
   - **Prompt:**  
     "Add unsaved changes handling:
     - Track timeline modifications in state (isDirty flag)
     - Show visual indicator (e.g., asterisk, badge) when unsaved changes exist
     - Add beforeunload event listener to warn on page refresh/close if unsaved
     - Show warning modal on navigation away from editor if unsaved
     - Clear isDirty flag after successful save."

9. **Firebase Emulator Testing** ⬜
   - [ ] Install firebase-tools globally (if not already by User Management)
   - [ ] Initialize/configure Firestore emulator (port 8080)
   - [ ] Configure emulator ports in firebase.json
   - [ ] Update Firebase SDK to use emulator in dev mode
   - [ ] Add npm scripts: 'emulators:start' and 'emulators:test'
   - [ ] Write Security Rules unit tests
   - [ ] Test CRUD operations against emulator
   - [ ] Test cross-user access denial scenarios
   - **Prompt:**  
     "Set up Firebase Emulator Suite (if not done by User Management):
     - Install: npm install -g firebase-tools
     - Initialize emulators: firebase init emulators (select Firestore if not already)
     - Configure emulator ports in firebase.json (Firestore: 8080)
     - Update Firebase SDK to use emulator in dev mode (connectFirestoreEmulator)
     - Add npm scripts: 'emulators:start' and 'emulators:test'
     - Write unit tests for Security Rules using @firebase/rules-unit-testing
     - Test CRUD operations against emulator
     - Test cross-user access denial scenarios."

10. **Error Handling & Monitoring** ⬜
    - [ ] Wrap all Firestore calls in try-catch
    - [ ] Handle specific Firebase errors with user-friendly messages
    - [ ] Map Firebase error codes to user-friendly messages
    - [ ] Log errors to console in dev mode
    - [ ] Set up Sentry or error tracking (optional)
    - [ ] Set up Firebase Performance Monitoring
    - [ ] Set up Firebase Analytics for projects
    - [ ] Track key metrics (saves/loads, errors)
    - [ ] Add retry logic for network errors (exponential backoff)
    - [ ] Display offline state indicator
    - [ ] Set up Firebase quota usage alerts (80% threshold)
    - **Prompt:**  
      "Add error handling and monitoring:
      - Wrap all Firestore calls in try-catch with user-friendly error messages
      - Handle specific Firebase errors (permission-denied, not-found, quota-exceeded, resource-exhausted)
      - Map Firebase error codes to user-friendly messages
      - Log errors to console in dev mode
      - Add Sentry or similar error tracking (optional but recommended)
      - Set up Firebase Performance Monitoring and Analytics
      - Track key metrics: project saves/loads, errors
      - Add retry logic for transient network errors (exponential backoff)
      - Display offline state indicator if network is unavailable
      - Monitor Firebase quota usage in console (set up alerts at 80% threshold)."

11. **Testing & QA** ⬜
    - [ ] Test project CRUD operations (create, read, update, delete, list)
    - [ ] Test Security Rules enforcement (cross-user access blocked)
    - [ ] Test import/export JSON functionality
    - [ ] Test unsaved changes warning on refresh/navigation
    - [ ] Test pagination for large project lists
    - [ ] Verify Firebase free tier quota monitoring
    - [ ] Test error handling for all error scenarios
    - **Prompt:**  
      "Write integration tests:
      - Test project CRUD operations (create, read, update, delete, list)
      - Test Security Rules enforcement (cross-user access blocked)
      - Test import/export JSON functionality
      - Test unsaved changes warning on refresh/navigation
      - Test pagination for large project lists
      - Verify Firebase free tier quota monitoring
      - Test error handling for all scenarios (network, permission, validation)."

#### Progress Tracking

- **Total Steps:** 11
- **Completed:** 0
- **In Progress:** 0
- **Remaining:** 11

**Milestone Breakdown:**

- **M0 (Firestore Setup):** Step 1 ⬜
- **M1 (Service Layer):** Step 2 ⬜
- **M2 (Frontend Integration):** Steps 3-8 ⬜
- **M3 (Testing & Hardening):** Steps 9-11 ⬜

**Prerequisite Completion:**

- User Management feature (Firebase Auth) must be completed before starting this feature

#### Further Considerations

1. **User Management Prerequisite:**
   - User Management feature (Firebase Auth with Google/Facebook OAuth) must be completed first
   - Assumes authenticated user context available via Context/Redux from User Management
   - Firestore users collection created and managed by User Management feature
   - This feature focuses only on project management, not user authentication

2. **Architecture Decision:**
   - **Phase 1 (MVP):** Direct client-side Firestore SDK ✅
     - Pros: Simpler, faster, cheaper, leverages Firebase Security Rules
     - Cons: Less control, harder to add complex features later
   - **Phase 2 (Optional):** Backend proxy with Firebase Admin SDK
     - When needed: Advanced validation, rate limiting, AI processing, webhooks
     - Migration path: Update firestoreProjectService.js to call backend API instead of Firestore directly
     - Frontend components unchanged (abstraction layer pays off)

3. **Service Layer Design:**
   - ALL Firestore project interactions MUST go through firestoreProjectService.js
   - Components should never import/call Firestore directly
   - This abstraction enables painless migration to backend API later
   - Consider adding request/response logging in service layer

4. **Soft-delete vs Hard-delete:**
   - **Recommended:** Soft-delete (deleted field) for recovery and audit trail
   - Hard-delete can be added as admin-only cleanup task

5. **Legacy Project Import:**
   - Manual import via JSON upload required
   - Optional: Prompt users on first login to import existing localStorage projects
   - Provide migration guide in documentation

6. **Firestore Document Size:**
   - Enforce 1 MB limit on payloadJson (Firestore hard limit)
   - Warn users at 500 KB (UI notification)
   - Block saves above 1 MB with clear error
   - Consider Firebase Storage for large video assets in future phases
   - Implement compression for large timeline payloads if needed (gzip JSON before storing)

7. **Offline Support (Future):**
   - Firestore has built-in offline persistence (enablePersistence)
   - Can be enabled in Phase 2 for better UX
   - Requires conflict resolution strategy for concurrent edits

8. **Migration to Backend (Future):**
   - When ready, create backend API with same interface as firestoreProjectService.js
   - Update service layer to call HTTP endpoints instead of Firestore
   - Use Firebase Admin SDK on backend for same data access
   - Zero changes needed in frontend components
   - Can do gradual rollout with feature flag

9. **Dependency on User Management:**
   - Ensure User Management feature is fully tested before starting this feature
   - Use User Management's authenticated user context (useAuth hook)
   - Coordinate Security Rules updates if needed
   - Test both features together after completion
