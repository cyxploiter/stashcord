# Stash Refactoring Plan

This document outlines the plan to refactor the Stash feature to align with the original `PROJECT_PLAN.md`.

## 1. Backend Verification

-   [ ] **Review Database Schema**: Ensure `apps/backend/src/db/schema.ts` matches the schema in `PROJECT_PLAN.md`.
-   [ ] **Review API Endpoints**: Verify that the routes in `apps/backend/src/routes/` implement the logic specified in the project plan for folders, files, uploads, and downloads.

## 2. Frontend Refactoring (`apps/frontend/src/app/stash/page.tsx`)

The goal is to simplify the `StashPage` to match the two-panel (Sidebar + Main Content) layout described in the plan.

-   [ ] **Simplify Main Layout**:
    -   Remove the current complex header and navigation controls.
    -   Implement a simple, resizable two-panel layout.
-   [ ] **Refactor Sidebar (`FolderList`)**:
    -   Fetch and display folders from `GET /api/folders`.
    -   Implement the "add folder" functionality with a simple dialog.
-   [ ] **Refactor Main View (`FileList`)**:
    -   When a folder is selected, fetch and display its files from `GET /api/files?folderId=...`.
    -   Use a simple `FileCard` or table row for each file.
    -   Implement download and delete functionality for each file.
-   [ ] **Refactor Uploads**:
    -   Simplify the upload process to a basic "Upload" button that opens a file dialog.
    -   Ensure it uses the `POST /api/upload` endpoint correctly.
    -   Remove the complex drag-and-drop overlay and conflict resolution for now to streamline the core feature.
-   [ ] **State Management**:
    -   Simplify the component's state to only manage the list of folders, the currently selected folder, and the files within that folder.

## 3. Create a TODO List

- [ ] Create a TODO list to keep track of the progress of the plan.