"use client";

import { useQuery } from "@tanstack/react-query";
import { setupApi } from "api";
import { Button } from "@/components/ui/button";
import {
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
     DialogDescription,
} from "@/components/ui/dialog";
import { Guild } from "api";
import Image from "next/image";

interface ServerSelectionModalProps {
     isOpen: boolean;
     onClose: () => void;
     onSelectServer: (guild: Guild) => void;
}

export function ServerSelectionModal({
     isOpen,
     onClose,
     onSelectServer,
}: ServerSelectionModalProps) {
     const { data: guilds, isLoading, error, refetch } = useQuery({
          queryKey: ["guilds"],
          queryFn: setupApi.getGuilds,
     });

     const handleCreateServer = () => {
          window.open("https://discord.com/channels/@me", "_blank");
     };

     return (
          <Dialog open={isOpen} onOpenChange={onClose}>
               <DialogContent>
                    <DialogHeader>
                         <DialogTitle>Select or Create a Server</DialogTitle>
                         <DialogDescription>
                              Choose a server you own to use with Stashcord, or create a new
                              one.
                         </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                         {isLoading && <p>Loading servers...</p>}
                         {error && <p className="text-red-500">Error fetching servers.</p>}
                         {guilds && (
                              <div className="space-y-2">
                                   {guilds.map((guild) => (
                                        <div
                                             key={guild.id}
                                             className="flex items-center justify-between p-2 border rounded-md"
                                        >
                                             <div className="flex items-center space-x-2">
                                                  {guild.icon && (
                                                       <Image
                                                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`}
                                                            alt={guild.name}
                                                            width={32}
                                                            height={32}
                                                            className="w-8 h-8 rounded-full"
                                                       />
                                                  )}
                                                  <span>{guild.name}</span>
                                             </div>
                                             <Button onClick={() => onSelectServer(guild)}>Select</Button>
                                        </div>
                                   ))}
                              </div>
                         )}
                    </div>
                    <div className="mt-6 flex justify-between">
                         <Button variant="outline" onClick={handleCreateServer}>
                              Create Server
                         </Button>
                         <Button onClick={() => refetch()}>Refresh List</Button>
                    </div>
               </DialogContent>
          </Dialog >
     );
}