/**
 * JourneyMapPreview Component
 *
 * Renders an embedded Leaflet map showing multi-modal journey legs:
 * - Walking dashed grey line
 * - Metro solid colored line (Purple, Green, Yellow)
 * - BMTC bus route lines
 * - Origin and destination markers
 */

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { JourneyLeg } from "../../types/journeyPlanner";

interface JourneyMapPreviewProps {
  legs: JourneyLeg[];
  className?: string;
}

function JourneyMapBoundsController({ allCoords }: { allCoords: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (allCoords.length >= 2) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [allCoords, map]);

  return null;
}

function createPinIcon(color: string, label: string) {
  return L.divIcon({
    html: `
      <div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function JourneyMapPreview({ legs, className = "h-64 sm:h-72 w-full" }: JourneyMapPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || legs.length === 0) {
    return <div className={`bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse ${className}`} />;
  }

  // Collect all path coordinates for auto-fit bounds
  const allCoords: [number, number][] = [];
  legs.forEach((leg) => {
    if (leg.pathCoords && leg.pathCoords.length > 0) {
      allCoords.push(...leg.pathCoords);
    } else {
      allCoords.push(leg.fromCoords, leg.toCoords);
    }
  });

  const originLeg = legs[0];
  const destLeg = legs[legs.length - 1];

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <MapContainer
        center={originLeg?.fromCoords || [12.9716, 77.5946]}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" maxZoom={19} />
        <JourneyMapBoundsController allCoords={allCoords} />

        {/* Polylines for each leg */}
        {legs.map((leg) => {
          const isWalk = leg.type === "walk";
          const coords = leg.pathCoords.length >= 2 ? leg.pathCoords : [leg.fromCoords, leg.toCoords];

          return (
            <Polyline
              key={leg.id}
              positions={coords}
              pathOptions={{
                color: isWalk ? "#64748b" : leg.lineColor,
                weight: isWalk ? 4 : 5.5,
                opacity: isWalk ? 0.8 : 0.95,
                dashArray: isWalk ? "4, 6" : undefined,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky>
                <span className="font-bold text-xs">{leg.label} ({leg.durationMinutes} min)</span>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Origin Marker */}
        {originLeg && (
          <Marker position={originLeg.fromCoords} icon={createPinIcon("#10B981", "From")}>
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span className="font-extrabold text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded-full shadow-xs">
                From: {originLeg.fromName}
              </span>
            </Tooltip>
          </Marker>
        )}

        {/* Destination Marker */}
        {destLeg && (
          <Marker position={destLeg.toCoords} icon={createPinIcon("#EF4444", "To")}>
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span className="font-extrabold text-[10px] text-rose-700 bg-white px-2 py-0.5 rounded-full shadow-xs">
                To: {destLeg.toName}
              </span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

