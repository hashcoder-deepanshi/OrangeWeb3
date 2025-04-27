import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: User | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function UserAvatar({ user, className, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user?.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
      ) : null}
      <AvatarFallback className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
        {getInitials(user?.displayName || user?.username)}
      </AvatarFallback>
    </Avatar>
  );
}
