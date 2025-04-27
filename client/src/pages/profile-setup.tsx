
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useBedrockPassport } from "@bedrock_org/passport";

const profileSetupSchema = z.object({
  username: z.string().min(3).max(20),
  displayName: z.string().min(2).max(50),
});

export default function ProfileSetup() {
  const { user, updateProfileMutation, bedrockUser } = useAuth();
  const { isLoggedIn } = useBedrockPassport();
  const [, navigate] = useLocation();
  
  const form = useForm({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      username: user?.username || `user_${(bedrockUser?.id || Math.random().toString(36).substring(7))}`,
      displayName: user?.displayName || "Orange User",
    },
  });
  
  // Update form when Bedrock user changes
  useEffect(() => {
    if (bedrockUser) {
      const suggestedUsername = `user_${(bedrockUser?.id || "").substring(0, 8) || Math.random().toString(36).substring(7)}`;
      const suggestedDisplayName = "Orange User";
      
      form.setValue("username", user?.username || suggestedUsername);
      form.setValue("displayName", user?.displayName || suggestedDisplayName);
      
      console.log("Profile setup - Bedrock user data loaded");
    }
  }, [bedrockUser, form, user]);
  
  // Redirect if not logged in with Bedrock
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/auth");
    }
  }, [isLoggedIn, navigate]);

  const onSubmit = async (data: z.infer<typeof profileSetupSchema>) => {
    try {
      // Include Bedrock avatar if available
      const profileData = {
        ...data,
        avatarUrl: user?.avatarUrl || "",
      };
      
      await updateProfileMutation.mutateAsync(profileData);
      navigate("/");
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue to Feed"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
