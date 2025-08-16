"use client";

import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
     Upload,
     FolderPlus,
     Star,
     Files,
     Folder,
     HardDrive,
     Clock,
     TrendingUp,
} from "lucide-react";

export default function Dashboard() {
     const { username } = useAppStore((state) => ({
          username: state.user?.username,
     }));

     const getGreeting = () => {
          const hour = new Date().getHours();
          if (hour < 12) return "Good morning";
          if (hour < 18) return "Good afternoon";
          return "Good evening";
     };

     return (
          <div className="p-6 space-y-6">
               {/* Welcome Section */}
               <div className="space-y-4">
                    <div>
                         <h1 className="text-2xl font-bold text-gray-900">
                              {getGreeting()}, {username}!
                         </h1>
                         <p className="text-gray-600">Welcome back to Stashcord</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3">
                         <Button className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Upload Files
                         </Button>
                         <Button variant="outline" className="flex items-center gap-2">
                              <FolderPlus className="h-4 w-4" />
                              New Folder
                         </Button>
                         <Button variant="outline" className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              View Starred
                         </Button>
                    </div>
               </div>

               {/* Getting Started */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Storage Overview */}
                    <Card className="p-6">
                         <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                   <HardDrive className="h-5 w-5 text-blue-600" />
                                   <h3 className="font-semibold text-gray-900">Storage</h3>
                              </div>
                              <div className="space-y-2">
                                   <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">0 GB used</span>
                                        <span className="text-gray-600">15 GB total</span>
                                   </div>
                                   <Progress value={0} className="h-2" />
                                   <p className="text-xs text-gray-500">Your storage is ready to use</p>
                              </div>
                         </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="p-6">
                         <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                   <TrendingUp className="h-5 w-5 text-green-600" />
                                   <h3 className="font-semibold text-gray-900">Your Stash</h3>
                              </div>
                              <div className="space-y-3">
                                   <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                             <Files className="h-4 w-4 text-gray-500" />
                                             <span className="text-sm text-gray-600">Files</span>
                                        </div>
                                        <span className="font-medium text-gray-900">0</span>
                                   </div>
                                   <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                             <Folder className="h-4 w-4 text-gray-500" />
                                             <span className="text-sm text-gray-600">Folders</span>
                                        </div>
                                        <span className="font-medium text-gray-900">0</span>
                                   </div>
                                   <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                             <Star className="h-4 w-4 text-gray-500" />
                                             <span className="text-sm text-gray-600">Starred</span>
                                        </div>
                                        <span className="font-medium text-gray-900">0</span>
                                   </div>
                              </div>
                         </div>
                    </Card>
               </div>

               {/* Getting Started Guide */}
               <Card className="p-6">
                    <div className="space-y-4">
                         <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-purple-600" />
                              <h3 className="font-semibold text-gray-900">Get Started</h3>
                         </div>
                         <div className="space-y-4">
                              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                                   <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-blue-600">1</span>
                                   </div>
                                   <div>
                                        <h4 className="font-medium text-gray-900">Upload your first files</h4>
                                        {/* eslint-disable-next-line react/no-unescaped-entities */}
                                        <p className="text-sm text-gray-600">Click 'Upload Files' to start building your stash</p>
                                   </div>
                              </div>
                              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                                   <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-blue-600">2</span>
                                   </div>
                                   <div>
                                        <h4 className="font-medium text-gray-900">Organize with folders</h4>
                                        <p className="text-sm text-gray-600">Create folders to keep your files organized by type or project</p>
                                   </div>
                              </div>
                              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                                   <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-blue-600">3</span>
                                   </div>
                                   <div>
                                        <h4 className="font-medium text-gray-900">Explore your stash</h4>
                                        <p className="text-sm text-gray-600">Visit the Stash page to browse your files in different views</p>
                                   </div>
                              </div>
                         </div>
                    </div>
               </Card>
          </div>
     );
}