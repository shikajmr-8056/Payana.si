/**
 * Payana Dashboard Page
 *
 * Fully responsive, multi-section dashboard implementation:
 * - Section A: Greeting ("Good Morning, Shikaj! 👋") & wide transit quick search bar
 * - Section B: Main Bengaluru Hero with dedicated background container (Vidhana Soudha + BMTC bus)
 *   Two columns: Left = Headline + Journey Planner; Right = Interactive Transit Map Preview
 * - Lower Section 1: Your Commute at a Glance (Next Best Bus, Saved Journeys, City Pulse)
 * - Lower Section 2: Payana Features ("Everything you need for a smarter journey.")
 * - Lower Section 3: Plan Ahead ("Your journey, planned before you leave.")
 * - Lower Section 4: Live Transit ("See Bengaluru in motion.")
 * - Lower Section 5: Peak Insights ("Understand your city's movement.")
 * - Lower Section 6: Impact Tracker ("Make every journey count.")
 * - Lower Section 7: Leaderboard ("Join Bengaluru's Green Commuters.")
 * - Lower Section 8: Final CTA ("Ready to travel smarter?") & Footer
 * - Natural full-document page scrolling without viewport height clipping
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import {
  MapPin,
  ArrowUpDown,
  Calendar,
  Clock,
  Zap,
  Footprints,
  Users,
  ArrowRight,
  Bus,
  Bookmark,
  BarChart3,
  ChevronRight,
  Search,
  Navigation,
  Train,
  ShieldCheck,
  Compass,
  Leaf,
  Trophy,
  Sparkles,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  CalendarDays,
  Crosshair,
} from "lucide-react";
import { findNearestStop } from "../lib/transitService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "payana.ai — Move smarter through Bengaluru" },
      {
        name: "description",
        content:
          "Intelligent multi-modal transit navigation for Bengaluru. Seamlessly combine BMTC buses, Namma Metro, and walking.",
      },
    ],
  }),
  component: DashboardPage,
});

const DashboardLeafletMap = lazy(() =>
  import("../components/map/DashboardLeafletMap").then((m) => ({
    default: m.DashboardLeafletMap,
  }))
);

export function DashboardPage() {
  const navigate = useNavigate();

  // Top Quick Search State
  const [quickSearch, setQuickSearch] = useState("");

  // Journey Search State (empty by default, user enters manually)
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [travelDate, setTravelDate] = useState("Today, 10 Jun");
  const [preference, setPreference] = useState<"best" | "bmtc" | "metro">("best");
  const [isLocating, setIsLocating] = useState(false);

  // Dynamic route suggestion details (optimizing for lowest travel time)
  const bestOptionDetails = {
    best: {
      badge: "Best option · Lowest time",
      time: "32 min",
      transfers: "1 transfer",
      breakdown: "Walk + BMTC + Metro",
    },
    bmtc: {
      badge: "BMTC Bus Route",
      time: "42 min",
      transfers: "0 transfers",
      breakdown: "BMTC Direct Arterial",
    },
    metro: {
      badge: "Namma Metro Route",
      time: "24 min",
      transfers: "0 transfers",
      breakdown: "Purple Line Express",
    },
  }[preference];

  // Live Location GPS handler
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = await findNearestStop(latitude, longitude);
        const name = nearest ? nearest.name : "My Live Location";
        const loc = { lat: latitude, lng: longitude, name };
        try {
          localStorage.setItem("payana_user_location", JSON.stringify(loc));
        } catch {}
        setFromLocation(name);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Quick search handler
  const handleQuickSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quickSearch.trim()) {
      navigate({
        to: "/routes",
        search: { q: quickSearch.trim() },
      });
    }
  };

  // Swap locations handler
  const handleSwap = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  // Submit journey search handler
  const handleFindRoute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    navigate({
      to: "/map",
      search: {
        from: fromLocation,
        to: toLocation,
        mode: preference,
      },
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-body transition-colors">
      {/* ========================================================
          SECTION A: GREETING & QUICK TRANSIT SEARCH BAR
         ======================================================== */}
      <section className="pt-16 sm:pt-20 pb-4 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Good Morning, Shikaj!</span>
              <span className="inline-block select-none text-2xl sm:text-3xl">👋</span>
            </h1>
            <p className="text-lg sm:text-xl font-bold text-[#7E59FF] dark:text-[#A78BFA] mt-0.5">
              Where are you headed today?
            </p>
          </div>

          <form onSubmit={handleQuickSearch} className="w-full max-w-[560px] mt-1">
            <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200/90 dark:border-slate-800 shadow-sm px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#7E59FF]/40 focus-within:border-[#7E59FF] transition-all">
              <Search size={18} className="text-[#7E59FF] shrink-0 mr-3" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search Routes, Bus Stops, or Destinations..."
                className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#7E59FF] hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 ml-2 transition-all cursor-pointer shadow-xs group"
                title="Search routes"
                aria-label="Search"
              >
                <Navigation size={14} className="rotate-45 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ========================================================
          SECTION B: MAIN BENGALURU HERO (Artwork + Journey Planner)
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-2 mb-12 sm:mb-16">
        <div className="relative rounded-3xl lg:rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 lg:p-10">
          
          {/* Dedicated Cityscape Artwork Container on the right */}
          <div
            className="hidden lg:block absolute top-0 right-0 bottom-0 w-[50%] xl:w-[52%] bg-no-repeat bg-cover bg-right-center pointer-events-none"
            style={{
              backgroundImage: "url('/bengaluru-hero-clean-city.png')",
            }}
          >
            {/* Smooth gentle blend from the white/dark left card into the artwork */}
            <div className="absolute inset-y-0 left-0 w-36 bg-gradient-to-r from-white dark:from-slate-950 via-white/70 dark:via-slate-950/70 to-transparent pointer-events-none" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start min-h-[480px]">
            {/* ---------------- LEFT COLUMN (~55%): Headline & Journey Planner ---------------- */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center">
              {/* Main Headline */}
              <div className="space-y-3 mb-6">
                <h2 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-heading font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                  Move smarter <br />
                  through <br />
                  <span className="relative inline-block text-indigo dark:text-[#A78BFA]">
                    Bengaluru.
                    {/* Purple curved accent underline exactly matching the reference */}
                    <svg
                      className="absolute -bottom-2.5 left-0 w-full h-3.5 text-[#7E59FF]"
                      viewBox="0 0 220 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 10C55 2 165 2 217 11"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </h2>

                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
                  Your city. Your best route. Every day.
                </p>
              </div>

              {/* Journey Planner Card */}
              <form
                onSubmit={handleFindRoute}
                className="w-full max-w-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border border-white/80 dark:border-slate-800 space-y-3"
              >
                {/* Row 1: From & Where to with Swap Button */}
                <div className="flex items-center gap-2 relative">
                  {/* From Field with GPS Live Location Trigger */}
                  <div className="flex-1 bg-slate-50/90 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo/40 transition-all min-h-[44px]">
                    <div className="w-3 h-3 rounded-full border-2 border-indigo flex items-center justify-center shrink-0">
                      <div className="w-1 h-1 bg-indigo rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                        From
                      </label>
                      <input
                        type="text"
                        value={fromLocation}
                        onChange={(e) => setFromLocation(e.target.value)}
                        placeholder="Current location or stop"
                        className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none truncate"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetLiveLocation}
                      disabled={isLocating}
                      title="Use My Live GPS Location"
                      aria-label="Use My Live GPS Location"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo hover:bg-indigo/10 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Crosshair size={14} className={isLocating ? "animate-spin text-indigo" : ""} />
                    </button>
                  </div>

                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo hover:border-indigo/50 shadow-sm shrink-0 transition-transform active:rotate-180 duration-300 cursor-pointer"
                    title="Swap locations"
                    aria-label="Swap locations"
                  >
                    <ArrowUpDown size={14} />
                  </button>

                  {/* Where To Field */}
                  <div className="flex-1 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-indigo/40 transition-all min-h-[46px]">
                    <MapPin size={16} className="text-[#EC4899] shrink-0 fill-[#EC4899]/20" />
                    <div className="flex-1 min-w-0">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                        To
                      </label>
                      <input
                        type="text"
                        value={toLocation}
                        onChange={(e) => setToLocation(e.target.value)}
                        placeholder="Destination"
                        className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none truncate"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Date Selector (Leave now removed) */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[42px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar size={14} className="text-indigo shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {travelDate}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 rotate-90 shrink-0" />
                </div>

                {/* Row 3: Routing Modes: Best Route, BMTC, Metro */}
                <div className="flex items-center gap-2 pt-0.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {/* Best Route (Quickest / Less Time) */}
                  <button
                    type="button"
                    onClick={() => setPreference("best")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[34px] cursor-pointer ${
                      preference === "best"
                        ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/25"
                        : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Zap size={13} className={preference === "best" ? "fill-white" : "text-amber-500"} />
                    <span>Best route</span>
                  </button>

                  {/* BMTC Bus */}
                  <button
                    type="button"
                    onClick={() => setPreference("bmtc")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[34px] cursor-pointer ${
                      preference === "bmtc"
                        ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/25"
                        : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Bus size={13} className={preference === "bmtc" ? "text-white" : "text-indigo"} />
                    <span>BMTC</span>
                  </button>

                  {/* Namma Metro */}
                  <button
                    type="button"
                    onClick={() => setPreference("metro")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[34px] cursor-pointer ${
                      preference === "metro"
                        ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/25"
                        : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Train size={13} className={preference === "metro" ? "text-white" : "text-purple-500"} />
                    <span>Metro</span>
                  </button>
                </div>

                {/* Row 4: Show Route CTA */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5] text-white py-3 px-4 rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo/25 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Show Route</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>

            {/* ---------------- RIGHT COLUMN (~45%): Floating Best Option Card & Responsive Art ---------------- */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between items-end min-h-[200px] lg:min-h-[460px] w-full">
              {/* Floating Best Option Card matching reference design */}
              <Link
                to="/map"
                search={{ from: fromLocation, to: toLocation, mode: preference }}
                className="group bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-xl hover:shadow-2xl border border-white/90 dark:border-slate-800 transition-all hover:scale-[1.02] cursor-pointer w-full max-w-[270px]"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
                    <Sparkles size={14} className="fill-[#4F46E5]/20 text-[#4F46E5]" />
                    <span>{bestOptionDetails.badge}</span>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-indigo transition-all" />
                </div>

                <div className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 dark:text-white my-1.5">
                  {bestOptionDetails.time}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <Bus size={13} className="text-slate-500 shrink-0" />
                    <span>{bestOptionDetails.transfers}</span>
                  </div>
                  <div className="text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
                    {bestOptionDetails.breakdown}
                  </div>
                </div>
              </Link>

              {/* Mobile/Tablet image preview below card */}
              <div className="lg:hidden w-full h-[220px] rounded-2xl overflow-hidden shadow-md mt-4 relative">
                <img
                  src="/bengaluru-hero-clean-city.png"
                  alt="Bengaluru Transit Illustration"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 1: YOUR COMMUTE AT A GLANCE
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Your commute at a glance</span>
            <span className="text-indigo select-none">ヾ</span>
          </h3>
          <Link to="/map" className="text-xs sm:text-sm font-bold text-indigo hover:text-indigo/80 flex items-center gap-1">
            <span>View all routes</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Card 1: Next Best Bus */}
          <Link
            to="/map"
            search={{ from: "Silk Board", to: "Majestic", mode: "fastest" }}
            className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-indigo/20 flex items-center justify-center text-indigo shrink-0">
                    <Bus size={16} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      Next best bus
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Near Silk Board (towards Majestic)
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-indigo transition-all shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-2 p-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#4F46E5] text-white text-xs font-black px-2 py-0.5 rounded shadow-2xs">
                    314E
                  </span>
                  <span className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                    Majestic
                  </span>
                </div>
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                  Arriving in 5 min
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Users size={12} className="text-slate-400" /> Moderate crowd
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Seats likely
              </span>
            </div>
          </Link>

          {/* Card 2: Saved Journeys */}
          <Link
            to="/plan"
            className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-cyan-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Bookmark size={16} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      Saved journeys
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your frequent routes
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-600 transition-all shrink-0" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-[#4F46E5] text-white text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">
                      314E
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Majestic → Indiranagar
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo bg-indigo/10 px-2 py-0.5 rounded shrink-0 ml-1">
                    32 min
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-[#059669] text-white text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">
                      G-3
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Koramangala → Silk Board
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo bg-indigo/10 px-2 py-0.5 rounded shrink-0 ml-1">
                    18 min
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Card 3: City Pulse */}
          <Link
            to="/insights"
            className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 shrink-0">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      City pulse
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live commute snapshot
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-500 transition-all shrink-0" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" /> Crowd level
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Moderate
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> Best departure window
                  </span>
                  <span className="text-xs font-black text-indigo">
                    10:15 – 10:30 AM
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 2: PAYANA FEATURES (Everything you need)
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 dark:bg-indigo/20 text-indigo text-xs font-bold uppercase tracking-wider mb-2">
            <span>Built for Bengaluru</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
            Everything you need for a smarter journey.
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
            Engineered specifically to handle the unique rhythm, traffic variations, and connection patterns of Bengaluru transit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo/10 text-indigo flex items-center justify-center mb-4">
              <Compass size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Smart Journey Planning
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Find optimal routes combining BMTC buses, Namma Metro, and walking with real-time transfer buffers and arrival forecasts.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
              <Train size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              BMTC + Metro Integration
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Synchronized schedules connecting arterial bus routes directly with Purple and Green metro lines for smooth transfers.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Crowd Intelligence
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Live and historical crowd insights categorizing buses from Seats Free to Standing Only before you reach the bus stop.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Seat Probability
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Machine learning models calculate seat availability probability based on time of day, route density, and boarding stop history.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-4">
              <CalendarDays size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Advance Travel Planning
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Plan departures for upcoming days or hours with day-of-week traffic delay trends and frequency recommendations.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <RotateCcw size={24} />
            </div>
            <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Journey Recovery
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If your bus is delayed or you miss a connection, Payana immediately recalibrates and offers alternative route options.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 3: PLAN AHEAD
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="bg-gradient-to-br from-[#4F46E5]/10 via-purple-500/5 to-cyan-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-cyan-950/30 rounded-3xl p-8 sm:p-12 border border-indigo/20 dark:border-indigo/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/15 text-indigo text-xs font-bold uppercase tracking-wider">
                <Clock size={12} />
                <span>Smart Scheduling</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
                Your journey, planned before you leave.
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Take the guesswork out of peak-hour Bengaluru travel. Compare departure time windows, customize preferences for walking vs speed, and save your daily commute routines for one-tap navigation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Future-date schedule predictions</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Departure-time comparison windows</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Custom transit preferences</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Saved journeys & alerts</span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/plan"
                  className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-heading font-bold text-sm shadow-md shadow-indigo/25 transition-all"
                >
                  <span>Open Trip Planner</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Departure Comparison</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Silk Board → Majestic</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">10:15 AM (Recommended)</span>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Low traffic buffer • Seats likely</p>
                  </div>
                  <span className="font-heading font-black text-sm text-emerald-700 dark:text-emerald-300">32 min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">09:30 AM (Peak Rush)</span>
                    <p className="text-[10px] text-slate-500">Heavy Silk Board congestion</p>
                  </div>
                  <span className="font-heading font-black text-sm text-slate-700 dark:text-slate-300">54 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 4: LIVE TRANSIT (See Bengaluru in motion)
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Map</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
              See Bengaluru in motion.
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Explore the full interactive transit map of Bengaluru. Trace route alignments, locate stops, inspect interchange corridors, and plan seamless cross-city journeys in real time.
            </p>
            <div className="pt-2">
              <Link
                to="/map"
                className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-heading font-bold text-sm shadow-md shadow-indigo/25 transition-all"
              >
                <span>Explore Live Map</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
            <Suspense
              fallback={
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
                  <span className="text-xs text-slate-500">Loading map...</span>
                </div>
              }
            >
              <DashboardLeafletMap className="w-full h-full" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 5: PEAK INSIGHTS
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp size={12} />
              <span>Congestion Intelligence</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
              Understand your city's movement.
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Historical congestion patterns, delay hotspots, and optimal departure windows across key corridors.
            </p>
          </div>
          <Link to="/insights" className="text-xs sm:text-sm font-bold text-indigo hover:text-indigo/80 flex items-center gap-1 shrink-0">
            <span>View Peak Insights</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Morning Peak Window</span>
            <p className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">08:30 – 10:15 AM</p>
            <p className="text-xs text-rose-500 font-semibold mt-1">Highest crowd on Silk Board & ORR</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evening Peak Window</span>
            <p className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">05:30 – 07:45 PM</p>
            <p className="text-xs text-amber-500 font-semibold mt-1">Whitefield & Hebbal delay surge</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fastest Corridor</span>
            <p className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">Purple Metro</p>
            <p className="text-xs text-emerald-500 font-semibold mt-1">98.2% on-time consistency</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Delay Reclaimed</span>
            <p className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">16.4 min</p>
            <p className="text-xs text-indigo font-semibold mt-1">Saved per commuter daily</p>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 6: IMPACT TRACKER
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Leaf size={12} />
                <span>Sustainable Bengaluru</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
                Make every journey count.
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                By choosing BMTC and Namma Metro, you actively reduce gridlock and carbon emissions across Karnataka's capital.
              </p>
            </div>
            <Link to="/carbon" className="text-xs sm:text-sm font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 shrink-0">
              <span>View Your Impact</span>
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">CO₂ Saved</span>
              <p className="text-2xl sm:text-3xl font-heading font-black text-emerald-800 dark:text-emerald-200 mt-1">127 kg</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">This month</p>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Trees Equivalent</span>
              <p className="text-2xl sm:text-3xl font-heading font-black text-emerald-800 dark:text-emerald-200 mt-1">6 Trees</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Annual absorption offset</p>
            </div>

            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-xs font-bold text-indigo uppercase tracking-wider">Public Transit Trips</span>
              <p className="text-2xl sm:text-3xl font-heading font-black text-indigo dark:text-indigo-200 mt-1">47 Trips</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">14-day commute streak</p>
            </div>

            <div className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/50">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Green Points</span>
              <p className="text-2xl sm:text-3xl font-heading font-black text-purple-700 dark:text-purple-200 mt-1">4,820</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gold Commuter Rank #3</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 7: LEADERBOARD
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 text-indigo text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy size={12} />
              <span>Community Leadership</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
              Join Bengaluru's Green Commuters.
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Top sustainability champions leading the charge towards cleaner, faster city transit.
            </p>
          </div>
          <Link to="/leaderboard" className="text-xs sm:text-sm font-bold text-indigo hover:text-indigo/80 flex items-center gap-1 shrink-0">
            <span>View Full Leaderboard</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base shrink-0">
              🥇
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white truncate">Arun Kumar</h4>
              <p className="text-xs text-slate-500">Koramangala • 189 kg CO₂</p>
            </div>
            <span className="text-xs font-bold text-indigo bg-indigo/10 px-2 py-1 rounded-lg">6,240 pts</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-base shrink-0">
              🥈
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white truncate">Priya Sharma</h4>
              <p className="text-xs text-slate-500">Indiranagar • 162 kg CO₂</p>
            </div>
            <span className="text-xs font-bold text-indigo bg-indigo/10 px-2 py-1 rounded-lg">5,680 pts</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo/40 dark:border-indigo/50 shadow-xs flex items-center gap-3 bg-indigo-50/20">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-base shrink-0">
              🥉
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-heading font-bold text-sm text-indigo dark:text-indigo-300 truncate">You (Shikaj)</h4>
                <span className="text-[10px] font-bold bg-indigo text-white px-1.5 py-0.2 rounded">Rank #3</span>
              </div>
              <p className="text-xs text-slate-500">Jayanagar • 127 kg CO₂</p>
            </div>
            <span className="text-xs font-bold text-indigo bg-indigo/10 px-2 py-1 rounded-lg">4,820 pts</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          LOWER SECTION 8: FINAL CTA
         ======================================================== */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-3xl sm:text-5xl font-heading font-black tracking-tight">
              Ready to travel smarter?
            </h3>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed">
              Join thousands of Bengaluru commuters saving time, avoiding gridlock, and moving effortlessly across the city every single day.
            </p>
            <div className="pt-2">
              <Link
                to="/map"
                className="inline-flex items-center gap-2 bg-white text-[#4F46E5] hover:bg-slate-100 px-6 py-3 rounded-xl font-heading font-black text-sm shadow-xl transition-all cursor-pointer active:scale-95"
              >
                <span>Plan My Journey</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER
         ======================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white font-bold shadow-md shadow-indigo/25">
              <MapPin size={17} className="fill-white/20" />
            </div>
            <span className="font-heading text-lg font-black tracking-tight text-slate-900 dark:text-white">
              payana<span className="text-indigo">.</span>ai
            </span>
            <span className="text-xs text-slate-400 ml-2">Intelligent Bengaluru Transit</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link to="/" className="hover:text-indigo transition-colors">Dashboard</Link>
            <Link to="/plan" className="hover:text-indigo transition-colors">Trip Planner</Link>
            <Link to="/map" className="hover:text-indigo transition-colors">Live Map</Link>
            <Link to="/routes" className="hover:text-indigo transition-colors">BMTC Routes</Link>
            <Link to="/insights" className="hover:text-indigo transition-colors">Peak Insights</Link>
            <Link to="/carbon" className="hover:text-indigo transition-colors">Carbon Impact</Link>
            <Link to="/leaderboard" className="hover:text-indigo transition-colors">Leaderboard</Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            © 2026 payana.ai. Data powered by Open Data Bengaluru.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;
