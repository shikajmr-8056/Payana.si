/**
 * Namma Metro Accurate Routing Engine
 *
 * Provides geographically authentic Namma Metro route planning:
 * - Real station-to-line mapping (Purple, Green, Yellow) based on BMRCL rail network data.
 * - Accurate interchange identification (Majestic for Purple <-> Green, RV Road for Green <-> Yellow).
 * - Honest viability checks: NEVER forces or suggests Metro when the journey is too short,
 *   when stations are beyond reasonable walking/feeder distance, or when Metro heads in the wrong direction.
 * - Accurate terminal directions (towards Challaghatta / Whitefield, Madavara / Silk Institute, Bommasandra / RV Road).
 */

import { haversineDistanceKm } from "./transitAdapter";
import { loadMetroNetwork, type BusStopItem } from "./transitService";

export type MetroLineRef = "Purple" | "Green" | "Yellow";

export interface MetroLineMeta {
  ref: MetroLineRef;
  name: string;
  fullName: string;
  terminals: {
    start: string;
    end: string;
  };
  color: string;
}

export const METRO_LINES_CONFIG: Record<MetroLineRef, MetroLineMeta> = {
  Purple: {
    ref: "Purple",
    name: "Purple Line",
    fullName: "Purple Line (Challaghatta ↔ Whitefield (Kadugodi))",
    terminals: {
      start: "Challaghatta",
      end: "Whitefield (Kadugodi)",
    },
    color: "#9333EA",
  },
  Green: {
    ref: "Green",
    name: "Green Line",
    fullName: "Green Line (Madavara ↔ Silk Institute)",
    terminals: {
      start: "Madavara",
      end: "Silk Institute",
    },
    color: "#16A34A",
  },
  Yellow: {
    ref: "Yellow",
    name: "Yellow Line",
    fullName: "Yellow Line (Delta Electronics Bommasandra ↔ Rashtreeya Vidyalaya Road)",
    terminals: {
      start: "Delta Electronics Bommasandra",
      end: "Rashtreeya Vidyalaya Road",
    },
    color: "#EAB308",
  },
};

export interface MetroStationProfile {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: MetroLineRef[];
  isInterchange: boolean;
  color: string;
  indexOnLine: Partial<Record<MetroLineRef, number>>;
}

export interface MetroLegPlan {
  line: MetroLineRef;
  lineName: string;
  lineColor: string;
  boardStation: string;
  alightStation: string;
  directionTerminus: string;
  stopsCount: number;
  durationMinutes: number;
  distanceKm: number;
  pathCoords: [number, number][];
}

export interface MetroJourneyPlan {
  isViable: boolean;
  unviableReason?: string;
  originStation: MetroStationProfile | null;
  destStation: MetroStationProfile | null;
  originWalkMeters: number;
  originWalkMinutes: number;
  destWalkMeters: number;
  destWalkMinutes: number;
  directDistanceKm: number;
  metroRideDistanceKm: number;
  isInterchange: boolean;
  interchangeStation?: string;
  legs: MetroLegPlan[];
  totalMetroMinutes: number;
  totalDurationMinutes: number;
  estimatedFareRupees: number;
}

// Cached normalized station index
let cachedStationsMap: Map<string, MetroStationProfile> | null = null;
let cachedStationsList: MetroStationProfile[] | null = null;

/**
 * Initialize and normalize all stations with their true lines & sequence indices
 */
export async function getMetroStationsDatabase(): Promise<{
  map: Map<string, MetroStationProfile>;
  list: MetroStationProfile[];
}> {
  if (cachedStationsMap && cachedStationsList) {
    return { map: cachedStationsMap, list: cachedStationsList };
  }

  const { lines, stations } = await loadMetroNetwork();
  const map = new Map<string, MetroStationProfile>();
  const list: MetroStationProfile[] = [];

  for (const st of stations) {
    const rawColor = st.color?.toLowerCase() || "";
    const name = st.name.trim();
    const nameLower = name.toLowerCase();

    // Determine lines for station
    const assignedLines: MetroLineRef[] = [];

    // Interchange overrides
    if (nameLower.includes("majestic") || nameLower.includes("kempegowda station")) {
      assignedLines.push("Purple", "Green");
    } else if (nameLower.includes("rashtreeya vidyalaya") || nameLower.includes("rv road")) {
      assignedLines.push("Green", "Yellow");
    } else if (nameLower.includes("jayadeva")) {
      assignedLines.push("Yellow");
    } else if (rawColor === "#e542de" || rawColor.includes("purple") || rawColor === "#9333ea") {
      assignedLines.push("Purple");
    } else if (rawColor === "#009933" || rawColor.includes("green") || rawColor === "#16a34a") {
      assignedLines.push("Green");
    } else if (rawColor === "#ffd700" || rawColor.includes("yellow") || rawColor === "#eab308") {
      assignedLines.push("Yellow");
    } else {
      // Fallback: check nearest line geometry distance
      let bestDist = Infinity;
      let bestLine: MetroLineRef = "Purple";
      for (const l of lines) {
        const ref = l.id.toLowerCase();
        const lRef: MetroLineRef = ref.includes("green") ? "Green" : ref.includes("yellow") ? "Yellow" : "Purple";
        for (const coord of l.coordinates) {
          const d = Math.hypot(coord[0] - st.lat, coord[1] - st.lng);
          if (d < bestDist) {
            bestDist = d;
            bestLine = lRef;
          }
        }
      }
      assignedLines.push(bestLine);
    }

    const isInterchange = assignedLines.length > 1 || st.isInterchange;
    const primaryLine = assignedLines[0] || "Purple";
    const color = isInterchange ? "#E11D48" : METRO_LINES_CONFIG[primaryLine].color;

    const profile: MetroStationProfile = {
      id: `metro-${st.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
      name: st.name,
      lat: st.lat,
      lng: st.lng,
      lines: assignedLines,
      isInterchange,
      color,
      indexOnLine: {},
    };

    map.set(profile.name.toLowerCase(), profile);
    list.push(profile);
  }

  // Calculate sequence index along each line's geometry
  for (const l of lines) {
    const ref = l.id.toLowerCase();
    const lRef: MetroLineRef = ref.includes("green") ? "Green" : ref.includes("yellow") ? "Yellow" : "Purple";
    const coords = l.coordinates;

    const matchedStations: { st: MetroStationProfile; idx: number }[] = [];
    for (const st of list) {
      if (!st.lines.includes(lRef)) continue;

      let minDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < coords.length; i++) {
        const d = Math.hypot(coords[i][0] - st.lat, coords[i][1] - st.lng);
        if (d < minDist) {
          minDist = d;
          bestIdx = i;
        }
      }
      matchedStations.push({ st, idx: bestIdx });
    }

    matchedStations.sort((a, b) => a.idx - b.idx);
    matchedStations.forEach((item, pos) => {
      item.st.indexOnLine[lRef] = pos;
    });
  }

  cachedStationsMap = map;
  cachedStationsList = list;
  return { map, list };
}

/**
 * Find the closest metro station to a geographic coordinate
 */
export async function findClosestMetroStation(
  lat: number,
  lng: number,
  filterLine?: MetroLineRef
): Promise<{ station: MetroStationProfile; distanceKm: number } | null> {
  const { list } = await getMetroStationsDatabase();
  let closest: MetroStationProfile | null = null;
  let minDist = Infinity;

  for (const st of list) {
    if (filterLine && !st.lines.includes(filterLine)) continue;
    const d = haversineDistanceKm(lat, lng, st.lat, st.lng);
    if (d < minDist) {
      minDist = d;
      closest = st;
    }
  }

  if (!closest) return null;
  return { station: closest, distanceKm: minDist };
}

/**
 * Match a location string (e.g. "Kengeri", "Jayanagar", "Majestic") to a Metro station
 */
export async function matchMetroStationByName(query: string): Promise<MetroStationProfile | null> {
  if (!query || !query.trim()) return null;
  const { list } = await getMetroStationsDatabase();
  const q = query.trim().toLowerCase();

  // 1. Exact or startsWith match
  for (const st of list) {
    const sName = st.name.toLowerCase();
    if (sName === q || sName.startsWith(q) || q.startsWith(sName)) {
      return st;
    }
  }

  // 2. Keyword match (e.g. "Abhiman" shouldn't match, but "Kengeri Bus Station" matches "Kengeri")
  for (const st of list) {
    const sName = st.name.toLowerCase();
    const words = sName.split(/[\s,-]+/);
    if (words.some((w) => w.length > 3 && q.includes(w))) {
      return st;
    }
  }

  return null;
}

/**
 * Compute official BMRCL fare slab based on distance
 */
export function calculateMetroFareRupees(distanceKm: number): number {
  if (distanceKm <= 2) return 10;
  if (distanceKm <= 4) return 15;
  if (distanceKm <= 6) return 20;
  if (distanceKm <= 8) return 25;
  if (distanceKm <= 10) return 30;
  if (distanceKm <= 15) return 40;
  if (distanceKm <= 20) return 50;
  return 60;
}

/**
 * Plan a realistic and authenticated Metro Journey between Origin and Destination
 */
export async function planAuthenticMetroJourney(
  origin: { lat: number; lng: number; name: string },
  dest: { lat: number; lng: number; name: string },
  options: {
    allowInterchange?: boolean;
    maxWalkKm?: number;
    forceMetroSearch?: boolean; // When user explicitly selected "Metro Only"
  } = {}
): Promise<MetroJourneyPlan> {
  const maxWalk = options.maxWalkKm ?? 2.2;
  const force = options.forceMetroSearch ?? false;

  const directDistanceKm = haversineDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng);

  // 1. Find best matching or closest metro stations
  const directOriginMatch = await matchMetroStationByName(origin.name);
  const directDestMatch = await matchMetroStationByName(dest.name);

  const closestOrigin = await findClosestMetroStation(origin.lat, origin.lng);
  const closestDest = await findClosestMetroStation(dest.lat, dest.lng);

  const originStation = directOriginMatch || closestOrigin?.station || null;
  const destStation = directDestMatch || closestDest?.station || null;

  if (!originStation || !destStation) {
    return {
      isViable: false,
      unviableReason: "No Namma Metro station found in this area.",
      originStation: null,
      destStation: null,
      originWalkMeters: 0,
      originWalkMinutes: 0,
      destWalkMeters: 0,
      destWalkMinutes: 0,
      directDistanceKm,
      metroRideDistanceKm: 0,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: 0,
      estimatedFareRupees: 0,
    };
  }

  const originWalkDistKm = directOriginMatch ? 0.1 : haversineDistanceKm(origin.lat, origin.lng, originStation.lat, originStation.lng);
  const destWalkDistKm = directDestMatch ? 0.1 : haversineDistanceKm(dest.lat, dest.lng, destStation.lat, destStation.lng);

  const originWalkMeters = Math.round(originWalkDistKm * 1000);
  const destWalkMeters = Math.round(destWalkDistKm * 1000);
  const originWalkMinutes = Math.max(2, Math.round(originWalkMeters / 75));
  const destWalkMinutes = Math.max(2, Math.round(destWalkMeters / 75));

  const metroRideDistanceKm = haversineDistanceKm(
    originStation.lat,
    originStation.lng,
    destStation.lat,
    destStation.lng
  );

  // =========================================================================
  // VIABILITY VALIDATION RULES
  // =========================================================================
  // Rule A: Origin and Destination map to the exact same metro station
  if (originStation.id === destStation.id) {
    return {
      isViable: false,
      unviableReason: `Both locations are closest to ${originStation.name}. Metro cannot be used for travel within the same neighborhood.`,
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm: 0,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: originWalkMinutes + destWalkMinutes,
      estimatedFareRupees: 0,
    };
  }

  // Rule B: Journey is too short to justify walking to subway (< 2.2 km total distance)
  // Example: BGS Health City Gate to Kengeri is 1.6 km directly along a bus line.
  if (directDistanceKm < 2.5 && !directOriginMatch && !directDestMatch) {
    return {
      isViable: false,
      unviableReason: "Trip distance is too short for Metro. Direct BMTC bus or walking is significantly faster.",
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: 0,
      estimatedFareRupees: 0,
    };
  }

  // Rule C: Walking to stations exceeds reasonable walking limit unless forced
  if (!force && (originWalkDistKm > maxWalk || destWalkDistKm > maxWalk)) {
    return {
      isViable: false,
      unviableReason: `Nearest metro station (${originWalkDistKm > maxWalk ? originStation.name : destStation.name}) is beyond walking distance (${(Math.max(originWalkDistKm, destWalkDistKm)).toFixed(1)} km).`,
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: 0,
      estimatedFareRupees: 0,
    };
  }

  // Rule D: Metro ride does not progress toward destination (detour check)
  const distAfterBoarding = haversineDistanceKm(originStation.lat, originStation.lng, dest.lat, dest.lng);
  if (distAfterBoarding > directDistanceKm + 1.2 && !directOriginMatch) {
    return {
      isViable: false,
      unviableReason: `Metro station (${originStation.name}) is in the opposite direction of destination.`,
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: 0,
      estimatedFareRupees: 0,
    };
  }

  // =========================================================================
  // ROUTE COMPUTATION (DIRECT VS INTERCHANGE)
  // =========================================================================
  // Find common line between origin and dest stations
  const sharedLine = originStation.lines.find((l) => destStation.lines.includes(l));

  if (sharedLine) {
    // -----------------------------------------------------------------------
    // CASE 1: DIRECT METRO LINE (Zero Transfers)
    // -----------------------------------------------------------------------
    const lineConfig = METRO_LINES_CONFIG[sharedLine];
    const fromIdx = originStation.indexOnLine[sharedLine] ?? 0;
    const toIdx = destStation.indexOnLine[sharedLine] ?? 0;
    const isForward = fromIdx <= toIdx;

    const terminus = isForward ? lineConfig.terminals.end : lineConfig.terminals.start;
    const stopsCount = Math.max(1, Math.abs(toIdx - fromIdx));
    const rideMins = Math.max(5, Math.round(stopsCount * 2.1 + 1));

    const directLeg: MetroLegPlan = {
      line: sharedLine,
      lineName: lineConfig.name,
      lineColor: lineConfig.color,
      boardStation: originStation.name,
      alightStation: destStation.name,
      directionTerminus: terminus,
      stopsCount,
      durationMinutes: rideMins,
      distanceKm: Number(metroRideDistanceKm.toFixed(1)),
      pathCoords: [
        [originStation.lat, originStation.lng],
        [(originStation.lat + destStation.lat) / 2, (originStation.lng + destStation.lng) / 2],
        [destStation.lat, destStation.lng],
      ],
    };

    const totalMinutes = originWalkMinutes + 3 + rideMins + destWalkMinutes;
    const fare = calculateMetroFareRupees(metroRideDistanceKm);

    return {
      isViable: true,
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm,
      isInterchange: false,
      legs: [directLeg],
      totalMetroMinutes: rideMins,
      totalDurationMinutes: totalMinutes,
      estimatedFareRupees: fare,
    };
  }

  // -------------------------------------------------------------------------
  // CASE 2: INTERCHANGE METRO (1 Transfer via Majestic or RV Road)
  // -------------------------------------------------------------------------
  const originLine = originStation.lines[0];
  const destLine = destStation.lines[0];

  let interchangeName = "Nadaprabhu Kempegowda Station, Majestic";
  if (
    (originLine === "Green" && destLine === "Yellow") ||
    (originLine === "Yellow" && destLine === "Green")
  ) {
    interchangeName = "Rashtreeya Vidyalaya Road";
  }

  const { map: stationMap } = await getMetroStationsDatabase();
  const interchangeStation = stationMap.get(interchangeName.toLowerCase());

  if (!interchangeStation) {
    return {
      isViable: false,
      unviableReason: `Could not resolve interchange station ${interchangeName}.`,
      originStation,
      destStation,
      originWalkMeters,
      originWalkMinutes,
      destWalkMeters,
      destWalkMinutes,
      directDistanceKm,
      metroRideDistanceKm,
      isInterchange: false,
      legs: [],
      totalMetroMinutes: 0,
      totalDurationMinutes: 0,
      estimatedFareRupees: 0,
    };
  }

  // Leg 1: Origin Station -> Interchange
  const line1Config = METRO_LINES_CONFIG[originLine];
  const fromIdx1 = originStation.indexOnLine[originLine] ?? 0;
  const toIdx1 = interchangeStation.indexOnLine[originLine] ?? 0;
  const isForward1 = fromIdx1 <= toIdx1;
  const terminus1 = isForward1 ? line1Config.terminals.end : line1Config.terminals.start;
  const stops1 = Math.max(1, Math.abs(toIdx1 - fromIdx1));
  const ride1Mins = Math.max(4, Math.round(stops1 * 2.1));
  const dist1Km = haversineDistanceKm(originStation.lat, originStation.lng, interchangeStation.lat, interchangeStation.lng);

  const leg1: MetroLegPlan = {
    line: originLine,
    lineName: line1Config.name,
    lineColor: line1Config.color,
    boardStation: originStation.name,
    alightStation: interchangeStation.name,
    directionTerminus: terminus1,
    stopsCount: stops1,
    durationMinutes: ride1Mins,
    distanceKm: Number(dist1Km.toFixed(1)),
    pathCoords: [
      [originStation.lat, originStation.lng],
      [(originStation.lat + interchangeStation.lat) / 2, (originStation.lng + interchangeStation.lng) / 2],
      [interchangeStation.lat, interchangeStation.lng],
    ],
  };

  // Leg 2: Interchange -> Dest Station
  const line2Config = METRO_LINES_CONFIG[destLine];
  const fromIdx2 = interchangeStation.indexOnLine[destLine] ?? 0;
  const toIdx2 = destStation.indexOnLine[destLine] ?? 0;
  const isForward2 = fromIdx2 <= toIdx2;
  const terminus2 = isForward2 ? line2Config.terminals.end : line2Config.terminals.start;
  const stops2 = Math.max(1, Math.abs(toIdx2 - fromIdx2));
  const ride2Mins = Math.max(4, Math.round(stops2 * 2.1));
  const dist2Km = haversineDistanceKm(interchangeStation.lat, interchangeStation.lng, destStation.lat, destStation.lng);

  const leg2: MetroLegPlan = {
    line: destLine,
    lineName: line2Config.name,
    lineColor: line2Config.color,
    boardStation: interchangeStation.name,
    alightStation: destStation.name,
    directionTerminus: terminus2,
    stopsCount: stops2,
    durationMinutes: ride2Mins,
    distanceKm: Number(dist2Km.toFixed(1)),
    pathCoords: [
      [interchangeStation.lat, interchangeStation.lng],
      [(interchangeStation.lat + destStation.lat) / 2, (interchangeStation.lng + destStation.lng) / 2],
      [destStation.lat, destStation.lng],
    ],
  };

  const transferWalkMinutes = 3; // 3 min walk inside interchange station
  const totalMetroRideMins = ride1Mins + transferWalkMinutes + ride2Mins;
  const totalMinutes = originWalkMinutes + 3 + totalMetroRideMins + destWalkMinutes;
  const totalRideDistKm = dist1Km + dist2Km;
  const fare = calculateMetroFareRupees(totalRideDistKm);

  return {
    isViable: true,
    originStation,
    destStation,
    originWalkMeters,
    originWalkMinutes,
    destWalkMeters,
    destWalkMinutes,
    directDistanceKm,
    metroRideDistanceKm: totalRideDistKm,
    isInterchange: true,
    interchangeStation: interchangeStation.name,
    legs: [leg1, leg2],
    totalMetroMinutes: totalMetroRideMins,
    totalDurationMinutes: totalMinutes,
    estimatedFareRupees: fare,
  };
}

