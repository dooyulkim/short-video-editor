## Features

### Backend-Managed Projects with OAuth Accounts

A step-by-step development plan to implement Firebase-managed projects with OAuth authentication, Firestore persistence, and project CRUD operations, replacing localStorage and file-based project management. Each step includes a Copilot-ready prompt for implementation.

#### Architecture Decision

**Phase 1 (MVP): Direct Firebase SDK** ✅

- Use Firebase Client SDK directly from frontend
- Leverage Firebase Security Rules for access control
- Faster development, lower costs, built-in scaling
- Ideal for validating product-market fit

**Phase 2 (Optional Future): Backend Proxy**

- Add FastAPI/Express backend as optional proxy layer
- Use Firebase Admin SDK on backend
- Enable advanced features: rate limiting, complex validation, AI processing
- Migration path: frontend calls backend API instead of Firebase directly

**Implementation Note:** Design frontend service layer to abstract Firebase calls, making future backend migration easier.

#### Steps

1. **Firebase Project Setup** ⬜
   - [ ] Create Firebase project in Firebase Console (free Spark plan)
   - [ ] Install Firebase SDK: `npm install firebase`
   - [ ] Set up folder structure: `src/firebase/` for config and services
   - [ ] Configure environment variables (.env) for dev/staging/prod
   - [ ] Initialize Firebase in app with config
   - **Prompt:**  
     "Create a new Firebase project in Firebase Console (free Spark plan). Install Firebase SDK in the frontend: npm install firebase. Initialize Firebase in the app with config (apiKey, authDomain, projectId, etc.). Set up folder structure: src/firebase/ for config and services. Use environment variables (.env) for Firebase config to support dev/staging/prod environments."

2. **Firestore Database & Security Rules** ⬜
   - [ ] Enable Firestore in Firebase Console
   - [ ] Create Security Rules for 'users' collection
   - [ ] Create Security Rules for 'projects' collection
   - [ ] Deploy Security Rules
   - [ ] Create composite index: userId + updatedAt (desc)
   - **Prompt:**  
     "Enable Firestore in Firebase Console. Create Security Rules for 'users' and 'projects' collections:
     - users: allow read/write only if auth.uid matches document ID
     - projects: allow read if userId matches auth.uid and deleted is false; allow create if userId matches auth.uid; allow update/delete if userId matches auth.uid.
       Deploy Security Rules and create composite index for projects: userId + updatedAt (desc)."

3. **Firebase Authentication Setup (Google/Facebook)** ⬜
   - [ ] Enable Google authentication provider in Firebase Console
   - [ ] Enable Facebook authentication provider in Firebase Console
   - [ ] Configure OAuth redirect URLs
   - [ ] Implement signInWithPopup for Google/Facebook
   - [ ] Implement onAuthStateChanged listener
   - [ ] Implement signOut for logout
   - [ ] Create login UI with Google/Facebook buttons
   - [ ] Store user info in Firestore users collection on first login
   - **Prompt:**  
     "Enable Google and Facebook authentication providers in Firebase Console. Configure OAuth redirect URLs. Implement Firebase Auth in frontend:
     - signInWithPopup for Google/Facebook
     - onAuthStateChanged listener to track auth state
     - signOut for logout
     - Create login UI with Google/Facebook buttons
     - Store user info in Firestore users collection on first login (email, displayName, photoURL, provider, createdAt, updatedAt)."

4. **Firestore Service Layer** ⬜
   - [ ] Create `src/firebase/firestoreService.js`
   - [ ] Implement createProject(userId, name, payloadJson, version)
   - [ ] Implement getProject(projectId)
   - [ ] Implement updateProject(projectId, updates)
   - [ ] Implement deleteProject(projectId) with soft-delete
   - [ ] Implement listProjects(userId, limit, startAfter) with pagination
   - [ ] Ensure abstraction layer design (no direct Firebase calls in components)
   - **Prompt:**  
     "Create src/firebase/firestoreService.js with functions:
     - createProject(userId, name, payloadJson, version): add document to 'projects' collection with userId, name, payloadJson, version, createdAt, updatedAt, deleted=false
     - getProject(projectId): fetch document by ID
     - updateProject(projectId, updates): update fields and set updatedAt
     - deleteProject(projectId): set deleted=true (soft-delete)
     - listProjects(userId, limit, startAfter): query projects where userId matches, deleted=false, ordered by updatedAt desc, with pagination support
       Use Firestore SDK (collection, doc, addDoc, getDoc, updateDoc, query, where, orderBy, limit).

     IMPORTANT: Design as abstraction layer - all Firestore logic contained in this service. Frontend components should ONLY call these service functions, never Firebase directly. This enables future migration to backend API without changing component code."

5. **Frontend Auth Integration** ⬜
   - [ ] Show login screen if user is not authenticated
   - [ ] Set up onAuthStateChanged for global auth state (Context/Redux)
   - [ ] Display user info (displayName, photoURL) in header
   - [ ] Add logout button that calls signOut
   - [ ] Create user document in Firestore on first login if not exists
   - [ ] Redirect to project list after successful login
   - **Prompt:**  
     "Integrate Firebase Auth into frontend:
     - Show login screen if user is not authenticated
     - Use onAuthStateChanged to manage global auth state (Context/Redux)
     - Display user info (displayName, photoURL) in header
     - Add logout button that calls signOut
     - On first login, create user document in Firestore users collection if not exists
     - Redirect to project list after successful login."

6. **Project List Integration** ⬜
   - [ ] Call listProjects(userId) from firestoreService on page load
   - [ ] Display projects in UI (id, name, createdAt, updatedAt)
   - [ ] Order by updatedAt desc
   - [ ] Add loading state
   - [ ] Add error handling
   - [ ] Add 'New Project' button
   - [ ] Remove all localStorage logic for recent projects
   - **Prompt:**  
     "Replace localStorage-based project list with Firestore:
     - On projects page load, call listProjects(userId) from firestoreService
     - Display projects in UI (id, name, createdAt, updatedAt)
     - Order by updatedAt desc to show recent projects first
     - Add loading state and error handling
     - Add 'New Project' button
     - Remove all localStorage logic for recent projects."

7. **Project Create & Save** ⬜
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

8. **Project Load** ⬜
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

9. **Project Delete** ⬜
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

10. **Project Import/Export** ⬜
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

11. **Unsaved Changes Warning** ⬜
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

12. **Firebase Emulator Testing** ⬜
    - [ ] Install firebase-tools globally
    - [ ] Initialize emulators (Auth: 9099, Firestore: 8080)
    - [ ] Configure emulator ports in firebase.json
    - [ ] Update Firebase SDK to use emulators in dev mode
    - [ ] Add npm scripts: 'emulators:start' and 'emulators:test'
    - [ ] Write Security Rules unit tests
    - [ ] Test CRUD operations against emulator
    - [ ] Test cross-user access denial scenarios
    - **Prompt:**  
      "Set up Firebase Emulator Suite:
      - Install: npm install -g firebase-tools
      - Initialize emulators: firebase init emulators (select Auth, Firestore)
      - Configure emulator ports in firebase.json (Auth: 9099, Firestore: 8080)
      - Update Firebase SDK to use emulators in dev mode (connectAuthEmulator, connectFirestoreEmulator)
      - Add npm scripts: 'emulators:start' and 'emulators:test'
      - Write unit tests for Security Rules using @firebase/rules-unit-testing
      - Test CRUD operations against emulator
      - Test cross-user access denial scenarios."

13. **Error Handling & Monitoring** ⬜
    - [ ] Wrap all Firestore calls in try-catch
    - [ ] Handle specific Firebase errors with user-friendly messages
    - [ ] Map Firebase error codes to user-friendly messages
    - [ ] Log errors to console in dev mode
    - [ ] Set up Sentry or error tracking (optional)
    - [ ] Set up Firebase Performance Monitoring
    - [ ] Set up Firebase Analytics
    - [ ] Track key metrics (saves/loads, auth events, errors)
    - [ ] Add retry logic for network errors (exponential backoff)
    - [ ] Display offline state indicator
    - [ ] Set up Firebase quota usage alerts (80% threshold)
    - **Prompt:**  
      "Add error handling and monitoring:
      - Wrap all Firestore calls in try-catch with user-friendly error messages
      - Handle specific Firebase errors (permission-denied, not-found, quota-exceeded, unauthenticated, resource-exhausted)
      - Map Firebase error codes to user-friendly messages
      - Log errors to console in dev mode
      - Add Sentry or similar error tracking (optional but recommended)
      - Set up Firebase Performance Monitoring and Analytics
      - Track key metrics: project saves/loads, auth events, errors
      - Add retry logic for transient network errors (exponential backoff)
      - Display offline state indicator if network is unavailable
      - Monitor Firebase quota usage in console (set up alerts at 80% threshold)."

14. **Testing & QA** ⬜
    - [ ] Test Firebase Auth flows (Google/Facebook login, logout)
    - [ ] Test project CRUD operations (create, read, update, delete, list)
    - [ ] Test Security Rules enforcement (cross-user access blocked)
    - [ ] Test import/export JSON functionality
    - [ ] Test unsaved changes warning on refresh/navigation
    - [ ] Test pagination for large project lists
    - [ ] Verify Firebase free tier quota monitoring
    - **Prompt:**  
      "Write integration tests:
      - Test Firebase Auth flows (Google/Facebook login, logout)
      - Test project CRUD operations (create, read, update, delete, list)
      - Test Security Rules enforcement (cross-user access blocked)
      - Test import/export JSON functionality
      - Test unsaved changes warning on refresh/navigation
      - Test pagination for large project lists
      - Verify Firebase free tier quota monitoring."

#### Progress Tracking

- **Total Steps:** 14
- **Completed:** 0
- **In Progress:** 0
- **Remaining:** 14

**Milestone Breakdown:**

- **M0 (Setup & Auth):** Steps 1-3 ⬜
- **M1 (Service Layer):** Steps 4 ⬜
- **M2 (Frontend Integration):** Steps 5-11 ⬜
- **M3 (Testing & Hardening):** Steps 12-14 ⬜

#### Further Considerations

1. **Architecture Decision:**
   - **Phase 1 (MVP):** Direct client-side Firestore SDK ✅
     - Pros: Simpler, faster, cheaper, leverages Firebase Security Rules
     - Cons: Less control, harder to add complex features later
   - **Phase 2 (Optional):** Backend proxy with Firebase Admin SDK
     - When needed: Advanced validation, rate limiting, AI processing, webhooks
     - Migration path: Update firestoreService.js to call backend API instead of Firebase directly
     - Frontend components unchanged (abstraction layer pays off)

2. **Service Layer Design:**
   - ALL Firebase interactions MUST go through firestoreService.js
   - Components should never import/call Firebase directly
   - This abstraction enables painless migration to backend API later
   - Consider adding request/response logging in service layer

3. **Soft-delete vs Hard-delete:**
   - **Recommended:** Soft-delete (deleted field) for recovery and audit trail
   - Hard-delete can be added as admin-only cleanup task

4. **Legacy Project Import:**
   - Manual import via JSON upload required
   - Optional: Prompt users on first login to import existing localStorage projects
   - Provide migration guide in documentation

5. **Firestore Document Size:**
   - Enforce 1 MB limit on payloadJson (Firestore hard limit)
   - Warn users at 500 KB (UI notification)
   - Block saves above 1 MB with clear error
   - Consider Firebase Storage for large video assets in future phases
   - Implement compression for large timeline payloads if needed (gzip JSON before storing)
6. **Offline Support (Future):**
   - Firestore has built-in offline persistence (enablePersistence)
   - Can be enabled in Phase 2 for better UX
   - Requires conflict resolution strategy for concurrent edits

7. **Migration to Backend (Future):**
   - When ready, create backend API with same interface as firestoreService.js
   - Update service layer to call HTTP endpoints instead of Firestore
   - Use Firebase Admin SDK on backend for same data access
   - Zero changes needed in frontend components
   - Can do gradual rollout with feature flag
