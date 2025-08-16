"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from '@/store';
import {
     FileIcon,
     DownloadIcon,
     UploadIcon,
     TrashIcon,
     ShareIcon,
     EyeIcon,
     ClockIcon,
     Activity,
} from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/utils";

interface TransferModalProps {
     isOpen: boolean;
     onClose: () => void;
}

function formatTimeAgo(date: Date | string | number): string {
     const now = new Date();
     const dateObj = date instanceof Date ? date : new Date(date);

     if (isNaN(dateObj.getTime())) {
          return "Unknown";
     }

     const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

     if (seconds < 60) return "Just now";
     if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
     if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
     return `${Math.floor(seconds / 86400)}d ago`;
}

function getTransferIcon(type: string, className = "w-4 h-4") {
     switch (type) {
          case "upload": return <UploadIcon className={className} />;
          case "download": return <DownloadIcon className={className} />;
          case "delete": return <TrashIcon className={className} />;
          case "share_create": return <ShareIcon className={className} />;
          case "share_access": return <EyeIcon className={className} />;
          default: return <FileIcon className={className} />;
     }
}

function getStatusColor(status: string): string {
     switch (status) {
          case "completed": return "text-emerald-500";
          case "failed": return "text-red-500";
          case "in_progress": return "text-blue-500";
          case "pending": return "text-amber-500";
          case "cancelled": return "text-gray-500";
          default: return "text-gray-400";
     }
}

function getStatusDot(status: string): string {
     switch (status) {
          case "completed": return "bg-emerald-500";
          case "failed": return "bg-red-500";
          case "in_progress": return "bg-blue-500";
          case "pending": return "bg-amber-500";
          case "cancelled": return "bg-gray-500";
          default: return "bg-gray-400";
     }
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
     const {
          transfers,
          isConnected,
     } = useAppStore((state) => ({
          transfers: state.transfers,
          isConnected: state.isConnected,
     }));

     const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

     const activeTransfers = transfers.filter(transfer =>
          transfer.status === "in_progress" || transfer.status === "pending"
     );

     const completedTransfers = transfers.filter(transfer =>
          transfer.status === "completed" || transfer.status === "failed" || transfer.status === "cancelled"
     );

     return (
          <Dialog open={isOpen} onOpenChange={onClose}>
               <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-gray-100">
                         <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                   <Activity className="w-5 h-5 text-blue-600" />
                              </div>
                              Transfer Activity
                         </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                         {/* Connection Status - Minimalist */}
                         <div className="flex items-center gap-2 mb-6">
                              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-gray-600">
                                   {isConnected ? 'Live' : 'Offline'}
                              </span>
                              <div className="flex-1" />
                              <div className="text-sm text-gray-500">
                                   {activeTransfers.length} active • {completedTransfers.length} completed
                              </div>
                         </div>

                         {/* Minimalist Tabs */}
                         <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
                              <button
                                   onClick={() => setActiveTab("active")}
                                   className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "active"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                              >
                                   Active ({activeTransfers.length})
                              </button>
                              <button
                                   onClick={() => setActiveTab("completed")}
                                   className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "completed"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                              >
                                   History ({completedTransfers.length})
                              </button>
                         </div>

                         {/* Transfer Lists - Minimalist Design */}
                         <div className="flex-1 overflow-y-auto">
                              {activeTab === "active" && (
                                   <div className="space-y-3">
                                        {activeTransfers.length === 0 ? (
                                             <div className="text-center py-12">
                                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                       <Activity className="w-8 h-8 text-gray-400" />
                                                  </div>
                                                  <h3 className="text-lg font-medium text-gray-900 mb-2">All clear</h3>
                                                  <p className="text-gray-500">No active transfers at the moment</p>
                                             </div>
                                        ) : (
                                             activeTransfers.map((transfer, index) => (
                                                  <div key={`active-${transfer.transferId}-${transfer.createdAt}-${index}`} className="group p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200">
                                                       <div className="flex items-start gap-4">
                                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                                                                 {getTransferIcon(transfer.type)}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                 <div className="flex items-center gap-2 mb-2">
                                                                      <h4 className="font-medium text-gray-900 truncate">
                                                                           {transfer.fileName}
                                                                      </h4>
                                                                      <div className={`w-2 h-2 rounded-full ${getStatusDot(transfer.status)} ${transfer.status === "in_progress" ? "animate-pulse" : ""
                                                                           }`} />
                                                                 </div>

                                                                 <div className="text-sm text-gray-500 mb-3">
                                                                      {formatBytes(transfer.fileSize || 0)} • {formatTimeAgo(transfer.createdAt)}
                                                                 </div>

                                                                 {/* Minimalist Progress Bar */}
                                                                 <div className="space-y-2">
                                                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                                                           <span>
                                                                                {formatBytes(transfer.bytesTransferred || 0)} transferred
                                                                           </span>
                                                                           <span className="font-medium">{transfer.progressPercentage || 0}%</span>
                                                                      </div>
                                                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                           <div
                                                                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                                                                style={{ width: `${transfer.progressPercentage || 0}%` }}
                                                                           />
                                                                      </div>
                                                                 </div>

                                                                 {transfer.errorMessage && (
                                                                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                                                           <p className="text-sm text-red-700">{transfer.errorMessage}</p>
                                                                      </div>
                                                                 )}
                                                            </div>

                                                            <div className="flex items-center">
                                                                 <span className={`text-sm font-medium capitalize ${getStatusColor(transfer.status)}`}>
                                                                      {transfer.status.replace('_', ' ')}
                                                                 </span>
                                                            </div>
                                                       </div>
                                                  </div>
                                             ))
                                        )}
                                   </div>
                              )}

                              {activeTab === "completed" && (
                                   <div className="space-y-2">
                                        {completedTransfers.length === 0 ? (
                                             <div className="text-center py-12">
                                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                       <ClockIcon className="w-8 h-8 text-gray-400" />
                                                  </div>
                                                  <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
                                                  <p className="text-gray-500">Transfer history will appear here</p>
                                             </div>
                                        ) : (
                                             completedTransfers.slice(0, 50).map((transfer, index) => (
                                                  <div key={`completed-${transfer.transferId}-${transfer.updatedAt}-${index}`} className="group p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                                       <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-gray-50 rounded-md">
                                                                 {getTransferIcon(transfer.type, "w-3.5 h-3.5")}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                 <div className="flex items-center gap-2 mb-1">
                                                                      <h4 className="font-medium text-gray-900 truncate text-sm">
                                                                           {transfer.fileName}
                                                                      </h4>
                                                                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(transfer.status)}`} />
                                                                 </div>

                                                                 <div className="text-xs text-gray-500">
                                                                      {formatBytes(transfer.fileSize || 0)} • {formatTimeAgo(transfer.updatedAt)}
                                                                      {transfer.status === "completed" && (
                                                                           <span className="ml-2">
                                                                                • {formatDuration(
                                                                                     new Date(transfer.updatedAt).getTime() - new Date(transfer.createdAt).getTime()
                                                                                )}
                                                                           </span>
                                                                      )}
                                                                 </div>
                                                            </div>

                                                            <div className="flex items-center">
                                                                 <span className={`text-xs font-medium capitalize ${getStatusColor(transfer.status)}`}>
                                                                      {transfer.status === "completed" ? "✓" : transfer.status === "failed" ? "✗" : "⋯"}
                                                                 </span>
                                                            </div>
                                                       </div>

                                                       {transfer.errorMessage && (
                                                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600">
                                                                 {transfer.errorMessage}
                                                            </div>
                                                       )}
                                                  </div>
                                             ))
                                        )}
                                   </div>
                              )}
                         </div>
                    </div>
               </DialogContent>
          </Dialog>
     );
}