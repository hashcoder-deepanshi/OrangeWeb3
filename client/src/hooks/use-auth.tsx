import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBedrockPassport } from "@bedrock_org/passport";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  bedrockUser: any;
  updateProfileMutation: UseMutationResult<SelectUser, Error, UpdateProfileData>;
};

type UpdateProfileData = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  username?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const bedrockPassport = useBedrockPassport();
  const bedrockUser = bedrockPassport.user;
  // Use any available loading property or default to false
  const isBedrockLoading = false; // We can't directly access loading state
  const isLoggedIn = bedrockPassport.isLoggedIn;
  const [isInitialBedrockCheck, setIsInitialBedrockCheck] = useState(true);
  
  // Store a test Bedrock token in localStorage for testing purposes
  useEffect(() => {
    if (isLoggedIn && bedrockUser) {
      localStorage.setItem('bedrock_token', 'test-bedrock-token');
    } else {
      localStorage.removeItem('bedrock_token');
    }
  }, [isLoggedIn, bedrockUser]);
  
  // Create or get user profile from our database based on Bedrock auth
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && !isBedrockLoading,
  });

  // Effect to handle Bedrock user state changes
  useEffect(() => {
    if (isLoggedIn && bedrockUser && isInitialBedrockCheck) {
      setIsInitialBedrockCheck(false);
      // If no user in our database yet, we may need to create one
      if (!user) {
        // This is handled in the profile setup flow
        console.log("User authenticated with Bedrock but no local profile yet");
      }
    }
  }, [isLoggedIn, bedrockUser, isInitialBedrockCheck, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      // If we have a Bedrock user but no local user, create one
      if (isLoggedIn && bedrockUser && !user) {
        // Create a new user in our database with Bedrock ID as reference
        const userId = typeof bedrockUser.id === 'string' ? bedrockUser.id : 'unknown';
        const username = profileData.username || `user_${userId.slice(0, 8)}`;
        const userData = {
          username,
          password: "bedrock_auth", // Placeholder since auth is via Bedrock
          displayName: profileData.displayName || username,
          bio: profileData.bio || "",
          avatarUrl: profileData.avatarUrl || "",
        };
        
        const res = await apiRequest("POST", "/api/register", userData);
        return await res.json();
      } else {
        // Update existing user
        const res = await apiRequest("PUT", "/api/user", profileData);
        return await res.json();
      }
    },
    onSuccess: (updatedUser: SelectUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      refetch(); // Refresh user data
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile",
        variant: "destructive",
      });
    },
  });

  const loadingState = isBedrockLoading || isInitialBedrockCheck || isLoading;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: loadingState,
        error,
        bedrockUser,
        updateProfileMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
