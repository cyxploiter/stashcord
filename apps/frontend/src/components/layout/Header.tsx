"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, LogOut, User, Activity, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import TransferModal from "@/components/TransferModal";

export default function Header() {
  const { user, logout } = useAuth();
  const { transfers, isConnected } = useWebSocket();
  const [showTransferModal, setShowTransferModal] = useState(false);

  const activeTransfersCount = transfers.filter(t => 
    t.status === "in_progress" || t.status === "pending"
  ).length;

  return (
    <header className="border-b border-gray-200 bg-white px-8 py-4 flex justify-between items-center shadow-sm">
      {/* Left Side - Logo */}
      <div className="flex items-center">
        {/* Stashcord Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
          </div>
          <span className="text-lg font-semibold text-gray-900">Stashcord</span>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-4">
        {/* Transfer Activity Button */}
        {user && (
          <button
            onClick={() => setShowTransferModal(true)}
            className="relative flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
          >
            <Activity className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Transfers</span>
            {activeTransfersCount > 0 && (
              <Badge variant="default" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {activeTransfersCount}
              </Badge>
            )}
          </button>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                {user.avatar && (
                  <Image
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-gray-200"
                    unoptimized
                  />
                )}
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} variant="destructive">
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />
    </header>
  );
}
