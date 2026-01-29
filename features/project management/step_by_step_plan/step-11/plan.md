# Step 11 — Testing & QA

Goals
- Validate all features via integration tests and manual QA scenarios.

Checklist
- [ ] Test CRUD operations end-to-end
- [ ] Test Security Rules enforcement (cross-user access blocked)
- [ ] Test import/export JSON flow and validation limits
- [ ] Test unsaved changes warning on refresh/navigation
- [ ] Test pagination for large project lists
- [ ] Verify Firebase free tier quota monitoring
- [ ] Test error handling for network/permission/validation failures

Copilot-ready prompt:
"Write integration tests:
- Test project CRUD operations (create, read, update, delete, list)
- Test Security Rules enforcement (cross-user access blocked)
- Test import/export JSON functionality
- Test unsaved changes warning on refresh/navigation
- Test pagination for large project lists
- Verify Firebase free tier quota monitoring
- Test error handling for all scenarios (network, permission, validation)."
