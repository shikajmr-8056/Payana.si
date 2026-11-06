/**
 * JourneyPreferenceSelector Component
 *
 * Implements:
 * - Primary travel priority (Fastest, Seat chance, Cheapest, Least walking, Fewer transfers)
 * - Optional secondary priorities
 * - Seating preference toggle (Prefer a seat / No preference)
 * - Honest occupancy disclaimer (Unknown when unavailable)
 */

import { Zap, Armchair, IndianRupee, Footprints, GitFork, Check, ShieldAlert } from "lucide-react";
import type { TravelPriority, SeatingPreference } from "../../types/journeyPlanner";

interface JourneyPreferenceSelectorProps {
  primaryPriority: TravelPriority;
  secondaryPriorities: TravelPriority[];
  seatingPreference: SeatingPreference;
  onPrimaryChange: (p: TravelPriority) => void;
  onToggleSecondary: (p: TravelPriority) => void;
  onSeatingChange: (s: SeatingPreference) => void;
  className?: string;
}

export function JourneyPreferenceSelector({
  primaryPriority,
  secondaryPriorities,
  seatingPreference,
  onPrimaryChange,
  onToggleSecondary,
  onSeatingChange,
  className = "",
}: JourneyPreferenceSelectorProps) {
  const priorities: { id: TravelPriority; label: string; icon: any; hint: string }[] = [
    { id: "fastest", label: "Fastest Arrival", icon: Zap, hint: "Prioritizes minimum total travel time" },
    { id: "seat", label: "Best Chance of Seat", icon: Armchair, hint: "Favors originating bays & low-crowd buses" },
    { id: "cheapest", label: "Cheapest Journey", icon: IndianRupee, hint: "Minimizes fare via ordinary BMTC services" },
    { id: "least_walking", label: "Least Walking", icon: Footprints, hint: "Prefers door-to-door stops under 400m" },
    { id: "fewest_transfers", label: "Fewer Transfers", icon: GitFork, hint: "Prefers direct single-vehicle journeys" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Primary Priority */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Primary Travel Priority
          </label>
          <span className="text-[11px] text-indigo font-bold">Ranks top recommendation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {priorities.map((item) => {
            const Icon = item.icon;
            const isPrimary = primaryPriority === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPrimaryChange(item.id)}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isPrimary
                    ? "bg-[#4F46E5] text-white border-transparent shadow-md shadow-indigo/25 scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                }`}
                title={item.hint}
              >
                <Icon size={16} className={isPrimary ? "text-white" : "text-indigo"} />
                <span className="text-xs font-extrabold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Secondary Preferences & Seating Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Secondary Priorities */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Optional Secondary Preferences
          </label>
          <div className="flex flex-wrap gap-1.5">
            {priorities
              .filter((p) => p.id !== primaryPriority)
              .map((sec) => {
                const isSelected = secondaryPriorities.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => onToggleSecondary(sec.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-indigo/15 text-indigo border-indigo/40 dark:bg-indigo/25 dark:text-indigo-300 shadow-2xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {isSelected && <Check size={11} className="text-indigo" />}
                    <span>{sec.label}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Seating Preference Control */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seating Preference
            </label>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <ShieldAlert size={10} />
              <span>Unknown if unverified</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSeatingChange("prefer_seat")}
              className={`py-1.5 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                seatingPreference === "prefer_seat"
                  ? "bg-emerald-600 text-white border-transparent shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <Armchair size={13} />
              <span>Prefer a Seat</span>
            </button>

            <button
              type="button"
              onClick={() => onSeatingChange("no_preference")}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                seatingPreference === "no_preference"
                  ? "bg-slate-800 dark:bg-slate-700 text-white border-transparent shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>No Preference</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

