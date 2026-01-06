# AI Assistant Guide

This guide helps AI code assistants (like GitHub Copilot, Claude, ChatGPT) efficiently navigate and understand the Video Editor project documentation.

---

## 🎯 Quick Navigation Strategy

### When User Asks About...

| Query Type | Check These Locations (in order) |
|------------|----------------------------------|
| **API endpoints, requests, responses** | 1. `docs/api/backend-api-reference.md`<br>2. `docs/api/quick-reference.md`<br>3. `docs/api/frontend-integration.md` |
| **Frontend-backend integration** | 1. `docs/api/frontend-integration.md`<br>2. `docs/api/quick-reference.md` |
| **Component implementation** | 1. `docs/components/{component-name}.md`<br>2. Source code in `frontend/src/components/` |
| **UI layout, structure** | 1. `docs/architecture/layout-guide.md`<br>2. `docs/components/` |
| **Testing, how to run tests** | 1. `docs/testing/backend-testing-guide.md`<br>2. `docs/testing/test-patterns.md`<br>3. `backend/tests/README.md` |
| **Project architecture, design decisions** | 1. `docs/architecture/development-plan.md`<br>2. `docs/architecture/layout-guide.md`<br>3. `docs/architecture/responsive-design.md` |
| **Setup, installation** | 1. `docs/guides/installation.md`<br>2. `README.md` |
| **Deployment** | 1. `docs/guides/deployment.md` |
| **User features, workflows** | 1. `docs/guides/user-guide.md` |
| **Keyboard shortcuts** | 1. `docs/components/keyboard-shortcuts-reference.md`<br>2. `docs/components/keyboard-shortcuts.md` |
| **Undo/redo system** | 1. `docs/architecture/undo-redo-architecture.md`<br>2. `docs/components/undo-redo-system.md` |
| **Historical context, "why was X done?"** | 1. `docs/history/step{NN}-{feature}.md`<br>2. `docs/history/project-completion-summary.md` |
| **Test coverage, what's tested** | 1. `docs/testing/backend-testing-guide.md`<br>2. `docs/testing/export-tests.md` |

---

## 📁 Documentation Structure

### Primary Documentation Hub: `docs/`

```
docs/
├── INDEX.md                    ← Start here for comprehensive overview
├── AI_ASSISTANT_GUIDE.md       ← This file
│
├── api/                        ← All API documentation
│   ├── backend-api-reference.md    # Full REST API spec (460 lines)
│   ├── quick-reference.md          # Common patterns, code snippets
│   └── frontend-integration.md     # Frontend API integration details
│
├── architecture/               ← Design & technical planning
│   ├── development-plan.md         # Project roadmap, phases
│   ├── responsive-design.md        # Responsive strategy
│   └── layout-guide.md             # UI structure
│
├── guides/                     ← User & developer guides
│   ├── user-guide.md               # Complete user manual (520 lines)
│   ├── installation.md             # Setup instructions
│   └── deployment.md               # Production deployment
│
├── components/                 ← Component & feature documentation
│   ├── player.md                   # Video player component
│   ├── project-save-load.md        # Project save/load
│   ├── export-dialog.md            # Export dialog
│   ├── text-tool.md                # Text tool component
│   ├── transition-components.md    # Transition effects UI
│   ├── keyboard-shortcuts.md       # Keyboard shortcuts system
│   ├── keyboard-shortcuts-reference.md  # Shortcut cheat sheet
│   └── undo-redo-system.md         # Undo/redo implementation
│
├── testing/                    ← Testing strategies (NO test results)
│   ├── backend-testing-guide.md    # Backend test suite
│   ├── export-tests.md             # Export test documentation
│   ├── manual-testing-guide.md     # Manual testing procedures
│   └── test-patterns.md            # Testing code examples
│
└── history/                    ← Implementation logs (archived)
    ├── project-completion-summary.md
    ├── implementation-completion-summary.md
    └── step{NN}-{feature}.md       # Chronological dev logs
```

### Co-located Documentation (with source code)

```
backend/
├── README.md                       # Backend setup & structure
└── tests/README.md                 # Test organization
```

---

## 🚀 Recommended Reading Order

### For Understanding the Codebase
1. **[README.md](../README.md)** - Project overview, features
2. **[docs/INDEX.md](INDEX.md)** - Documentation map
3. **[docs/architecture/development-plan.md](architecture/development-plan.md)** - Technical vision
4. **[docs/architecture/layout-guide.md](architecture/layout-guide.md)** - UI structure
5. **Component READMEs** - Individual component details

### For API Integration Work
1. **[docs/api/quick-reference.md](api/quick-reference.md)** - Common patterns
2. **[docs/api/backend-api-reference.md](api/backend-api-reference.md)** - Full API spec
3. **[docs/api/frontend-integration.md](api/frontend-integration.md)** - Integration details

### For Testing Work
1. **[docs/testing/backend-testing-guide.md](testing/backend-testing-guide.md)** - How to run tests
2. **[docs/testing/test-patterns.md](testing/test-patterns.md)** - Code examples
3. **[backend/tests/README.md](../backend/tests/README.md)** - Test organization

### For Component Development
1. **[docs/architecture/layout-guide.md](architecture/layout-guide.md)** - UI structure
2. **Relevant component doc** in `docs/components/{component}.md`
3. **[docs/api/frontend-integration.md](api/frontend-integration.md)** - API usage

---

## 🎨 Documentation Conventions

### What's Current vs. Historical

#### ✅ Current Documentation (use these)
- **Location**: `docs/api/`, `docs/guides/`, `docs/architecture/`, `docs/testing/`, component READMEs
- **Purpose**: Active reference material for ongoing development
- **Naming**: Descriptive `kebab-case-names.md`
- **Content**: Current state, best practices, how-to guides

#### 📜 Historical/Archived (reference when needed)
- **Location**: `docs/history/`
- **Purpose**: Implementation logs, development chronology
- **Naming**: `stepNN-feature-description.md`
- **Content**: What was built, when, and why
- **Use Case**: Understanding historical context, design decisions

### What's NOT in Documentation

❌ **Test Results**: No test execution results, pass/fail counts, or test fixes
- We removed: `TEST_SUMMARY.md`, `TEST_REPORT.md`, `TEST_FIXES_SUMMARY.md`, `TEST_RESULTS_*.md`
- We keep: Testing strategies, how-to guides, test patterns

❌ **Duplicate API Docs**: Consolidated into `docs/api/`
- Single source of truth for API documentation
- Quick reference for common patterns

---

## 🔍 Search Strategies

### Efficient Context Gathering

#### When searching for code usage:
1. Use `semantic_search` for concepts, not exact strings
2. Use `grep_search` for exact function/variable names
3. Use `list_code_usages` for finding all references

#### When searching for documentation:
1. Start with `docs/INDEX.md` to understand structure
2. Check specific `docs/{category}/` directories
3. All component docs are in `docs/components/`

#### File path patterns:
```bash
# API documentation
docs/api/**/*.md

# Component documentation  
docs/components/**/*.md

# Testing documentation
docs/testing/**/*.md
backend/tests/README.md

# Architecture/design
docs/architecture/**/*.md

# Historical context
docs/history/**/*.md
```

---

## 🧠 Understanding Project Architecture

### Backend (Python/FastAPI)
- **Location**: `backend/`
- **Structure**: Routers → Services → Models
- **Documentation**: `backend/README.md`, `docs/api/backend-api-reference.md`
- **Key Services**:
  - Media management: Upload, thumbnails, metadata
  - Timeline processing: Clips, transitions, effects
  - Audio mixing: Audio tracks, mixing, normalization
  - Export: Video rendering, format conversion

### Frontend (React/TypeScript)
- **Location**: `frontend/src/`
- **Structure**: Components, hooks, services, state management
- **Documentation**: `docs/components/`, `docs/architecture/layout-guide.md`
- **Key Features**:
  - Video player with timeline
  - Drag-and-drop media library
  - Text overlay tool
  - Transition effects
  - Export dialog
  - Undo/redo system
  - Keyboard shortcuts

### Key Systems

#### API Integration
- **Frontend → Backend**: axios-based service layer
- **Documentation**: `docs/api/frontend-integration.md`
- **Location**: `frontend/src/services/api.ts`

#### State Management
- **Timeline State**: Zustand store
- **Undo/Redo**: Custom history stack
- **Documentation**: `frontend/src/hooks/useUndoRedo/ARCHITECTURE.md`

#### Testing
- **Backend**: pytest with fixtures
- **Frontend**: Vitest + React Testing Library
- **Documentation**: `docs/testing/`

---

## 💡 Best Practices for AI Assistants

### DO:
✅ Check `docs/INDEX.md` first for orientation
✅ Use `docs/components/` for component-specific questions
✅ Reference `docs/api/` for all API-related queries
✅ Check `docs/testing/` for test strategies (not test results)
✅ Look at `docs/history/` only when historical context is needed
✅ Prefer current documentation over historical logs

### DON'T:
❌ Reference test result files (they don't exist anymore)
❌ Look for STEP files outside `docs/history/`
❌ Assume old file paths (many docs were moved/consolidated)
❌ Skip the documentation index - it saves time
❌ Search for API docs in multiple places (consolidated in `docs/api/`)

### When Answering Code Questions:

1. **Understand the context**:
   - What component/service is involved?
   - Is it frontend or backend?
   - Is it about API, UI, testing, or architecture?

2. **Find relevant documentation**:
   - Use the "When User Asks About..." table above
   - Check `docs/components/` for component documentation
   - Reference API docs for integration questions

3. **Verify with source code**:
   - Documentation shows the "what" and "why"
   - Source code shows the "how" and current implementation
   - Always verify against actual code when making suggestions

4. **Provide context-aware answers**:
   - Link to relevant documentation
   - Show code examples from source
   - Explain design decisions from architecture docs

---

## 📊 Documentation Statistics

- **Total organized documentation**: ~40 markdown files
- **Primary categories**: 6 (api, architecture, guides, testing, components, history)
- **Component documentation**: 9 files in `docs/components/`
- **Removed artifacts**: 11 test result/fix files
- **Consolidated**: All scattered component/feature docs → `docs/components/`

---

## 🔄 Documentation Maintenance

### When Documentation Changes:
1. Update relevant doc in appropriate `docs/` subdirectory
2. Update `docs/INDEX.md` if structure changes
3. Keep this AI guide synchronized with new patterns

### Adding New Documentation:
- **Component docs**: Add to `docs/components/` with `kebab-case.md` naming
- **API changes**: Update `docs/api/backend-api-reference.md`
- **Architecture decisions**: Add to `docs/architecture/`
- **Testing strategies**: Add to `docs/testing/`
- **Implementation logs**: Add to `docs/history/` (with date)

---

## 🎓 Example Query Patterns

### "How do I upload a file?"
1. Check `docs/api/quick-reference.md` for code snippet
2. Reference `docs/api/backend-api-reference.md` for endpoint details
3. See `docs/api/frontend-integration.md` for frontend usage

### "How does the undo/redo system work?"
1. Read `docs/architecture/undo-redo-architecture.md` for design
2. Check `docs/components/undo-redo-system.md` for usage
3. Look at source code in `frontend/src/hooks/useUndoRedo/`

### "What components are available?"
1. Check `docs/architecture/layout-guide.md` for UI structure
2. Browse `docs/components/` directory
3. List files in `frontend/src/components/`

### "How do I run tests?"
1. Check `docs/testing/backend-testing-guide.md` or `docs/testing/manual-testing-guide.md`
2. Look at `backend/tests/README.md` for test organization
3. Reference `docs/testing/test-patterns.md` for code examples

### "Why was feature X implemented this way?"
1. Search `docs/history/` for relevant STEP file
2. Check `docs/architecture/development-plan.md` for design rationale
3. Look at `docs/components/` for implementation details

---

## 🤖 AI-Specific Tips

### Context Window Optimization
- Start with `docs/INDEX.md` (comprehensive overview)
- Load only relevant docs based on query
- Component docs in `docs/components/` are concise and focused

### Avoiding Outdated Information
- Ignore references to removed test result files
- Don't look for API docs at root level (moved to `docs/api/`)
- Historical logs in `docs/history/` may not reflect current state

### Efficient File Discovery
- Use `docs/INDEX.md` "Finding Documentation" table
- Components centralized in `docs/components/`
- Remember: Testing guides in `docs/testing/`, not with test code

---

## 📞 Documentation Hierarchy

When information conflicts, priority order:

1. **Source code** - Ultimate truth
2. **docs/components/** - Component-specific truth
3. **docs/api/** - API specification truth
4. **docs/architecture/** - Design intent truth
5. **docs/guides/** - Usage guidance
6. **docs/history/** - Historical context only

---

*Last Updated: January 6, 2026*

**For comprehensive documentation overview, see [INDEX.md](INDEX.md)**
