# Plan: Trash & Recovery System

This feature introduces a "Trash" or "Recycle Bin" to prevent accidental data loss. When a user deletes a file or folder, it is first "soft-deleted" and can be recovered or permanently deleted later.

## Workflow

```mermaid
graph TD
    subgraph "Main View"
        A["User clicks &quot;Delete&quot; on a file"] --> B["API: 'DELETE /api/file/:id'"]
        B --> C{"Backend performs &quot;soft delete&quot;"}
        C --> D["File disappears from main view"]
    end

    subgraph "Trash View"
        E["User navigates to &quot;Trash&quot; page"] --> F["API: 'GET /api/trash'"]
        F --> G["Lists all soft-deleted items"]
        G --> H{"User clicks &quot;Restore&quot;"}
        H --> I["API: 'POST /api/trash/:id/restore'"]
        I --> J["File reappears in main view"]
        
        G --> K{"User clicks &quot;Delete Permanently&quot;"}
        K --> L["API: 'DELETE /api/trash/:id/permanent'"]
        L --> M["Backend deletes Discord thread & DB record"]
    end

    subgraph "Database"
        N["Add 'status' column to 'files' & 'folders' tables"]
        C --> N
        I --> N
        M --> N
    end
```

## Proposed Task Breakdown

-   [ ] **Database:** Add a `status` column (e.g., 'active', 'trashed') to the `files` and `folders` tables.
-   [ ] **Backend:** Modify the existing `DELETE` endpoints to perform a soft delete (i.e., update the status to 'trashed').
-   [ ] **Backend:** Create a new endpoint (`GET /api/trash`) to fetch all items marked as 'trashed'.
-   [ ] **Backend:** Create a new endpoint (`POST /api/trash/:id/restore`) to restore an item.
-   [ ] **Backend:** Create a new endpoint (`DELETE /api/trash/:id/permanent`) for permanent deletion.
-   [ ] **Frontend:** Create a new "Trash" page accessible from the main layout.
-   [ ] **Frontend:** Implement "Restore" and "Delete Permanently" actions in the Trash view.