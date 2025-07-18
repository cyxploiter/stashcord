# Plan: Public Shareable Links

This feature will enable users to generate a unique URL for a file that can be shared publicly, with optional security features like password protection and expiration dates.

## Workflow

```mermaid
graph TD
    subgraph "User Action"
        A["User selects a file"] --> B{"Clicks &quot;Get public link&quot;"}
        B --> C["Public Link Dialog Opens"]
        C --> D{"Sets options (password, expiry)"}
        D --> E["Clicks &quot;Generate Link&quot;"]
    end

    subgraph "Backend Process"
        E --> F["API Request: POST /api/files/:id/share"]
        F --> G["Backend generates unique share ID"]
        G --> H["Saves share details to new `public_shares` table"]
    end

    subgraph "Guest Access"
        I["User gets public URL: /share/unique-id"] --> J["Guest visits URL"]
        J --> K["Public page fetches share details"]
        K --> L{"Prompts for password if needed"}
        L --> M["Guest clicks &quot;Download&quot;"]
        M --> N["Backend streams file to guest"]
    end
```

## Proposed Task Breakdown

-   [ ] **Database:** Add a `public_shares` table to the schema to store share links, passwords, and expiration dates.
-   [ ] **Backend:** Create an API endpoint to generate and manage public links.
-   [ ] **Backend:** Create a public, unauthenticated endpoint for downloading shared files.
-   [ ] **Frontend:** Design and build a "Get Public Link" dialog component.
-   [ ] **Frontend:** Create a new public-facing page (`/share/[shareId]`) to display the shared file information and download button.