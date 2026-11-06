/**
 * Payana Live Map Page
 *
 * Implements TransitRouter live map behavior with authentic BMTC Route Transit panel:
 * - Direct integration with authentic BMTC dataset (2,487 routes, 8,812 stops, GTFS-RT feed)
 * - Tabs: [BMTC Route Transit] & [Decision Engine]
 * - Route search, horizontal route pills (500-D, KIA-9, 335-E, 365, etc.)
 * - Route Overview with active live buses, flip direction, and stop sequence
 * - BMTC Bus Stop Arrivals sheet with upcoming buses, live ETA, and seat status ("Seats Free", "Few Seats", "Standing Only")
 * - Live user GPS location detection with manual fallback
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Crosshair, Bus, Train } from "lucide-react";
import { MapBackground } from "../components/MapBackground";
import { BottomBar } from "../components/BottomBar";
import { BmtcLiveTransitPanel } from "../components/transit/BmtcLiveTransitPanel";
import { findNearestStop, isMetroRoute, type BusStopItem } from "../lib/transitService";

const mapSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  bus: z.string().optional(),
  mode: z.string().optional(),
});

export const Route = createFileRoute("/map")({
  validateSearch: mapSearchSchema,
  head: () => ({
    meta: [
      { title: "Live Transit Map — payana.ai" },
      {
        name: "description",
        content:
          "Interactive Bengaluru live transit map with BMTC GTFS-RT arrivals, seat availability, and Namma Metro.",
      },
    ],
  }),
  component: LiveMapPage,
});

function LiveMapPage() {
  const { from: initialFrom, to: initialTo, bus: initialBus, mode: initialMode } = Route.useSearch();

  // Transit Mode Toggle: "bmtc" | "metro" | "all"
  const [transitMode, setTransitMode] = useState<"bmtc" | "metro" | "all">(
    initialMode === "metro" || isMetroRoute(initialBus || "") ? "metro" : "bmtc"
  );

  // Active route & selection state (empty by default, user enters manually)
  const [activeBusNumber, setActiveBusNumber] = useState(initialBus || "");
  const [activeDestination, setActiveDestination] = useState(initialTo || "");
  const [fromLocation, setFromLocation] = useState(initialFrom || "");
  const [selectedStop, setSelectedStop] = useState<BusStopItem | null>(null);

  // Live Location State
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Ask for location access for map centering, but do not fill inputs automatically
  useEffect(() => {
    handleGetLiveLocation(false);
  }, []);

  // Handle GPS location request (fillInput is true only when user clicks GPS button)
  const handleGetLiveLocation = (fillInput = true) => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const nearest = await findNearestStop(lat, lng);
        const name = nearest ? nearest.name : "My Live Location";
        const loc = { lat, lng, name };
        setUserLocation(loc);
        try {
          localStorage.setItem("payana_user_location", JSON.stringify(loc));
        } catch {}
        if (fillInput) {
          setFromLocation(name);
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn("GPS lookup failed:", err.message);
        if (!userLocation) {
          setUserLocation({ lat: 12.9716, lng: 77.5946, name: "Bengaluru Central" });
        }
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectRouteFromPanel = (routeNo: string, details?: any) => {
    setActiveBusNumber(routeNo);
    if (details?.service?.to) {
      setActiveDestination(details.service.to);
    }
  };

  const handleSelectStopFromPanel = (stop: BusStopItem) => {
    setSelectedStop(stop);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Interactive Map */}
      <MapBackground
        from={fromLocation}
        to={activeDestination}
        busNumber={activeBusNumber}
        userLocation={userLocation}
        selectedStop={selectedStop}
        onSelectStop={(stop) => setSelectedStop(stop)}
        onSelectRoute={(routeNo) => {
          setActiveBusNumber(routeNo);
          if (isMetroRoute(routeNo)) setTransitMode("metro");
        }}
        transitMode={transitMode}
      />

      {/* Floating BMTC Live Transit Panel (Source & Destination or Bus Number) */}
      <div className="absolute top-16 left-3 sm:left-6 w-[calc(100%-1.5rem)] sm:w-[420px] max-w-[430px] z-[1000] pointer-events-auto">
        <BmtcLiveTransitPanel
          initialRouteNo={activeBusNumber}
          initialFrom={fromLocation}
          initialTo={activeDestination}
          externalTransitMode={transitMode}
          onTransitModeChange={(mode) => setTransitMode(mode)}
          onSelectRoute={(routeNo, details) => {
            handleSelectRouteFromPanel(routeNo, details);
            if (isMetroRoute(routeNo)) setTransitMode("metro");
          }}
          onSelectPlaceToPlace={(from, to, routeNo) => {
            setFromLocation(from);
            setActiveDestination(to);
            if (routeNo) {
              setActiveBusNumber(routeNo);
              if (isMetroRoute(routeNo)) setTransitMode("metro");
            }
          }}
          onClearRoute={() => {
            setActiveBusNumber("");
            setActiveDestination("");
            setFromLocation("");
            setSelectedStop(null);
          }}
          onSelectStop={handleSelectStopFromPanel}
          selectedStop={selectedStop}
          onClearSelectedStop={() => setSelectedStop(null)}
        />
      </div>

      {/* Top-Right Quick Controls: GPS Live Location & Transit Status */}
      <div className="absolute top-16 right-3 sm:right-6 z-[1000] pointer-events-auto flex items-center gap-2">
        {/* GPS Live Location Button */}
        <button
          type="button"
          onClick={() => handleGetLiveLocation(true)}
          disabled={isLocating}
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-indigo hover:border-indigo/50 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Crosshair size={14} className={isLocating ? "animate-spin text-indigo" : ""} />
          <span className="hidden sm:inline">
            {isLocating
              ? "Locating GPS..."
              : userLocation
              ? userLocation.name
              : "Use My Live Location"}
          </span>
          <span className="sm:hidden">GPS</span>
        </button>

        {/* Seat Availability Legend */}
        <div className="hidden lg:flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" /> Seats Available
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" /> Rush (No Seats)
          </span>
        </div>

        {/* Network indicator pill */}
        <div className="hidden md:flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setTransitMode("bmtc")}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              transitMode === "bmtc" || transitMode === "all"
                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Bus size={12} /> BMTC {transitMode === "bmtc" ? "Active" : "Live"}
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setTransitMode("metro")}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              transitMode === "metro" || transitMode === "all"
                ? "text-purple-600 dark:text-purple-400 font-extrabold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Train size={12} /> Metro {transitMode === "metro" ? "Active" : "Ready"}
          </button>
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-[1000]">
        <BottomBar transitMode={transitMode} onModeChange={(mode) => setTransitMode(mode)} />
      </div>
    </div>
  );
}

export default LiveMapPage;
