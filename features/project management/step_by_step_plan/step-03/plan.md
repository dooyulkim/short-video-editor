# Step 3 — Project List Integration

Goals
- Use listProjects(userId) from service on page load.
- Show loading and error states.
- Remove localStorage recent projects logic.

Checklist
- [ ] Call listProjects(userId) on projects page load
- [ ] Display projects (id, name, createdAt, updatedAt)
- [ ] Order by updatedAt desc
- [ ] Add loading spinner and error handling
- [ ] Add 'New Project' button
- [ ] Remove localStorage-based recent projects logic

Copilot-ready prompt:
"Replace localStorage-based project list with Firestore:
- On projects page load, call listProjects(userId) from firestoreProjectService
- Get userId from authenticated user context (User Management feature)
- Display projects in UI (id, name, createdAt, updatedAt)
- Order by updatedAt desc to show recent projects first
- Add loading state and error handling
- Add 'New Project' button
- Remove all localStorage logic for recent projects."
