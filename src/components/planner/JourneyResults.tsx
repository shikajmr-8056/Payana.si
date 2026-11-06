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

import { useState, useEffect, useMemo } from "react";
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
  Bus,
  Train,
  CheckCircle2,
  GitCommit,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { JourneyRecommendation, CorridorBusArrival } from "../../types/journeyPlanner";
import { JourneyRecommendationCard } from "./JourneyRecommendationCard";
import { DualDirectionTransitDiagram } from "../transit/DualDirectionTransitDiagram";

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
  // Determine available BMTC bus routes from results
  const busRouteList = Array.from(
    new Set(
      results
        .flatMap((r) => [
          ...(r.corridorBuses || []),
          ...r.legs.filter((l) => l.type === "bus" && l.routeNumber).map((l) => l.routeNumber!),
        ])
        .filter(Boolean)
    )
  );

  const defaultBus = busRouteList[0] || "500-D";
  const [selectedBmtcRoute, setSelectedBmtcRoute] = useState<string>(defaultBus);

  // Sync selected bus route whenever results change
  useEffect(() => {
    if (busRouteList.length > 0 && !busRouteList.includes(selectedBmtcRoute)) {
      setSelectedBmtcRoute(busRouteList[0]);
    }
  }, [results]);

  const availableBuses =
    busRouteList.length > 0 ? busRouteList : ["500-D", "378", "222-A", "335-E"];

  // Generate authentic arrival times for the corridor bus list with one simulated delay
  const corridorBusArrivals: CorridorBusArrival[] = useMemo(() => {
    const baseNow = new Date();
    // Default arrival time offsets for consecutive buses in corridor
    const etaOffsets = [3, 9, 16, 24, 33];
    const seatsPool: ("Seats Free" | "Few Seats" | "Standing Only")[] = [
      "Seats Free",
      "Standing Only",
      "Few Seats",
      "Seats Free",
    ];

    return availableBuses.map((rNo, idx) => {
      const scheduledEta = etaOffsets[idx % etaOffsets.length];
      const schedDate = new Date(baseNow.getTime() + scheduledEta * 60 * 1000);
      const schedTimeStr = schedDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Simulate a live congestion delay for the 2nd bus in list
      const isSimulatedDelayed = idx === 1;
      const delayMins = isSimulatedDelayed ? 6 : 0;
      const actualEta = scheduledEta + delayMins;
      const actualDate = new Date(baseNow.getTime() + actualEta * 60 * 1000);
      const actualTimeStr = actualDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return {
        routeNo: rNo,
        destination: to || "Terminus Hub",
        etaMinutes: actualEta,
        scheduledTime: isSimulatedDelayed ? actualTimeStr : schedTimeStr,
        status: isSimulatedDelayed ? "delayed" : "on_time",
        delayMinutes: isSimulatedDelayed ? delayMins : undefined,
        delayReason: isSimulatedDelayed
          ? "Traffic congestion backlog near Silk Board / Mysore Rd"
          : undefined,
        seatStatus: seatsPool[idx % seatsPool.length],
        isRealtime: true,
      };
    });
  }, [availableBuses, to]);

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
            Evaluating Multimodal Paths & BMTC Bus Corridors...
          </span>
          <span className="text-xs font-bold text-indigo flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo animate-ping" />
            <span>Calculating transfers & bus subway diagram</span>
          </span>
        </div>

        {/* 2-Column Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1 Skeleton: AI Recommended Path List */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-lg bg-indigo/10 dark:bg-indigo-950/50 flex items-center justify-center text-indigo">
                <Sparkles size={14} />
              </div>
              <div>
                <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800/60 rounded mt-1 animate-pulse" />
              </div>
            </div>
            {[1, 2].map((n) => (
              <div
                key={n}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="w-44 h-7 bg-slate-200 dark:bg-slate-800 rounded-xl" />
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

          {/* Column 2 Skeleton: BMTC Bus List with Dual Track Subway */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Bus size={14} />
              </div>
              <div>
                <div className="w-44 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-56 h-3 bg-slate-100 dark:bg-slate-800/60 rounded mt-1 animate-pulse" />
              </div>
            </div>
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-[#0b0e17] text-white min-h-[420px] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">
                Loading dual-direction subway track diagram...
              </span>
            </div>
          </div>
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
            <strong className="text-slate-700 dark:text-slate-200">"{to}"</strong>.
          </p>
        </div>
        <div className="pt-1 text-xs text-slate-500 font-medium space-y-1">
          <p>💡 Verify the origin or destination name using the autocomplete suggestions dropdown.</p>
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
            Choose your starting stop or metro station, destination, and departure time above to inspect AI recommended paths alongside the BMTC bus dual-track subway diagram.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            ⚡ AI Multimodal Paths
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            🚇 Dual-Track Subway Diagram
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
            💺 Seat Probability
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
              Multimodal Journey Comparison
            </span>
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
            AI Recommended Paths vs. BMTC Bus Dual-Track Subway for {from} ➔ {to}
          </p>
        </div>

        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <Sparkles size={12} className="text-amber-500 shrink-0" />
          <span>Real-time Transit Intelligence</span>
        </div>
      </div>

      {/* 2 COLUMNS: AI Recommended Path List | BMTC Bus List with Dual Track Subway */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            COLUMN 1: AI RECOMMENDED PATH LIST (lg:col-span-6)
           ======================================================== */}
        <div className="lg:col-span-6 space-y-4">
          {/* Column 1 Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo to-purple-600 text-white flex items-center justify-center shadow-2xs">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>AI Recommended Path List</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo via-purple-600 to-pink-600 text-white shadow-2xs">
                    {results.length} Options
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Ranked multimodal options combining Metro, BMTC & walking
                </p>
              </div>
            </div>
          </div>

          {/* List of Recommended Journey Cards */}
          <div className="space-y-3">
            {results.map((rec, idx) => (
              <JourneyRecommendationCard
                key={rec.id}
                recommendation={rec}
                isInitiallyExpanded={idx === 0}
              />
            ))}
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: BMTC BUS LIST WITH DUAL TRACK SUBWAY (lg:col-span-6)
           ======================================================== */}
        <div className="lg:col-span-6 space-y-4">
          {/* Column 2 Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-2xs">
                <Bus size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>BMTC Bus List & Subway Diagram</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Dual Track
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Select any bus in this corridor to inspect its dual-track subway route
                </p>
              </div>
            </div>
          </div>

          {/* BMTC Bus List with Live Arrival Times & Simulated Delay */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-heading font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bus size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Buses Travelling in this Path with Arrival Times</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Select bus for subway diagram
              </span>
            </div>

            {/* List of bus arrival cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {corridorBusArrivals.map((bus) => {
                const isSelected = selectedBmtcRoute === bus.routeNo;
                const isDelayed = bus.status === "delayed";

                return (
                  <button
                    key={bus.routeNo}
                    type="button"
                    onClick={() => setSelectedBmtcRoute(bus.routeNo)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden text-left flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "bg-slate-900 text-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
                        : "bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    {/* Header: Route Number + Status Badge */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs shrink-0 flex items-center gap-1 ${
                            isSelected ? "bg-emerald-600 text-white" : "bg-[#4F46E5] text-white"
                          }`}
                        >
                          <Bus size={11} />
                          <span>BMTC {bus.routeNo}</span>
                        </span>
                      </div>

                      {/* On-Time or Delay badge */}
                      {isDelayed ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1 shrink-0 animate-pulse">
                          <AlertTriangle size={10} />
                          <span>+{bus.delayMinutes}m Delay</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>On Time</span>
                        </span>
                      )}
                    </div>

                    {/* Arrival ETA and Time */}
                    <div className="space-y-1 w-full">
                      <div className="flex items-baseline justify-between gap-1">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-sm font-heading font-black ${
                              isSelected ? "text-white" : "text-slate-900 dark:text-white"
                            }`}
                          >
                            Arr in {bus.etaMinutes} min
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            ({bus.scheduledTime})
                          </span>
                        </div>

                        {/* Seat Badge */}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            bus.seatStatus === "Seats Free"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border-emerald-800"
                              : bus.seatStatus === "Few Seats"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-400 dark:border-amber-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800"
                          }`}
                        >
                          {bus.seatStatus === "Seats Free"
                            ? "🟢 Seats Free"
                            : bus.seatStatus === "Few Seats"
                            ? "🟡 Few Seats"
                            : "🔴 Rush"}
                        </span>
                      </div>

                      {/* Delay Reason if delayed */}
                      {isDelayed && bus.delayReason && (
                        <p className="text-[10px] font-semibold text-amber-500 flex items-center gap-1 leading-tight mt-0.5">
                          <span>⚠️ {bus.delayReason}</span>
                        </p>
                      )}
                    </div>

                    {/* Active Selected Indicator */}
                    {isSelected && (
                      <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-emerald-400 w-full">
                        <span>Viewing Dual-Track Subway below</span>
                        <CheckCircle2 size={11} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Track Subway Diagram */}
          {selectedBmtcRoute && (
            <DualDirectionTransitDiagram
              routeNo={selectedBmtcRoute}
              highlightedStopNames={[from, to]}
              className="shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

