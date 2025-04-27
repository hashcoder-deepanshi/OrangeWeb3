import { useState, useRef, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { extractHashtags } from "@/lib/utils";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Image, Video, X, Hash } from "lucide-react";
import UserAvatar from "@/components/ui/user-avatar";
import { motion } from "framer-motion";

const createVibeSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Maximum 500 characters"),
  hashtags: z.string().optional(),
});

type CreateVibeFormData = z.infer<typeof createVibeSchema>;

export default function CreatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<CreateVibeFormData>({
    resolver: zodResolver(createVibeSchema),
    defaultValues: {
      content: "",
      hashtags: "",
    },
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
      navigate("/");
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
  
  return (
    <AppLayout header={<h2 className="text-xl font-bold">Create New Vibe</h2>}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Share Your Vibe</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-start space-x-3">
                  <UserAvatar user={user} />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            placeholder="What's on your mind?"
                            className="bg-muted resize-none focus:ring-primary min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {mediaPreview && (
                  <div className="relative rounded-lg overflow-hidden">
                    {mediaType === "image" ? (
                      <img src={mediaPreview} alt="Media preview" className="w-full max-h-80 object-contain" />
                    ) : (
                      <video src={mediaPreview} className="w-full max-h-80" controls />
                    )}
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaChange}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
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
                
                <FormField
                  control={form.control}
                  name="hashtags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Hashtags
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Add hashtags (e.g. web3 coding ethereum)"
                          className="bg-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90" 
                  disabled={form.formState.isSubmitting || createVibeMutation.isPending}
                >
                  {form.formState.isSubmitting || createVibeMutation.isPending ? "Posting..." : "Post Vibe"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="bg-card rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Tips for Great Vibes</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center">
              <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">1</span>
              Add relevant hashtags to reach more people
            </li>
            <li className="flex items-center">
              <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
              High-quality images and videos get more engagement
            </li>
            <li className="flex items-center">
              <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
              Keep your content informative and interesting
            </li>
            <li className="flex items-center">
              <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
              Engage with others to grow your connections
            </li>
          </ul>
        </div>
      </motion.div>
    </AppLayout>
  );
}
