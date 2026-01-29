# Step 10 — Error Handling & Monitoring

Goals
- Provide user-friendly errors, logging, retries, and monitoring hooks.

Checklist
- [ ] Wrap all Firestore calls in try/catch
- [ ] Map Firebase error codes to friendly messages (permission-denied, not-found, quota)
- [ ] Log errors in dev and optionally send to Sentry
- [ ] Add retry logic for transient network errors (exponential backoff)
- [ ] Show offline state indicator in UI
- [ ] Add Firebase Performance & Analytics hooks for saves/loads/errors

Copilot-ready prompt:
"Add error handling and monitoring:
- Wrap all Firestore calls in try-catch with user-friendly error messages
- Handle specific Firebase errors (permission-denied, not-found, quota-exceeded, resource-exhausted)
- Map Firebase error codes to user-friendly messages
- Log errors to console in dev mode
- Add Sentry or similar error tracking (optional but recommended)
- Set up Firebase Performance Monitoring and Analytics
- Track key metrics: project saves/loads, errors
- Add retry logic for transient network errors (exponential backoff)
- Display offline state indicator if network is unavailable
- Monitor Firebase quota usage in console (set up alerts at 80% threshold)."
