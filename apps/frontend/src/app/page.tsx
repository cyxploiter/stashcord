"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { Sidebar, Header } from "@/components/layout";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [selectedView, setSelectedView] = useState<string>("home");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const renderContent = () => {
    switch (selectedView) {
      case "home":
        return <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header - spans full width */}
        <Header />
        
        {/* Main content with sidebar and content area */}
        <div className="flex flex-1">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200">
            <Sidebar selectedView={selectedView} onSelectView={handleSelectView} />
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-gray-50">
            {renderContent()}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
