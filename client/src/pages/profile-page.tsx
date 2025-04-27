import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AppLayout from "@/components/app-layout";
import UserAvatar from "@/components/ui/user-avatar";
import VibeCard from "@/components/ui/vibe-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Edit, UserCheck, UserPlus, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const profileFormSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional().or(z.string().length(0)),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, updateProfileMutation } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("vibes");
  
  // Determine if this is the current user's profile or another user's
  const userId = params.userId ? parseInt(params.userId) : user?.id;
  const isCurrentUser = userId === user?.id;
  
  // Fetch user profile if not current user
  const {
    data: profileUser,
    isLoading: isLoadingProfile,
  } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      if (!userId) return null;
      
      const response = await fetch(`/api/users/${userId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user's vibes
  const {
    data: userVibes = [],
    isLoading: isLoadingVibes,
  } = useQuery({
    queryKey: [`/api/users/${userId}/vibes`],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await fetch(`/api/users/${userId}/vibes`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user vibes");
      }
      
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user connections
  const {
    data: connections = [],
    isLoading: isLoadingConnections,
  } = useQuery({
    queryKey: ["/api/connections", userId, { status: "accepted" }],
    queryFn: async () => {
      const response = await fetch("/api/connections?status=accepted", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch connections");
      }
      
      const allConnections = await response.json();
      // Filter connections where the viewed user is involved
      return allConnections.filter((conn: any) => 
        conn.userId === userId || conn.connectedToId === userId
      );
    },
    enabled: !!userId,
  });
  
  // Check if there's a connection between current user and profile user
  const {
    data: connectionStatus,
    isLoading: isLoadingConnectionStatus,
  } = useQuery({
    queryKey: ["/api/connections", userId],
    queryFn: async () => {
      if (!userId || isCurrentUser) return null;
      
      const response = await fetch("/api/connections", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch connection status");
      }
      
      const connections = await response.json();
      return connections.find(
        (c: any) =>
          (c.userId === user?.id && c.connectedToId === userId) ||
          (c.userId === userId && c.connectedToId === user?.id)
      ) || null;
    },
    enabled: !!userId && !!user && !isCurrentUser,
  });
  
  // Connection mutation
  const connectMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectedToId: targetUserId }),
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
      queryClient.invalidateQueries({ queryKey: ["/api/connections", userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch connection users data at once
  const { data: connectionUsers = [] } = useQuery({
    queryKey: ["/api/profile/connection-users", connections],
    queryFn: async () => {
      if (!isCurrentUser || connections.length === 0) return [];
      
      // Get the connected users IDs
      const otherUserIds = connections.map((c: any) => 
        c.userId === user?.id ? c.connectedToId : c.userId
      );
      
      // Fetch each user's data
      const users = await Promise.all(
        otherUserIds.map(async (id: number) => {
          const response = await fetch(`/api/users/${id}`, {
            credentials: "include",
          });
          
          if (!response.ok) return null;
          
          return response.json();
        })
      );
      
      return users.filter(Boolean);
    },
    enabled: isCurrentUser && connections.length > 0,
  });
  
  // Set up form with current profile data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || "",
    },
  });
  
  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user, form]);
  
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };
  
  const handleConnect = () => {
    if (!userId || !user) return;
    connectMutation.mutate(userId);
  };
  
  // Display connection status and show appropriate buttons
  const getConnectionButton = () => {
    if (isLoadingConnectionStatus) {
      return (
        <Button variant="outline" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading
        </Button>
      );
    }
    
    if (!connectionStatus) {
      return (
        <Button
          onClick={handleConnect}
          className="flex items-center gap-2"
          disabled={connectMutation.isPending}
        >
          <UserPlus className="h-4 w-4" />
          Connect
        </Button>
      );
    }
    
    if (connectionStatus.status === "pending") {
      const isPendingFromMe = connectionStatus.userId === user?.id;
      
      return (
        <Button variant="outline" disabled className="flex items-center gap-2">
          {isPendingFromMe ? "Request Sent" : "Pending Approval"}
        </Button>
      );
    }
    
    if (connectionStatus.status === "accepted") {
      return (
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Connected
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => navigate(`/chat/${displayUser?.id}`)}
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
        </div>
      );
    }
    
    return null;
  };
  
  const displayUser = isCurrentUser ? user : profileUser;
  
  // Don't immediately redirect if user is null - this could happen during initial load
  // Just show a loading state instead and let the ProtectedRoute handle redirection if needed
  if (!user && !isLoadingProfile) {
    return (
      <AppLayout>
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-6">
          {isLoadingProfile ? (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <UserAvatar 
                user={displayUser} 
                className="w-24 h-24 border-4 border-primary/20"
              />
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {displayUser?.displayName || displayUser?.username}
                    </h2>
                    <p className="text-muted-foreground">@{displayUser?.username}</p>
                  </div>
                  
                  {isCurrentUser ? (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  ) : (
                    getConnectionButton()
                  )}
                </div>
                
                {displayUser?.bio && (
                  <p className="mt-4 text-muted-foreground">{displayUser.bio}</p>
                )}
                
                <div className="flex items-center space-x-4 mt-4">
                  <div>
                    <span className="font-bold">{userVibes?.length || 0}</span>{" "}
                    <span className="text-muted-foreground">Vibes</span>
                  </div>
                  <div>
                    <span className="font-bold">{isCurrentUser ? connections?.length || 0 : 0}</span>{" "}
                    <span className="text-muted-foreground">Connections</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="vibes" className="flex-1">Vibes</TabsTrigger>
          {isCurrentUser && (
            <TabsTrigger value="connections" className="flex-1">Connections</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="vibes" className="mt-0">
          {isLoadingVibes ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-40 w-full" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userVibes.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">No vibes yet</h3>
              {isCurrentUser ? (
                <>
                  <p className="text-muted-foreground mb-4">Share your first vibe!</p>
                  <Button onClick={() => navigate("/create")}>Create Vibe</Button>
                </>
              ) : (
                <p className="text-muted-foreground">This user hasn't posted any vibes yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {userVibes.map((vibe: any, index: number) => (
                <motion.div
                  key={vibe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <VibeCard vibe={vibe} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {isCurrentUser && (
          <TabsContent value="connections" className="mt-0">
            {isLoadingConnections ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">Connect with other users to grow your network!</p>
                <Button onClick={() => navigate("/connect")}>Find Connections</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((connection: any, index: number) => {
                  const otherUserId = user && connection.userId === user.id ? connection.connectedToId : connection.userId;
                  
                  // Get user data from connection users query
                  const connectionUser = connectionUsers.find((u: any) => u.id === otherUserId);
                  const isLoadingConnectionUser = !connectionUser;
                  
                  return (
                    <motion.div
                      key={connection.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          {isLoadingConnectionUser ? (
                            <div className="flex items-center space-x-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <UserAvatar user={connectionUser} />
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => window.location.href = `/profile/${connectionUser?.id}`}
                                >
                                  <h3 className="font-medium">
                                    {connectionUser?.displayName || connectionUser?.username}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">@{connectionUser?.username}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/chat/${connectionUser?.id}`;
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Message 
                              </Button>
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
        )}
      </Tabs>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile information.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is how others will see you on the platform.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description about yourself. Maximum 160 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for your profile picture.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
