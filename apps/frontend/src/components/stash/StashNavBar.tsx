"use client";

import {
     ChevronLeft,
     ChevronRight as ChevronRightNav,
     Home,
     List,
     Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ExplorerViewMode = "grid" | "list";

interface StashNavBarProps {
     currentPath: string[];
     explorerViewMode: ExplorerViewMode;
     onNavigateBack: () => void;
     onNavigateForward: () => void;
     onNavigateToPath: (index: number) => void;
     onSetExplorerViewMode: (mode: ExplorerViewMode) => void;
}

export default function StashNavBar({
     currentPath,
     explorerViewMode,
     onNavigateBack,
     onNavigateForward,
     onNavigateToPath,
     onSetExplorerViewMode,
}: StashNavBarProps) {
     return (
          <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between theme-transition">
               <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                         <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={onNavigateBack}
                              disabled={currentPath.length <= 1}
                         >
                              <ChevronLeft className="h-4 w-4" />
                         </Button>
                         <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={onNavigateForward}
                              disabled={true} // Forward is disabled for now
                         >
                              <ChevronRightNav className="h-4 w-4" />
                         </Button>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                         <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-gray-600"
                              onClick={() => onNavigateToPath(0)}
                         >
                              <Home className="h-3 w-3 mr-1" />
                              Stash
                         </Button>
                         {currentPath.slice(1).map((path, index) => (
                              <div key={index} className="flex items-center gap-1">
                                   <span className="text-gray-400">/</span>
                                   <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-gray-600"
                                        onClick={() => onNavigateToPath(index + 1)}
                                   >
                                        {path}
                                   </Button>
                              </div>
                         ))}
                    </div>
               </div>
               <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-md">
                         <Button
                              variant={explorerViewMode === "grid" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => onSetExplorerViewMode("grid")}
                              className="h-7 px-2"
                         >
                              <Grid3X3 className="h-3 w-3" />
                         </Button>
                         <Button
                              variant={explorerViewMode === "list" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => onSetExplorerViewMode("list")}
                              className="h-7 px-2"
                         >
                              <List className="h-3 w-3" />
                         </Button>
                    </div>
               </div>
          </div>
     );
}