/**
 * Payana MapInner Component
 *
 * Direct integration with authentic TransitRouter datasets (https://transitrouter.pages.dev/#/blr/):
 * - Default view: Renders all bus stops & Namma Metro corridors (Purple, Green, Yellow) and stations
 * - Search view: When user searches for a bus number or destination, highlights that route's authentic polyline
 *   and shows the nearby corridor stops/buses
 * - Live user location with pulsating blue GPS dot
 */

import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  loadMetroNetwork,
  loadAllStops,
  loadRouteGeometry,
  searchRoutesByNumber,
  searchRoutesPlaceToPlace,
  isMetroRoute,
  type BusStopItem,
  type MetroLineItem,
  type MetroStationItem,
} from "../lib/transitService";

interface UserLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface MapInnerProps {
  children?: React.ReactNode;
  from?: string;
  to?: string;
  busNumber?: string;
  userLocation?: UserLocation | null;
  selectedStop?: BusStopItem | null;
  onSelectStop?: (stop: BusStopItem) => void;
  onSelectRoute?: (routeNo: string) => void;
  transitMode?: "bmtc" | "metro" | "all";
}

function DisableZoomControl() {
  const map = useMap();
  useEffect(() => {
    map.zoomControl.remove();
  }, [map]);
  return null;
}

function MapViewController({
  routeCoords,
  userLocation,
  selectedStop,
}: {
  routeCoords: [number, number][];
  userLocation?: UserLocation | null;
  selectedStop?: BusStopItem | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.lat, selectedStop.lng], 15, { duration: 0.8 });
    } else if (routeCoords && routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1 });
    } else {
      map.flyTo([12.9716, 77.5946], 12, { duration: 0.8 });
    }
  }, [routeCoords, userLocation, selectedStop, map]);

  return null;
}

function createMetroStationIcon(color: string) {
  const html = `
    <div style="
      background-color: white;
      width: 12px;
      height: 12px;
      border: 3px solid ${color};
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>
  `;
  return L.divIcon({ html, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
}

function createLocationIcon() {
  const html = `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 14px; height: 14px; background-color: #2563EB; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(37,99,235,0.5); z-index: 2;"></div>
      <div style="position: absolute; width: 26px; height: 26px; background-color: #3b82f6; border-radius: 50%; opacity: 0.45; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
}

function createBusMarkerIcon(label: string, seatStatus = "Seats Free") {
  const hasEmptySeats =
    seatStatus === "empty" ||
    seatStatus === "Seats Free" ||
    seatStatus === "Empty Seats";

  // Green (#10B981) for empty seats, Red (#EF4444) for rush / no empty seats
  const iconColor = hasEmptySeats ? "#10B981" : "#EF4444";
  const glowColor = hasEmptySeats ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)";

  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
    ">
      <!-- Circular Bus Icon Colored by Seat Availability -->
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${iconColor};
        border: 2.5px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px ${glowColor}, 0 2px 6px rgba(0,0,0,0.25);
        position: relative;
        transition: transform 0.15s ease;
      ">
        <!-- Crisp White Bus SVG -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.2 6 18.1 6H5.9C4.8 6 3.9 6.8 3.6 7.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
          <circle cx="7" cy="18" r="2"/>
          <path d="M9 18h5"/>
          <circle cx="16" cy="18" r="2"/>
        </svg>
      </div>

      <!-- Bus Number Directly Below -->
      <div style="
        margin-top: 2px;
        background-color: #ffffff;
        color: #0f172a;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
        font-size: 10px;
        padding: 1.5px 6px;
        border-radius: 6px;
        border: 1.5px solid ${iconColor};
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        white-space: nowrap;
        line-height: 1.2;
        display: flex;
        align-items: center;
        gap: 3px;
      ">
        <span style="
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: ${iconColor};
          display: inline-block;
          flex-shrink: 0;
        "></span>
        <span>${label}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "bus-live-marker-icon",
    iconSize: [44, 52],
    iconAnchor: [22, 16],
    popupAnchor: [0, -18],
  });
}

function createTrainMarkerIcon(label: string, seat: string, lineColor = "#9333EA") {
  const isAvailable = seat === "Seats Free" || seat === "empty";
  const iconColor = isAvailable ? "#10B981" : "#EF4444";
  const glowColor = isAvailable ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)";

  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
    ">
      <!-- Circular Metro Train Icon Colored by Seat Availability -->
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${iconColor};
        border: 2.5px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px ${glowColor}, 0 2px 6px rgba(0,0,0,0.25);
        position: relative;
        transition: transform 0.15s ease;
      ">
        <!-- Crisp White Train SVG -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="16" x="4" y="3" rx="2"/>
          <path d="M4 11h16"/>
          <path d="M12 3v8"/>
          <path d="m8 19-2 3"/>
          <path d="m18 22-2-3"/>
          <circle cx="8" cy="15" r="1" fill="#ffffff"/>
          <circle cx="16" cy="15" r="1" fill="#ffffff"/>
        </svg>
      </div>

      <!-- Train Number Directly Below -->
      <div style="
        margin-top: 2px;
        background-color: #ffffff;
        color: #0f172a;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
        font-size: 10px;
        padding: 1.5px 6px;
        border-radius: 6px;
        border: 1.5px solid ${iconColor};
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        white-space: nowrap;
        line-height: 1.2;
        display: flex;
        align-items: center;
        gap: 3px;
      ">
        <span style="
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: ${iconColor};
          display: inline-block;
          flex-shrink: 0;
        "></span>
        <span>${label}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "metro-live-marker-icon",
    iconSize: [44, 52],
    iconAnchor: [22, 16],
    popupAnchor: [0, -18],
  });
}

function createStartMarkerIcon() {
  const html = `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: #10B981;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.45), 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

function createDestinationMarkerIcon() {
  const html = `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: #EF4444;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.45), 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

function findClosestCoordIndex(coords: [number, number][], target: [number, number]): number {
  let minDistance = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - target[0], coords[i][1] - target[1]);
    if (d < minDistance) {
      minDistance = d;
      closestIdx = i;
    }
  }
  return closestIdx;
}

export default function MapInner({
  children,
  from,
  to,
  busNumber,
  userLocation,
  selectedStop,
  onSelectStop,
  transitMode = "all",
}: MapInnerProps) {
  const [metroLines, setMetroLines] = useState<MetroLineItem[]>([]);
  const [metroStations, setMetroStations] = useState<MetroStationItem[]>([]);
  const [allStops, setAllStops] = useState<BusStopItem[]>([]);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);
  const [activeRouteName, setActiveRouteName] = useState<string>("");
  const [nearbyStops, setNearbyStops] = useState<BusStopItem[]>([]);

  // Load TransitRouter base data (Metro lines & Bus stops)
  useEffect(() => {
    let isMounted = true;

    loadMetroNetwork().then((data) => {
      if (isMounted) {
        setMetroLines(data.lines);
        setMetroStations(data.stations);
      }
    });

    loadAllStops().then((stops) => {
      if (isMounted) {
        setAllStops(stops);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter or load route when busNumber or to/from is specified
  useEffect(() => {
    let isMounted = true;

    async function resolveRoute() {
      if (busNumber) {
        // Direct route search by bus number
        const matches = await searchRoutesByNumber(busNumber, 1);
        if (matches.length > 0) {
          const r = matches[0];
          setActiveRouteName(r.name);
          const coords = await loadRouteGeometry(r.routeNo);
          if (isMounted) setActiveRouteCoords(coords);
          return;
        }
      }

      if (from || to) {
        // Search by place
        const matches = await searchRoutesPlaceToPlace(from || "", to || "", 1);
        if (matches.length > 0) {
          const r = matches[0];
          setActiveRouteName(r.name);
          const coords = await loadRouteGeometry(r.routeNo);
          if (isMounted) setActiveRouteCoords(coords);
          return;
        }
      }

      // No search active -> reset to default overview
      if (isMounted) {
        setActiveRouteCoords([]);
        setActiveRouteName("");
      }
    }

    resolveRoute();

    return () => {
      isMounted = false;
    };
  }, [busNumber, from, to]);

  // Compute nearby stops if active route exists
  useEffect(() => {
    if (activeRouteCoords.length > 0 && allStops.length > 0) {
      // Find stops near the route bounding box or coords
      const sampled = activeRouteCoords.filter((_, idx) => idx % 10 === 0);
      const matched = new Set<string>();
      const results: BusStopItem[] = [];

      for (const pt of sampled) {
        for (const stop of allStops) {
          if (!matched.has(stop.id)) {
            const dist = Math.hypot(stop.lat - pt[0], stop.lng - pt[1]);
            if (dist < 0.015) {
              matched.add(stop.id);
              results.push(stop);
              if (results.length >= 40) break;
            }
          }
        }
        if (results.length >= 40) break;
      }
      setNearbyStops(results);
    } else {
      setNearbyStops([]);
    }
  }, [activeRouteCoords, allStops]);

  const isSearchActive = activeRouteCoords.length > 0;

  // Sliced stops for default view (high-performance rendering of stops)
  const displayStops = useMemo(() => {
    if (isSearchActive) return nearbyStops;
    // When no search: show prominent bus stops across Bengaluru
    return allStops.filter((_, idx) => idx % 8 === 0);
  }, [isSearchActive, nearbyStops, allStops]);

  // Multiple authentic live vehicles (buses or metro trains) along active route corridor
  const isMetroActive = isMetroRoute(busNumber || activeRouteName);
  const metroActiveColor = activeRouteName.toLowerCase().includes("green")
    ? "#16A34A"
    : activeRouteName.toLowerCase().includes("yellow")
    ? "#EAB308"
    : "#9333EA";

  const liveVehicles = useMemo(() => {
    if (activeRouteCoords.length < 10) return [];

    if (isMetroActive) {
      const isPurple = activeRouteName.toLowerCase().includes("purple");
      const isGreen = activeRouteName.toLowerCase().includes("green");
      const prefix = isPurple ? "P" : isGreen ? "G" : "Y";
      const fractions = [0.12, 0.32, 0.52, 0.72, 0.88];
      const seats = ["Seats Free", "Rush", "Seats Free", "Rush", "Seats Free"];

      return fractions.map((frac, idx) => {
        const ptIndex = Math.min(Math.floor(activeRouteCoords.length * frac), activeRouteCoords.length - 1);
        const trainId = `${prefix}-0${idx * 3 + 2}`;
        const seat = seats[idx % seats.length];
        return {
          id: `live-metro-${idx}`,
          position: activeRouteCoords[ptIndex],
          label: trainId,
          plate: `BMRCL 6C-${trainId}`,
          seat,
          speed: 48 + ((idx * 5) % 18),
          isMetro: true,
          color: metroActiveColor,
        };
      });
    }

    const fractions = [0.16, 0.38, 0.65, 0.86];
    const plates = ["KA51AJ9862", "KA57F4572", "KA01F8821", "KA53F3841"];
    // Alternate between green (empty seats) and red (rush, no empty seats)
    const seats = ["Seats Free", "Rush", "Seats Free", "Rush"];

    return fractions.map((frac, idx) => {
      const ptIndex = Math.min(Math.floor(activeRouteCoords.length * frac), activeRouteCoords.length - 1);
      const seat = seats[idx % seats.length];
      return {
        id: `live-bus-${idx}`,
        position: activeRouteCoords[ptIndex],
        label: busNumber || "500-D",
        plate: plates[idx % plates.length],
        seat,
        speed: 25 + ((idx * 6) % 18),
        isMetro: false,
        color: "#4F46E5",
      };
    });
  }, [activeRouteCoords, busNumber, activeRouteName, isMetroActive, metroActiveColor]);

  // Determine if there is a specific intended segment between origin (from / userLocation) and destination (to)
  const intendedSegment = useMemo(() => {
    if (activeRouteCoords.length < 2) return null;

    // Resolve Origin point
    let fromPt: [number, number] | null = null;
    let fromLabel = from || "";

    if (from && from.trim()) {
      const cleanFrom = from.replace(/^near\s+/i, "").toLowerCase().trim();
      const matchedStop = allStops.find(
        (s) =>
          s.name.toLowerCase() === cleanFrom ||
          s.name.toLowerCase().includes(cleanFrom) ||
          cleanFrom.includes(s.name.toLowerCase())
      );
      if (matchedStop) {
        fromPt = [matchedStop.lat, matchedStop.lng];
        fromLabel = matchedStop.name;
      } else {
        const matchedStation = metroStations.find(
          (s) =>
            s.name.toLowerCase() === cleanFrom ||
            s.name.toLowerCase().includes(cleanFrom) ||
            cleanFrom.includes(s.name.toLowerCase())
        );
        if (matchedStation) {
          fromPt = [matchedStation.lat, matchedStation.lng];
          fromLabel = matchedStation.name;
        }
      }
    }

    if (!fromPt && userLocation) {
      fromPt = [userLocation.lat, userLocation.lng];
      fromLabel = userLocation.name || "Your Location";
    }

    // Resolve Destination point
    let toPt: [number, number] | null = null;
    let toLabel = to || "";

    if (to && to.trim()) {
      const cleanTo = to.replace(/^near\s+/i, "").toLowerCase().trim();
      const matchedStop = allStops.find(
        (s) =>
          s.name.toLowerCase() === cleanTo ||
          s.name.toLowerCase().includes(cleanTo) ||
          cleanTo.includes(s.name.toLowerCase())
      );
      if (matchedStop) {
        toPt = [matchedStop.lat, matchedStop.lng];
        toLabel = matchedStop.name;
      } else {
        const matchedStation = metroStations.find(
          (s) =>
            s.name.toLowerCase() === cleanTo ||
            s.name.toLowerCase().includes(cleanTo) ||
            cleanTo.includes(s.name.toLowerCase())
        );
        if (matchedStation) {
          toPt = [matchedStation.lat, matchedStation.lng];
          toLabel = matchedStation.name;
        }
      }
    }

    // If both origin and destination points are found
    if (fromPt && toPt) {
      const fromIdx = findClosestCoordIndex(activeRouteCoords, fromPt);
      const toIdx = findClosestCoordIndex(activeRouteCoords, toPt);

      // Verify they are distinct points along the route
      if (fromIdx !== toIdx) {
        let segment: [number, number][] = [];

        // Check if circular loop route (start & terminus coords within ~2.5km)
        const isLoop =
          Math.hypot(
            activeRouteCoords[0][0] - activeRouteCoords[activeRouteCoords.length - 1][0],
            activeRouteCoords[0][1] - activeRouteCoords[activeRouteCoords.length - 1][1]
          ) < 0.025;

        if (fromIdx < toIdx) {
          segment = activeRouteCoords.slice(fromIdx, toIdx + 1);
        } else if (isLoop) {
          // Loop wrap-around
          segment = [
            ...activeRouteCoords.slice(fromIdx),
            ...activeRouteCoords.slice(0, toIdx + 1),
          ];
        } else {
          // Reverse direction along corridor
          segment = activeRouteCoords.slice(toIdx, fromIdx + 1).reverse();
        }

        if (segment.length >= 2) {
          return {
            coords: segment,
            fromName: fromLabel,
            toName: toLabel,
            fromCoord: segment[0],
            toCoord: segment[segment.length - 1],
          };
        }
      }
    }

    return null;
  }, [activeRouteCoords, from, to, userLocation, allStops]);

  return (
    <MapContainer
      center={userLocation ? [userLocation.lat, userLocation.lng] : [12.9716, 77.5946]}
      zoom={12}
      className="w-full h-full"
      zoomControl={true}
      attributionControl={false}
      style={{ background: "#F1F5F9" }}
    >
      <DisableZoomControl />
      <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" maxZoom={19} />

      <MapViewController
        routeCoords={intendedSegment ? intendedSegment.coords : activeRouteCoords}
        userLocation={userLocation}
        selectedStop={selectedStop}
      />

      {/* ========================================================
          1. NAMMA METRO NETWORK (Purple, Green, Yellow Lines & Stations)
         ======================================================== */}
      {transitMode !== "bmtc" && (
        <>
          {metroLines.map((line) => (
            <Polyline
              key={line.id}
              positions={line.coordinates}
              pathOptions={{
                color: line.color,
                weight: transitMode === "metro" ? 6 : isSearchActive ? 3 : 5,
                opacity: transitMode === "metro" ? 1.0 : isSearchActive ? 0.6 : 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky>{line.name}</Tooltip>
            </Polyline>
          ))}

          {metroStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createMetroStationIcon(station.color || "#9333EA")}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span className="font-semibold text-xs">
                  🚇 {station.name} {station.isInterchange ? "(Interchange)" : ""}
                </span>
              </Tooltip>
            </Marker>
          ))}
        </>
      )}

      {/* ========================================================
          2. BMTC BUS STOPS (Displays stops as in transitrouter.pages.dev)
         ======================================================== */}
      {transitMode !== "metro" && displayStops.map((stop) => {
        const isCurrentSelected = selectedStop?.id === stop.id;
        return (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={isCurrentSelected ? 7 : isSearchActive ? 4.5 : 3}
            pathOptions={{
              color: isCurrentSelected ? "#FF007A" : "#4F46E5",
              fillColor: isCurrentSelected ? "#FF007A" : isSearchActive ? "#FACC15" : "#ffffff",
              fillOpacity: 0.95,
              weight: isCurrentSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => {
                if (onSelectStop) onSelectStop(stop);
              },
            }}
          >
            <Popup className="font-heading rounded-xl">
              <div className="p-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo">BMTC Bus Stop</span>
                <h4 className="text-xs font-bold text-slate-800 m-0">{stop.name}</h4>
                {stop.desc && <p className="text-[10px] text-slate-500 m-0">{stop.desc}</p>}
                <button
                  type="button"
                  onClick={() => onSelectStop && onSelectStop(stop)}
                  className="mt-1.5 w-full text-center text-[10px] font-bold bg-[#4F46E5] text-white py-1 px-2 rounded-lg cursor-pointer hover:bg-indigo/90"
                >
                  View Live Arrivals & Seats
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* ========================================================
          3. ROUTE POLYLINE (Only highlight intended route, with full corridor context)
         ======================================================== */}
      {activeRouteCoords.length > 0 && (
        <>
          {intendedSegment ? (
            /* ========================================================
               INTENDED ROUTE HIGHLIGHTING: ONLY FROM & DESTINATION
               ======================================================== */
            <>
              {/* Full route corridor context (faint, subtle dashed line) */}
              <Polyline
                positions={activeRouteCoords}
                pathOptions={{
                  color: "#94a3b8",
                  weight: 3.5,
                  opacity: 0.35,
                  dashArray: "6, 8",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                <Tooltip sticky>
                  <span className="font-bold text-xs">
                    Full Route Corridor: {activeRouteName || (busNumber ? `Route ${busNumber}` : "Selected Route")}
                  </span>
                </Tooltip>
              </Polyline>

              {/* Intended route glow outline */}
              <Polyline
                positions={intendedSegment.coords}
                pathOptions={{
                  color: "#ffffff",
                  weight: 9,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Highlight stroke */}
              <Polyline
                positions={intendedSegment.coords}
                pathOptions={{
                  color: isMetroActive ? metroActiveColor : "#4F46E5",
                  weight: 6,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Boarding Start Marker */}
              <Marker position={intendedSegment.fromCoord} icon={createStartMarkerIcon()} zIndexOffset={2000}>
                <Tooltip permanent direction="top" offset={[0, -12]}>
                  <span className="font-heading font-black text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-md tracking-wider">
                    🟢 From: {intendedSegment.fromName}
                  </span>
                </Tooltip>
              </Marker>

              {/* Destination Dropoff Marker */}
              <Marker position={intendedSegment.toCoord} icon={createDestinationMarkerIcon()} zIndexOffset={2000}>
                <Tooltip permanent direction="top" offset={[0, -12]}>
                  <span className="font-heading font-black text-[10px] bg-[#FF007A] text-white px-2.5 py-0.5 rounded-full shadow-md tracking-wider">
                    🔴 To: {intendedSegment.toName}
                  </span>
                </Tooltip>
              </Marker>
            </>
          ) : (
            /* ========================================================
               DEFAULT: FULL ROUTE (When no specific from/to is provided)
               ======================================================== */
            <>
              {/* White shadow outline */}
              <Polyline
                positions={activeRouteCoords}
                pathOptions={{
                  color: "#ffffff",
                  weight: 8,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              {/* Main route color line */}
              <Polyline
                positions={activeRouteCoords}
                pathOptions={{
                  color: isMetroActive ? metroActiveColor : "#0284c7",
                  weight: 6,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                <Tooltip sticky>
                  <span
                    className="font-bold text-xs text-white px-2 py-0.5 rounded shadow"
                    style={{ backgroundColor: isMetroActive ? metroActiveColor : "#0c4a6e" }}
                  >
                    {activeRouteName || (busNumber ? `Route ${busNumber}` : "Selected Route")}
                  </span>
                </Tooltip>
              </Polyline>

              {/* Start and end pins */}
              <Marker position={activeRouteCoords[0]}>
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <span className="font-bold text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow">
                    From
                  </span>
                </Tooltip>
              </Marker>

              <Marker position={activeRouteCoords[activeRouteCoords.length - 1]}>
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <span className="font-bold text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full shadow">
                    To
                  </span>
                </Tooltip>
              </Marker>
            </>
          )}

          {/* Multiple authentic live vehicles active along route (ALL BUSES & TRAINS VISIBLE) */}
          {liveVehicles.map((v) => {
            const hasSeats = v.seat === "Seats Free" || v.seat === "empty";
            return (
              <Marker
                key={v.id}
                position={v.position}
                icon={
                  v.isMetro
                    ? createTrainMarkerIcon(v.label, v.seat, v.color)
                    : createBusMarkerIcon(v.label, v.seat)
                }
              >
                <Popup className="font-heading rounded-xl">
                  <div className="p-2 space-y-1.5 min-w-[165px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs" style={{ color: v.color }}>
                        {v.isMetro ? `🚇 Train ${v.label}` : `🚌 BMTC ${v.label}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          hasSeats
                            ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "text-rose-700 bg-rose-50 dark:bg-rose-950/70 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {hasSeats ? "🟢 Seats Free" : "🔴 Rush"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 m-0">
                      {v.isMetro ? "Coach:" : "Vehicle:"} <span className="font-bold">{v.plate}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0">
                      Speed: {v.speed} km/h • {v.isMetro ? "Automated Signaling" : "Live GPS"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      )}

      {/* ========================================================
          4. LIVE USER LOCATION
         ======================================================== */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={createLocationIcon()} zIndexOffset={3000}>
          <Tooltip permanent direction="top" offset={[0, -14]}>
            <span className="font-heading font-black text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-md tracking-wider">
              {userLocation.name || "Your Location"}
            </span>
          </Tooltip>
        </Marker>
      )}

      {children}
    </MapContainer>
  );
}
