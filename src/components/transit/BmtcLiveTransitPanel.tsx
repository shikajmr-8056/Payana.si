/**
 * BmtcLiveTransitPanel Component
 *
 * Implements authentic BMTC live transit dashboard as requested:
 * - Tabs: [BMTC Route Transit (with pulsing active dot)] and [Decision Engine]
 * - Route search bar with Enter / refresh
 * - Horizontal scrolling route pills (500-D, KIA-9, 335-E, 365, G-2, 411-A, etc.)
 * - Route Overview Header with [BMTC 500-D], [🟢 8 Live Buses Active], [⇄ Flip], [⚑ 36 Stops]
 * - Live feed ticker: "((•)) Namma BMTC GTFS-RT Live Feed" & live ticking timestamp
 * - Full chronological stop sequence with click-to-view arrivals
 * - BMTC Bus Stop Arrivals overlay with upcoming buses, live ETA, and seat status ("Seats Free", "Few Seats", "Standing Only")
 * - Decision Engine mode with congestion intelligence and seat probability
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Bus,
  Train,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  ArrowUpDown,
  Layers,
  MapPin,
  Clock,
  X,
  Radio,
  Cpu,
  Sparkles,
  Users,
  TrendingDown,
  Compass,
  GitCommit,
  Navigation,
  Crosshair,
} from "lucide-react";
import { DualDirectionTransitDiagram } from "./DualDirectionTransitDiagram";
import {
  getRouteDetails,
  searchRoutesByNumber,
  searchRoutesPlaceToPlace,
  loadAllStops,
  loadAllMetroStations,
  loadMetroNetwork,
  getMetroStationsForLine,
  isMetroRoute,
  METRO_LINES_DATA,
  findNearestStop,
  getUpcomingBusesForStop,
  type BusStopItem,
  type RouteServiceItem,
  type UpcomingBusArrival,
  type MetroLineSummary,
} from "../../lib/transitService";
import { matchMetroStationByName } from "../../lib/metroRouting";

const ROUTE_PILLS = [
  "500-D",
  "KIA-9",
  "335-E",
  "365",
  "378",
  "201-G",
  "G-2",
  "411-A",
  "MF-1",
  "252-H",
];

interface BmtcLiveTransitPanelProps {
  initialRouteNo?: string;
  initialFrom?: string;
  initialTo?: string;
  onSelectRoute: (routeNo: string, routeDetails?: any) => void;
  onSelectPlaceToPlace?: (from: string, to: string, routeNo?: string) => void;
  onClearRoute?: () => void;
  onSelectStop: (stop: BusStopItem) => void;
  selectedStop: BusStopItem | null;
  onClearSelectedStop: () => void;
  className?: string;
  externalTransitMode?: "bmtc" | "metro" | "all";
  onTransitModeChange?: (mode: "bmtc" | "metro") => void;
}

export function BmtcLiveTransitPanel({
  initialRouteNo = "",
  initialFrom = "",
  initialTo = "",
  onSelectRoute,
  onSelectPlaceToPlace,
  onClearRoute,
  onSelectStop,
  selectedStop,
  onClearSelectedStop,
  className = "",
  externalTransitMode,
  onTransitModeChange,
}: BmtcLiveTransitPanelProps) {
  // Tabs: "transit" | "decision"
  const [activeTab, setActiveTab] = useState<"transit" | "decision">("transit");
  // Transit Mode: "bmtc" | "metro"
  const [transitMode, setTransitMode] = useState<"bmtc" | "metro">(
    isMetroRoute(initialRouteNo) ? "metro" : "bmtc"
  );

  // Route state
  const [currentRouteNo, setCurrentRouteNo] = useState(initialRouteNo || "");
  const [hasActiveRoute, setHasActiveRoute] = useState(
    Boolean(initialRouteNo || (initialFrom && initialTo))
  );
  const [searchMode, setSearchMode] = useState<"place" | "route">(
    initialRouteNo ? "route" : "place"
  );

  // Place-to-place search state (empty by default, user enters manually)
  const [fromPlace, setFromPlace] = useState(initialFrom || "");
  const [toPlace, setToPlace] = useState(initialTo || "");
  const [allStopsList, setAllStopsList] = useState<BusStopItem[]>([]);
  const [allMetroStationsList, setAllMetroStationsList] = useState<BusStopItem[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<BusStopItem[]>([]);
  const [toSuggestions, setToSuggestions] = useState<BusStopItem[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Bus number search state
  const [searchQuery, setSearchQuery] = useState(initialRouteNo || "");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveBusesCount, setLiveBusesCount] = useState(8);

  // Loaded route details
  const [routeService, setRouteService] = useState<RouteServiceItem | null>(null);
  const [routeStops, setRouteStops] = useState<BusStopItem[]>([]);
  const [activeStop, setActiveStop] = useState<BusStopItem | null>(selectedStop);
  const [upcomingBuses, setUpcomingBuses] = useState<UpcomingBusArrival[]>([]);
  const [routeSeatsAvailable, setRouteSeatsAvailable] = useState<number>(18);
  const [showSubwayDiagram, setShowSubwayDiagram] = useState(false);

  // Ticket Booking Real-time Sync (from BMTC Ticket Booking App bookaticket)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("payana_transit_tickets");
      channel.onmessage = (event) => {
        handleTicketEvent(event.data);
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "payana_ticket_sync_event" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          handleTicketEvent(data);
        } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    const handlePostMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "TICKET_PURCHASED") {
        handleTicketEvent(event.data);
      }
    };
    window.addEventListener("message", handlePostMessage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleTicketEvent(data: any) {
      if (!data) return;
      const targetRoute = String(data.route || "").toUpperCase().replace(/\s+/g, "");
      const passengers = Number(data.passengerCount) || 1;

      // Decrement seatCount and update status for upcoming arrivals
      setUpcomingBuses((prev) =>
        prev.map((bus) => {
          const busNorm = bus.routeNo.toUpperCase().replace(/\s+/g, "");
          if (
            !targetRoute ||
            busNorm === targetRoute ||
            targetRoute.includes(busNorm) ||
            busNorm.includes(targetRoute)
          ) {
            const newCount = Math.max(0, bus.seatCount - passengers);
            const newStatus: "Seats Free" | "Few Seats" | "Standing Only" =
              newCount <= 0 ? "Standing Only" : newCount <= 6 ? "Few Seats" : "Seats Free";
            const newCrowd: "Low" | "Medium" | "High" =
              newCount <= 0 ? "High" : newCount <= 12 ? "Medium" : "Low";
            return {
              ...bus,
              seatCount: newCount,
              seatStatus: newStatus,
              crowdLevel: newCrowd,
            };
          }
          return bus;
        })
      );

      // Decrement active route seat forecast
      const currentNorm = (currentRouteNo || "").toUpperCase().replace(/\s+/g, "");
      if (
        !targetRoute ||
        currentNorm === targetRoute ||
        targetRoute.includes(currentNorm) ||
        currentNorm.includes(targetRoute)
      ) {
        setRouteSeatsAvailable((prev) => {
          const updated = Math.max(0, prev - passengers);
          toast.success(
            `🎟️ BMTC Ticket Booked: +${passengers} passenger(s) on Route ${data.route || currentRouteNo}! Remaining seats: ${updated}`
          );
          return updated;
        });
      }
    }

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("message", handlePostMessage);
    };
  }, [currentRouteNo]);

  // User's customized travel path on this route (Starting stop -> Ending stop)
  const [travelFromStopId, setTravelFromStopId] = useState<string>("");
  const [travelToStopId, setTravelToStopId] = useState<string>("");

  // Live timestamp
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

  // Minimized / expanded for mobile
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Suggestions for route search
  const [suggestions, setSuggestions] = useState<RouteServiceItem[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);

  // Close place suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(target)) {
        setShowFromDropdown(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(target)) {
        setShowToDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync with external transit mode (e.g. from bottom bar)
  useEffect(() => {
    if (externalTransitMode && externalTransitMode !== "all") {
      setTransitMode(externalTransitMode);
      if (!hasActiveRoute) {
        setSearchMode(externalTransitMode === "metro" ? "route" : "place");
      }
    }
  }, [externalTransitMode, hasActiveRoute]);

  // Load stops cache and metro stations cache on mount
  useEffect(() => {
    loadAllStops().then(setAllStopsList);
    loadAllMetroStations().then(setAllMetroStationsList);
  }, []);

  // Keep live clock updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLastUpdatedTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync external selected stop
  useEffect(() => {
    if (selectedStop) {
      setActiveStop(selectedStop);
      if (currentRouteNo) {
        const arrivals = getUpcomingBusesForStop(
          selectedStop.name,
          currentRouteNo,
          routeService?.to || "Terminus"
        );
        setUpcomingBuses(arrivals);
      }
    }
  }, [selectedStop, currentRouteNo, routeService]);

  // Load route details on route change or initial mount
  useEffect(() => {
    if (currentRouteNo) {
      loadRoute(currentRouteNo);
    }
  }, [currentRouteNo]);

  // If initial From & To are present, automatically search and load route
  useEffect(() => {
    if (initialFrom && initialTo && !currentRouteNo) {
      handlePlaceToPlaceSubmit(undefined, initialFrom, initialTo);
    }
  }, [initialFrom, initialTo]);

  const loadRoute = async (routeNo: string) => {
    if (!routeNo || !routeNo.trim()) return;
    setIsLoading(true);
    setSuggestions([]);
    try {
      const details = await getRouteDetails(routeNo);
      setRouteService(details.service);
      setRouteStops(details.stops);
      setIsFlipped(false);
      setHasActiveRoute(true);

      const busCount = Math.floor(Math.random() * 5) + 6;
      setLiveBusesCount(busCount);

      onSelectRoute(routeNo, details);

      if (details.stops.length > 0 && !activeStop) {
        const first = details.stops[0];
        setActiveStop(first);
        setUpcomingBuses(
          getUpcomingBusesForStop(first.name, routeNo, details.service?.to || "Terminus")
        );
      }
    } catch (err) {
      console.error("Failed to load route in panel", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Flip direction
  const handleFlipRoute = () => {
    setIsFlipped(!isFlipped);
    setRouteStops((prev) => [...prev].reverse());
  };

  // Clear active route and return to city overview
  const handleClearActiveRoute = () => {
    setHasActiveRoute(false);
    setCurrentRouteNo("");
    setSearchQuery("");
    setRouteService(null);
    setRouteStops([]);
    setActiveStop(null);
    setUpcomingBuses([]);
    setShowSubwayDiagram(false);
    setTravelFromStopId("");
    setTravelToStopId("");
    setPlaceError(null);
    onClearRoute?.();
  };

  // Autocomplete for From
  const handleFromChange = (val: string) => {
    setFromPlace(val);
    if (!val.trim()) {
      setFromSuggestions([]);
      setShowFromDropdown(false);
      return;
    }
    const lower = val.toLowerCase();
    const sourceList = transitMode === "metro" ? allMetroStationsList : allStopsList;
    const filtered = sourceList
      .filter((s) => s.name.toLowerCase().includes(lower))
      .slice(0, 8);
    setFromSuggestions(filtered);
    setShowFromDropdown(true);
  };

  // Autocomplete for To
  const handleToChange = (val: string) => {
    setToPlace(val);
    if (!val.trim()) {
      setToSuggestions([]);
      setShowToDropdown(false);
      return;
    }
    const lower = val.toLowerCase();
    const sourceList = transitMode === "metro" ? allMetroStationsList : allStopsList;
    const filtered = sourceList
      .filter((s) => s.name.toLowerCase().includes(lower))
      .slice(0, 8);
    setToSuggestions(filtered);
    setShowToDropdown(true);
  };

  // Swap From / To
  const handleSwapPlaces = () => {
    const temp = fromPlace;
    setFromPlace(toPlace);
    setToPlace(temp);
  };

  // GPS for From
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
        setFromPlace("Kempegowda Bus Station");
      },
      { timeout: 8000 }
    );
  };

  // Place-to-place search submit
  const handlePlaceToPlaceSubmit = async (
    e?: React.FormEvent,
    overrideFrom?: string,
    overrideTo?: string
  ) => {
    if (e) e.preventDefault();
    const f = (overrideFrom !== undefined ? overrideFrom : fromPlace).trim();
    const t = (overrideTo !== undefined ? overrideTo : toPlace).trim();
    if (!f && !t) return;

    setShowFromDropdown(false);
    setShowToDropdown(false);
    setIsSearchingPlaces(true);
    setPlaceError(null);
    try {
      if (transitMode === "metro") {
        const fromSt = await matchMetroStationByName(f);
        const toSt = await matchMetroStationByName(t);

        if (!fromSt && !toSt) {
          setPlaceError(
            `Neither "${f}" nor "${t}" are recognized Namma Metro stations. Please select valid stations or switch to BMTC for direct bus routes.`
          );
          setIsSearchingPlaces(false);
          return;
        }

        if (fromSt && toSt) {
          // Check common line
          const commonLine = fromSt.lines.find((l) => toSt.lines.includes(l));
          if (commonLine) {
            const lineName = `${commonLine} Line`;
            setCurrentRouteNo(lineName);
            setSearchQuery(lineName);
            await loadRoute(lineName);
            setTravelFromStopId(fromSt.id);
            setTravelToStopId(toSt.id);
            onSelectPlaceToPlace?.(fromSt.name, toSt.name, lineName);
            return;
          } else {
            // Interchange required (Purple <-> Green via Majestic, Green <-> Yellow via RV Road)
            const originLine = fromSt.lines[0];
            const destLine = toSt.lines[0];
            const interchangeName =
              (originLine === "Green" && destLine === "Yellow") ||
              (originLine === "Yellow" && destLine === "Green")
                ? "Rashtreeya Vidyalaya Road"
                : "Nadaprabhu Kempegowda Station, Majestic";

            const lineName = `${originLine} Line`;
            setCurrentRouteNo(lineName);
            setSearchQuery(lineName);
            await loadRoute(lineName);
            setTravelFromStopId(fromSt.id);
            onSelectPlaceToPlace?.(fromSt.name, toSt.name, lineName);
            setPlaceError(
              `Interchange Route: Board ${originLine} Line at ${fromSt.name}, change trains at ${interchangeName} to ${destLine} Line towards ${toSt.name}.`
            );
            return;
          }
        }

        // Only one place is a metro station
        if (!fromSt) {
          setPlaceError(
            `"${f}" is not a Namma Metro station. Try searching in BMTC mode or select the nearest Metro station.`
          );
          setIsSearchingPlaces(false);
          return;
        }
        if (!toSt) {
          setPlaceError(
            `"${t}" is not a Namma Metro station. Try searching in BMTC mode or select the nearest Metro station.`
          );
          setIsSearchingPlaces(false);
          return;
        }
      }

      const matches = await searchRoutesPlaceToPlace(f, t, 5);
      if (matches.length > 0) {
        const best = matches[0];
        const routeNo =
          best.isTransfer && best.leg1 ? best.leg1.routeNo : best.routeNo.split("➔")[0].trim();
        setCurrentRouteNo(routeNo);
        setSearchQuery(routeNo);
        await loadRoute(routeNo);
        onSelectPlaceToPlace?.(f, t, routeNo);
      } else {
        setPlaceError(
          transitMode === "metro"
            ? `No direct Metro line found between "${f}" and "${t}". Try searching by Metro line name above.`
            : `No direct BMTC route found between "${f}" and "${t}". Try searching by route number or nearby transit hubs.`
        );
      }
    } catch (err) {
      console.error("Place search failed", err);
      setPlaceError("Error searching routes. Please try again.");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  // Route search autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery === currentRouteNo) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchRoutesByNumber(searchQuery, 6).then(setSuggestions);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, currentRouteNo]);

  // Handle Route Search submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) {
      setCurrentRouteNo(q);
      loadRoute(q);
      setSuggestions([]);
    }
  };

  // Handle route pill click
  const handleRoutePillClick = (rNo: string) => {
    setSearchQuery(rNo);
    setCurrentRouteNo(rNo);
    loadRoute(rNo);
  };

  // Click on a stop
  const handleStopClick = (stop: BusStopItem) => {
    setActiveStop(stop);
    onSelectStop(stop);
    if (currentRouteNo) {
      const arrivals = getUpcomingBusesForStop(
        stop.name,
        currentRouteNo,
        routeService?.to || "Terminus"
      );
      setUpcomingBuses(arrivals);
    }
  };

  // Scroll pill row left / right
  const scrollPills = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -140 : 140;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Travel Path computations (Starting Stop -> Ending Stop on active route)
  const travelFromStop = routeStops.find((s) => s.id === travelFromStopId) || null;
  const travelToStop = routeStops.find((s) => s.id === travelToStopId) || null;

  const travelPathSegment = useMemo(() => {
    if (!travelFromStop || !travelToStop) return null;
    const fromIdx = routeStops.findIndex((s) => s.id === travelFromStop.id);
    const toIdx = routeStops.findIndex((s) => s.id === travelToStop.id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return null;

    const startIdx = Math.min(fromIdx, toIdx);
    const endIdx = Math.max(fromIdx, toIdx);
    const intermediateCount = endIdx - startIdx;
    const estMin = Math.max(4, Math.round(intermediateCount * 2.2 + 2));
    const fare = intermediateCount <= 5 ? 15 : intermediateCount <= 12 ? 20 : 25;

    return {
      fromIdx,
      toIdx,
      startIdx,
      endIdx,
      stopsCount: intermediateCount,
      estMinutes: estMin,
      fare,
      isForward: fromIdx < toIdx,
      stopIdsSet: new Set(routeStops.slice(startIdx, endIdx + 1).map((s) => s.id)),
    };
  }, [travelFromStop, travelToStop, routeStops]);

  const handleSetStartingStop = (stop: BusStopItem | null) => {
    const nextFromId = stop ? stop.id : "";
    setTravelFromStopId(nextFromId);

    // If destination stop is not yet set, default to terminus
    let nextTo = travelToStop;
    if (stop && !travelToStop && routeStops.length > 0) {
      const lastStop = routeStops[routeStops.length - 1];
      if (lastStop.id !== stop.id) {
        nextTo = lastStop;
        setTravelToStopId(lastStop.id);
      }
    }

    if (stop && nextTo && onSelectPlaceToPlace) {
      onSelectPlaceToPlace(stop.name, nextTo.name, currentRouteNo);
    } else if (!stop && !nextTo && onSelectPlaceToPlace) {
      onSelectPlaceToPlace("", "", currentRouteNo);
    }
  };

  const handleSetEndingStop = (stop: BusStopItem | null) => {
    const nextToId = stop ? stop.id : "";
    setTravelToStopId(nextToId);

    // If starting stop is not yet set, default to route origin
    let nextFrom = travelFromStop;
    if (stop && !travelFromStop && routeStops.length > 0) {
      const firstStop = routeStops[0];
      if (firstStop.id !== stop.id) {
        nextFrom = firstStop;
        setTravelFromStopId(firstStop.id);
      }
    }

    if (nextFrom && stop && onSelectPlaceToPlace) {
      onSelectPlaceToPlace(nextFrom.name, stop.name, currentRouteNo);
    } else if (!nextFrom && !stop && onSelectPlaceToPlace) {
      onSelectPlaceToPlace("", "", currentRouteNo);
    }
  };

  const handleSwapTravelPath = () => {
    const tempFrom = travelFromStop;
    const tempTo = travelToStop;
    setTravelFromStopId(tempTo ? tempTo.id : "");
    setTravelToStopId(tempFrom ? tempFrom.id : "");
    if (tempTo && tempFrom && onSelectPlaceToPlace) {
      onSelectPlaceToPlace(tempTo.name, tempFrom.name, currentRouteNo);
    }
  };

  const handleClearTravelPath = () => {
    setTravelFromStopId("");
    setTravelToStopId("");
    if (onSelectPlaceToPlace) {
      onSelectPlaceToPlace("", "", currentRouteNo);
    }
  };

  const handleSetNearestStartStop = () => {
    if (!navigator.geolocation || routeStops.length === 0) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let closest = routeStops[0];
        let minDist = Infinity;
        for (const st of routeStops) {
          const d = Math.hypot(st.lat - latitude, st.lng - longitude);
          if (d < minDist) {
            minDist = d;
            closest = st;
          }
        }
        setIsLocating(false);
        if (closest) {
          handleSetStartingStop(closest);
        }
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const displayedStops = routeStops;

  return (
    <div
      className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 pointer-events-auto ${
        isCollapsed || !hasActiveRoute
          ? "h-auto overflow-visible"
          : "h-[calc(100vh-6.5rem)] max-h-[820px] overflow-hidden"
      } ${className}`}
    >
      {/* ========================================================
          1. TOP NAVIGATION TABS (BMTC Bus, Namma Metro & Decision Engine)
         ======================================================== */}
      <div className="p-2.5 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-2">
        <div className="flex items-center gap-1.5 w-full">
          {/* Tab 1: BMTC Bus */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("transit");
              setTransitMode("bmtc");
              onTransitModeChange?.("bmtc");
            }}
            className={`flex-1 py-1.5 sm:py-2 px-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "transit" && transitMode === "bmtc"
                ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/25"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bus size={14} />
            <span>BMTC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </button>

          {/* Tab 2: Namma Metro */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("transit");
              setTransitMode("metro");
              onTransitModeChange?.("metro");
              if (!hasActiveRoute) {
                setSearchMode("route");
              }
            }}
            className={`flex-1 py-1.5 sm:py-2 px-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "transit" && transitMode === "metro"
                ? "bg-[#9333EA] text-white shadow-md shadow-purple-600/25"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Train size={14} />
            <span>Metro</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
          </button>

          {/* Tab 3: Decision Engine */}
          <button
            type="button"
            onClick={() => setActiveTab("decision")}
            className={`py-1.5 sm:py-2 px-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "decision"
                ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/25"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Decision Engine"
          >
            <Cpu size={14} />
            <span className="hidden sm:inline">Engine</span>
          </button>
        </div>

        {/* Mobile / Mini Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          title={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* ========================================================
              ACTIVE TAB CONTENT: BMTC / METRO TRANSIT OR DECISION ENGINE
             ======================================================== */}
          {activeTab === "transit" ? (
            !hasActiveRoute ? (
              /* ========================================================
                  NO ACTIVE ROUTE: ASK SOURCE & DESTINATION OR ROUTE NUMBER
                 ======================================================== */
              <div className="px-3 py-3 space-y-3">
                {/* Mode Switcher Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setSearchMode("place")}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      searchMode === "place"
                        ? transitMode === "metro"
                          ? "bg-[#9333EA] text-white shadow-sm"
                          : "bg-[#4F46E5] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Navigation size={13} />
                    <span>From & To</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("route")}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      searchMode === "route"
                        ? transitMode === "metro"
                          ? "bg-[#9333EA] text-white shadow-sm"
                          : "bg-[#4F46E5] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {transitMode === "metro" ? <Train size={13} /> : <Bus size={13} />}
                    <span>{transitMode === "metro" ? "Metro Lines" : "Bus Number"}</span>
                  </button>
                </div>

                {/* MODE 1: SOURCE AND DESTINATION */}
                {searchMode === "place" ? (
                  <form onSubmit={handlePlaceToPlaceSubmit} className="space-y-2.5">
                    {/* FROM INPUT */}
                    <div className="relative">
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            From
                          </label>
                          <button
                            type="button"
                            onClick={handleGetLiveLocation}
                            disabled={isLocating}
                            className="text-[10px] font-bold text-indigo hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Crosshair size={11} className={isLocating ? "animate-spin" : ""} />
                            <span>{isLocating ? "GPS..." : "Use Live GPS"}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${transitMode === "metro" ? "bg-purple-500" : "bg-emerald-500"}`} />
                          <input
                            type="text"
                            value={fromPlace}
                            onChange={(e) => handleFromChange(e.target.value)}
                            onFocus={() => {
                              if (fromPlace.trim() && fromSuggestions.length > 0) setShowFromDropdown(true);
                            }}
                            placeholder={transitMode === "metro" ? "Starting metro station..." : "Starting stop or location..."}
                            className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* From Dropdown */}
                      {showFromDropdown && fromSuggestions.length > 0 && (
                        <div
                          ref={fromDropdownRef}
                          className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-[100] max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          {fromSuggestions.map((s) => (
                            <button
                              key={`from-${s.id}`}
                              type="button"
                              onClick={() => {
                                setFromPlace(s.name);
                                setShowFromDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-indigo-50/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px]">
                                  {s.id?.startsWith("station") || transitMode === "metro" ? "🚇" : "🚏"}
                                </div>
                                <div className="truncate">
                                  <span className="font-bold text-slate-900 dark:text-white block truncate">{s.name}</span>
                                  {s.desc && <span className="text-[10px] text-slate-400 block truncate">{s.desc}</span>}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-indigo dark:text-indigo-400 bg-indigo/10 dark:bg-indigo/20 px-2 py-0.5 rounded-md shrink-0">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center -my-1">
                      <button
                        type="button"
                        onClick={handleSwapPlaces}
                        className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:text-indigo transition-transform active:rotate-180"
                        title="Swap From and To"
                      >
                        <ArrowUpDown size={13} />
                      </button>
                    </div>

                    {/* TO INPUT */}
                    <div className="relative">
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          To
                        </label>
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-[#FF007A] shrink-0 fill-[#FF007A]/20" />
                          <input
                            type="text"
                            value={toPlace}
                            onChange={(e) => handleToChange(e.target.value)}
                            onFocus={() => {
                              if (toPlace.trim() && toSuggestions.length > 0) setShowToDropdown(true);
                            }}
                            placeholder={transitMode === "metro" ? "Destination metro station..." : "Destination stop or location..."}
                            className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* To Dropdown */}
                      {showToDropdown && toSuggestions.length > 0 && (
                        <div
                          ref={toDropdownRef}
                          className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-[100] max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          {toSuggestions.map((s) => (
                            <button
                              key={`to-${s.id}`}
                              type="button"
                              onClick={() => {
                                setToPlace(s.name);
                                setShowToDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-indigo-50/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 text-[10px]">
                                  {s.id?.startsWith("station") || transitMode === "metro" ? "🚇" : "📍"}
                                </div>
                                <div className="truncate">
                                  <span className="font-bold text-slate-900 dark:text-white block truncate">{s.name}</span>
                                  {s.desc && <span className="text-[10px] text-slate-400 block truncate">{s.desc}</span>}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-indigo dark:text-indigo-400 bg-indigo/10 dark:bg-indigo/20 px-2 py-0.5 rounded-md shrink-0">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {placeError && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
                        {placeError}
                      </p>
                    )}

                    {/* Submit Search Button */}
                    <button
                      type="submit"
                      disabled={isSearchingPlaces || (!fromPlace.trim() && !toPlace.trim())}
                      className={`w-full font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-white ${
                        transitMode === "metro" ? "bg-[#9333EA] hover:bg-purple-700" : "bg-[#4F46E5] hover:bg-indigo/90"
                      }`}
                    >
                      <Search size={14} />
                      <span>{isSearchingPlaces ? "Finding Route..." : "Show Route"}</span>
                    </button>
                  </form>
                ) : transitMode === "metro" ? (
                  /* MODE 2 (METRO): SELECT METRO CORRIDOR */
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                      <span>Select Metro Line:</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">BMRCL Real-time</span>
                    </div>

                    <div className="space-y-2">
                      {METRO_LINES_DATA.map((line) => {
                        const isPurple = line.ref === "Purple";
                        const isGreen = line.ref === "Green";
                        const lineColor = isPurple ? "#9333EA" : isGreen ? "#16A34A" : "#EAB308";
                        return (
                          <button
                            key={line.ref}
                            type="button"
                            onClick={() => {
                              setCurrentRouteNo(`${line.ref} Line`);
                              setSearchQuery(`${line.ref} Line`);
                              loadRoute(`${line.ref} Line`);
                            }}
                            className="w-full text-left p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer group shadow-2xs hover:shadow-md"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className="text-xs font-black text-white px-2.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-1.5"
                                style={{ backgroundColor: lineColor }}
                              >
                                <Train size={12} />
                                {line.name}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {line.activeTrainsCount} Trains Active
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-1">
                              {line.terminals}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                              <span>{line.stationsCount} Stations • {line.distanceKm} km</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                                Track Live ➔
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* MODE 2 (BMTC): BUS NUMBER SEARCH */
                  <div className="space-y-3">
                    <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                      <div className="flex-1 relative flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
                        <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search bus number..."
                          className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none uppercase"
                        />
                      </div>
                      <button
                        type="submit"
                        className="ml-2 bg-[#4F46E5] hover:bg-indigo/90 text-white font-bold px-3.5 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer shrink-0"
                      >
                        Show
                      </button>
                    </form>

                    {/* Typeahead Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
                        {suggestions.map((s) => (
                          <button
                            key={s.routeNo}
                            type="button"
                            onClick={() => handleRoutePillClick(s.routeNo)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-bold text-indigo">{s.routeNo}</span>
                            <span className="truncate text-slate-600 dark:text-slate-300 text-[11px] ml-2 font-medium">
                              {s.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ========================================================
                  HAS ACTIVE ROUTE: ROUTE OVERVIEW, LIVE BUSES & STOPS
                 ======================================================== */
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 scrollbar-thin">
                {/* Search Bar for Quick Switching */}
                <div className="pt-2">
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <div className="flex-1 relative flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
                      <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search another route..."
                        className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none uppercase"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => loadRoute(currentRouteNo)}
                      className="ml-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 transition-colors cursor-pointer"
                      title="Refresh Live GTFS-RT feed"
                    >
                      <RefreshCw size={13} className={isLoading ? "animate-spin text-indigo" : ""} />
                    </button>
                  </form>

                  {/* Typeahead Suggestions when switching routes */}
                  {suggestions.length > 0 && searchQuery.trim() && (
                    <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                      {suggestions.map((s) => (
                        <button
                          key={s.routeNo}
                          type="button"
                          onClick={() => handleRoutePillClick(s.routeNo)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-indigo">{s.routeNo}</span>
                          <span className="truncate text-slate-600 dark:text-slate-300 text-[11px] ml-2 font-medium">
                            {s.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Horizontal Route Pills */}
                <div className="flex items-center gap-1.5 relative py-0.5">
                  <button
                    type="button"
                    onClick={() => scrollPills("left")}
                    className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                    title="Scroll left"
                  >
                    <ChevronLeft size={12} />
                  </button>

                  <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth py-0.5"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {transitMode === "metro" || isMetroRoute(currentRouteNo)
                      ? METRO_LINES_DATA.map((line) => {
                          const isActive =
                            currentRouteNo.toLowerCase().includes(line.ref.toLowerCase());
                          return (
                            <button
                              key={line.ref}
                              type="button"
                              onClick={() => {
                                setCurrentRouteNo(`${line.ref} Line`);
                                loadRoute(`${line.ref} Line`);
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                isActive
                                  ? "text-white shadow-sm"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                              }`}
                              style={isActive ? { backgroundColor: line.color } : {}}
                            >
                              <Train size={11} />
                              <span>{line.name}</span>
                            </button>
                          );
                        })
                      : ROUTE_PILLS.map((rNo) => {
                          const isActive = currentRouteNo.toUpperCase() === rNo.toUpperCase();
                          return (
                            <button
                              key={rNo}
                              type="button"
                              onClick={() => handleRoutePillClick(rNo)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                                isActive
                                  ? "bg-[#4F46E5] text-white shadow-sm"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                              }`}
                            >
                              <Bus size={11} />
                              <span>{rNo}</span>
                            </button>
                          );
                        })}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollPills("right")}
                    className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                    title="Scroll right"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>

                {/* Route Summary Card */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-white font-extrabold px-2.5 py-0.5 rounded-lg text-[11px] shadow-2xs flex items-center gap-1"
                      style={{ backgroundColor: isMetroRoute(currentRouteNo) ? (METRO_LINES_DATA.find(m => m.name.toLowerCase() === currentRouteNo.toLowerCase() || currentRouteNo.toLowerCase().includes(m.ref.toLowerCase()))?.color || "#9333EA") : "#4F46E5" }}
                    >
                      {isMetroRoute(currentRouteNo) ? <Train size={11} /> : <Bus size={11} />}
                      <span>{isMetroRoute(currentRouteNo) ? currentRouteNo : `BMTC ${currentRouteNo}`}</span>
                    </span>

                    <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-lg text-[11px] flex items-center gap-1.5 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>{liveBusesCount} Live {isMetroRoute(currentRouteNo) ? "Trains" : "Buses"} Active</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleFlipRoute}
                      className="ml-auto bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform active:scale-95 shadow-2xs"
                      title="Flip origin and destination"
                    >
                      <ArrowRightLeft size={11} />
                      <span>Flip</span>
                    </button>

                    <span className="bg-[#4F46E5]/15 text-[#4F46E5] dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1">
                      <Layers size={11} />
                      <span>{displayedStops.length} {isMetroRoute(currentRouteNo) ? "Stations" : "Stops"}</span>
                    </span>
                  </div>

                  {/* Route Full Title */}
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                      {routeService?.name || (isMetroRoute(currentRouteNo) ? `Namma Metro ${currentRouteNo}` : `${currentRouteNo} Transit Corridor`)}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                      {displayedStops[0]?.name || routeService?.from || "Origin"} ➔{" "}
                      {displayedStops[displayedStops.length - 1]?.name || routeService?.to || "Terminus"}
                    </p>
                  </div>

                  {/* ========================================================
                      STARTING TO ENDING TRAVELPATH SELECTOR
                     ======================================================== */}
                  <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-3 border border-indigo/20 dark:border-indigo/40 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo dark:text-indigo-400 flex items-center gap-1.5">
                        <Navigation size={12} />
                        <span>Select My Travel Path</span>
                      </span>

                      {travelPathSegment && (
                        <button
                          type="button"
                          onClick={handleClearTravelPath}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <X size={11} />
                          <span>Show Full Route</span>
                        </button>
                      )}
                    </div>

                    {/* Selectors: Starting Stop & Destination Stop */}
                    <div className="space-y-1.5">
                      {/* Starting Stop */}
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700/80 focus-within:border-emerald-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] uppercase font-black text-slate-400 block leading-none">
                            Starting Stop (Boarding)
                          </label>
                          <select
                            value={travelFromStopId}
                            onChange={(e) => {
                              const found = routeStops.find((s) => s.id === e.target.value) || null;
                              handleSetStartingStop(found);
                            }}
                            className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate py-0.5"
                          >
                            <option value="" className="text-slate-400 dark:bg-slate-900">
                              Select starting stop...
                            </option>
                            {routeStops.map((st, idx) => (
                              <option key={st.id} value={st.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                {idx + 1}. {st.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleSetNearestStartStop}
                          className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                          title="Set to nearest stop using GPS"
                        >
                          <Crosshair size={11} />
                          <span className="hidden sm:inline">GPS</span>
                        </button>
                      </div>

                      {/* Ending Stop */}
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700/80 focus-within:border-rose-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] uppercase font-black text-slate-400 block leading-none">
                            Ending Stop (Destination)
                          </label>
                          <select
                            value={travelToStopId}
                            onChange={(e) => {
                              const found = routeStops.find((s) => s.id === e.target.value) || null;
                              handleSetEndingStop(found);
                            }}
                            className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate py-0.5"
                          >
                            <option value="" className="text-slate-400 dark:bg-slate-900">
                              Select ending destination...
                            </option>
                            {routeStops.map((st, idx) => (
                              <option key={st.id} value={st.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                {idx + 1}. {st.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {travelFromStopId && travelToStopId && (
                          <button
                            type="button"
                            onClick={handleSwapTravelPath}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 transition-transform active:scale-95 cursor-pointer"
                            title="Swap starting & destination stops"
                          >
                            <ArrowRightLeft size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Travel Path Stats */}
                    {travelPathSegment && (
                      <div className="p-2 bg-gradient-to-r from-emerald-500/10 via-indigo/10 to-rose-500/10 rounded-xl border border-indigo/20 flex flex-wrap items-center justify-between gap-1.5 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Travelpath Active on Map</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-2xs border border-slate-200/60 dark:border-slate-700">
                            {travelPathSegment.stopsCount} stops
                          </span>
                          <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-2xs border border-slate-200/60 dark:border-slate-700">
                            ~{travelPathSegment.estMinutes} min
                          </span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-black">
                            ₹{travelPathSegment.fare}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Feed Ticker */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/40 text-[10px]">
                    <div className="flex items-center gap-1 text-indigo font-bold">
                      <Radio size={11} className="animate-pulse" />
                      <span>{isMetroRoute(currentRouteNo) ? "BMRCL Namma Metro Signaling Feed" : "Namma BMTC GTFS-RT Live Feed"}</span>
                    </div>
                    <div className="text-slate-400 font-semibold">
                      Updated {lastUpdatedTime}
                    </div>
                  </div>

                  {/* Dual Action Buttons: Diagram & Clear Route */}
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/40 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowSubwayDiagram(!showSubwayDiagram)}
                      className="w-full bg-[#15803d] hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                    >
                      <GitCommit size={14} />
                      <span>{showSubwayDiagram ? (isMetroRoute(currentRouteNo) ? "Show Stations List" : "Show Stops List") : "View Dual-Track Subway Diagram"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearActiveRoute}
                      className="w-full bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 cursor-pointer transition-colors"
                    >
                      <X size={13} />
                      <span>Clear Route (Show All Stops & Metro)</span>
                    </button>
                  </div>
                </div>

                {/* ========================================================
                    SHOW EITHER DUAL-TRACK DIAGRAM OR STOP SEQUENCE
                   ======================================================== */}
                {showSubwayDiagram ? (
                  <div className="animate-in fade-in duration-200">
                    <DualDirectionTransitDiagram
                      routeNo={currentRouteNo}
                      onClose={() => setShowSubwayDiagram(false)}
                      selectedStopId={activeStop?.id}
                      onSelectStop={handleStopClick}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {isMetroRoute(currentRouteNo) ? "STATION SEQUENCE" : "STOP SEQUENCE"} ({displayedStops.length} {isMetroRoute(currentRouteNo) ? "STATIONS" : "STOPS"})
                      </span>
                      <span className="text-[11px] font-bold text-indigo hover:underline cursor-pointer">
                        Click any {isMetroRoute(currentRouteNo) ? "station" : "stop"} for live {isMetroRoute(currentRouteNo) ? "departures" : "arrivals"}
                      </span>
                    </div>

                    {/* Scrollable Stops List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-56 overflow-y-auto">
                      {displayedStops.map((stop, idx) => {
                        const isSelected = activeStop?.id === stop.id;
                        const isTravelStart = travelFromStopId === stop.id;
                        const isTravelEnd = travelToStopId === stop.id;
                        const isOnTravelPath = travelPathSegment?.stopIdsSet.has(stop.id);

                        return (
                          <div
                            key={`${stop.id}-${idx}`}
                            onClick={() => handleStopClick(stop)}
                            className={`w-full text-left p-2.5 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isTravelStart
                                ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-l-4 border-emerald-500"
                                : isTravelEnd
                                ? "bg-rose-500/10 dark:bg-rose-950/40 border-l-4 border-rose-500"
                                : isOnTravelPath
                                ? "bg-indigo/5 dark:bg-indigo-950/30 border-l-4 border-indigo/60"
                                : isSelected
                                ? "bg-indigo/10 dark:bg-indigo/20 text-indigo font-bold"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex flex-col items-center shrink-0">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                                    isTravelStart
                                      ? "bg-emerald-600 text-white ring-2 ring-emerald-500/40"
                                      : isTravelEnd
                                      ? "bg-rose-600 text-white ring-2 ring-rose-500/40"
                                      : isOnTravelPath
                                      ? "bg-indigo text-white"
                                      : idx === 0
                                      ? "bg-emerald-600 text-white"
                                      : idx === displayedStops.length - 1
                                      ? "bg-rose-600 text-white"
                                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                  <span>{stop.name}</span>
                                  {isTravelStart && (
                                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black shrink-0">
                                      Boarding
                                    </span>
                                  )}
                                  {isTravelEnd && (
                                    <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-black shrink-0">
                                      Destination
                                    </span>
                                  )}
                                </div>
                                {stop.desc && (
                                  <div className="text-[10px] text-slate-400 truncate">{stop.desc}</div>
                                )}
                              </div>
                            </div>

                            {/* Quick Action Buttons for Start & End */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetStartingStop(stop);
                                }}
                                className={`text-[9px] px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                                  isTravelStart
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title="Set as starting boarding stop"
                              >
                                Start
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetEndingStop(stop);
                                }}
                                className={`text-[9px] px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                                  isTravelEnd
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                }`}
                                title="Set as ending destination stop"
                              >
                                End
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================
                    BMTC BUS STOP ARRIVALS OVERLAY
                   ======================================================== */}
                {activeStop && upcomingBuses.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-indigo flex items-center gap-1">
                          <MapPin size={10} />
                          <span>{isMetroRoute(currentRouteNo) ? "Namma Metro Station Departures" : "BMTC Bus Stop Arrivals"}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[260px]">
                          {activeStop.name}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={onClearSelectedStop}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Close stop arrivals"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="text-[10px] font-black uppercase text-slate-400">
                      Upcoming {isMetroRoute(currentRouteNo) ? "Trains at this Station" : "Buses at this Stop"}
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {upcomingBuses.map((bus, idx) => (
                        <div
                          key={`${bus.routeNo}-${idx}`}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2"
                        >
                          <div className="space-y-1 min-w-0">
                            {/* Route Badge & Seat Availability */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-white font-black px-2 py-0.5 rounded-md text-[10px] shadow-2xs" style={{ backgroundColor: isMetroRoute(bus.routeNo) ? (METRO_LINES_DATA.find(m => m.name.toLowerCase() === bus.routeNo.toLowerCase() || bus.routeNo.toLowerCase().includes(m.ref.toLowerCase()))?.color || "#9333EA") : "#4F46E5" }}>
                                {bus.routeNo}
                              </span>

                              {/* Seat status badge */}
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                  bus.seatStatus === "Seats Free"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border-emerald-800"
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800"
                                }`}
                              >
                                {bus.seatStatus === "Seats Free" ? "🟢 Empty Seats" : "🔴 Rush"}
                              </span>
                            </div>

                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {bus.direction}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {isMetroRoute(bus.routeNo) ? "Train" : "Bus"}: {bus.vehicleNo}
                            </div>
                          </div>

                          {/* Live ETA */}
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-indigo block">
                              {bus.etaMinutes} min
                            </span>
                            <div className="text-[9px] text-slate-400 flex items-center gap-0.5 justify-end">
                              <Clock size={9} />
                              <span>Live ETA</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Travel Path Quick Actions for this Stop */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSetStartingStop(activeStop)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          travelFromStopId === activeStop.id
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{travelFromStopId === activeStop.id ? "✓ Boarding Stop" : "Board Here (Start)"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetEndingStop(activeStop)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          travelToStopId === activeStop.id
                            ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                            : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>{travelToStopId === activeStop.id ? "✓ Destination Stop" : "Get Off Here (End)"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* ========================================================
                DECISION ENGINE MODE
               ======================================================== */
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
              <div className="bg-gradient-to-br from-indigo/10 via-purple-500/5 to-transparent rounded-2xl p-4 border border-indigo/20 space-y-3">
                <div className="flex items-center gap-2 text-indigo font-black text-xs">
                  <Sparkles size={14} />
                  <span>AI Route Decision Engine</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {hasActiveRoute
                    ? `Predictive crowd intelligence and dispatch optimization for route ${currentRouteNo}.`
                    : "Select or search any BMTC route to inspect real-time crowd congestion and seat probability forecasts."}
                </p>
              </div>

              {hasActiveRoute ? (
                <>
                  {/* Congestion & Seat probability */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Corridor Congestion & Delay
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {displayedStops[0]?.name || "Origin"} ➔{" "}
                        {displayedStops[displayedStops.length - 1]?.name || "Terminus"}
                      </span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                        +3 min delay
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[55%]" />
                    </div>
                  </div>

                  {/* Seat probability forecast */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Seat Probability at Next Stop
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {routeSeatsAvailable <= 0
                          ? "Low (0% chance of seat)"
                          : routeSeatsAvailable <= 6
                          ? "Moderate (35% chance of seat)"
                          : "High (82% chance of seat)"}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          routeSeatsAvailable <= 0
                            ? "text-rose-600 bg-rose-50 dark:bg-rose-950"
                            : routeSeatsAvailable <= 6
                            ? "text-amber-600 bg-amber-50 dark:bg-amber-950"
                            : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                        }`}
                      >
                        {routeSeatsAvailable <= 0
                          ? "🔴 Rush (Standing Only)"
                          : routeSeatsAvailable <= 6
                          ? "🟡 Few Seats Left"
                          : `🟢 Seats Free (${routeSeatsAvailable})`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Boarding at {displayedStops[1]?.name || "Upcoming Stop"} recommended for guaranteed seating.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    Switch to "BMTC Route Transit" to select your route first.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BmtcLiveTransitPanel;

