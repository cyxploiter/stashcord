"use client";

import { ChevronRight, Home } from "lucide-react";

interface Breadcrumb {
  id: number;
  name: string;
}

interface BreadcrumbsProps {
  path: Breadcrumb[];
  onNavigate: (folderId: number | null) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <button onClick={() => onNavigate(null)} className="hover:text-primary transition-colors">
        <Home className="w-4 h-4" />
      </button>
      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-1" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`hover:text-primary transition-colors ${
              index === path.length - 1 ? "text-foreground font-medium" : ""
            }`}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
