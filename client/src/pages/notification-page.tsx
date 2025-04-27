import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/app-layout";
import { queryClient } from "@/lib/queryClient";
import { formatTimeAgo } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import UserAvatar from "@/components/ui/user-avatar";
import { Loader2, Heart, MessageSquare, UserCheck, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Notification } from "@shared/schema";

export default function NotificationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");

  // Fetch all notifications
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Update connection status from notification
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
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
    },
  });

  // Fetch users for notifications (in a single batch)
  const { data: notificationUsers = {} } = useQuery({
    queryKey: ['/api/notification-users', notifications],
    queryFn: async () => {
      // Get unique user IDs from notifications
      const userIds = Array.from(
        new Set(
          notifications
            .filter((n: Notification) => n.fromUserId)
            .map((n: Notification) => n.fromUserId)
        )
      );
      
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
    enabled: notifications.length > 0,
  });

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((n: Notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    return n.type === activeTab;
  });

  // Group notifications by type for the counter
  const notificationCounts = notifications.reduce(
    (acc: Record<string, number>, notification: Notification) => {
      const type = notification.type;
      acc[type] = (acc[type] || 0) + 1;
      acc.unread = (acc.unread || 0) + (notification.isRead ? 0 : 1);
      return acc;
    },
    { all: notifications.length, unread: 0 }
  );

  const handleReadNotification = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleConnectionResponse = (connectionId: number, status: "accepted" | "rejected", notificationId: number) => {
    updateConnectionMutation.mutate({ id: connectionId, status });
    handleReadNotification(notificationId);
  };

  // Get the icon and color for different notification types
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "connection_request":
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case "connection_accepted":
        return <UserCheck className="h-5 w-5 text-primary" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Get text content based on notification type
  const getNotificationContent = (notification: Notification, fromUser: any) => {
    const username = fromUser?.displayName || fromUser?.username || "Someone";
    
    switch (notification.type) {
      case "like":
        return `${username} liked your vibe`;
      case "comment":
        return `${username} commented: "${notification.content?.substring(0, 30)}${
          notification.content && notification.content.length > 30 ? "..." : ""
        }"`;
      case "connection_request":
        return `${username} wants to connect with you`;
      case "connection_accepted":
        return `${username} accepted your connection request`;
      case "message":
        return `New message from ${username}: "${notification.content?.substring(0, 30)}${
          notification.content && notification.content.length > 30 ? "..." : ""
        }"`;
      default:
        return "You have a new notification";
    }
  };

  return (
    <AppLayout header={<h2 className="text-xl font-bold">Notifications</h2>}>
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="w-full mb-4 grid grid-cols-4">
          <TabsTrigger value="all" className="relative">
            All
            {notificationCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notificationCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="relative">
            Unread
            {notificationCounts.unread > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                {notificationCounts.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="connection_request" className="relative">
            Requests
            {notificationCounts.connection_request > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notificationCounts.connection_request}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="message" className="relative">
            Messages
            {notificationCounts.message > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notificationCounts.message}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0 space-y-4">
          {isLoadingNotifications ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No notifications yet.</p>
              {activeTab === "unread" && (
                <p className="text-sm text-muted-foreground mt-2">
                  All caught up! Check back later for new notifications.
                </p>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification: Notification, index) => {
              // Get user data from our batch-loaded users
              const fromUser = notification.fromUserId ? notificationUsers[notification.fromUserId] : null;
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleReadNotification(notification.id);
                    }
                  }}
                >
                  <Card 
                    className={`overflow-hidden transition-colors cursor-pointer hover:bg-muted/50 ${
                      !notification.isRead ? "border-l-4 border-l-primary" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {fromUser && <UserAvatar user={fromUser} size="sm" />}
                              <p className="text-sm font-medium">
                                {getNotificationContent(notification, fromUser)}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          
                          {notification.type === "connection_request" && (
                            <div className="mt-2 flex space-x-2 ml-10">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConnectionResponse(notification.entityId!, "accepted", notification.id);
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConnectionResponse(notification.entityId!, "rejected", notification.id);
                                }}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                          
                          {notification.type === "message" && (
                            <div className="mt-2 ml-10">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/chat/${notification.fromUserId}`;
                                }}
                              >
                                Reply
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
