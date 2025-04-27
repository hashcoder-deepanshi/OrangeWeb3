
import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserAvatar from "@/components/ui/user-avatar";
import { Send, Smile } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch chat partner details
  const { data: chatPartner } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ["/api/messages", userId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${userId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Consider data always stale to ensure fresh fetches
    // @ts-ignore - cacheTime is deprecated but still works
    cacheTime: Infinity, // Keep data in cache
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true // Refetch when component mounts
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiverId: Number(userId), content })
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/messages", userId] });
    }
  });

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };
  
  const handleEmojiClick = (emojiObject: any) => {
    setMessage(prevMessage => prevMessage + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <AppLayout header={
      <div className="flex items-center space-x-3">
        {chatPartner && <UserAvatar user={chatPartner} />}
        <h2 className="text-xl font-bold">{chatPartner?.displayName || chatPartner?.username}</h2>
      </div>
    }>
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {(Array.isArray(messages) ? messages : []).map((msg: any) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderId === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <CardContent className="border-t p-4">
          <div className="relative">
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
            
            <form onSubmit={handleSend} className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 pr-10"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              <Button type="submit" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
