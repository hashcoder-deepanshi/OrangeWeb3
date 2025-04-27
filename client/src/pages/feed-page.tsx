import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/app-layout";
import UserAvatar from "@/components/ui/user-avatar";
import VibeCard from "@/components/ui/vibe-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Vibe, User } from "@shared/schema";
import { motion } from "framer-motion";

export default function FeedPage() {
  const { user } = useAuth();
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [storyUsers, setStoryUsers] = useState<User[]>([]);
  const [pageNumber, setPageNumber] = useState(0);
  const pageSize = 5;
  
  // Fetch users for stories
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/connections", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Only fetch accepted connections for current user
      const response = await fetch(`/api/connections?status=accepted`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch connections");
      const connections = await response.json();
      
      // Filter connections where the current user is involved
      const userConnections = connections.filter((conn: any) => 
        conn.userId === user.id || conn.connectedToId === user.id
      );
      
      const userPromises = userConnections.map(async (conn: any) => {
        const userId = conn.userId === user.id ? conn.connectedToId : conn.userId;
        const userResponse = await fetch(`/api/users/${userId}`, { credentials: "include" });
        if (userResponse.ok) return userResponse.json();
        return null;
      });
      
      const users = await Promise.all(userPromises);
      return users.filter(Boolean);
    },
  });
  
  useEffect(() => {
    if (users.length) {
      setStoryUsers([...users]);
    }
  }, [users]);
  
  // Fetch vibes for feed
  const { 
    data: newVibes = [], 
    isLoading: isLoadingVibes,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useQuery({
    queryKey: ["/api/vibes", pageNumber],
    queryFn: async () => {
      const response = await fetch(`/api/vibes?limit=${pageSize}&offset=${pageNumber * pageSize}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch vibes");
      return response.json();
    },
    keepPreviousData: true
  });
  
  useEffect(() => {
    if (newVibes.length) {
      if (pageNumber === 0) {
        setVibes(newVibes);
      } else {
        setVibes(prev => [...prev, ...newVibes]);
      }
    }
  }, [newVibes, pageNumber]);
  
  const loadMore = () => {
    setPageNumber(prev => prev + 1);
  };
  
  const StoryItem = ({ user }: { user: User }) => (
    <div className="flex flex-col items-center space-y-1 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/70 p-[2px]">
        <div className="bg-background rounded-full w-full h-full flex items-center justify-center overflow-hidden">
          <UserAvatar user={user} size="lg" />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{user.displayName || user.username}</span>
    </div>
  );
  
  const SkeletonStory = () => (
    <div className="flex flex-col items-center space-y-1">
      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/70 p-[2px]">
        <Skeleton className="h-full w-full rounded-full" />
      </div>
      <Skeleton className="h-2 w-12" />
    </div>
  );
  
  const SkeletonVibe = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-md" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
  
  return (
    <AppLayout>
      {/* Stories Section */}
      <div className="mb-6 overflow-x-auto no-scrollbar">
        <ScrollArea className="w-full" orientation="horizontal">
          <div className="flex space-x-4 pb-2">
            {isLoadingUsers ? (
              Array(5).fill(0).map((_, i) => <SkeletonStory key={i} />)
            ) : storyUsers.length > 0 ? (
              storyUsers.map((storyUser) => <StoryItem key={storyUser.id} user={storyUser} />)
            ) : (
              <div className="text-center text-muted-foreground w-full py-4">
                No connections found. Visit the Connect page!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Vibes Feed */}
      <div className="space-y-6">
        {isLoadingVibes && pageNumber === 0 ? (
          Array(3).fill(0).map((_, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SkeletonVibe />
            </motion.div>
          ))
        ) : vibes.length > 0 ? (
          <>
            {vibes.map((vibe, index) => (
              <motion.div 
                key={vibe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VibeCard vibe={vibe} />
              </motion.div>
            ))}
            
            <div className="flex justify-center py-4">
              <Button
                className={cn(
                  "bg-card hover:bg-muted transition-colors text-muted-foreground",
                  isFetchingNextPage && "opacity-50 cursor-not-allowed"
                )}
                onClick={loadMore}
                disabled={isFetchingNextPage || newVibes.length < pageSize}
              >
                {isFetchingNextPage ? "Loading..." : newVibes.length < pageSize ? "No more vibes" : "Load More"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium mb-2">No vibes yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to share a vibe!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
