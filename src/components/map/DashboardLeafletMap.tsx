/**
 * Payana Dashboard Transit Map Preview
 *
 * Polished, high-performance interactive map of Bengaluru:
 * - Google Maps raster base layer (https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z})
 * - Clean BMTC Arterial Route corridor (without metro lines)
 * - Origin & Destination markers
 * - Floating 'Best option' route card & zoom controls
 * - Auto-invalidates size on mount and container resizing
 */

import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import { Crown, ChevronRight, Bus, Plus, Minus, Crosshair } from "lucide-react";

// BMTC Arterial Route (Yeshwanthpur -> Majestic -> Silk Board -> Electronic City)
const BMTC_CORRIDOR: [number, number][] = [
  [13.0233, 77.5497], // Yeshwanthpur
  [13.0031, 77.5643], // Malleshwaram
  [12.9767, 77.5713], // Majestic
  [12.9515, 77.5900], // Shantinagar
  [12.9352, 77.6245], // Koramangala
  [12.9173, 77.6230], // Silk Board
  [12.8900, 77.6400], // Kudlu Gate
  [12.8456, 77.6603], // Electronic City
];

function createStartPin() {
  return L.divIcon({
    html: `
      <div style="background-color: #059669; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(5,150,105,0.4); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createDestPin() {
  return L.divIcon({
    html: `
      <div style="background-color: #E11D48; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(225,29,72,0.45); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 7px; height: 7px; border-radius: 50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapResizeController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);
  return null;
}

function MapControls() {
  const map = useMap();

  return (
    <div className="absolute bottom-3 right-3 z-[1000] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.zoomIn();
        }}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus size={15} strokeWidth={2.5} />
      </button>
      <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.zoomOut();
        }}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus size={15} strokeWidth={2.5} />
      </button>
      <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.flyTo([12.9550, 77.6100], 11.5, { duration: 0.8 });
        }}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        title="Reset view"
        aria-label="Reset view"
      >
        <Crosshair size={15} strokeWidth={2.5} className="text-indigo" />
      </button>
    </div>
  );
}

export function DashboardLeafletMap({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-full h-full rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-center ${className}`}
      >
        <span className="text-xs text-slate-500 font-semibold">Loading transit map...</span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl bg-[#f8f7f5] group ${className}`}
    >
      <MapContainer
        center={[12.9550, 77.6100]}
        zoom={11.5}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%", background: "#f8f7f5" }}
      >
        <MapResizeController />

        {/* Google Maps Base Layer */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={19}
        />

        {/* BMTC Arterial Route Connection (Only BMTC Route, No Metro Lines) */}
        <Polyline
          positions={BMTC_CORRIDOR}
          pathOptions={{
            color: "#ffffff",
            weight: 6,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
        <Polyline
          positions={BMTC_CORRIDOR}
          pathOptions={{
            color: "#0284c7",
            weight: 4,
            opacity: 0.95,
            dashArray: "6, 8",
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        {/* Origin Pin: Yeswanthpur */}
        <Marker position={[13.0233, 77.5497]} icon={createStartPin()} />

        {/* Destination Pin: Electronic City */}
        <Marker position={[12.8456, 77.6603]} icon={createDestPin()} />

        {/* Floating Zoom & Reset controls */}
        <MapControls />
      </MapContainer>

      {/* Floating 'Best option' Card (Bottom Left) */}
      <Link
        to="/map"
        search={{ from: "Yeswanthpur", to: "Electronic City", mode: "fastest" }}
        className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-indigo/40 transition-all duration-300 max-w-[190px] active:scale-95 group/card"
      >
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <div className="flex items-center gap-1 text-indigo font-bold text-[11px]">
            <Crown size={12} className="fill-indigo/20 text-indigo" />
            <span>Best option</span>
          </div>
          <ChevronRight size={13} className="text-slate-400 group-hover/card:translate-x-0.5 group-hover/card:text-indigo transition-all" />
        </div>

        <div className="text-2xl font-heading font-black text-slate-900 dark:text-white leading-tight">
          32 min
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <Bus size={12} className="text-slate-500" />
          <span>1 transfer</span>
        </div>

        <div className="text-[10px] font-bold text-indigo mt-0.5">
          BMTC Direct Route
        </div>
      </Link>
    </div>
  );
}

export default DashboardLeafletMap;
