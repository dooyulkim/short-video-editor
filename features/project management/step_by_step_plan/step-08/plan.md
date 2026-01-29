# Step 8 — Unsaved Changes Warning

Goals
- Track isDirty, show indicator, warn on close/navigation, clear on save.

Checklist
- [ ] Track timeline modifications in state (isDirty)
- [ ] Show visual indicator (asterisk/badge) when isDirty
- [ ] Add window.beforeunload listener to warn on refresh/close
- [ ] Show warning modal on navigation away from editor
- [ ] Clear isDirty after successful save

Copilot-ready prompt:
"Add unsaved changes handling:
- Track timeline modifications in state (isDirty flag)
- Show visual indicator (e.g., asterisk, badge) when unsaved changes exist
- Add beforeunload event listener to warn on page refresh/close if unsaved
- Show warning modal on navigation away from editor if unsaved
- Clear isDirty flag after successful save."
