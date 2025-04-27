import { motion } from "framer-motion";
import { LoginPanel, useBedrockPassport } from "@bedrock_org/passport";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { isLoggedIn } = useBedrockPassport();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);


  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Hero Section */}
      <div className="w-full md:w-1/2 bg-primary p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md text-center md:text-left"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Orange<span className="text-white">Web3</span>
          </h1>
          <p className="text-primary-foreground/90 text-lg mb-6">
            Connect with other developers, share your vibes, and stay updated with the latest in Web3 technology.
          </p>
          <div className="hidden md:block">
            <ul className="space-y-2 text-primary-foreground/80">
              <li className="flex items-center">
                <span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center mr-2">✓</span>
                Share your Web3 projects and ideas
              </li>
              <li className="flex items-center">
                <span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center mr-2">✓</span>
                Connect with like-minded developers
              </li>
              <li className="flex items-center">
                <span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center mr-2">✓</span>
                Stay on top of trending blockchain technology
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Auth Forms */}
      <div className="w-full p-8 flex items-center justify-center">
        <LoginPanel
          title="Sign in to"
          logo="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg"
          logoAlt="Orange Web3"
          walletButtonText="Connect Wallet"
          showConnectWallet={false}
          separatorText="OR"
          features={{
            enableWalletConnect: false,
            enableAppleLogin: true,
            enableGoogleLogin: true,
            enableEmailLogin: true,
          }}
          titleClass="text-xl font-bold"
          logoClass="ml-2 md:h-8 h-6"
          panelClass="container p-2 md:p-8 rounded-2xl max-w-[480px]"
          buttonClass="hover:border-orange-500"
          separatorTextClass="bg-orange-900 text-gray-500"
          separatorClass="bg-orange-900"
          linkRowClass="justify-center"
          headerClass="justify-center"
        />
      </div>
    </div>
  );
}