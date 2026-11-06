/**
 * Payana Transit Data Adapter
 *
 * Dedicated layer for loading, normalizing, and transforming Bengaluru transit datasets
 * from TransitRouter (BMTC buses + Namma Metro lines and stations).
 * Preserves route and stop IDs, parses geometries into GeoJSON, and isolates data
 * operations from map rendering components.
 */

import { toGeoJSON } from "@mapbox/polyline";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TransitStop {
  id: string;
  name: string;
  desc?: string;
  lat: number;
  lng: number;
  mode: "bus" | "metro";
  lines?: string[];
  isInterchange?: boolean;
}

export interface TransitRoute {
  id: string;
  routeNo: string;
  name: string;
  mode: "bus" | "metro";
  color: string;
  direction?: "outward" | "return";
  geometry: GeoJSON.LineString;
  stopIds?: string[];
}

export interface RailFeatureProperties {
  ref?: string;
  name?: string;
  stroke?: string;
  mode?: string;
  "station-color"?: string;
  interchange?: boolean;
  [key: string]: unknown;
}

// In-memory caches to avoid redundant HTTP requests and parsing
let cachedRailGeoJSON: GeoJSON.FeatureCollection | null = null;
let cachedBMTCArterialGeoJSON: GeoJSON.FeatureCollection | null = null;
let cachedStopsGeoJSON: GeoJSON.FeatureCollection | null = null;
let cachedStopsMap: Map<string, TransitStop> | null = null;
let cachedServices: Record<string, { name: string; stops?: string[][] }> | null = null;

// Official and high-contrast transit colors for Bengaluru
export const TRANSIT_COLORS = {
  purpleLine: "#9333EA", // Namma Metro Purple Line
  greenLine: "#16A34A",  // Namma Metro Green Line
  yellowLine: "#EAB308", // Namma Metro Yellow Line
  bmtcVajra: "#2563EB",  // BMTC AC / Vajra
  bmtcVayuVajra: "#1E3A8A", // BMTC Airport Express
  bmtcFeeder: "#059669", // BMTC Metro Feeder
  bmtcStandard: "#E11D48", // BMTC Standard City Bus
  bmtcOrdinary: "#EA580C", // BMTC Ordinary
  walking: "#64748B",    // Walking connections
};

/**
 * Load and normalize Namma Metro lines and stations from rail.json
 */
export async function loadRailData(): Promise<GeoJSON.FeatureCollection> {
  if (cachedRailGeoJSON) return cachedRailGeoJSON;

  try {
    const res = await fetch("/data/transit/rail.json");
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching rail.json`);
    const rawData = (await res.json()) as GeoJSON.FeatureCollection;

    // Normalize metro features and apply standard line colors
    const normalizedFeatures: GeoJSON.Feature[] = rawData.features.map((f) => {
      const props = (f.properties || {}) as RailFeatureProperties;
      if (f.geometry.type === "LineString") {
        const ref = props.ref?.toLowerCase() || "";
        let stroke = props.stroke || "#9333EA";
        if (ref.includes("purple") || props.name?.toLowerCase().includes("purple")) {
          stroke = TRANSIT_COLORS.purpleLine;
        } else if (ref.includes("green") || props.name?.toLowerCase().includes("green")) {
          stroke = TRANSIT_COLORS.greenLine;
        } else if (ref.includes("yellow") || props.name?.toLowerCase().includes("yellow")) {
          stroke = TRANSIT_COLORS.yellowLine;
        }
        return {
          ...f,
          properties: {
            ...props,
            mode: "metro",
            stroke,
            lineName: props.name || `${props.ref} Line`,
          },
        };
      } else if (f.geometry.type === "Point") {
        // Station marker
        const name = (props.name as string) || "Metro Station";
        const isInterchange =
          props.interchange === true ||
          name.toLowerCase().includes("majestic") ||
          name.toLowerCase().includes("kempegowda") ||
          name.toLowerCase().includes("silk board") ||
          name.toLowerCase().includes("jayadeva") ||
          name.toLowerCase().includes("rashtreeya vidyalaya");

        return {
          ...f,
          properties: {
            ...props,
            name,
            mode: "metro",
            isInterchange,
            "station-color": props["station-color"] || "#9333EA",
          },
        };
      }
      return f;
    });

    cachedRailGeoJSON = {
      type: "FeatureCollection",
      features: normalizedFeatures,
    };
    return cachedRailGeoJSON;
  } catch (err) {
    console.warn("Failed to load rail.json, returning empty FeatureCollection", err);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Load curated BMTC Arterial Routes GeoJSON
 */
export async function loadBMTCArterialRoutes(): Promise<GeoJSON.FeatureCollection> {
  if (cachedBMTCArterialGeoJSON) return cachedBMTCArterialGeoJSON;

  try {
    const res = await fetch("/data/transit/bmtc_arterial.geojson");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    cachedBMTCArterialGeoJSON = data;
    return cachedBMTCArterialGeoJSON;
  } catch (err) {
    console.warn("Falling back to empty BMTC arterial routes", err);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Load BMTC Bus Stops GeoJSON
 */
export async function loadBMTCStops(): Promise<GeoJSON.FeatureCollection> {
  if (cachedStopsGeoJSON) return cachedStopsGeoJSON;

  try {
    const res = await fetch("/data/transit/bmtc_stops.geojson");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    cachedStopsGeoJSON = data;

    // Also populate stops map
    const map = new Map<string, TransitStop>();
    for (const f of data.features) {
      if (f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates;
        const props = (f.properties || {}) as Record<string, string>;
        map.set(props.id, {
          id: props.id,
          name: props.name || "Bus Stop",
          desc: props.desc || "",
          lat,
          lng,
          mode: "bus",
        });
      }
    }
    cachedStopsMap = map;
    return cachedStopsGeoJSON;
  } catch (err) {
    console.warn("Could not load bmtc_stops.geojson", err);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Decode a raw polyline string from routes.min.json on demand
 */
export function decodePolylineGeometry(encodedString: string): GeoJSON.LineString {
  try {
    return toGeoJSON(encodedString);
  } catch (err) {
    console.warn("Failed to decode polyline", err);
    return { type: "LineString", coordinates: [] };
  }
}

/**
 * Find the closest stops (bus or metro) within a given radius in km
 */
export async function findNearbyTransitStops(
  targetLat: number,
  targetLng: number,
  maxDistanceKm = 2.5,
  limit = 8
): Promise<TransitStop[]> {
  const results: { stop: TransitStop; distance: number }[] = [];

  // Check metro stations from rail.json
  const railData = await loadRailData();
  for (const f of railData.features) {
    if (f.geometry.type === "Point") {
      const [lng, lat] = f.geometry.coordinates;
      const d = haversineDistanceKm(targetLat, targetLng, lat, lng);
      if (d <= maxDistanceKm) {
        const props = (f.properties || {}) as RailFeatureProperties;
        results.push({
          distance: d,
          stop: {
            id: `metro-${props.name}`,
            name: (props.name as string) || "Metro Station",
            desc: props.lineName as string,
            lat,
            lng,
            mode: "metro",
            isInterchange: !!props.isInterchange,
          },
        });
      }
    }
  }

  // Check BMTC stops
  await loadBMTCStops();
  if (cachedStopsMap) {
    for (const stop of cachedStopsMap.values()) {
      const d = haversineDistanceKm(targetLat, targetLng, stop.lat, stop.lng);
      if (d <= maxDistanceKm) {
        results.push({ distance: d, stop });
      }
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, limit).map((r) => r.stop);
}

/**
 * Search stops or stations by name (case-insensitive substring match)
 */
export async function searchTransitStops(query: string, limit = 10): Promise<TransitStop[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: TransitStop[] = [];

  // Match metro stations first
  const railData = await loadRailData();
  for (const f of railData.features) {
    if (f.geometry.type === "Point") {
      const props = (f.properties || {}) as RailFeatureProperties;
      const name = ((props.name as string) || "").toLowerCase();
      if (name.includes(q)) {
        const [lng, lat] = f.geometry.coordinates;
        matches.push({
          id: `metro-${props.name}`,
          name: (props.name as string) || "Metro Station",
          desc: props.lineName as string,
          lat,
          lng,
          mode: "metro",
          isInterchange: !!props.isInterchange,
        });
      }
    }
  }

  // Match bus stops
  await loadBMTCStops();
  if (cachedStopsMap) {
    for (const stop of cachedStopsMap.values()) {
      if (stop.name.toLowerCase().includes(q)) {
        matches.push(stop);
        if (matches.length >= limit) break;
      }
    }
  }

  return matches.slice(0, limit);
}

/**
 * Resolve a known place name or landmark to coordinates
 */
export async function resolveLocationCoordinates(
  nameOrLocation: string
): Promise<{ name: string; lat: number; lng: number; mode?: "bus" | "metro" }> {
  const trimmed = nameOrLocation.trim();

  // Known major hub dictionary for reliable instantaneous resolution
  const KNOWN_HUBS: Record<string, { lat: number; lng: number; mode?: "bus" | "metro" }> = {
    majestic: { lat: 12.9767, lng: 77.5713, mode: "metro" },
    "kempegowda bus station": { lat: 12.9767, lng: 77.5713, mode: "bus" },
    "electronic city": { lat: 12.8456, lng: 77.6603, mode: "bus" },
    indiranagar: { lat: 12.9784, lng: 77.6408, mode: "metro" },
    "mg road": { lat: 12.9734, lng: 77.608, mode: "metro" },
    hebbal: { lat: 13.0358, lng: 77.597, mode: "bus" },
    shivajinagar: { lat: 12.9857, lng: 77.6057, mode: "bus" },
    koramangala: { lat: 12.9352, lng: 77.6245, mode: "bus" },
    "silk board": { lat: 12.9173, lng: 77.623, mode: "bus" },
    "central silk board": { lat: 12.9173, lng: 77.623, mode: "bus" },
    whitefield: { lat: 12.9698, lng: 77.75, mode: "metro" },
    "whitefield (kadugodi)": { lat: 12.9956, lng: 77.7579, mode: "metro" },
    jayanagar: { lat: 12.9308, lng: 77.5838, mode: "metro" },
    "btm layout": { lat: 12.9166, lng: 77.6101, mode: "metro" },
    marathahalli: { lat: 12.9569, lng: 77.7011, mode: "bus" },
    yelahanka: { lat: 13.1007, lng: 77.5963, mode: "bus" },
    malleshwaram: { lat: 13.0031, lng: 77.5643, mode: "bus" },
    domlur: { lat: 12.9611, lng: 77.6387, mode: "bus" },
    banashankari: { lat: 12.9255, lng: 77.5468, mode: "metro" },
    yeshwantpur: { lat: 13.0233, lng: 77.5497, mode: "metro" },
    nagavara: { lat: 13.0423, lng: 77.6249, mode: "bus" },
    "manyata tech park": { lat: 13.0501, lng: 77.6212, mode: "bus" },
    "hkbk college": { lat: 13.0366, lng: 77.6321, mode: "bus" },
    "hsr layout": { lat: 12.9116, lng: 77.6389, mode: "bus" },
    kallugodi: { lat: 12.9956, lng: 77.7579, mode: "metro" },
    challaghatta: { lat: 12.8973, lng: 77.4612, mode: "metro" },
    "silk institute": { lat: 12.8616, lng: 77.5299, mode: "metro" },
  };

  const lookupKey = trimmed.toLowerCase();
  if (KNOWN_HUBS[lookupKey]) {
    return { name: trimmed, ...KNOWN_HUBS[lookupKey] };
  }

  // Look through transit stops
  const matches = await searchTransitStops(trimmed, 1);
  if (matches.length > 0) {
    return {
      name: matches[0].name,
      lat: matches[0].lat,
      lng: matches[0].lng,
      mode: matches[0].mode,
    };
  }

  // Default fallback to central Bengaluru (Vidhana Soudha / MG Road)
  return {
    name: trimmed,
    lat: 12.9716,
    lng: 77.5946,
    mode: "bus",
  };
}

/**
 * Haversine formula for distance in kilometers
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

