/**
 * JourneyRecommendationCard Component
 *
 * Renders a clean, responsive multimodal journey option:
 * - Total duration, departure/arrival times, fare, walking duration
 * - Sequence badges with transport-specific color schemes
 * - Dynamic priority tags (FASTEST, BEST CHANCE OF SEAT, CHEAPEST, etc.)
 * - Expandable details view with JourneyDetails & Leaflet map preview
 */

import { useState } from "react";
import {
  Clock,
  IndianRupee,
  Footprints,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  Armchair,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
  AlertTriangle,
} from "lucide-react";
import type { JourneyRecommendation, RecommendationTag } from "../../types/journeyPlanner";
import { JourneyDetails } from "./JourneyDetails";

interface JourneyRecommendationCardProps {
  recommendation: JourneyRecommendation;
  isInitiallyExpanded?: boolean;
  className?: string;
}

export function JourneyRecommendationCard({
  recommendation,
  isInitiallyExpanded = false,
  className = "",
}: JourneyRecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const {
    title,
    tags,
    totalDurationMinutes,
    departureTime,
    arrivalTime,
    estimatedFareRupees,
    walkingDurationMinutes,
    transfersCount,
    transportSummary,
    seatProbability,
    isRealtimeTracked,
    nextDepartureMinutes = 4,
    delayInfo,
  } = recommendation;

  // Tag styling helper
  const getTagStyle = (tag: RecommendationTag) => {
    switch (tag) {
      case "BEST MATCH":
        return "bg-gradient-to-r from-indigo via-purple-600 to-pink-600 text-white shadow-xs font-black";
      case "FASTEST":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black";
      case "BEST CHANCE OF SEAT":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black";
      case "CHEAPEST":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-black";
      case "LEAST WALKING":
        return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-black";
      case "FEWEST TRANSFERS":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-black";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold";
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden ${
        isExpanded ? "ring-2 ring-indigo/40 dark:ring-indigo/30" : ""
      } ${className}`}
    >
      {/* Clickable Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer space-y-3"
      >
        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Recommendation Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className={`text-[10px] px-2.5 py-0.5 rounded-lg flex items-center gap-1 tracking-wide uppercase ${getTagStyle(
                  t
                )}`}
              >
                {t === "BEST MATCH" && <Sparkles size={11} />}
                {t === "FASTEST" && <Zap size={11} />}
                {t === "BEST CHANCE OF SEAT" && <Armchair size={11} />}
                <span>{t}</span>
              </span>
            ))}
          </div>

          {/* Seat Probability Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold shrink-0">
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                seatProbability === "Likely"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                  : seatProbability === "Possible"
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              {seatProbability === "Likely"
                ? "🟢 Seats Likely"
                : seatProbability === "Possible"
                ? "🟡 Seats Possible"
                : "⚪ Occupancy Unknown"}
            </span>
          </div>
        </div>

        {/* Next Transit Departure & Real-Time Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Clock size={12} className="text-indigo shrink-0" />
            <span>
              Arrival / Next Departure in <strong className="text-indigo">{nextDepartureMinutes} min</strong> ({departureTime})
            </span>
          </div>

          {delayInfo?.isDelayed ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
              <AlertTriangle size={11} className="text-amber-500 shrink-0" />
              <span>+{delayInfo.delayMinutes}m Congestion Delay</span>
            </span>
          ) : (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>On Time (GTFS Live)</span>
            </span>
          )}
        </div>

        {delayInfo?.isDelayed && delayInfo.reason && (
          <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <span>⚠️ Live Transit Alert: {delayInfo.reason}</span>
            {delayInfo.revisedTime && (
              <span className="text-[10px] font-mono font-bold shrink-0">
                Expected: {delayInfo.revisedTime}
              </span>
            )}
          </div>
        )}

        {/* Primary Row: Duration, Time & Fare */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white">
                {totalDurationMinutes} min
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                ({departureTime} → {arrivalTime})
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              {title}
            </h4>
          </div>

          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block">
              ₹{estimatedFareRupees}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Estimated Fare
            </span>
          </div>
        </div>

        {/* Transport Sequence Badges: Walk 5 min -> Metro -> BMTC 500-D */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {transportSummary.sequenceLabels.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-black px-2.5 py-1 rounded-xl text-white shadow-2xs flex items-center gap-1"
                style={{ backgroundColor: item.color }}
              >
                <span>{item.label}</span>
                <span className="opacity-80 font-normal">({item.badgeText})</span>
              </span>
              {idx < transportSummary.sequenceLabels.length - 1 && (
                <ArrowRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Secondary Info & Expand Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold">
              <Footprints size={12} />
              <span>{walkingDurationMinutes} min walk</span>
            </span>
            <span>•</span>
            <span className="font-semibold">
              {transfersCount === 0 ? "Direct (0 transfers)" : `${transfersCount} transfer`}
            </span>
          </div>

          <div className="flex items-center gap-1 font-bold text-indigo group-hover:underline">
            <span>{isExpanded ? "Hide Details" : "View Details & Map"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* Expandable Section: Journey Details */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5">
          <JourneyDetails recommendation={recommendation} />
        </div>
      )}
    </div>
  );
}

