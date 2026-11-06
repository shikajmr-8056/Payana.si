/**
 * Payana Mobile Bottom Navigation Bar
 *
 * Dedicated fixed bottom navigation for mobile viewports (< 768px).
 * Provides quick access to Home, Plan, Map, Routes, and a 'More' drawer
 * containing Peak Insights, Impact Tracker, Leaderboard, History, and Settings.
 */

import { useState } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Navigation,
  Map,
  Route,
  MoreHorizontal,
  BarChart3,
  Leaf,
  Trophy,
  History,
  Moon,
  Sun,
  User,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

export function MobileBottomNav() {
  const location = useLocation();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const currentPath = location.pathname;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("payana_auth");
    setMoreOpen(false);
    router.navigate({ to: "/signin", replace: true });
  };

  const mainTabs = [
    { to: "/" as const, label: "Home", icon: Home, isActive: currentPath === "/" },
    { to: "/plan" as const, label: "Plan", icon: Navigation, isActive: currentPath.startsWith("/plan") },
    { to: "/map" as const, label: "Map", icon: Map, isActive: currentPath.startsWith("/map") },
    { to: "/routes" as const, label: "Routes", icon: Route, isActive: currentPath.startsWith("/routes") },
  ];

  const moreItems = [
    { to: "/insights" as const, label: "Peak Insights", icon: BarChart3, desc: "Congestion & rush hour trends" },
    { to: "/carbon" as const, label: "Impact Tracker", icon: Leaf, desc: "CO₂ saved & green transit points" },
    { to: "/leaderboard" as const, label: "Leaderboard", icon: Trophy, desc: "Bengaluru commuter rankings" },
    { to: "/history" as const, label: "History", icon: History, desc: "Past journeys & frequent trips" },
  ];

  return (
    <>
      {/* Fixed Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-95 ${
                  tab.isActive
                    ? "text-indigo font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-colors ${
                    tab.isActive ? "bg-indigo/10 text-indigo" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={tab.isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-95 ${
              moreOpen ||
              moreItems.some((item) => currentPath.startsWith(item.to))
                ? "text-indigo font-bold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                moreOpen ? "bg-indigo/10 text-indigo" : ""
              }`}
            >
              <MoreHorizontal size={20} strokeWidth={2} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up 'More' Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 md:hidden"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-3xl shadow-2xl p-5 pb-24 max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center text-indigo">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Mohammed Shikaj</h3>
                    <p className="text-[11px] text-muted-foreground">mohammed@payana.ai</p>
                  </div>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface text-muted-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-Pages Grid */}
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Explore Payana
              </p>
              <div className="space-y-1.5 mb-5">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = currentPath === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                        isCurrent
                          ? "bg-indigo/10 border border-indigo/20 text-indigo"
                          : "hover:bg-surface border border-transparent text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isCurrent ? "bg-indigo text-white" : "bg-surface text-muted-foreground"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>

              {/* Preferences & Sign Out */}
              <div className="pt-3 border-t border-border/70 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface/80 text-foreground transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-indigo" />}
                    <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Toggle</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

