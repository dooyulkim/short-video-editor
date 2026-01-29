# Step 1 — Firestore Database & Security Rules

Goals
- Enable Firestore in Firebase Console (if not already).
- Create and deploy Security Rules for `projects` collection.
- Create composite index: `userId + updatedAt (desc)`.

Checklist
- [ ] Enable Firestore
- [ ] Write Security Rules for `projects`:
  - allow read if auth.uid == resource.data.userId && resource.data.deleted == false
  - allow create if auth.uid == request.resource.data.userId
  - allow update/delete if auth.uid == resource.data.userId
- [ ] Deploy rules
- [ ] Create index for `projects(userId, updatedAt desc)`

Copilot-ready prompt:
"Enable Firestore in Firebase Console (if not already). Create Security Rules for 'projects' collection:
- projects: allow read if userId matches auth.uid and deleted is false; allow create if userId matches auth.uid; allow update/delete if userId matches auth.uid.
  Deploy Security Rules and create composite index for projects: userId + updatedAt (desc)."
