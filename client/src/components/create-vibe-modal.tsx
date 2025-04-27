import { useState, useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { extractHashtags } from "@/lib/utils";
import { X, Image, Video, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/ui/user-avatar";

interface CreateVibeModalProps {
  onClose: () => void;
}

const createVibeSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Maximum 500 characters"),
  hashtags: z.string().optional(),
});

type CreateVibeFormData = z.infer<typeof createVibeSchema>;

export default function CreateVibeModal({ onClose }: CreateVibeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateVibeFormData>({
    resolver: zodResolver(createVibeSchema),
    defaultValues: {
      content: "",
      hashtags: "",
    }
  });
  
  const createVibeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/vibes", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create vibe");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vibe posted!",
        description: "Your vibe has been posted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vibes"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post vibe",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
      setMediaType(file.type.startsWith("image/") ? "image" : "video");
    };
    reader.readAsDataURL(file);
  };
  
  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const onSubmit = async (data: CreateVibeFormData) => {
    const formData = new FormData();
    formData.append("content", data.content);
    
    // Extract hashtags from content and hashtags field
    const contentTags = extractHashtags(data.content);
    const hashtagsTags = data.hashtags 
      ? data.hashtags.split(" ").map(tag => tag.startsWith("#") ? tag.substring(1) : tag)
      : [];
    
    const uniqueTags = [...new Set([...contentTags, ...hashtagsTags])].filter(Boolean);
    
    if (uniqueTags.length > 0) {
      formData.append("hashtags", JSON.stringify(uniqueTags));
    }
    
    if (fileInputRef.current?.files?.[0]) {
      formData.append("media", fileInputRef.current.files[0]);
      formData.append("mediaType", mediaType || "");
    }
    
    createVibeMutation.mutate(formData);
  };
  
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      onClick={onClose}
    >
      <motion.div 
        className="bg-card rounded-xl w-full max-w-lg"
        variants={modalVariants}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-lg">Create New Vibe</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4">
          <div className="flex items-start space-x-3 mb-4">
            <UserAvatar user={user} />
            <div className="w-full">
              <Textarea 
                placeholder="What's on your mind?"
                className="bg-muted resize-none focus:ring-primary h-24"
                {...register("content")}
              />
              {errors.content && (
                <p className="text-destructive text-sm mt-1">{errors.content.message}</p>
              )}
            </div>
          </div>
          
          {mediaPreview && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              {mediaType === "image" ? (
                <img src={mediaPreview} alt="Media preview" className="w-full max-h-60 object-contain" />
              ) : (
                <video src={mediaPreview} className="w-full max-h-60" controls />
              )}
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="border border-dashed border-border rounded-xl p-6 mb-4 flex flex-col items-center justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaChange}
              accept="image/*,video/*"
              className="hidden"
            />
            
            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center"
              >
                <Image className="h-5 w-5 mr-2" />
                Add Photo
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center"
              >
                <Video className="h-5 w-5 mr-2" />
                Add Video
              </Button>
            </div>
          </div>
          
          <div className="mb-4 flex items-center space-x-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Add hashtags (e.g. web3 coding)"
              className="bg-muted"
              {...register("hashtags")}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90" 
            disabled={isSubmitting || createVibeMutation.isPending}
          >
            {isSubmitting || createVibeMutation.isPending ? "Posting..." : "Post Vibe"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
