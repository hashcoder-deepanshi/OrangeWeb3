import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  HomeIcon, 
  PlusIcon, 
  UsersIcon, 
  BellIcon, 
  TrendingUpIcon, 
  SearchIcon,
  MessageSquareIcon,
  LogOutIcon,
  MenuIcon,
  BookOpenIcon
} from "lucide-react";
import UserAvatar from "@/components/ui/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CreateVibeModal from "@/components/create-vibe-modal";
import {useBedrockPassport} from "@bedrock_org/passport"

interface AppLayoutProps {
  children: ReactNode;
  header?: ReactNode;
}

export default function AppLayout({ children, header }: AppLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Get unread notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?isRead=false", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
  
  const hasNotifications = notifications.length > 0;
  
  const navLinks = [
    { href: "/", label: "Feed", icon: HomeIcon },
    { href: "/create", label: "Create", icon: PlusIcon },
    { href: "/connect", label: "Connect", icon: UsersIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon, hasBadge: hasNotifications },
    { href: "/trending", label: "Trending", icon: TrendingUpIcon },
    { href: "/learn", label: "Learn", icon: BookOpenIcon },
  ];
  
  const { signOut } = useBedrockPassport();
  
  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
  };
  
  // Mobile navigation at bottom
  const MobileNav = () => (
    <nav className="fixed bottom-0 inset-x-0 bg-dark-card border-t border-border h-16 md:hidden z-10">
      <div className="flex justify-around items-center h-full">
        {navLinks.map((link) => (
          <div key={link.href} className="cursor-pointer" onClick={() => window.location.href = link.href}>
            <div className={cn(
              "flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors",
              location === link.href && "text-primary"
            )}>
              <div className="relative">
                <link.icon className="h-6 w-6" />
                {link.hasBadge && (
                  <span className="absolute -top-1 -right-1 bg-primary rounded-full w-2 h-2" />
                )}
              </div>
              <span className="text-xs mt-1">{link.label}</span>
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
  
  // Desktop side navigation
  const DesktopNav = () => (
    <nav className="hidden md:flex md:flex-col md:justify-between md:h-screen md:w-20 md:border-r md:border-border md:py-8 md:fixed md:left-0 md:top-0 md:bg-dark-card">
      <div className="flex justify-center">
        <div className="text-primary font-bold text-2xl">O</div>
      </div>
      
      <div className="flex flex-col items-center justify-center space-y-10">
        {navLinks.map((link) => (
          <div key={link.href} className="cursor-pointer" onClick={() => window.location.href = link.href}>
            <div className={cn(
              "nav-link flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors relative",
              location === link.href && "text-primary active"
            )}>
              <div className="relative">
                <link.icon className="h-6 w-6" />
                {link.hasBadge && (
                  <span className="absolute -top-1 -right-1 bg-primary rounded-full w-2 h-2" />
                )}
              </div>
              <span className="text-xs mt-1 text-[10px]">{link.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-auto">
        <div className="cursor-pointer" onClick={() => window.location.href = "/profile"}>
          <div className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <UserAvatar 
              user={user} 
              className="w-8 h-8 border-2 border-transparent hover:border-primary transition-colors" 
            />
            <span className="text-xs mt-1 text-[10px]">Profile</span>
          </div>
        </div>
      </div>
    </nav>
  );
  
  // Header section
  const Header = () => (
    <header className="sticky top-0 z-10 bg-dark-card/80 backdrop-blur-sm border-b border-border py-3 px-4 md:ml-20">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-foreground flex items-center">
          <span className="text-primary">Orange</span>Web3
        </h1>
        
        <div className="flex items-center space-x-4">
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <SearchIcon className="h-5 w-5" />
          </button>
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-muted-foreground hover:text-primary transition-colors md:hidden">
                <MenuIcon className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col h-full pt-8">
                <div className="flex flex-col space-y-6">
                  {navLinks.map((link) => (
                    <div 
                      key={link.href} 
                      className="cursor-pointer" 
                      onClick={() => window.location.href = link.href}
                    >
                      <div className={cn(
                        "flex items-center space-x-3 text-muted-foreground hover:text-primary transition-colors px-2 py-2 rounded-md",
                        location === link.href && "text-primary bg-primary/10"
                      )}>
                        <link.icon className="h-5 w-5" />
                        <span>{link.label}</span>
                        {link.hasBadge && (
                          <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {notifications.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div 
                    className="cursor-pointer" 
                    onClick={() => window.location.href = "/profile"}
                  >
                    <div className={cn(
                      "flex items-center space-x-3 text-muted-foreground hover:text-primary transition-colors px-2 py-2 rounded-md",
                      location === "/profile" && "text-primary bg-primary/10"
                    )}>
                      <UserAvatar user={user} className="h-5 w-5" />
                      <span>Profile</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="mt-auto flex items-center space-x-3 text-muted-foreground hover:text-destructive transition-colors px-2 py-2 rounded-md"
                >
                  <LogOutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:block">
                <UserAvatar user={user} className="h-8 w-8" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={() => window.location.href = "/profile"}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {header && (
        <div className="max-w-2xl mx-auto mt-2">
          {header}
        </div>
      )}
    </header>
  );
  
  // Create vibe button (mobile)
  const CreateVibeButton = () => (
    <button
      onClick={() => setShowCreateModal(true)}
      className="fixed right-6 bottom-20 md:hidden bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors z-10"
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DesktopNav />
      <Header />
      
      <main className="flex-1 pt-4 pb-20 md:pb-4 md:ml-20 animate-fade-in">
        <div className="container mx-auto px-4 max-w-2xl">
          {children}
        </div>
      </main>
      
      <MobileNav />
      <CreateVibeButton />
      
      <AnimatePresence>
        {showCreateModal && (
          <CreateVibeModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
