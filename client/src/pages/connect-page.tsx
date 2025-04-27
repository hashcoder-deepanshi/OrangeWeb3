import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/app-layout";
import UserAvatar from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Search, MessageSquare, UserPlus, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { User, Connection } from "@shared/schema";

export default function ConnectPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");

  // Fetch users to connect with
  const {
    data: usersToConnect = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["/api/users/connect", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/users/connect?limit=50&search=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch user connections
  const {
    data: connections = [],
    isLoading: isLoadingConnections,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: async () => {
      const response = await fetch("/api/connections", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch connections");
      return response.json();
    },
  });

  // Create connection request mutation
  const connectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectedToId: userId }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send connection request");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection request sent",
        description: "The user will be notified of your request",
      });
      refetchUsers();
      refetchConnections();
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update connection status mutation
  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update connection");
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "accepted" ? "Connection accepted" : "Connection rejected",
        description: variables.status === "accepted" 
          ? "You are now connected with this user" 
          : "The connection request has been rejected",
      });
      refetchConnections();
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users based on search query
  const filteredUsersToConnect = searchQuery
    ? usersToConnect.filter(
        (u: User) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : usersToConnect;

  // Get connections by status
  const pendingConnections = connections.filter(
    (c: Connection) => c.status === "pending" && c.connectedToId === user?.id
  );
  
  const acceptedConnections = connections.filter(
    (c: Connection) => c.status === "accepted"
  ).map((c: Connection) => ({
    ...c,
    otherUserId: c.userId === user?.id ? c.connectedToId : c.userId,
  }));

  // Fetch all connection users data at once
  const { data: connectionUsers = {} } = useQuery({
    queryKey: ['/api/connection-users', connections],
    queryFn: async () => {
      // Get unique user IDs from connections
      const userIdsSet = new Set<number>();
      
      connections.forEach((connection: Connection) => {
        const otherUserId = connection.userId === user?.id ? connection.connectedToId : connection.userId;
        if (otherUserId) userIdsSet.add(otherUserId);
      });
      
      // Add pending connection user IDs
      pendingConnections.forEach((connection: Connection) => {
        if (connection.userId) userIdsSet.add(connection.userId);
      });
      
      const userIds = Array.from(userIdsSet);
      
      if (userIds.length === 0) return {};
      
      // Create an object to store user data by ID
      const users: Record<number, any> = {};
      
      // Fetch user data for each ID
      await Promise.all(
        userIds.map(async (userId: number) => {
          try {
            const response = await fetch(`/api/users/${userId}`, {
              credentials: "include",
            });
            if (response.ok) {
              const userData = await response.json();
              users[userId] = userData;
            }
          } catch (error) {
            console.error(`Failed to fetch user ${userId}`, error);
          }
        })
      );
      
      return users;
    },
    enabled: connections.length > 0,
  });

  const handleConnect = (userId: number) => {
    connectMutation.mutate(userId);
  };

  const handleConnectionAction = (id: number, status: "accepted" | "rejected") => {
    updateConnectionMutation.mutate({ id, status });
  };

  return (
    <AppLayout header={<h2 className="text-xl font-bold">Connect</h2>}>
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 relative">
            Pending
            {pendingConnections.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {pendingConnections.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex-1">Connections</TabsTrigger>
        </TabsList>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Discover Tab */}
        <TabsContent value="discover" className="mt-0">
          {isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsersToConnect.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found to connect with.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsersToConnect.map((userToConnect: User, index: number) => (
                <motion.div
                  key={userToConnect.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <UserAvatar user={userToConnect} />
                          <div>
                            <h3 className="font-medium">
                              {userToConnect.displayName || userToConnect.username}
                            </h3>
                            <p className="text-xs text-muted-foreground">@{userToConnect.username}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleConnect(userToConnect.id)}
                          disabled={connectMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                          Connect
                        </Button>
                      </div>
                      {userToConnect.bio && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {userToConnect.bio}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="mt-0">
          {isLoadingConnections ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingConnections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pending connection requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingConnections.map((connection: Connection) => {
                const requestUser = connectionUsers[connection.userId];
                const isLoadingRequestUser = !requestUser;

                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        {isLoadingRequestUser ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <UserAvatar user={requestUser} />
                              <div>
                                <h3 className="font-medium">
                                  {requestUser?.displayName || requestUser?.username}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Wants to connect with you
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 text-green-500"
                                onClick={() => handleConnectionAction(connection.id, "accepted")}
                                disabled={updateConnectionMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 text-destructive"
                                onClick={() => handleConnectionAction(connection.id, "rejected")}
                                disabled={updateConnectionMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="mt-0">
          {isLoadingConnections ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : acceptedConnections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have any connections yet.</p>
              <Button 
                variant="link" 
                onClick={() => setActiveTab("discover")}
                className="mt-2"
              >
                Discover users
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedConnections.map((connection: any, index: number) => {
                const connectionUser = connectionUsers[connection.otherUserId];
                const isLoadingConnectionUser = !connectionUser;

                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        {isLoadingConnectionUser ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <UserAvatar user={connectionUser} />
                              <div>
                                <h3 className="font-medium">
                                  {connectionUser?.displayName || connectionUser?.username}
                                </h3>
                                <p className="text-xs text-muted-foreground">@{connectionUser?.username}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={() => window.location.href = `/chat/${connectionUser.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Message
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
