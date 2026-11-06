import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Toaster } from "../components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "payana.ai — Move Smarter Through Bengaluru" },
      {
        name: "description",
        content:
          "Real-time BMTC bus tracking, Namma Metro transit maps, and intelligent route decisions for Bengaluru commuters.",
      },
      { property: "og:title", content: "payana.ai — Intelligent Bengaluru Transit" },
      {
        property: "og:description",
        content: "Move smarter through Bengaluru with multi-modal BMTC and Metro transit optimization.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeadContent />
      {children}
      <Scripts />
    </>
  );
}

function RootComponent() {
  const location = useLocation();
  const isSignIn = location.pathname === "/signin";

  useEffect(() => {
    // Initialize active user state so visitors can access the app immediately
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("payana_auth");
      if (stored === null) {
        localStorage.setItem("payana_auth", "true");
      }
    }
  }, []);

  return (
    <>
      <Toaster position="top-right" richColors />
      {!isSignIn && <Navbar />}
      <Outlet />
      {!isSignIn && <MobileBottomNav />}
    </>
  );
}
// Payana.ai
