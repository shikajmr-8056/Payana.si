/**
 * JourneyLegTimeline Component
 *
 * Renders step-by-step chronological timeline of transit legs:
 * - Walking (start to boarding)
 * - Metro line with stations count and line color
 * - BMTC bus with route number and stops count
 * - Waiting times and interchange connections
 * - Honest occupancy status ("Unknown" when unverified)
 * - Scheduled vs Live indicators
 */

import {
  Footprints,
  Train,
  Bus,
  Clock,
  ArrowRight,
  ShieldCheck,
  Radio,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { JourneyLeg } from "../../types/journeyPlanner";

interface JourneyLegTimelineProps {
  legs: JourneyLeg[];
  className?: string;
}

export function JourneyLegTimeline({ legs, className = "" }: JourneyLegTimelineProps) {
  const [expandedLegId, setExpandedLegId] = useState<string | null>(null);

  const toggleLegStops = (id: string) => {
    setExpandedLegId(expandedLegId === id ? null : id);
  };

  return (
    <div className={`space-y-4 relative ${className}`}>
      {/* Vertical connection line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700/80 -z-0" />

      {legs.map((leg, idx) => {
        const isWalk = leg.type === "walk";
        const isMetro = leg.type === "metro";
        const isBus = leg.type === "bus";
        const isExpanded = expandedLegId === leg.id;

        const iconBg = isWalk
          ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          : isMetro
          ? "text-white"
          : "bg-blue-600 text-white";

        return (
          <div key={leg.id || idx} className="relative z-10 pl-10">
            {/* Step Icon Anchor */}
            <div
              className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900 ${iconBg}`}
              style={isMetro ? { backgroundColor: leg.lineColor } : {}}
            >
              {isWalk ? (
                <Footprints size={14} />
              ) : isMetro ? (
                <Train size={14} />
              ) : (
                <Bus size={14} />
              )}
            </div>

            {/* Leg Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              {/* Header: Label, Departure Time & Live/Scheduled Badge */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-lg text-white"
                    style={{ backgroundColor: isWalk ? "#64748b" : leg.lineColor }}
                  >
                    {leg.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {leg.durationMinutes} min
                  </span>
                  {leg.distanceMeters > 0 && (
                    <span className="text-[11px] text-slate-400">
                      ({leg.distanceMeters >= 1000 ? `${(leg.distanceMeters / 1000).toFixed(1)} km` : `${leg.distanceMeters} m`})
                    </span>
                  )}
                </div>

                {/* Data Source Badge */}
                <div className="flex items-center gap-1 text-[10px] font-extrabold">
                  {leg.dataSource === "Live Verified" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Radio size={10} className="animate-pulse" />
                      <span>Live Verified</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                      {leg.dataSource}
                    </span>
                  )}
                </div>
              </div>

              {/* Boarding / Start Point */}
              <div className="text-xs space-y-1">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isWalk ? `Start: ${leg.fromName}` : `Board at: ${leg.fromName}`}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">{leg.departureTime}</span>
                  </div>
                </div>

                {/* Instructions or Waiting Time */}
                {leg.waitingMinutes && leg.waitingMinutes > 0 && (
                  <div className="ml-4 py-1 text-[11px] text-indigo font-semibold flex items-center gap-1">
                    <Clock size={11} />
                    <span>~{leg.waitingMinutes} min wait for departure</span>
                  </div>
                )}

                {/* Intermediate Stops Dropdown if available */}
                {leg.intermediateStopsCount && leg.intermediateStopsCount > 0 && (
                  <div className="ml-4 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleLegStops(leg.id)}
                      className="text-[11px] font-bold text-slate-500 hover:text-indigo flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>
                        Ride {leg.intermediateStopsCount} {isMetro ? "stations" : "stops"}
                      </span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 space-y-1">
                        <p className="font-semibold">{leg.instructions}</p>
                        <p className="text-slate-400">Regular frequency every 4–7 mins.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Drop-off / Alight Point */}
                <div className="flex items-start gap-2 pt-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isWalk ? `Arrive: ${leg.toName}` : `Alight at: ${leg.toName}`}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">{leg.arrivalTime}</span>
                  </div>
                </div>
              </div>

              {/* Occupancy Status footer for vehicles */}
              {!isWalk && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-[10px]">
                  <span className="text-slate-400 font-semibold">Seat Availability:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded-md ${
                      leg.occupancyStatus === "Seats Free"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : leg.occupancyStatus === "Standing Only" || leg.occupancyStatus === "Crowded"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {leg.occupancyStatus === "Seats Free"
                      ? "🟢 Seats Free"
                      : leg.occupancyStatus === "Standing Only"
                      ? "🟡 Standing Only"
                      : leg.occupancyStatus === "Crowded"
                      ? "🔴 Crowded"
                      : "⚪ Unknown"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

