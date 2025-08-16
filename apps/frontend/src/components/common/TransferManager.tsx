"use client";

import { useState, useEffect } from "react";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store";
import { TransferStatus } from "@/store/transferSlice";

export default function TransferManager() {
     const { transfers, removeTransfer, clearCompleted } = useAppStore();
     const [isExpanded, setIsExpanded] = useState(false);

     // Get active transfers
     const activeTransfers = transfers.filter(t => t.status === 'uploading').length;
     const completedTransfers = transfers.filter(t => t.status === 'completed');

     // Auto-close completed transfers
     useEffect(() => {
          if (completedTransfers.length > 0) {
               const timer = setTimeout(() => {
                    clearCompleted();
               }, 5000); // Remove completed transfers after 5 seconds

               return () => clearTimeout(timer);
          }
     }, [completedTransfers.length, clearCompleted]);

     const getStatusIcon = (status: TransferStatus) => {
          switch (status) {
               case "completed":
                    return <CheckCircle className="h-4 w-4 text-green-500" />;
               case "failed":
                    return <AlertCircle className="h-4 w-4 text-red-500" />;
               case "uploading":
                    return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
               default:
                    return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
          }
     };

     // Don't render if no transfers
     if (transfers.length === 0) return null;

     const hasActiveTransfers = transfers.some(t => t.status === 'uploading');

     return (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg min-w-80 max-w-96 z-50">
               {/* Header */}
               <div
                    className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
               >
                    <div className="flex items-center gap-2">
                         <div className="text-sm font-medium">
                              Transfers ({transfers.length})
                         </div>
                         {hasActiveTransfers && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                         )}
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="text-xs text-gray-500">
                              {activeTransfers} active
                         </div>
                         <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                   e.stopPropagation();
                                   setIsExpanded(!isExpanded);
                              }}
                              className="h-6 w-6 p-0"
                         >
                              <X className="h-4 w-4" />
                         </Button>
                    </div>
               </div>

               {/* Transfer List */}
               {isExpanded && (
                    <div className="max-h-80 overflow-y-auto">
                         {transfers.map((transfer) => (
                              <div key={transfer.id} className="p-4 border-b border-gray-100 last:border-b-0">
                                   <div className="flex items-center gap-3 mb-2">
                                        <Upload className="h-4 w-4 text-blue-500 flex-shrink-0" />

                                        <div className="flex-1 min-w-0">
                                             <div className="text-sm font-medium truncate">
                                                  {transfer.file.name}
                                             </div>
                                             <div className="text-xs text-gray-500">
                                                  {transfer.status}
                                             </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                             {getStatusIcon(transfer.status)}
                                             <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => removeTransfer(transfer.id)}
                                                  className="h-6 w-6 p-0"
                                             >
                                                  <X className="h-3 w-3" />
                                             </Button>
                                        </div>
                                   </div>

                                   {/* Progress Bar */}
                                   {transfer.status === 'uploading' && (
                                        <div className="space-y-1">
                                             <Progress value={transfer.progress} className="h-2" />
                                             <div className="flex justify-between text-xs text-gray-500">
                                                  <span>{Math.round(transfer.progress)}%</span>
                                             </div>
                                        </div>
                                   )}
                              </div>
                         ))}
                    </div>
               )}
          </div>
     );
}
