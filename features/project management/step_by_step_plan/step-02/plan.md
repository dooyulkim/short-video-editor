# Step 2 — Firestore Service Layer

Goals
- Add `src/firebase/firestoreProjectService.js` as abstraction layer for all project Firestore calls.
- Implement create/get/update/delete/list with pagination and soft-delete.
- Wrap calls in try/catch and return clear errors for UI.

Checklist
- [ ] createProject(userId, name, payloadJson, version)
- [ ] getProject(projectId)
- [ ] updateProject(projectId, updates)
- [ ] deleteProject(projectId) // soft-delete set deleted=true
- [ ] listProjects(userId, limit, startAfter) // ordered by updatedAt desc
- [ ] No direct Firebase calls from components — only this service

Copilot-ready prompt:
"Create src/firebase/firestoreProjectService.js with functions:
- createProject(userId, name, payloadJson, version): add document to 'projects' collection with userId, name, payloadJson, version, createdAt, updatedAt, deleted=false
- getProject(projectId): fetch document by ID
- updateProject(projectId, updates): update fields and set updatedAt
- deleteProject(projectId): set deleted=true (soft-delete)
- listProjects(userId, limit, startAfter): query projects where userId matches, deleted=false, ordered by updatedAt desc, with pagination support
  Use Firestore SDK (collection, doc, addDoc, getDoc, updateDoc, query, where, orderBy, limit).

IMPORTANT: Design as abstraction layer - all Firestore logic contained in this service. Frontend components should ONLY call these service functions, never Firebase directly. This enables future migration to backend API without changing component code."
