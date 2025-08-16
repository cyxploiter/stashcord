"use client";

import AuthGuard from "@/components/common/AuthGuard";
import SetupGuard from "@/components/common/SetupGuard";
import { Header } from "@/components/layout";
import { Sidebar } from "@/components/layout";
import StashContainer from "@/components/stash/StashContainer";

export default function StashPage() {
  return (
    <AuthGuard>
      <SetupGuard>
        <div className="min-h-screen bg-background flex flex-col theme-transition">
          {/* Header - spans full width with no border */}
          <Header />

          {/* Main content with sidebar and content area */}
          <div className="flex flex-1">
            {/* Sidebar - invisible border */}
            <div className="w-64">
              <Sidebar selectedView="files" />
            </div>

            {/* Content Area - seamless */}
            <div className="flex-1 bg-background">
              <StashContainer />
            </div>
          </div>
        </div>
      </SetupGuard>
    </AuthGuard>
  );
}
