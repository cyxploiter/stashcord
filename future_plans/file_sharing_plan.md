# Plan: Implement File & Folder Sharing

This feature will allow a user to grant read-only or read/write access to their files and folders to other registered Stashcord users.

## Workflow

```mermaid
graph TD
    A["User A selects a file/folder"] --> B{"Clicks &quot;Share&quot; button"};
    B --> C["Share Dialog Opens"];
    C --> D["User A enters User B's username"];
    D --> E{"Selects Permission: View or Edit"};
    E --> F["Clicks &quot;Grant Access&quot;"];
    F --> G["API Request: POST /api/share"];
    G --> H["Backend validates users & ownership"];
    H --> I["Creates new record in file_permissions/folder_permissions"];
    I --> J["User B now sees the shared item in their file view"];
```

## Task Breakdown

-   [ ] **Backend:** Create new API endpoints for sharing.
-   [ ] **Backend:** Update existing endpoints to respect permissions.
-   [ ] **Frontend:** Design and build the "Share" dialog component.
-   [ ] **Frontend:** Integrate the "Share" dialog into file/folder menus.
-   [ ] **Frontend:** Modify the main file view to display shared items.
-   [ ] **Backend:** Implement logic to notify users of new shares.