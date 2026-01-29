# Step 7 — Project Import/Export

Goals
- Provide JSON export and import with validation and size limits.

Checklist
- [ ] Export JSON button to download project (payloadJson + metadata)
- [ ] Import JSON picker and preview
- [ ] Validate required fields: name, payloadJson, version
- [ ] Warn if payload > 500KB; block > 1MB
- [ ] Show preview and validation errors
- [ ] On import, call createProject or updateProject
- [ ] Optional: prompt to import legacy localStorage projects on first login

Copilot-ready prompt:
"Implement project import/export:
- Export: Add 'Export JSON' button that downloads current project as JSON file (payloadJson + metadata)
- Import: Add 'Import JSON' button with file picker
  - Validate JSON schema (check required fields: name, payloadJson, version)
  - Enforce payload size limit (warn if >500KB, block if >1MB)
  - Show preview of imported data
  - Call createProject or updateProject with imported payload
  - Handle validation errors with clear messages
  - Allow users to import legacy localStorage projects on first login (optional prompt with instructions)."
