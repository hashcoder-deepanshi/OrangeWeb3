import { useState, useRef } from "react";
import { Link } from "wouter";
import { Vibe, User, Comment } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/ui/user-avatar";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import EmojiPicker from 'emoji-picker-react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Play,
  Smile
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface VibeCardProps {
  vibe: Vibe;
  className?: string;
  detailed?: boolean;
}

export default function VibeCard({ vibe, className, detailed = false }: VibeCardProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(detailed);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Fetch vibe author with explicit type adjustment
  const { data: author = null } = useQuery<User | null>({
    queryKey: [`/api/users/${vibe.userId}`],
    enabled: !!vibe.userId,
    select: (data) => data || null, // Convert undefined to null to fix type issues
  });
  
  // Fetch likes
  const { data: likes = [] } = useQuery<any[]>({
    queryKey: [`/api/vibes/${vibe.id}/likes`],
    enabled: !!vibe.id,
  });
  
  // Get current user's like
  const userLike = likes.find(like => like.userId === user?.id);
  const likeCount = likes.filter(like => like.isLike).length;
  const dislikeCount = likes.filter(like => !like.isLike).length;
  
  // Fetch comments
  const { data: comments = [], refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: [`/api/vibes/${vibe.id}/comments`],
    enabled: showComments,
  });
  
  // Like/dislike mutation
  const likeMutation = useMutation({
    mutationFn: async ({ isLike }: { isLike: boolean }) => {
      await fetch(`/api/vibes/${vibe.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLike }),
        credentials: "include"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vibes/${vibe.id}/likes`] });
    }
  });
  
  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/vibes/${vibe.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to post comment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/vibes/${vibe.id}/comments`] });
    },
    onError: (error) => {
      console.error("Comment error:", error);
    }
  });
  
  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate({ isLike: true });
  };
  
  const handleDislike = () => {
    if (!user) return;
    likeMutation.mutate({ isLike: false });
  };
  
  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;
    commentMutation.mutate(comment);
  };
  
  const toggleComments = () => {
    setShowComments(!showComments);
  };
  
  const handleEmojiClick = (emojiObject: any) => {
    setComment(prevComment => prevComment + emojiObject.emoji);
    setShowEmojiPicker(false);
  };
  
  return (
    <Card className={cn("overflow-hidden shadow-lg vibe-card animate-slide-up", className)}>
      <CardHeader className="p-4 space-y-0">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => window.location.href = `/profile/${author?.id}`}
          >
            <UserAvatar user={author} />
            <div>
              <div className="font-medium">{author?.displayName || author?.username}</div>
              <div className="text-xs text-muted-foreground">{formatTimeAgo(vibe.createdAt)}</div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Show delete option only to vibe owner */}
              {user?.id === vibe.userId && (
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this vibe?")) {
                      fetch(`/api/vibes/${vibe.id}`, {
                        method: "DELETE",
                        credentials: "include"
                      }).then(() => {
                        // Refresh the feed
                        queryClient.invalidateQueries({ queryKey: ['/api/vibes'] });
                        // Also refresh user vibes if on profile page
                        queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/vibes`] });
                      });
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?vibe=${vibe.id}`);
                  alert('Link copied to clipboard!');
                }}
              >
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      {vibe.content && (
        <CardContent className="px-4 py-2">
          <p>{vibe.content}</p>
          
          {vibe.hashtags && vibe.hashtags.length > 0 && (
            <p className="text-primary text-sm mt-1">
              {vibe.hashtags.map(tag => `#${tag}`).join(' ')}
            </p>
          )}
        </CardContent>
      )}
      
      {vibe.mediaUrl && (
        <div className="relative bg-muted">
          {vibe.mediaType === 'image' ? (
            <img 
              src={vibe.mediaUrl} 
              alt="Vibe media" 
              className="w-full object-cover max-h-96"
            />
          ) : vibe.mediaType === 'video' ? (
            <div className="relative aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={vibe.mediaUrl} 
                  alt="Video thumbnail" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary bg-opacity-80 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
      
      <CardFooter className="flex flex-col p-0">
        <div className="px-4 py-3 flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className={cn(
                "flex items-center space-x-1 p-2 h-auto",
                userLike?.isLike && "text-primary"
              )}
            >
              <Heart className={cn("h-5 w-5", userLike?.isLike && "fill-current")} />
              <span>{likeCount}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleComments}
              className="flex items-center space-x-1 p-2 h-auto"
            >
              <MessageSquare className="h-5 w-5" />
              <span>{comments.length}</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center p-2 h-auto"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check out this vibe: ${window.location.origin}/?vibe=${vibe.id}`, '_blank')}>
                  Share on Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.origin}/?vibe=${vibe.id}`, '_blank')}>
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?vibe=${vibe.id}`);
                  alert('Link copied to clipboard!');
                }}>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 h-auto"
          >
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>
        
        {showComments && (
          <div className="w-full px-4 pb-3 border-t border-border">
            <div className="mt-2 space-y-3">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              
              <form onSubmit={handleComment} className="flex items-center space-x-2 mt-3">
                <UserAvatar user={user} size="sm" />
                <div className="relative flex-1">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-muted rounded-md text-sm min-h-0 resize-none py-2 pr-8"
                    rows={1}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  
                  {showEmojiPicker && (
                    <div className="absolute z-50 bottom-full right-0 mb-2">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={!comment.trim() || commentMutation.isPending}>
                  Post
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Comment item component to avoid using hooks inside loops
interface CommentItemProps {
  comment: Comment;
}

function CommentItem({ comment }: CommentItemProps) {
  // Fetch comment author with fallback to null
  const { data: commentAuthor = null } = useQuery<User | null>({
    queryKey: [`/api/users/${comment.userId}`],
    enabled: !!comment.userId,
    select: (data) => data || null, // Convert undefined to null to fix type issues
  });
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start space-x-2"
    >
      <UserAvatar user={commentAuthor} size="sm" />
      <div>
        <span className="font-medium text-sm">{commentAuthor?.username}</span>
        <p className="text-sm text-muted-foreground">{comment.content}</p>
      </div>
    </motion.div>
  );
}
