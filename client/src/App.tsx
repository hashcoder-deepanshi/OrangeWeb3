import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import FeedPage from "@/pages/feed-page";
import CreatePage from "@/pages/create-page";
import ConnectPage from "@/pages/connect-page";
import NotificationPage from "@/pages/notification-page";
import ProfilePage from "@/pages/profile-page";
import TrendingPage from "@/pages/trending-page";
import LearnPage from "@/pages/learn-page";
import { ThemeProvider } from "next-themes";
import ChatPage from "@/pages/chat-page"; // Assuming this component exists
import AuthCallback from "@/pages/auth-callback"; // Added import for AuthCallback component
import ProfileSetup from "@/pages/profile-setup"; // Added import for ProfileSetup component

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <FeedPage />} />
      <ProtectedRoute path="/create" component={() => <CreatePage />} />
      <ProtectedRoute path="/connect" component={() => <ConnectPage />} />
      <ProtectedRoute path="/notifications" component={() => <NotificationPage />} />
      <ProtectedRoute path="/profile" component={() => <ProfilePage />} />
      <ProtectedRoute path="/profile/:userId" component={() => <ProfilePage />} />
      <ProtectedRoute path="/trending" component={() => <TrendingPage />} />
      <ProtectedRoute path="/learn" component={() => <LearnPage />} />
      <Route path="/auth">{() => <AuthPage />}</Route>
      <Route path="/auth/callback">{() => <AuthCallback />}</Route>
      <ProtectedRoute path="/profile-setup" component={() => <ProfileSetup />} />
      <Route path="/chat/:userId">{() => <ChatPage />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

import { BedrockPassportProvider } from "@bedrock_org/passport";
import "@bedrock_org/passport/dist/style.css";

function App() {
  return (
    <BedrockPassportProvider
      baseUrl="https://api.bedrockpassport.com"
      authCallbackUrl={`${window.location.origin}/auth/callback`}
      tenantId="orange-moffnvf77b"
    >
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BedrockPassportProvider>
  );
}

export default App;