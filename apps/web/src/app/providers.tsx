"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { isNative } from "@/lib/capacitor";

function useNativeInit() {
  useEffect(() => {
    if (!isNative()) return;

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
    const handleUnauthorized = () => {
      queryClient.clear();
      router.push("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
