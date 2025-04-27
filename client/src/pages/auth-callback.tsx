
import { useEffect } from "react";
import { useBedrockPassport } from "@bedrock_org/passport";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { loginCallback } = useBedrockPassport();
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const refreshToken = params.get("refreshToken");

        if (token && refreshToken) {
          const success = await loginCallback(token, refreshToken);
          if (success) {
            navigate("/profile-setup");
          } else {
            navigate("/auth");
          }
        } else {
          navigate("/auth");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/auth");
      }
    };

    handleCallback();
  }, [loginCallback, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Authenticating...</span>
    </div>
  );
}
