"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { QueryClientProvider } from "@tanstack/react-query";

import { isNative } from "@/lib/capacitor";
import { queryClient } from "@/lib/query-client";

function useNativeInit() {
  useEffect(() => {
    if (!isNative()) {return;}

    const init = async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });

      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();

      const { App } = await import("@capacitor/app");
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    };

    init().catch(console.error);
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useNativeInit();
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {return;}

    const handleUnauthorized = () => {
      queryClient.clear();
      // Save current URL to redirect back after login
      const currentPath = window.location.pathname;
      // Don't save login/register pages as return URL
      if (currentPath !== "/login" && currentPath !== "/register") {
        localStorage.setItem("returnUrl", currentPath);
      }
      router.push("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
