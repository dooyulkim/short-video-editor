# CLAUDE.md - Coding Guidelines

## Project Overview
Short video editor with React/TypeScript frontend and Python/FastAPI backend.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Python, FastAPI, FFmpeg
- **Testing**: Vitest (frontend), Pytest (backend)

## Code Style

### TypeScript/React
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use explicit types, avoid `any`
- Name components in PascalCase, hooks with `use` prefix
- Keep components small and focused

### Python
- Follow PEP 8
- Use type hints
- Async functions for I/O operations
- Services handle business logic, routers handle HTTP

## Project Structure
```
frontend/src/
  components/   # React components by feature
  hooks/        # Custom hooks
  stores/       # State management
  types/        # TypeScript types

backend/
  routers/      # API endpoints
  services/     # Business logic
  models/       # Data models
  tests/        # Pytest tests
```

## Commands
```bash
# Frontend
cd frontend && npm run dev      # Start dev server
cd frontend && npm run test     # Run tests

# Backend
cd backend && uvicorn main:app --reload  # Start API
cd backend && pytest            # Run tests
```

## Best Practices
- Write tests for new features
- Handle errors gracefully with user feedback
- Use existing UI components from shadcn/ui
- Keep API responses consistent
- Document complex logic with comments

## Clean Code Patterns

### Early Return (Guard Clauses)
```typescript
// ❌ Avoid nested conditionals
function process(data) {
  if (data) {
    if (data.isValid) {
      // do work
    }
  }
}

// ✅ Use early returns
function process(data) {
  if (!data) return;
  if (!data.isValid) return;
  // do work
}
```

### Avoid Deep Nesting
- Max 2-3 levels of nesting
- Extract complex logic into helper functions
- Use early returns to reduce indentation

### Single Responsibility
- One function = one task
- If a function needs "and" to describe it, split it

### Naming Conventions
- Functions: verb + noun (`getUserData`, `calculateTotal`)
- Booleans: `is`, `has`, `can` prefix (`isLoading`, `hasError`)
- Constants: UPPER_SNAKE_CASE

### Avoid Magic Numbers
```typescript
// ❌ Bad
if (status === 3) { }

// ✅ Good
const STATUS_COMPLETE = 3;
if (status === STATUS_COMPLETE) { }
```

### Prefer Declarative Over Imperative
```typescript
// ❌ Imperative
const results = [];
for (const item of items) {
  if (item.active) results.push(item.name);
}

// ✅ Declarative
const results = items.filter(i => i.active).map(i => i.name);
```

### Error Handling
- Fail fast, fail loud
- Provide meaningful error messages
- Use try/catch at appropriate boundaries

## SOLID Principles

### S - Single Responsibility
Each class/module should have only one reason to change.
```typescript
// ❌ Bad: Component does too much
function VideoPlayer({ video }) {
  // handles playback, analytics, comments, sharing...
}

// ✅ Good: Separate concerns
function VideoPlayer({ video }) { /* only playback */ }
function VideoAnalytics({ video }) { /* only tracking */ }
```

### O - Open/Closed
Open for extension, closed for modification.
```typescript
// ❌ Bad: Must modify function for new types
function getIcon(type) {
  if (type === 'video') return <VideoIcon />;
  if (type === 'audio') return <AudioIcon />;
  // must edit here for new types
}

// ✅ Good: Extend via configuration
const iconMap = { video: VideoIcon, audio: AudioIcon };
function getIcon(type) {
  const Icon = iconMap[type];
  return Icon ? <Icon /> : null;
}
```

### L - Liskov Substitution
Subtypes must be substitutable for their base types.
```typescript
// Child classes should work anywhere parent is expected
// Don't override methods in ways that break expectations
```

### I - Interface Segregation
Don't force clients to depend on interfaces they don't use.
```typescript
// ❌ Bad: One massive interface
interface MediaHandler {
  play(); pause(); upload(); download(); transcode(); // etc
}

// ✅ Good: Smaller, focused interfaces
interface Playable { play(); pause(); }
interface Uploadable { upload(); }
interface Downloadable { download(); }
```

### D - Dependency Inversion
Depend on abstractions, not concrete implementations.
```typescript
// ❌ Bad: Direct dependency
class VideoService {
  private storage = new LocalStorage(); // tightly coupled
}

// ✅ Good: Inject dependency
class VideoService {
  constructor(private storage: IStorage) {} // accepts any storage
}
```
