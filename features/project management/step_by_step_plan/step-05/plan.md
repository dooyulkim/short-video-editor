# Step 5 — Project Load

Goals
- Use getProject(projectId) to load payload into editor.
- Provide spinner and error handling.

Checklist
- [ ] Call getProject(projectId) on selection
- [ ] Load payloadJson into timeline state
- [ ] Show loading spinner while fetching
- [ ] Handle not-found and permission-denied errors
- [ ] Remove localStorage load logic

Copilot-ready prompt:
"Replace project load logic with Firestore:
- On project selection from list, call getProject(projectId)
- Load payloadJson into timeline state
- Show loading spinner during fetch
- Handle errors (project not found, permission denied)
- Remove localStorage load logic."
