# Step 9 — Firebase Emulator Testing

Goals
- Configure Firestore emulator and unit tests for rules & CRUD.

Checklist
- [ ] Install firebase-tools and init emulators
- [ ] Configure emulator ports (Firestore: 8080) in firebase.json
- [ ] Update SDK to connectFirestoreEmulator in dev
- [ ] Add npm scripts: emulators:start, emulators:test
- [ ] Write Security Rules unit tests using @firebase/rules-unit-testing
- [ ] Test CRUD and cross-user denial scenarios

Copilot-ready prompt:
"Set up Firebase Emulator Suite (if not done by User Management):
- Install: npm install -g firebase-tools
- Initialize emulators: firebase init emulators (select Firestore if not already)
- Configure emulator ports in firebase.json (Firestore: 8080)
- Update Firebase SDK to use emulator in dev mode (connectFirestoreEmulator)
- Add npm scripts: 'emulators:start' and 'emulators:test'
- Write unit tests for Security Rules using @firebase/rules-unit-testing
- Test CRUD operations against emulator
- Test cross-user access denial scenarios."
