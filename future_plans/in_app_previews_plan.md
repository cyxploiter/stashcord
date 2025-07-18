# Plan: In-App File Previews

This feature will allow users to preview common file types (images, videos, PDFs, plain text) directly within the Stashcord UI instead of forcing a download.

## Workflow

```mermaid
graph TD
    A[User clicks on a file] --> B{Determine File Type};
    B --> |Image| C[Open Image Preview Modal];
    B --> |Video| D[Open Video Player Modal];
    B --> |PDF| E[Open PDF Viewer Modal];
    B --> |Text/Code| F[Open Text Viewer Modal];
    B --> |Unsupported| G[Initiate Standard Download];

    subgraph "Backend Support"
        H[GET /api/files/:id/preview] --> I{Stream file content with correct Content-Type};
        I --> J[No 'Content-Disposition: attachment' header];
    end

    C --> H;
    D --> H;
    E --> H;
    F --> H;
```

## Proposed Task Breakdown

-   [ ] **Backend:** Create a new API endpoint (`/api/files/:id/preview`) that streams file content with the appropriate `Content-Type` header for in-browser viewing.
-   [ ] **Frontend:** Develop a universal "Preview" modal component.
-   [ ] **Frontend:** Implement specific preview handlers within the modal for different file types (e.g., an `<img>` tag for images, a `<video>` player for videos).
-   [ ] **Frontend:** Integrate a PDF rendering library (like `react-pdf`) for PDF previews.
-   [ ] **Frontend:** Update the `FileCard` component's click action to open the preview modal instead of downloading directly.