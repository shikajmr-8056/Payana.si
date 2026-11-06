/**
 * Payana Application Navigation Bar
 *
 * Faithfully matches the approved reference design on desktop,
 * and renders a sleek, compact header on mobile.
 */

import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  Route,
  BarChart3,
  Leaf,
  Trophy,
  History,
  LogOut,
  LayoutDashboard,
  Navigation,
  Moon,
  Sun,
  User,
  Settings,
  MapPin,
  Bell,
} from "lucide-react";

const navLinks = [
  { to: "/" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan" as const, label: "Plan", icon: Navigation },
  { to: "/map" as const, label: "Live Map", icon: Map },
  { to: "/routes" as const, label: "Routes", icon: Route },
  { to: "/insights" as const, label: "Peak Insights", icon: BarChart3 },
  { to: "/carbon" as const, label: "Impact Tracker", icon: Leaf },
  { to: "/leaderboard" as const, label: "Leaderboard", icon: Trophy },
  { to: "/history" as const, label: "History", icon: History },
];

export function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const handleSignOut = () => {
    localStorage.removeItem("payana_auth");
    router.navigate({ to: "/signin", replace: true });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 shadow-xs transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-12 md:h-13 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-md shadow-indigo/25 group-hover:scale-105 transition-transform duration-300">
            <MapPin size={17} className="text-white fill-white/20" />
          </div>
          <span className="font-heading text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            payana<span className="text-indigo">.</span>ai
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </Link>

        {/* Desktop Navigation Links (>= 1024px) */}
        <div className="hidden xl:flex items-center gap-0.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#EDE9FE] text-[#4F46E5] dark:bg-indigo/20 dark:text-indigo shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Tablet Navigation Links (768px - 1279px) */}
        <div className="hidden md:flex xl:hidden items-center gap-1">
          {navLinks.slice(0, 5).map((link) => {
            const Icon = link.icon;
            const isActive = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#EDE9FE] text-[#4F46E5] dark:bg-indigo/20 dark:text-indigo"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={14} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Controls: Theme Toggle & Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications on Mobile/Tablet */}
          <button
            className="md:hidden p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell size={18} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
          </button>

          {/* Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo/40 transition-all"
              title="User Account"
              aria-label="User Account"
            >
              <User size={16} className="text-indigo" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden py-1 z-50 origin-top-right"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Mohammed Shikaj</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">mohammed@payana.ai</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/plan"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <Navigation size={14} className="text-indigo" /> Trip Planner
                    </Link>
                    <Link
                      to="/carbon"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <Leaf size={14} className="text-emerald-500" /> Green Impact
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <History size={14} className="text-slate-500" /> Travel History
                    </Link>
                  </div>
                  <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
