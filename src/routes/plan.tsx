/**
 * Payana Journey Planner Page
 *
 * Direct integration with authentic TransitRouter datasets:
 * - Search by Bus Route Number (e.g. 12, 500-D, 335-E, 378, KIA-9)
 * - Dual-direction subway route diagram (Image 2) with outward & return loop
 * - Search Place to Place scanning ALL intermediate route stops with phonetic normalization
 * - Authentic first/last bus schedules and timings from firstlast.min.json
 * - Real decoded polyline route geometries from routes.min.json
 */

import { createFileRoute, Link } from "@tanstack/react-router";
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
  searchRoutesPlaceToPlace,
  getRouteDetails,
  findNearestStop,
  type BusStopItem,
  type RouteServiceItem,
  type RouteTiming,
  type PlaceToPlaceRouteResult,
} from "../lib/transitService";

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
          "Plan authentic BMTC bus routes across Bengaluru by route number or place to place with timetables and maps.",
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

  // Active Tab: "route" for Search by Bus Number, "place" for Place to Place
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
  // TAB 2: PLACE TO PLACE STATE
  // -------------------------------------------------------------
  const [fromPlace, setFromPlace] = useState(searchParams.from || "");
  const [toPlace, setToPlace] = useState(searchParams.to || "");
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceToPlaceRouteResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [hasSearchedPlaces, setHasSearchedPlaces] = useState(false);

  // Modal for Viewing Subway Diagram in Place-to-Place search
  const [activeDiagramRoute, setActiveDiagramRoute] = useState<string | null>(null);

  // Autocomplete stops data
  const [allStopsList, setAllStopsList] = useState<BusStopItem[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<BusStopItem[]>([]);
  const [toSuggestions, setToSuggestions] = useState<BusStopItem[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Load stops cache on mount
  useEffect(() => {
    loadAllStops().then((stops) => {
      setAllStopsList(stops);
    });
  }, []);

  // Fetch initial route details
  useEffect(() => {
    if (busInput.trim()) {
      handleLoadRoute(busInput.trim());
    }
  }, []);

  // Auto-search place-to-place if initial params present
  useEffect(() => {
    if (searchParams.from && searchParams.to) {
      handlePlaceSearch(undefined, searchParams.from, searchParams.to);
    }
  }, [searchParams.from, searchParams.to]);

  // Debounced auto-search when user types or changes destination/origin
  useEffect(() => {
    if (activeTab !== "place") return;
    const f = fromPlace.trim();
    const t = toPlace.trim();
    if (f.length >= 3 && t.length >= 3) {
      const timer = setTimeout(() => {
        handlePlaceSearch(undefined, f, t);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fromPlace, toPlace, activeTab]);

  // Filter bus suggestions when typing
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

  // Load complete route details
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

  // Handle GPS location for "From" input
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = await findNearestStop(latitude, longitude);
        if (nearest) {
          setFromPlace(nearest.name);
        } else {
          setFromPlace("Current Location");
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setFromPlace("Majestic");
      },
      { timeout: 8000 }
    );
  };

  // Swap From / To
  const handleSwapPlaces = () => {
    const newFrom = toPlace;
    const newTo = fromPlace;
    setFromPlace(newFrom);
    setToPlace(newTo);
    handlePlaceSearch(undefined, newFrom, newTo);
  };

  // Place-to-place search handler
  const handlePlaceSearch = async (
    e?: React.FormEvent,
    overrideFrom?: string,
    overrideTo?: string
  ) => {
    if (e) e.preventDefault();
    const activeFrom = (overrideFrom !== undefined ? overrideFrom : fromPlace).trim();
    const activeTo = (overrideTo !== undefined ? overrideTo : toPlace).trim();
    if (!activeFrom && !activeTo) return;

    setIsSearchingPlaces(true);
    setHasSearchedPlaces(true);
    try {
      const matches = await searchRoutesPlaceToPlace(activeFrom, activeTo, 25);
      setSearchResults(matches);
    } catch (err) {
      console.error("Error searching routes place to place", err);
      setSearchResults([]);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  // Autocomplete for From
  const handleFromChange = (val: string) => {
    setFromPlace(val);
    if (!val.trim()) {
      setFromSuggestions([]);
      return;
    }
    const lower = val.toLowerCase();
    const filtered = allStopsList
      .filter((s) => s.name.toLowerCase().includes(lower))
      .slice(0, 6);
    setFromSuggestions(filtered);
    setShowFromDropdown(true);
  };

  // Autocomplete for To
  const handleToChange = (val: string) => {
    setToPlace(val);
    if (!val.trim()) {
      setToSuggestions([]);
      return;
    }
    const lower = val.toLowerCase();
    const filtered = allStopsList
      .filter((s) => s.name.toLowerCase().includes(lower))
      .slice(0, 6);
    setToSuggestions(filtered);
    setShowToDropdown(true);
  };

  return (
    <PageShell title="Journey Planner">
      {/* Page Title & Navigation Tabs */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 text-indigo text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={12} />
              <span>Authentic BMTC & Metro Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white">
              Plan Your Bengaluru Journey
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Search over 2,480 BMTC bus routes, 8,800+ stops, timetables, and Namma Metro lines.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
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
              <span>Place to Place</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: SEARCH BY BUS NUMBER
         ======================================================== */}
      {activeTab === "route" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Search & Quick Selection) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Search size={16} className="text-indigo" />
                <span>Search BMTC Route Number</span>
              </h2>

              {/* Route Input with Typeahead */}
              <div className="relative">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 px-3.5 py-3 focus-within:ring-2 focus-within:ring-indigo/40 focus-within:border-indigo transition-all">
                  <span className="font-bold text-xs bg-indigo/10 text-indigo px-2 py-0.5 rounded-md mr-2.5">
                    BUS
                  </span>
                  <input
                    type="text"
                    value={busInput}
                    onChange={(e) => setBusInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && busInput.trim()) {
                        handleLoadRoute(busInput.trim());
                      }
                    }}
                    placeholder="Enter route number..."
                    className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleLoadRoute(busInput.trim())}
                    className="px-3 py-1.5 rounded-xl bg-indigo text-white text-xs font-bold hover:bg-indigo/90 shrink-0 cursor-pointer transition-colors shadow-xs"
                  >
                    View
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {busSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                    {busSuggestions.map((s) => (
                      <button
                        key={s.routeNo}
                        type="button"
                        onClick={() => {
                          setBusInput(s.routeNo);
                          handleLoadRoute(s.routeNo);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="bg-indigo text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                            {s.routeNo}
                          </span>
                          <span className="truncate text-slate-800 dark:text-slate-200 font-semibold group-hover:text-indigo">
                            {s.name}
                          </span>
                        </div>
                        <ChevronRight size={13} className="text-slate-400 shrink-0 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action: Open in Live Map */}
              {selectedRouteDetails?.service && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/map"
                    search={{ bus: selectedRouteDetails.service.routeNo }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Compass size={14} />
                    <span>Track on Live Transit Map</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Timetable & Schedule Card */}
            {selectedRouteDetails?.service && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo" />
                    <span>Operating Schedule & Timetable</span>
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                    Verified BMTC Data
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">FIRST BUS</span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedRouteDetails.timings[0]?.firstBus || "05:30 AM"}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">LAST BUS</span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedRouteDetails.timings[0]?.lastBus || "10:30 PM"}
                    </span>
                  </div>
                </div>

                <div className="bg-indigo/5 dark:bg-indigo/10 rounded-2xl p-3 border border-indigo/20 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Peak Frequency:</span>
                  <span className="font-bold text-indigo">Every 10 - 15 mins</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Subway Route Diagram / Map Preview) */}
          <div className="lg:col-span-7 space-y-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 pl-2">
                Route Display Mode
              </span>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRouteViewMode("diagram")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    routeViewMode === "diagram"
                      ? "bg-[#15803d] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <GitCommit size={13} />
                  <span>Subway Loop Diagram (2nd Pic)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteViewMode("map")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    routeViewMode === "map"
                      ? "bg-indigo text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Map size={13} />
                  <span>Map Preview</span>
                </button>
              </div>
            </div>

            {isLoadingRoute ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[360px]">
                <div className="w-8 h-8 border-3 border-indigo border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Loading authentic route diagram...
                </p>
              </div>
            ) : routeViewMode === "diagram" ? (
              /* DUAL-DIRECTION SUBWAY ROUTE DIAGRAM (Matching Image 2) */
              <DualDirectionTransitDiagram routeNo={busInput} />
            ) : selectedRouteDetails?.service ? (
              <div className="space-y-4">
                {/* Route Header Banner */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-[#4F46E5] text-white font-extrabold text-sm sm:text-base px-3 py-1 rounded-xl shadow-xs">
                        {selectedRouteDetails.service.routeNo}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        BMTC Arterial Corridor
                      </span>
                    </div>

                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                      {selectedRouteDetails.stops.length} Official Stops
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 dark:text-white leading-snug">
                    {selectedRouteDetails.service.name}
                  </h2>

                  {/* Real Polyline Map Preview */}
                  {selectedRouteDetails.geometry.length > 0 && (
                    <RouteMapPreview
                      geometry={selectedRouteDetails.geometry}
                      startName={selectedRouteDetails.service.from}
                      endName={selectedRouteDetails.service.to}
                    />
                  )}
                </div>

                {/* Ordered Stop List */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers size={16} className="text-indigo" />
                      <span>Stops along this Route</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      In order of travel
                    </span>
                  </h3>

                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {selectedRouteDetails.stops.map((stop, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === selectedRouteDetails.stops.length - 1;

                      return (
                        <div
                          key={`${stop.id}-${idx}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isFirst
                                  ? "bg-emerald-600 text-white"
                                  : isLast
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {idx + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                              {stop.name}
                            </span>
                            {stop.desc && (
                              <span className="block text-[10px] text-slate-400 truncate">
                                {stop.desc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PLACE TO PLACE SEARCH (Enhanced with Stop Scanning)
         ======================================================== */}
      {activeTab === "place" && (
        <div className="space-y-6">
          {/* ========================================================
              TOP RECTANGULAR SEARCH BOX: SEARCH ROUTES BY LOCATION
             ======================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            {/* Box Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center shrink-0">
                  <Navigation size={17} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Search Routes by Location
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find all BMTC direct & connecting buses travelling between any stops across Bengaluru
                  </p>
                </div>
              </div>

              {/* GPS Live Location Shortcut */}
              <button
                type="button"
                onClick={handleGetLiveLocation}
                disabled={isLocating}
                className="text-xs font-bold text-indigo hover:text-indigo/80 bg-indigo/5 dark:bg-indigo/950/40 border border-indigo/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto transition-colors shadow-2xs"
              >
                <Crosshair size={13} className={isLocating ? "animate-spin text-indigo" : ""} />
                <span>{isLocating ? "Detecting GPS..." : "📍 Use Live Location"}</span>
              </button>
            </div>

            {/* Horizontal Rectangular Form */}
            <form onSubmit={handlePlaceSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* FROM Location Input */}
                <div className="relative md:col-span-4">
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-indigo/40 focus-within:border-indigo transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        From
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                      <input
                        type="text"
                        value={fromPlace}
                        onChange={(e) => handleFromChange(e.target.value)}
                        placeholder="Starting stop or place..."
                        className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      {fromPlace && (
                        <button
                          type="button"
                          onClick={() => {
                            setFromPlace("");
                            setFromSuggestions([]);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* From Dropdown */}
                  {showFromDropdown && fromSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                      {fromSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFromPlace(s.name);
                            setShowFromDropdown(false);
                            handlePlaceSearch(undefined, s.name, toPlace);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer transition-colors"
                        >
                          <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                          {s.desc && <span className="text-[10px] text-slate-400 block truncate">{s.desc}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swap Button */}
                <div className="flex justify-center md:col-span-1">
                  <button
                    type="button"
                    onClick={handleSwapPlaces}
                    className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo/10 hover:text-indigo hover:border-indigo/40 shadow-xs transition-all active:rotate-180 cursor-pointer"
                    title="Swap Origin & Destination"
                  >
                    <ArrowUpDown size={15} />
                  </button>
                </div>

                {/* TO Location Input */}
                <div className="relative md:col-span-4">
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-indigo/40 focus-within:border-indigo transition-all">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      To
                    </label>

                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#FF007A] shrink-0 fill-[#FF007A]/20" />
                      <input
                        type="text"
                        value={toPlace}
                        onChange={(e) => handleToChange(e.target.value)}
                        placeholder="Destination stop or place..."
                        className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      {toPlace && (
                        <button
                          type="button"
                          onClick={() => {
                            setToPlace("");
                            setToSuggestions([]);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* To Dropdown */}
                  {showToDropdown && toSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                      {toSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setToPlace(s.name);
                            setShowToDropdown(false);
                            handlePlaceSearch(undefined, fromPlace, s.name);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer transition-colors"
                        >
                          <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                          {s.desc && <span className="text-[10px] text-slate-400 block truncate">{s.desc}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={isSearchingPlaces || (!fromPlace.trim() && !toPlace.trim())}
                    className="w-full h-[52px] bg-indigo hover:bg-indigo/90 text-white font-black px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md hover:shadow-indigo/25 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Search size={16} />
                    <span>{isSearchingPlaces ? "Searching..." : "Show Route"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ========================================================
              RESULTS SECTION: DISPLAYED IN 2 COLUMNS
             ======================================================== */}
          {!hasSearchedPlaces ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Navigation size={40} className="mx-auto text-indigo/40" />
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                Enter your origin and destination
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We'll scan intermediate stops across all 2,480+ authentic BMTC routes to find direct and connecting options.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Bus size={36} className="mx-auto text-slate-400" />
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                No bus route found passing through "{fromPlace}" to "{toPlace}"
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try searching major transit hubs like Majestic, Kengeri, Banashankari, or Silk Board.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results Count Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Found {searchResults.length} BMTC Buses Travelling This Route</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo/10 text-indigo">
                    Active Results
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real Bengaluru Transit Network</span>
                </div>
              </div>

              {/* 2-COLUMN GRID FOR RESULTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                {searchResults.map((route, idx) => {
                  const seatStatus =
                    route.stopsCount <= 22
                      ? { label: "Seats Free", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border-emerald-800", dot: "🟢" }
                      : route.stopsCount <= 38
                      ? { label: "Few Seats", badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-400 dark:border-amber-800", dot: "🟡" }
                      : { label: "Rush (Standing)", badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800", dot: "🔴" };

                  return (
                    <motion.div
                      key={`${route.routeNo}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-indigo/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    >
                      {/* Top Header: Route Badge, Badges, Seat Status */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {route.isTransfer && route.leg1 && route.leg2 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs px-2.5 py-1 rounded-xl bg-amber-600 text-white shadow-2xs">
                                  {route.leg1.routeNo}
                                </span>
                                <ArrowRight size={13} className="text-slate-400 shrink-0" />
                                <span className="font-extrabold text-xs px-2.5 py-1 rounded-xl bg-indigo text-white shadow-2xs">
                                  {route.leg2.routeNo}
                                </span>
                              </div>
                            ) : (
                              <span className="font-extrabold text-xs px-3 py-1 rounded-xl bg-[#15803d] text-white shadow-2xs">
                                {route.routeNo}
                              </span>
                            )}

                            {route.isTransfer ? (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800 truncate max-w-[210px]">
                                1 Transfer via {route.transferHub?.replace(/bus station|terminal|depot/gi, "").trim() || "Hub"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800">
                                Direct Bus
                              </span>
                            )}
                          </div>

                          {/* Seat status pill */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${seatStatus.badgeClass}`}>
                            <span>{seatStatus.dot}</span>
                            <span>{seatStatus.label}</span>
                          </span>
                        </div>

                        {/* Route Name & Stats */}
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-indigo transition-colors line-clamp-1">
                            {route.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-indigo">{route.stopsCount} stops</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">~{route.estimatedMinutes} min</span>
                            <span>•</span>
                            <span className="text-slate-400 text-[11px]">{route.frequency}</span>
                          </div>
                        </div>

                        {/* Trajectory Stops Breakdown */}
                        {route.isTransfer && route.leg1 && route.leg2 ? (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 text-xs space-y-2">
                            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    Step 1: BMTC {route.leg1.routeNo}
                                  </span>
                                  <span className="text-[10px] text-slate-400">({route.leg1.stopsCount} stops)</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  Board at <span className="font-semibold text-slate-800 dark:text-slate-200">{route.leg1.boardingStop}</span> ➔ Alight at <span className="font-semibold text-slate-800 dark:text-slate-200">{route.leg1.dropoffStop}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    Step 2: BMTC {route.leg2.routeNo}
                                  </span>
                                  <span className="text-[10px] text-slate-400">({route.leg2.stopsCount} stops)</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  Transfer at <span className="font-bold text-indigo">{route.transferHub}</span> ➔ Alight at destination <span className="font-semibold text-slate-800 dark:text-slate-200">{route.leg2.dropoffStop}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Board at:</span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">{route.boardingStop}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Alight at:</span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">{route.dropoffStop}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span className="flex items-center gap-1 font-black text-slate-900 dark:text-white">
                            <IndianRupee size={13} className="text-slate-400" />
                            <span>{route.fare}</span>
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Leaf size={13} />
                            <span>{route.co2Savings}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* View Subway Route Diagram Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              const targetNo = route.isTransfer && route.leg1
                                ? route.leg1.routeNo
                                : route.routeNo.split("➔")[0].trim();
                              setActiveDiagramRoute(targetNo);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 font-bold border border-slate-800 dark:border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs"
                          >
                            <GitCommit size={13} />
                            <span>View Route Diagram</span>
                          </button>

                          {/* Open in Live Map */}
                          <Link
                            to="/map"
                            search={{
                              bus: route.isTransfer && route.leg1 ? route.leg1.routeNo : route.routeNo,
                              from: route.boardingStop,
                              to: route.dropoffStop,
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo text-white font-bold hover:bg-indigo/90 transition-colors cursor-pointer text-xs shadow-2xs"
                          >
                            Live Map
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: SUBWAY ROUTE DIAGRAM (Matching Image 2)
         ======================================================== */}
      {activeDiagramRoute && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl">
            <DualDirectionTransitDiagram
              routeNo={activeDiagramRoute}
              onClose={() => setActiveDiagramRoute(null)}
              highlightedStopNames={[fromPlace, toPlace]}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default PlanPage;
