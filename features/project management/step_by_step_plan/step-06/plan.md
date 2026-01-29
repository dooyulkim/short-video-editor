# Step 6 — Project Delete

Goals
- Soft-delete projects via service and update UI list.

Checklist
- [ ] Add delete action to list items
- [ ] Show confirmation dialog before delete
- [ ] Call deleteProject(projectId) to set deleted=true
- [ ] Remove project from UI on success
- [ ] Optional: provide undo within short timeframe

Copilot-ready prompt:
"Add project delete functionality:
- Add delete button/action to project list items
- Show confirmation dialog before delete
- Call deleteProject(projectId) to set deleted=true
- Remove project from UI list after successful delete
- Add undo option (optional) within short timeframe."
