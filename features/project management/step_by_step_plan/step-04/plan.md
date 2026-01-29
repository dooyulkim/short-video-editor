# Step 4 — Project Create & Save

Goals
- 'New Project' and 'Save Project' use service functions.
- Show toasts, update local state, remove file-download persistence.

Checklist
- [ ] New Project -> createProject(userId, name, emptyPayload, version='1.0')
- [ ] Save Project -> updateProject(projectId, {payloadJson, updatedAt, version})
- [ ] Success and error toasts
- [ ] Update projectId and timestamps in local state after create/save
- [ ] Unsaved changes indicator (isDirty)
- [ ] Remove file download save logic and localStorage persistence

Copilot-ready prompt:
"Replace project save logic with Firestore:
- On 'New Project', call createProject(userId, name, emptyPayload, version='1.0')
- On 'Save Project', call updateProject(projectId, {payloadJson, updatedAt, version})
- Show success/error toast notifications
- Update local state with returned projectId and timestamps
- Add 'unsaved changes' indicator when timeline is modified but not saved
- Remove file download save logic and localStorage persistence."
