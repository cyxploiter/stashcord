# Plan: Team Workspaces

This feature introduces the concept of "Workspaces," which are shared environments where multiple users can be invited to collaborate on files and folders. This moves Stashcord from a personal storage application to a collaborative platform.

## Workflow

```mermaid
graph TD
    subgraph Workspace Management
        A[User creates a new Workspace] --> B{Invites members by username};
        B --> C[Assigns roles: Admin, Editor, Viewer];
        C --> D[API: POST /api/workspaces];
    end

    subgraph Member Interaction
        E[Invited user accepts] --> F{Sees Workspace in their sidebar};
        F --> G[Can view/edit/upload based on role];
        G --> H[All actions are associated with the Workspace];
    end

    subgraph Data Model
        I[New `workspaces` table] --> J[New `workspace_members` table];
        J --> K[Folders and files are linked to a `workspace_id`];
    end
```

## Proposed Task Breakdown

-   [ ] **Database:** Add `workspaces` and `workspace_members` tables. Modify `folders` and `files` to include a `workspace_id`.
-   [ ] **Backend:** Create API endpoints for creating, managing, and inviting users to workspaces.
-   [ ] **Backend:** Update all existing file/folder endpoints to be workspace-aware and respect member roles.
-   [ ] **Frontend:** Add a workspace switcher to the UI.
-   [ ] **Frontend:** Create a settings page for workspace management (inviting members, changing roles).
-   [ ] **Frontend:** Ensure all file and folder operations happen within the context of the selected workspace.