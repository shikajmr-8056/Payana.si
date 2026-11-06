/**
 * Payana Journey Planner Page
 *
 * Implements:
 * 1. By Route Number: Search authentic BMTC bus routes (12, 500-D, KIA-9) with timetables & dual-track subway diagram.
 * 2. Personalized Multimodal Journey Planner:
 *    - Origin & destination autocomplete (BMTC stops + Metro stations)
 *    - GPS current location & swap
 *    - Departure timing (Leave now / Depart at / Arrive by)
 *    - Transport mode selection (BMTC Only, Metro Only, BMTC + Metro)
 *    - Personalized priorities (Fastest, Best chance of seat, Cheapest, Least walking, Fewer transfers)
 *    - Seating preference control (Prefer a seat / No preference)
 *    - Accurate recommendation tags (FASTEST, BEST CHANCE OF SEAT, CHEAPEST, etc.)
 *    - Expandable journey cards with leg-by-leg timeline and interactive Leaflet map preview
 *    - Honest occupancy reporting ("Unknown" when unavailable)
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Bus,
  Search,
  Crosshair,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  IndianRupee,
  Leaf,
  ArrowUpDown,
  Compass,
  Map,
  GitCommit,
  X,
  ArrowRight,
} from "lucide-react";
import { PageShell } from "../components/PageShell";
import { RouteMapPreview } from "../components/map/RouteMapPreview";
import { DualDirectionTransitDiagram } from "../components/transit/DualDirectionTransitDiagram";
import {
  loadAllStops,
  searchRoutesByNumber,
  getRouteDetails,
  type BusStopItem,
  type RouteServiceItem,
  type RouteTiming,
} from "../lib/transitService";

// Multimodal Components & Engine
import { JourneySearchForm } from "../components/planner/JourneySearchForm";
import { TransportModeSelector } from "../components/planner/TransportModeSelector";
import { JourneyPreferenceSelector } from "../components/planner/JourneyPreferenceSelector";
import { JourneyResults } from "../components/planner/JourneyResults";
import { planMultimodalJourney } from "../lib/multimodalPlannerEngine";
import type {
  JourneyPlanRequest,
  JourneyRecommendation,
  TransportModeFilter,
  TravelPriority,
  SeatingPreference,
  DepartureTimingPreference,
} from "../types/journeyPlanner";

const planSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  bus: z.string().optional(),
  tab: z.enum(["route", "place"]).optional(),
});

export const Route = createFileRoute("/plan")({
  validateSearch: planSearchSchema,
  head: () => ({
    meta: [
      { title: "Journey Planner — payana.ai" },
      {
        name: "description",
        content:
          "Personalized multimodal public transport journey planner combining BMTC buses, Namma Metro, and walking with real-time crowd and seat intelligence.",
      },
    ],
  }),
  component: PlanPage,
});

const POPULAR_ROUTES = [
  "12",
  "500-D",
  "378",
  "335-E",
  "201-G",
  "KIA-9",
  "G-3",
  "365",
  "375-D",
  "252-H",
];

function PlanPage() {
  const searchParams = Route.useSearch();

  // Active Tab: "route" for Search by Bus Number, "place" for Multimodal Journey Planner
  const [activeTab, setActiveTab] = useState<"route" | "place">(
    searchParams.tab || (searchParams.bus ? "route" : "place")
  );

  // -------------------------------------------------------------
  // TAB 1: SEARCH BY BUS NUMBER STATE
  // -------------------------------------------------------------
  const [busInput, setBusInput] = useState(searchParams.bus || "");
  const [busSuggestions, setBusSuggestions] = useState<RouteServiceItem[]>([]);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState<{
    service: RouteServiceItem | null;
    stops: BusStopItem[];
    timings: RouteTiming[];
    geometry: [number, number][];
  } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeViewMode, setRouteViewMode] = useState<"diagram" | "map">("diagram");

  // -------------------------------------------------------------
  // TAB 2: PERSONALIZED MULTIMODAL JOURNEY PLANNER STATE
  // -------------------------------------------------------------
  const [fromPlace, setFromPlace] = useState(searchParams.from || "");
  const [toPlace, setToPlace] = useState(searchParams.to || "");
  const [departureTiming, setDepartureTiming] = useState<DepartureTimingPreference>({
    type: "now",
    time: "08:30",
  });
  const [transportMode, setTransportMode] = useState<TransportModeFilter>("all");
  const [primaryPriority, setPrimaryPriority] = useState<TravelPriority>("fastest");
  const [secondaryPriorities, setSecondaryPriorities] = useState<TravelPriority[]>(["seat"]);
  const [seatingPreference, setSeatingPreference] = useState<SeatingPreference>("no_preference");

  const [multimodalResults, setMultimodalResults] = useState<JourneyRecommendation[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [hasPlanned, setHasPlanned] = useState(Boolean(searchParams.from && searchParams.to));
  const [planError, setPlanError] = useState<string | null>(null);

  // Fetch initial route details for Tab 1
  useEffect(() => {
    if (busInput.trim()) {
      handleLoadRoute(busInput.trim());
    }
  }, []);

  // Filter bus suggestions when typing in Tab 1
  useEffect(() => {
    if (!busInput.trim()) {
      setBusSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchRoutesByNumber(busInput, 8).then(setBusSuggestions);
    }, 180);
    return () => clearTimeout(timer);
  }, [busInput]);

  // Load complete route details for Tab 1
  const handleLoadRoute = async (routeNo: string) => {
    setIsLoadingRoute(true);
    setBusSuggestions([]);
    try {
      const details = await getRouteDetails(routeNo);
      setSelectedRouteDetails(details);
    } catch (err) {
      console.error("Error loading route details", err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Run Multimodal Journey Planner
  const handleRunMultimodalPlan = async (
    overrideFrom?: string,
    overrideTo?: string,
    overrideMode?: TransportModeFilter,
    overridePrimary?: TravelPriority,
    overrideSecondaries?: TravelPriority[],
    overrideSeating?: SeatingPreference,
    overrideTiming?: DepartureTimingPreference
  ) => {
    const f = (overrideFrom !== undefined ? overrideFrom : fromPlace).trim();
    const t = (overrideTo !== undefined ? overrideTo : toPlace).trim();
    const mode = overrideMode || transportMode;
    const pri = overridePrimary || primaryPriority;
    const sec = overrideSecondaries || secondaryPriorities;
    const seat = overrideSeating || seatingPreference;
    const timing = overrideTiming || departureTiming;

    if (!f || !t) return;
    if (f.toLowerCase() === t.toLowerCase()) {
      setPlanError("Origin and destination cannot be the same location.");
      setMultimodalResults([]);
      setHasPlanned(true);
      return;
    }

    setIsPlanning(true);
    setPlanError(null);
    setHasPlanned(true);

    try {
      const results = await planMultimodalJourney({
        from: f,
        to: t,
        transportMode: mode,
        primaryPriority: pri,
        secondaryPriorities: sec,
        seatingPreference: seat,
        departureTiming: timing,
      });
      setMultimodalResults(results);
    } catch (err: any) {
      console.error("Multimodal planning error:", err);
      setPlanError("Unable to calculate multimodal route. Please try another stop or location.");
      setMultimodalResults([]);
    } finally {
      setIsPlanning(false);
    }
  };

  // Auto-search multimodal on mount if search params provided
  useEffect(() => {
    if (searchParams.from && searchParams.to) {
      handleRunMultimodalPlan(searchParams.from, searchParams.to);
    }
  }, [searchParams.from, searchParams.to]);

  // Handlers for preference changes
  const handlePrimaryChange = (p: TravelPriority) => {
    setPrimaryPriority(p);
    const nextSec = secondaryPriorities.filter((item) => item !== p);
    setSecondaryPriorities(nextSec);
    if (hasPlanned && fromPlace.trim() && toPlace.trim()) {
      handleRunMultimodalPlan(undefined, undefined, undefined, p, nextSec);
    }
  };

  const handleToggleSecondary = (p: TravelPriority) => {
    const next = secondaryPriorities.includes(p)
      ? secondaryPriorities.filter((item) => item !== p)
      : [...secondaryPriorities, p];
    setSecondaryPriorities(next);
    if (hasPlanned && fromPlace.trim() && toPlace.trim()) {
      handleRunMultimodalPlan(undefined, undefined, undefined, undefined, next);
    }
  };

  const handleTransportModeChange = (m: TransportModeFilter) => {
    setTransportMode(m);
    if (hasPlanned && fromPlace.trim() && toPlace.trim()) {
      handleRunMultimodalPlan(undefined, undefined, m);
    }
  };

  const handleSeatingChange = (s: SeatingPreference) => {
    setSeatingPreference(s);
    if (hasPlanned && fromPlace.trim() && toPlace.trim()) {
      handleRunMultimodalPlan(undefined, undefined, undefined, undefined, undefined, s);
    }
  };

  const handleTimingChange = (t: DepartureTimingPreference) => {
    setDepartureTiming(t);
    if (hasPlanned && fromPlace.trim() && toPlace.trim()) {
      handleRunMultimodalPlan(undefined, undefined, undefined, undefined, undefined, undefined, t);
    }
  };

  return (
    <PageShell title="Journey Planner">
      {/* Page Title & Navigation Tabs */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 text-indigo text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={12} />
              <span>Personalized Multimodal Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white">
              Plan Your Bengaluru Journey
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Combine BMTC buses, Namma Metro lines, and walking with personalized travel priorities.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("place")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "place"
                  ? "bg-indigo text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Navigation size={15} />
              <span>Multimodal Planner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("route")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "route"
                  ? "bg-indigo text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Bus size={15} />
              <span>By Route Number</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: BY ROUTE NUMBER (PRESERVED & FULLY FUNCTIONAL)
         ======================================================== */}
      {activeTab === "route" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Search & Quick Selection) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Search Bus Route Number
              </label>

              <div className="relative">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
                  <Search size={18} className="text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    value={busInput}
                    onChange={(e) => setBusInput(e.target.value)}
                    placeholder="Enter route number..."
                    className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none uppercase"
                  />
                  {busInput && (
                    <button
                      type="button"
                      onClick={() => setBusInput("")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {busSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {busSuggestions.map((s) => (
                      <button
                        key={s.routeNo}
                        type="button"
                        onClick={() => {
                          setBusInput(s.routeNo);
                          handleLoadRoute(s.routeNo);
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-[#4F46E5] text-white font-black px-2 py-0.5 rounded text-[11px]">
                            {s.routeNo}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {s.name}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {s.stopsCount} stops
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Bengaluru Routes Pills */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-black uppercase text-slate-400 block">
                  Popular BMTC Routes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_ROUTES.map((rNo) => {
                    const isActive = busInput.toUpperCase() === rNo.toUpperCase();
                    return (
                      <button
                        key={rNo}
                        type="button"
                        onClick={() => {
                          setBusInput(rNo);
                          handleLoadRoute(rNo);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {rNo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timetable Card (First / Last Bus Times) */}
            {selectedRouteDetails?.timings && selectedRouteDetails.timings.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo font-bold text-xs">
                  <Clock size={15} />
                  <span>Official Bus Departure Timings</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedRouteDetails.timings.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                    >
                      <div className="text-[10px] text-slate-400 font-bold uppercase truncate">
                        {t.direction}
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-100">
                        {t.firstBus} ➔ {t.lastBus}
                      </div>
                      <div className="text-[10px] text-indigo font-semibold">
                        Every ~{t.frequencyMinutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Route Diagram / Map / Stops) */}
          <div className="lg:col-span-7 space-y-4">
            {isLoadingRoute ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-indigo border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading authentic route corridor...</p>
              </div>
            ) : selectedRouteDetails?.service ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* View Switcher: Diagram vs Map */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="bg-[#4F46E5] text-white font-extrabold px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
                      BMTC {selectedRouteDetails.service.routeNo}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {selectedRouteDetails.stops.length} Stops
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRouteViewMode("diagram")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        routeViewMode === "diagram"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <GitCommit size={13} />
                      <span>Subway Diagram</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteViewMode("map")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        routeViewMode === "map"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Map size={13} />
                      <span>Live Map</span>
                    </button>
                  </div>
                </div>

                {/* Diagram View or Map View */}
                {routeViewMode === "diagram" ? (
                  <DualDirectionTransitDiagram
                    routeNo={selectedRouteDetails.service.routeNo}
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                    <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white leading-snug">
                      {selectedRouteDetails.service.name}
                    </h2>
                    {selectedRouteDetails.geometry.length > 0 && (
                      <RouteMapPreview
                        geometry={selectedRouteDetails.geometry}
                        startName={selectedRouteDetails.service.from}
                        endName={selectedRouteDetails.service.to}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
                <Compass size={28} className="mx-auto text-indigo" />
                <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  Select or Enter a Route Number
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Search any BMTC route (e.g. 500-D, 12, KIA-9) to view its official timetable, stop sequence, and dual-track subway diagram.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PERSONALIZED MULTIMODAL JOURNEY PLANNER
         ======================================================== */}
      {activeTab === "place" && (
        <div className="space-y-6">
          {/* Main Search & Preference Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center shrink-0">
                <Navigation size={17} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Personalized Multimodal Journey Planner
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Plan your journey across Bengaluru combining BMTC buses, Namma Metro, and walking with smart crowd & seat intelligence.
                </p>
              </div>
            </div>

            {/* 1. Journey Search Form (From, To, GPS, Swap, Departure Time) */}
            <JourneySearchForm
              from={fromPlace}
              to={toPlace}
              departureTiming={departureTiming}
              onFromChange={setFromPlace}
              onToChange={setToPlace}
              onTimingChange={handleTimingChange}
              onSubmit={() => handleRunMultimodalPlan()}
              isSearching={isPlanning}
            />

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-6">
              {/* 2. Transport Mode Selector (BMTC Only / Metro Only / BMTC + Metro) */}
              <TransportModeSelector
                selectedMode={transportMode}
                onChange={handleTransportModeChange}
              />

              {/* 3. Personalized Travel Priorities & Seating Control */}
              <JourneyPreferenceSelector
                primaryPriority={primaryPriority}
                secondaryPriorities={secondaryPriorities}
                seatingPreference={seatingPreference}
                onPrimaryChange={handlePrimaryChange}
                onToggleSecondary={handleToggleSecondary}
                onSeatingChange={handleSeatingChange}
              />
            </div>
          </div>

          {/* 4. Journey Results (All states: Initial, Loading, Results, No route found, Error) */}
          <JourneyResults
            results={multimodalResults}
            isLoading={isPlanning}
            hasSearched={hasPlanned}
            error={planError}
            from={fromPlace}
            to={toPlace}
          />
        </div>
      )}
    </PageShell>
  );
}

export default PlanPage;
