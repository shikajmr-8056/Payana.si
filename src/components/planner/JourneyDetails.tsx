/**
 * JourneyDetails Component
 *
 * Detailed expansion for a selected journey recommendation:
 * - Summary statistics (Walking, Transit, Waiting, CO2, Fare)
 * - Map preview toggle with interactive Leaflet map
 * - Chronological leg timeline
 * - Direct "Open in Live Map" navigation shortcut
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Footprints,
  IndianRupee,
  Leaf,
  Layers,
  Map,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { JourneyRecommendation } from "../../types/journeyPlanner";
import { JourneyLegTimeline } from "./JourneyLegTimeline";
import { JourneyMapPreview } from "./JourneyMapPreview";

interface JourneyDetailsProps {
  recommendation: JourneyRecommendation;
  className?: string;
}

export function JourneyDetails({ recommendation, className = "" }: JourneyDetailsProps) {
  const [showMap, setShowMap] = useState(true);

  const {
    totalDurationMinutes,
    walkingDurationMinutes,
    walkingDistanceMeters,
    inVehicleDurationMinutes,
    waitingDurationMinutes,
    transfersCount,
    estimatedFareRupees,
    co2SavedKg,
    legs,
  } = recommendation;

  const originName = legs[0]?.fromName || "Origin";
  const destName = legs[legs.length - 1]?.toName || "Destination";

  return (
    <div className={`space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Footprints size={11} />
            <span>Walking</span>
          </div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
            {walkingDurationMinutes} min ({walkingDistanceMeters}m)
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Clock size={11} />
            <span>Transit Time</span>
          </div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
            {inVehicleDurationMinutes} min
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Layers size={11} />
            <span>Transfers</span>
          </div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
            {transfersCount === 0 ? "Direct (0 transfers)" : `${transfersCount} transfer`}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Leaf size={11} className="text-emerald-500" />
            <span>CO2 Avoided</span>
          </div>
          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            ~{co2SavedKg} kg CO₂
          </div>
        </div>
      </div>

      {/* Map Toggle & Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Route Geography & Stops
          </span>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-xs font-bold text-indigo hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Map size={13} />
            <span>{showMap ? "Hide Map Preview" : "Show Map Preview"}</span>
          </button>
        </div>

        {showMap && <JourneyMapPreview legs={legs} />}
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Step-by-Step Directions
        </span>
        <JourneyLegTimeline legs={legs} />
      </div>

      {/* Action Footer: Live Map Navigation Link */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-700/40">
        <div className="text-[11px] text-slate-400 font-medium">
          Estimated fare: <strong className="text-slate-700 dark:text-slate-200 font-extrabold">₹{estimatedFareRupees}</strong>
        </div>

        <Link
          to="/map"
          search={{ from: originName, to: destName }}
          className="bg-[#4F46E5] hover:bg-indigo/90 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span>Track on Live Map</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

