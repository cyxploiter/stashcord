"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  Folder,
  Share2,
  Star,
  Trash2,
  HardDrive,
} from "lucide-react";

interface SidebarProps {
  selectedView?: string;
  onSelectView?: (view: string) => void;
}

const sidebarItems = [
  { id: "home", label: "Home", icon: Home, route: "/" },
  { id: "files", label: "Stash", icon: Folder, route: "/stash" },
  { id: "shared", label: "Shared", icon: Share2, route: "/shared" },
  { id: "starred", label: "Starred", icon: Star, route: "/starred" },
  { id: "trash", label: "Trash", icon: Trash2, route: "/trash" },
];

export default function Sidebar({ selectedView = "home", onSelectView }: SidebarProps) {
  const router = useRouter();

  const handleItemClick = (item: typeof sidebarItems[0]) => {
    // Navigate to the route
    router.push(item.route);
    
    // Also call the callback if provided (for backward compatibility)
    if (onSelectView) {
      onSelectView(item.id);
    }
  };

  const handleUpgradeStorage = () => {
    // TODO: Implement upgrade storage functionality
    console.log("Upgrade storage");
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Navigation Items */}
      <div className="flex-1 p-2 pt-4">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Upgrade Storage */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleUpgradeStorage}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-50 text-gray-700"
        >
          <HardDrive className="h-5 w-5" />
          <span className="text-sm">Upgrade Storage</span>
        </button>
      </div>
    </div>
  );
}
