/**
 * RouteMapPreview Component
 * Renders an interactive Leaflet map preview of an authentic decoded BMTC bus route geometry.
 */

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteMapPreviewProps {
  geometry: [number, number][];
  startName?: string;
  endName?: string;
  className?: string;
}

function MapBoundsController({ geometry }: { geometry: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (geometry && geometry.length > 1) {
      const bounds = L.latLngBounds(geometry);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timeout);
  }, [geometry, map]);

  return null;
}

function createStartPin() {
  return L.divIcon({
    html: `
      <div style="background-color: #059669; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(5,150,105,0.45); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 5px; height: 5px; border-radius: 50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createEndPin() {
  return L.divIcon({
    html: `
      <div style="background-color: #E11D48; width: 20px; height: 20px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(225,29,72,0.5); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function RouteMapPreview({
  geometry,
  startName,
  endName,
  className = "",
}: RouteMapPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !geometry || geometry.length === 0) {
    return (
      <div
        className={`w-full h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-center ${className}`}
      >
        <span className="text-xs text-slate-500 font-medium">Loading route geometry...</span>
      </div>
    );
  }

  const startCoord = geometry[0];
  const endCoord = geometry[geometry.length - 1];

  return (
    <div
      className={`relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-md ${className}`}
    >
      <MapContainer
        center={startCoord}
        zoom={12}
        scrollWheelZoom={false}
        attributionControl={false}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%", background: "#f8f7f5" }}
      >
        <MapBoundsController geometry={geometry} />

        {/* Google Maps Base Layer */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={19}
        />

        {/* Outer Halo */}
        <Polyline
          positions={geometry}
          pathOptions={{
            color: "#ffffff",
            weight: 6,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        {/* Real Route Polyline */}
        <Polyline
          positions={geometry}
          pathOptions={{
            color: "#4F46E5",
            weight: 4,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        {/* Start Pin */}
        <Marker position={startCoord} icon={createStartPin()} />

        {/* End Pin */}
        <Marker position={endCoord} icon={createEndPin()} />
      </MapContainer>

      {/* Floating Start & Destination labels */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        {startName && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 shadow-sm truncate max-w-[48%]">
            🟢 {startName}
          </div>
        )}
        {endName && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-200/60 shadow-sm truncate max-w-[48%] ml-auto">
            🔴 {endName}
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteMapPreview;

