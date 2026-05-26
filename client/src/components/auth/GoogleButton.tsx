"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface GoogleButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: Error) => void;
  text?: "signin" | "signup";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              type?: string;
              shape?: string;
              logo_alignment?: string;
            }
          ) => void;
        };
      };
    };
  }
}

export default function GoogleButton({ 
  onSuccess, 
  onError,
  text = "signin"
}: GoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Reset on mount
  useEffect(() => {
    mountedRef.current = true;
    initializedRef.current = false;
    setIsReady(false);
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize Google button
  useEffect(() => {
    // Check if Google SDK is loaded
    if (!window.google || !clientId || !buttonRef.current || initializedRef.current) return;
    
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!mountedRef.current) return;
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError?.(new Error("No credential received"));
          }
        },
        cancel_on_tap_outside: true,
      });
      
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: text === "signup" ? "signup_with" : "continue_with",
        width: 400,
        logo_alignment: "center",
      });
      
      initializedRef.current = true;
      setIsReady(true);
    } catch (error) {
      console.error("Google initialization error:", error);
      onError?.(error as Error);
    }
  }, [clientId, onSuccess, onError, text]);

  // Handle script load
  const handleScriptLoad = () => {
    if (!window.google || !clientId || !buttonRef.current || initializedRef.current) return;
    
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!mountedRef.current) return;
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError?.(new Error("No credential received"));
          }
        },
        cancel_on_tap_outside: true,
      });
      
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: text === "signup" ? "signup_with" : "continue_with",
        width: 400,
        logo_alignment: "center",
      });
      
      initializedRef.current = true;
      setIsReady(true);
    } catch (error) {
      console.error("Google initialization error:", error);
    }
  };

  if (!clientId) {
    return null;
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={handleScriptLoad}
        onError={() => console.error("Failed to load Google script")}
        strategy="afterInteractive"
      />

      <div className="w-full">
        {/* Loading state */}
        {!isReady && (
          <div 
            className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm text-white/50"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              height: "44px",
            }}
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span>Loading...</span>
          </div>
        )}
        
        {/* Google button container */}
        <div 
          ref={buttonRef}
          className="google-btn-wrapper"
          style={{ 
            display: isReady ? 'block' : 'none',
          }}
        />
      </div>

      <style jsx global>{`
        .google-btn-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .google-btn-wrapper > div {
          width: 100% !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .google-btn-wrapper iframe {
          border-radius: 12px !important;
        }
      `}</style>
    </>
  );
}