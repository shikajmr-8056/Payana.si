/**
 * JourneyResults Component
 *
 * Implements all UI states:
 * - Initial state (empty guide)
 * - Searching / loading state (animated skeleton cards)
 * - Results state (ranked journey cards)
 * - No route found state
 * - Invalid origin/destination state
 * - Error state
 */

import {
  Compass,
  Search,
  AlertCircle,
  HelpCircle,
  MapPin,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { JourneyRecommendation } from "../../types/journeyPlanner";
import { JourneyRecommendationCard } from "./JourneyRecommendationCard";

interface JourneyResultsProps {
  results: JourneyRecommendation[];
  isLoading: boolean;
  hasSearched: boolean;
  error?: string | null;
  from: string;
  to: string;
  onSelectRoutePill?: (routeNo: string) => void;
  className?: string;
}

export function JourneyResults({
  results,
  isLoading,
  hasSearched,
  error,
  from,
  to,
  onSelectRoutePill,
  className = "",
}: JourneyResultsProps) {
  // 1. ERROR STATE
  if (error) {
    return (
      <div className={`p-6 bg-rose-50 dark:bg-rose-950/30 rounded-3xl border border-rose-200 dark:border-rose-900/60 text-center space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-rose-900 dark:text-rose-100">
            Routing Error
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // 2. SEARCHING / LOADING STATE
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Evaluating Multimodal Corridors...
          </span>
          <span className="text-xs font-bold text-indigo flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo animate-ping" />
            <span>Calculating optimal transfers</span>
          </span>
        </div>

        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="w-48 h-7 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-14 h-7 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-28 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. NO ROUTE FOUND STATE
  if (hasSearched && results.length === 0) {
    return (
      <div className={`p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 ${className}`}>
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <HelpCircle size={28} />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="font-heading font-black text-base text-slate-800 dark:text-slate-100">
            No Direct Transit Route Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            We couldn't connect <strong className="text-slate-700 dark:text-slate-200">"{from}"</strong> and{" "}
            <strong className="text-slate-700 dark:text-slate-200">"{to}"</strong> with the selected mode filter.
          </p>
        </div>
        <div className="pt-1 text-xs text-slate-500 font-medium space-y-1">
          <p>💡 Try switching to <strong className="text-indigo">BMTC + Metro</strong> to enable transfer routes.</p>
          <p>💡 Or verify the spelling using the autocomplete suggestions dropdown.</p>
        </div>
      </div>
    );
  }

  // 4. INITIAL STATE (Before searching)
  if (!hasSearched) {
    return (
      <div className={`p-8 bg-gradient-to-br from-indigo/5 via-purple-500/5 to-transparent rounded-3xl border border-indigo/20 text-center space-y-4 ${className}`}>
        <div className="w-14 h-14 rounded-full bg-indigo/10 flex items-center justify-center mx-auto text-indigo">
          <Compass size={28} />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="font-heading font-black text-base sm:text-lg text-slate-900 dark:text-white">
            Plan Your Bengaluru Multimodal Trip
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Choose your starting stop or metro station, destination, and personalized priorities above to inspect optimized routes combining BMTC buses, Namma Metro, and walking.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            ⚡ Fastest Transit
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            💺 Seat Probability
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            🪙 Fare Optimization
          </span>
        </div>
      </div>
    );
  }

  // 5. RESULTS STATE
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-indigo dark:text-indigo-400">
              AI Recommended Multimodal Routes
            </span>
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
            {results.length} smart route options for {from} ➔ {to}
          </p>
        </div>

        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <Sparkles size={12} className="text-amber-500 shrink-0" />
          <span>Ranked by AI Multimodal Engine</span>
        </div>
      </div>

      {/* Cards Grid: 2 columns under search bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {results.map((rec) => (
          <JourneyRecommendationCard
            key={rec.id}
            recommendation={rec}
            isInitiallyExpanded={false}
          />
        ))}
      </div>
    </div>
  );
}

