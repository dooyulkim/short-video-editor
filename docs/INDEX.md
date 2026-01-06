# Documentation Index

This index provides a comprehensive overview of all documentation in the Video Editor project, organized by category for easy navigation.

---

## 📚 Quick Start

- **[README](../README.md)** - Project overview, features, and quick start guide
- **[Installation Guide](guides/installation.md)** - Setup instructions for development
- **[User Guide](guides/user-guide.md)** - Complete user manual with features and workflows
- **[Deployment Guide](guides/deployment.md)** - Production deployment instructions

---

## 🔌 API Documentation

Complete API reference and integration guides:

- **[Backend API Reference](api/backend-api-reference.md)** - Full REST API documentation
- **[Quick Reference](api/quick-reference.md)** - Common API patterns and code snippets
- **[Frontend Integration](api/frontend-integration.md)** - Frontend-backend API integration guide

---

## 🏗️ Architecture & Design

System architecture, design decisions, and technical planning:

- **[Development Plan](architecture/development-plan.md)** - Project roadmap and implementation phases
- **[Responsive Design](architecture/responsive-design.md)** - Responsive design strategy and breakpoints
- **[Layout Guide](architecture/layout-guide.md)** - UI layout structure and component organization

---

## 🧪 Testing Documentation

Testing strategies, guides, and how-to documentation:

- **[Backend Testing Guide](testing/backend-testing-guide.md)** - Backend test suite overview and running tests
- **[Export Tests](testing/export-tests.md)** - Export functionality test documentation
- **[Manual Testing Guide](testing/manual-testing-guide.md)** - Visual and manual testing procedures
- **[Test Patterns](testing/test-patterns.md)** - Common testing patterns and code examples

---

## 🧩 Component Documentation

Component and feature-specific documentation:

### Frontend Components
- **[Player Component](components/player.md)** - Video player implementation
- **[Project Save/Load](components/project-save-load.md)** - Project save/load functionality
- **[Export Dialog](components/export-dialog.md)** - Export dialog component
- **[Text Tool](components/text-tool.md)** - Text overlay tool
- **[Transition Components](components/transition-components.md)** - Transition effects UI

### Frontend Features
- **[Keyboard Shortcuts](components/keyboard-shortcuts.md)** - Keyboard shortcuts system
- **[Keyboard Shortcuts Reference](components/keyboard-shortcuts-reference.md)** - Shortcut cheat sheet
- **[Undo/Redo System](components/undo-redo-system.md)** - Undo/redo implementation
- **[Undo/Redo Architecture](architecture/undo-redo-architecture.md)** - Undo/redo system design

### Backend Documentation
- **[Backend README](../backend/README.md)** - Backend setup and structure
- **[Tests README](../backend/tests/README.md)** - Backend test organization

---

## 📜 Implementation History

Chronological development logs and milestone summaries (archived):

### Project Milestones
- **[Project Completion Summary](history/project-completion-summary.md)** - Final project completion overview
- **[Implementation Completion](history/implementation-completion-summary.md)** - Missing features implementation

### Backend Implementation Steps
- **[Step 03: Media Upload API](history/step03-media-upload-api.md)** - Media upload endpoints
- **[Step 10: Video Processing](history/step10-video-processing.md)** - Video processing endpoints
- **[Step 11: Transition Service](history/step11-transition-service.md)** - Transition effects service
- **[Step 14: Audio Mixing](history/step14-audio-mixing.md)** - Audio mixing service

### Frontend Implementation Steps
- **[Step 20: Frontend-Backend Integration](history/step20-frontend-backend-integration.md)** - API integration
- **[Step 21: Keyboard Shortcuts](history/step21-keyboard-shortcuts.md)** - Keyboard shortcuts implementation
- **[Step 23: Undo/Redo System](history/step23-undo-redo-system.md)** - Undo/redo implementation
- **[Step 24: UI Polish & Theming](history/step24-ui-polish-theming.md)** - UI improvements and theming

---

## 📂 Documentation Organization

### Directory Structure

```
docs/
├── INDEX.md                          # This file - documentation index
├── AI_ASSISTANT_GUIDE.md             # Guide for AI code assistants
├── api/                              # API documentation
│   ├── backend-api-reference.md      # Full REST API reference
│   ├── quick-reference.md            # Common API patterns
│   └── frontend-integration.md       # Frontend API integration
├── architecture/                     # System architecture & design
│   ├── development-plan.md           # Project roadmap
│   ├── responsive-design.md          # Responsive design strategy
│   ├── layout-guide.md               # UI layout structure
│   └── undo-redo-architecture.md     # Undo/redo system design
├── guides/                           # User and developer guides
│   ├── user-guide.md                 # Complete user manual
│   ├── installation.md               # Setup instructions
│   └── deployment.md                 # Deployment guide
├── testing/                          # Testing documentation
│   ├── backend-testing-guide.md      # Backend test suite
│   ├── export-tests.md               # Export test documentation
│   ├── manual-testing-guide.md       # Manual testing procedures
│   └── test-patterns.md              # Testing patterns & examples
├── components/                       # Component & feature documentation
│   ├── player.md                     # Video player component
│   ├── project-save-load.md          # Project save/load
│   ├── export-dialog.md              # Export dialog
│   ├── text-tool.md                  # Text tool component
│   ├── transition-components.md      # Transition effects UI
│   ├── keyboard-shortcuts.md         # Keyboard shortcuts system
│   ├── keyboard-shortcuts-reference.md  # Shortcut cheat sheet
│   └── undo-redo-system.md           # Undo/redo implementation
└── history/                          # Implementation logs (archived)
    ├── project-completion-summary.md
    ├── implementation-completion-summary.md
    ├── step03-media-upload-api.md
    ├── step10-video-processing.md
    ├── step11-transition-service.md
    ├── step14-audio-mixing.md
    ├── step20-frontend-backend-integration.md
    ├── step21-keyboard-shortcuts.md
    ├── step23-undo-redo-system.md
    └── step24-ui-polish-theming.md
```

### Co-located Documentation

Backend documentation remains co-located with source code:
- Backend setup: `backend/README.md`
- Test organization: `backend/tests/README.md`

---

## 🔍 Finding Documentation

### By Use Case

| I want to... | See... |
|--------------|--------|
| Get started with the project | [README](../README.md), [Installation Guide](guides/installation.md) |
| Learn how to use the editor | [User Guide](guides/user-guide.md) |
| Integrate with the API | [API Quick Reference](api/quick-reference.md), [Frontend Integration](api/frontend-integration.md) |
| Understand the architecture | [Development Plan](architecture/development-plan.md), [Layout Guide](architecture/layout-guide.md) |
| Run tests | [Backend Testing Guide](testing/backend-testing-guide.md), [Manual Testing Guide](testing/manual-testing-guide.md) |
| Write new tests | [Test Patterns](testing/test-patterns.md) |
| Deploy to production | [Deployment Guide](guides/deployment.md) |
| Understand a specific component | Component docs in [docs/components/](components/) |
| See development history | Implementation logs in [history/](history/) |
| Find keyboard shortcuts | [Keyboard Shortcuts Reference](components/keyboard-shortcuts-reference.md) |

### By Role

**For End Users:**
- [User Guide](guides/user-guide.md)
- [Keyboard Shortcuts Reference](components/keyboard-shortcuts-reference.md)

**For Developers:**
- [Installation Guide](guides/installation.md)
- [Backend API Reference](api/backend-api-reference.md)
- [Frontend Integration](api/frontend-integration.md)
- [Development Plan](architecture/development-plan.md)
- [Testing Guides](testing/)
- [Component Documentation](components/)

**For DevOps/System Administrators:**
- [Deployment Guide](guides/deployment.md)
- [Installation Guide](guides/installation.md)

**For AI Code Assistants:**
- [AI Assistant Guide](AI_ASSISTANT_GUIDE.md)
- This index

---

## 📝 Documentation Conventions

### File Naming
- `kebab-case-names.md` for all documentation files
- Descriptive names indicating content purpose
- No STEP numbers in current documentation (moved to history)

### Organization Principles
1. **Current vs. Historical**: Active documentation in topic directories; implementation logs in `history/`
2. **Co-location**: Component-specific docs stay with source code
3. **Centralization**: Cross-cutting concerns (API, architecture) in `docs/`
4. **No Test Results**: Only testing strategies/guides; no test results or fixes

### Document Types
- **Guides**: How-to documentation for users and developers
- **References**: Complete API and technical specifications
- **Architecture**: Design decisions and system structure
- **History**: Chronological implementation logs (archived)
- **Component Docs**: Specific component usage and implementation

---

## 🤖 For AI Code Assistants

**See [AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md) for comprehensive guidance on navigating this documentation.**

Quick tips:
- Start with this INDEX for overview
- Use `docs/api/` for backend integration questions
- Check `docs/architecture/` for design decisions
- See component READMEs for UI component details
- Ignore `history/` unless researching past decisions

---

*Last Updated: January 6, 2026*
