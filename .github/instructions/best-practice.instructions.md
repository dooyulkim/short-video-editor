# Copilot Instructions

## Part 1: Copilot Behavior Rules (MUST FOLLOW)

### 1.1 Clarification & Decision Making

When uncertain about requirements or implementation:

1. **Ask clarifying questions** before proceeding with ambiguous requests
2. **Present options** when multiple valid approaches exist, explaining pros/cons of each
3. **Confirm understanding** of complex requirements before implementing
4. **Never assume** - If something is unclear, ask rather than guess
5. **Provide recommendations** with your preferred option, but let the user decide

### 1.2 Testing Requirements

Whenever code is added, modified or removed:

1. **Run existing tests** to ensure no regressions are introduced
2. **Create new tests** for any new functionality or bug fixes
3. **update tests** if the behavior of the code has changed
4. **Critical Note** Ensure all tests pass before considering the modification complete

### 1.3 Documentation Requirements

Whenever code modifications change architecture or functionality:

1. **Create or update relevant documentation** in the `docs/` folder to reflect the changes
2. **Create or update API documentation** if endpoints are added, modified, or removed
3. **Create or update the README** if setup steps, dependencies, or usage instructions change
4. **Create or update CLAUDE.md** if development workflows or project conventions change
5. **Critical Note** Ensure documentation stays in sync with the actual implementation

---

## Part 2: Best Practices for Users

### 2.1 Effective Prompting

1. **Be specific and clear** - Provide detailed context about what you want to achieve
2. **Include relevant file paths** - Reference specific files when asking about modifications
3. **Break down complex tasks** - Split large requests into smaller, manageable steps
4. **Provide examples** - When possible, show expected input/output or code patterns

### 2.2 Maximizing Productivity

1. **Use context effectively** - Keep relevant files open so Copilot has context
2. **Iterate on responses** - Ask follow-up questions to refine solutions
3. **Review generated code** - Always review and understand AI-generated code before committing
4. **Leverage workspace knowledge** - Reference existing patterns in the codebase

### 2.3 Working with This Project

1. **Reference documentation** - Point to docs in `docs/` folder for context
2. **Use existing patterns** - Ask Copilot to follow established code conventions
3. **Request explanations** - Ask for explanations when learning new concepts
4. **Validate with tests** - Always request test coverage for new code

### 2.4 Communication Tips

1. **One task at a time** - Focus on single objectives for better results
2. **Provide feedback** - Indicate what worked and what didn't
3. **Use markdown** - Format requests with code blocks and lists for clarity
4. **Reference errors** - Include full error messages when debugging

---

## Part 3: Project Coding Guidelines

### Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Python, FastAPI, FFmpeg
- Testing: Vitest (frontend), Pytest (backend)

### Code Style

- **TypeScript/React**: Functional components with hooks; prefer `const` over `let`; avoid `any`; PascalCase components; `use` prefix for hooks; keep components small and focused.
- **Python**: Follow PEP 8; use type hints; prefer async for I/O; routers handle HTTP, services handle business logic.

### Commands

```bash
# Frontend
cd frontend && npm run dev      # Start dev server
cd frontend && npm run test     # Run tests

# Backend
cd backend && uvicorn main:app --reload  # Start API
cd backend && pytest            # Run tests
```

### Clean Code Patterns

- **Early return** to avoid deep nesting.
- **Avoid deep nesting**: keep to 2-3 levels; extract helpers.
- **Single responsibility**: one function = one task.
- **Naming**: verb+noun functions; `is/has/can` booleans; UPPER_SNAKE_CASE constants.
- **Avoid magic numbers**: extract descriptive constants.
- **Prefer declarative** over imperative array/object handling.
- **Error handling**: fail fast with meaningful messages; place try/catch at boundaries.

### SOLID Principles

- **Single Responsibility**: one reason to change per module.
- **Open/Closed**: extend via configuration, avoid modifying core logic for new types.
- **Liskov Substitution**: subtypes must work anywhere the base type is expected.
- **Interface Segregation**: keep interfaces small and focused.
- **Dependency Inversion**: depend on abstractions, inject concrete implementations.
