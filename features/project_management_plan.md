## Features

### Backend-Managed Projects with OAuth Accounts

A step-by-step development plan to implement backend-managed projects with OAuth authentication, MySQL persistence, and project CRUD APIs, replacing localStorage and file-based project management. Each step includes a Copilot-ready prompt for implementation.

#### Steps

1. **Backend Project Setup**
   - Initialize FastAPI backend with CORS, JWT/session support, and MySQL connection.
   - **Prompt:**  
     "Create a FastAPI backend with CORS middleware, JWT/session authentication, and SQLAlchemy MySQL connection. Set up folder structure: routers/, services/, models/, utils/. Add requirements.txt with FastAPI, SQLAlchemy, databases, python-jose, passlib, and OAuth dependencies."

2. **Database Schema & Migrations**
   - Define SQLAlchemy models for `users` and `projects` tables per PRD schema.
   - **Prompt:**  
     "Create SQLAlchemy models for users (id, provider, provider_user_id, email, display_name, created_at, updated_at) and projects (id, user_id, name, payload_json, version, created_at, updated_at, deleted_at). Add Alembic migration scripts for initial schema."

3. **OAuth Authentication (Google/Facebook)**
   - Implement OAuth login flows, user creation, and JWT/session issuance.
   - **Prompt:**  
     "Implement OAuth login endpoints for Google and Facebook: POST /auth/{provider}/start, GET /auth/{provider}/callback. On first login, create user record. Issue JWT/session for API calls. Add /auth/logout endpoint. Use python-social-auth or authlib."

4. **Auth Middleware & Access Control**
   - Add middleware to enforce authentication and ownership on all project endpoints.
   - **Prompt:**  
     "Add FastAPI dependency/middleware to require valid JWT/session for all /projects endpoints. Enforce that users can only access their own projects (403/404 for non-owners)."

5. **Project CRUD API Endpoints**
   - Implement RESTful endpoints for project create, read, update, delete, and list.
   - **Prompt:**  
     "Create FastAPI router for /projects with endpoints:
     - GET /projects (paginated, ordered by updatedAt desc)
     - POST /projects (create project, return id, createdAt, updatedAt, version)
     - GET /projects/{project_id} (return project if owner)
     - PUT /projects/{project_id} (update payload/metadata, bump version)
     - DELETE /projects/{project_id} (soft-delete, set deleted_at, exclude from list)"

6. **Project Import/Export Endpoints**
   - Add endpoints for importing/exporting project JSON.
   - **Prompt:**  
     "Add endpoints:
     - POST /projects/{project_id}/import (accept JSON, validate schema, update project)
     - GET /projects/{project_id}/export (return project JSON for backup/share).  
       Validate input and return clear errors for invalid schema."

7. **Frontend Auth Integration**
   - Replace localStorage auth with OAuth login UI and token/session management.
   - **Prompt:**  
     "Implement OAuth login UI for Google/Facebook. On login, store JWT/session. Add logout button. Show empty project list after login. Use axios for API calls with token."

8. **Frontend Project CRUD Integration**
   - Replace localStorage project logic with backend API calls for all project actions.
   - **Prompt:**  
     "Replace all localStorage and file download project logic with API calls:
     - List projects from GET /projects
     - Create/save via POST/PUT /projects
     - Load via GET /projects/{project_id}
     - Delete via DELETE /projects/{project_id}
     - Import/export via new endpoints.  
       Show unsaved changes indicator and warn on refresh if not saved."

9. **Recent Projects & Unsaved Edits Handling**
   - Use backend for recent projects; implement unsaved changes warning.
   - **Prompt:**  
     "Remove localStorage for recent projects. Use backend /projects list for recents. Add UI indicator for unsaved changes. Warn user before refresh/navigation if edits are not saved."

10. **Testing & QA**
    - Add backend and frontend tests for auth, project CRUD, and access control.
    - **Prompt:**  
      "Write Pytest tests for OAuth, user creation, project CRUD, and access control (owner-only). Add frontend tests for login, project list, create, update, delete, import/export, and unsaved changes warning."

#### Further Considerations

1. **Token Strategy:**
   - JWT vs server session? Recommend JWT for stateless APIs; refresh tokens for long-lived sessions.
2. **Soft-delete vs Hard-delete:**
   - Soft-delete (deleted_at) is preferred for recovery; hard-delete can be added as admin-only.
3. **Legacy Project Import:**
   - Manual import via JSON upload; optionally prompt users to import on first login.
