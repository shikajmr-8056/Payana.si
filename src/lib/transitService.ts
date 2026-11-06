/**
 * Payana Transit Service
 *
 * Direct integration with authentic Bengaluru transit data from TransitRouter:
 * - 2,487 BMTC bus routes from services.min.json & routes.min.json
 * - 8,812 bus stops from stops.min.json
 * - Namma Metro lines and stations from rail.json
 * - Timetables & first/last bus schedules from firstlast.min.json
 */

import { decode as decodePolyline } from "@mapbox/polyline";

export interface BusStopItem {
  id: string;
  name: string;
  desc: string;
  lat: number;
  lng: number;
}

export interface RouteServiceItem {
  routeNo: string;
  name: string;
  from: string;
  to: string;
  stopIds: string[];
}

export interface MetroLineItem {
  id: string;
  name: string;
  color: string;
  coordinates: [number, number][]; // [lat, lng]
}

export interface MetroStationItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color?: string;
  isInterchange?: boolean;
}

export interface RouteTiming {
  routeNo: string;
  firstBus: string;
  lastBus: string;
  frequency: string;
}

// In-memory caches
let cachedStops: Map<string, BusStopItem> | null = null;
let cachedStopsList: BusStopItem[] | null = null;
let cachedServices: RouteServiceItem[] | null = null;
let cachedRawServices: Record<string, Record<string, unknown>> | null = null;
let cachedRawRoutes: Record<string, string[]> | null = null;
let cachedRailData: { lines: MetroLineItem[]; stations: MetroStationItem[] } | null = null;
let cachedTimings: Map<string, string[]> | null = null;

export async function loadRawServices(): Promise<Record<string, Record<string, unknown>>> {
  if (cachedRawServices) return cachedRawServices;
  try {
    const res = await fetch("/data/transit/services.min.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedRawServices = await res.json();
    return cachedRawServices!;
  } catch (err) {
    console.error("Failed to load raw services.min.json", err);
    return {};
  }
}

/**
 * Normalizes common Bengaluru locality spelling variations & abbreviations
 */
export function normalizePlaceQuery(text: string): string {
  let q = text.toLowerCase().trim();
  const aliases: Record<string, string> = {
    whitefield: "white field",
    yeshwanthpur: "yeshawanthapura",
    yeswanthpur: "yeshawanthapura",
    yeshwantpur: "yeshawanthapura",
    yesvantpur: "yeshawanthapura",
    kengari: "kengeri",
    hebbal: "hebbala",
    hebbale: "hebbala",
    marathalli: "marathahalli",
    ecity: "electronic city",
    elc: "electronic city",
    majestic: "kempegowda",
    kbs: "kempegowda",
    silkboard: "silk board",
    bsk: "banashankari",
    banashankri: "banashankari",
    shanthinagar: "shanthinagara",
    shantinagar: "shanthinagara",
    shivajinagar: "shivajinagara",
    "kr puram": "krishnarajapura",
    malleswaram: "malleshwaram",
  };

  for (const [k, v] of Object.entries(aliases)) {
    q = q.replace(new RegExp("\\b" + k + "\\b", "gi"), v);
  }
  return q;
}

export interface PlaceToPlaceRouteResult {
  routeNo: string;
  name: string;
  from: string;
  to: string;
  boardingStop: string;
  dropoffStop: string;
  stopsCount: number;
  estimatedMinutes: number;
  fare: number;
  co2Savings: string;
  frequency: string;
  stopIds: string[];
  isTransfer?: boolean;
  transferHub?: string;
  leg1?: {
    routeNo: string;
    name: string;
    boardingStop: string;
    dropoffStop: string;
    stopsCount: number;
  };
  leg2?: {
    routeNo: string;
    name: string;
    boardingStop: string;
    dropoffStop: string;
    stopsCount: number;
  };
}

export interface RouteDirectionData {
  terminalId: string;
  terminalName: string;
  stops: BusStopItem[];
}

export interface DetailedDualRoute {
  routeNo: string;
  name: string;
  outward: RouteDirectionData | null;
  returnDir: RouteDirectionData | null;
  totalDirections: number;
}

/**
 * Load all BMTC stops from stops.min.json
 */
export async function loadAllStops(): Promise<BusStopItem[]> {
  if (cachedStopsList) return cachedStopsList;

  try {
    const res = await fetch("/data/transit/stops.min.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawStops: Record<string, [number, number, string, string, string]> = await res.json();

    const map = new Map<string, BusStopItem>();
    const list: BusStopItem[] = [];

    for (const [id, data] of Object.entries(rawStops)) {
      const [lng, lat, name, desc] = data;
      const item: BusStopItem = {
        id,
        name: name || "Bus Stop",
        desc: desc || "",
        lat,
        lng,
      };
      map.set(id, item);
      list.push(item);
    }

    cachedStops = map;
    cachedStopsList = list;
    return list;
  } catch (err) {
    console.error("Failed to load stops.min.json", err);
    return [];
  }
}

/**
 * Get stop by ID
 */
export async function getStopById(id: string): Promise<BusStopItem | undefined> {
  if (!cachedStops) await loadAllStops();
  return cachedStops?.get(id);
}

/**
 * Load all BMTC route services from services.min.json
 */
export async function loadAllServices(): Promise<RouteServiceItem[]> {
  if (cachedServices) return cachedServices;

  try {
    const res = await fetch("/data/transit/services.min.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawServices: Record<string, Record<string, unknown>> = await res.json();

    const list: RouteServiceItem[] = [];

    for (const [routeNo, obj] of Object.entries(rawServices)) {
      const name = (obj.name as string) || `Route ${routeNo}`;
      const parts = name.split("⇔").map((s) => s.trim());
      const from = parts[0] || "";
      const to = parts[1] || "";

      // Collect stop IDs from outward direction
      let stopIds: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        if (k !== "name" && Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
          stopIds = v[0] as string[];
          break;
        }
      }

      list.push({
        routeNo,
        name,
        from,
        to,
        stopIds,
      });
    }

    cachedServices = list;
    return list;
  } catch (err) {
    console.error("Failed to load services.min.json", err);
    return [];
  }
}

/**
 * Search routes by bus number (e.g. "500-D", "335", "KIA")
 */
export async function searchRoutesByNumber(query: string, limit = 20): Promise<RouteServiceItem[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const results: RouteServiceItem[] = [];

  // Match Namma Metro Lines
  if (isMetroRoute(q)) {
    for (const m of METRO_LINES_DATA) {
      if (
        m.name.toUpperCase().includes(q) ||
        m.fullName.toUpperCase().includes(q) ||
        m.ref.toUpperCase().includes(q) ||
        q.includes("METRO")
      ) {
        results.push({
          routeNo: `${m.ref} Line`,
          name: m.fullName,
          from: m.terminals.split("↔")[0].trim(),
          to: m.terminals.split("↔")[1].trim(),
          stopIds: [],
          isReturn: false,
        });
      }
    }
  }

  const services = await loadAllServices();

  for (const s of services) {
    if (s.routeNo.toUpperCase().startsWith(q) || s.routeNo.toUpperCase().includes(q)) {
      results.push(s);
      if (results.length >= limit) break;
    }
  }

  // Also match name if few matches
  if (results.length < limit) {
    for (const s of services) {
      if (
        !results.includes(s) &&
        (s.name.toUpperCase().includes(q) || s.from.toUpperCase().includes(q) || s.to.toUpperCase().includes(q))
      ) {
        results.push(s);
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}

/**
 * Search routes from place to place
 * Scans both intermediate route stops and terminal endpoints to find all buses that travel this route
 */
/**
 * Find stop IDs matching a user place query
 * Prioritizes actual stop name (s.name) and excludes directional annotations in s.desc (e.g. '(Towards Bidadi)')
 */
export function findMatchingStopIds(rawQuery: string, stopsList: BusStopItem[]): Set<string> {
  const norm = normalizePlaceQuery(rawQuery);
  const rawLower = rawQuery.toLowerCase().trim();
  const matchedIds = new Set<string>();
  if (!norm && !rawLower) return matchedIds;

  // 1. Direct substring match in stop name (s.name) ONLY.
  // We strictly avoid matching directional 's.desc' like '(Towards Bidadi)' which falsely
  // labels intermediate boarding stops (e.g. Kengeri Bus Station) as destination stops.
  for (const s of stopsList) {
    const sName = s.name.toLowerCase();
    if (sName.includes(norm) || (rawLower && sName.includes(rawLower))) {
      matchedIds.add(s.id);
    }
  }

  if (matchedIds.size > 0) return matchedIds;

  // 2. Word / token matching in stop name (e.g. "Abhiman Studio", "Kengeri Satellite Town")
  const words = (norm || rawLower).split(/[\s,./-]+/).filter((w) => w.length > 2);
  if (words.length > 1) {
    for (const s of stopsList) {
      const sName = s.name.toLowerCase();
      if (words.every((w) => sName.includes(w))) {
        matchedIds.add(s.id);
      }
    }
  }

  if (matchedIds.size > 0) return matchedIds;

  // 3. Partial word matching if multi-word query (>= 60% of words match)
  if (words.length > 1) {
    const scored: { id: string; score: number }[] = [];
    for (const s of stopsList) {
      const sName = s.name.toLowerCase();
      const matchCount = words.filter((w) => sName.includes(w)).length;
      if (matchCount >= Math.ceil(words.length * 0.6)) {
        scored.push({ id: s.id, score: matchCount });
      }
    }
    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const topScore = scored[0].score;
      for (const item of scored) {
        if (item.score === topScore) matchedIds.add(item.id);
      }
    }
  }

  // 4. Last resort: if still 0 matches, check s.desc but STRIP any directional '(Towards ...)' marker
  if (matchedIds.size === 0) {
    for (const s of stopsList) {
      const cleanDesc = (s.desc || "").replace(/\(?\s*towards\s+[^)]+\)?/gi, "").trim().toLowerCase();
      if (cleanDesc && (cleanDesc.includes(norm) || cleanDesc.includes(rawLower))) {
        matchedIds.add(s.id);
      }
    }
  }

  return matchedIds;
}

const MAJOR_HUBS = [
  "kengeri bus station",
  "kempegowda bus station",
  "banashankari bus station",
  "central silk board",
  "hebbala bridge",
  "shivajinagara bus station",
  "kr market",
  "yeshawanthapura bus station",
  "electronic city",
  "tin factory",
  "marathahalli",
];

export async function searchRoutesPlaceToPlace(
  fromPlace: string,
  toPlace: string,
  limit = 20
): Promise<PlaceToPlaceRouteResult[]> {
  const fromRaw = fromPlace.trim();
  const toRaw = toPlace.trim();
  if (!fromRaw && !toRaw) return [];

  const fromQ = normalizePlaceQuery(fromRaw);
  const toQ = normalizePlaceQuery(toRaw);

  const [stopsList, rawServices] = await Promise.all([
    loadAllStops(),
    loadRawServices(),
  ]);

  // Find stop IDs matching from & to strictly by stop name
  const fromIds = findMatchingStopIds(fromRaw, stopsList);
  const toIds = findMatchingStopIds(toRaw, stopsList);

  const directResults: PlaceToPlaceRouteResult[] = [];
  const seenRoutes = new Set<string>();

  // 1. Search direct routes passing through both from and to stops in forward travel direction
  for (const [rNo, sData] of Object.entries(rawServices)) {
    const name = (sData.name as string) || `Route ${rNo}`;
    const parts = name.split("⇔").map((s) => s.trim());
    const fromTerminal = parts[0] || "";
    const toTerminal = parts[1] || "";

    for (const [k, v] of Object.entries(sData)) {
      if (k !== "name" && Array.isArray(v)) {
        for (const stopArr of v) {
          if (Array.isArray(stopArr) && stopArr.length > 1) {
            let bestFrom = -1;
            let bestTo = -1;
            let minDist = Infinity;

            for (let i = 0; i < stopArr.length; i++) {
              if (fromIds.has(stopArr[i])) {
                for (let j = i + 1; j < stopArr.length; j++) {
                  if (toIds.has(stopArr[j])) {
                    const dist = j - i;
                    if (dist < minDist) {
                      minDist = dist;
                      bestFrom = i;
                      bestTo = j;
                    }
                    break;
                  }
                }
              }
            }

            // Enforce forward travel: bestFrom < bestTo
            if (bestFrom !== -1 && bestTo !== -1 && bestFrom < bestTo) {
              if (!seenRoutes.has(rNo)) {
                seenRoutes.add(rNo);
                const boardingStop = cachedStops?.get(stopArr[bestFrom])?.name || "Boarding Stop";
                const dropoffStop = cachedStops?.get(stopArr[bestTo])?.name || "Drop-off Stop";
                const stopsCount = bestTo - bestFrom;
                const estMin = Math.max(8, Math.round(stopsCount * 2.2 + 3));
                const fare = stopsCount <= 5 ? 15 : stopsCount <= 12 ? 20 : 25;

                directResults.push({
                  routeNo: rNo,
                  name,
                  from: fromTerminal,
                  to: toTerminal,
                  boardingStop,
                  dropoffStop,
                  stopsCount,
                  estimatedMinutes: estMin,
                  fare,
                  co2Savings: `-${(stopsCount * 0.08).toFixed(1)}kg CO₂`,
                  frequency: "Every 10-15 min",
                  stopIds: stopArr as string[],
                  isTransfer: false,
                });
              }
            }
          }
        }
      }
    }
  }

  // 2. Also search terminal names if direct results are few
  if (directResults.length < 5) {
    for (const [rNo, sData] of Object.entries(rawServices)) {
      if (seenRoutes.has(rNo)) continue;
      const name = ((sData.name as string) || "").toLowerCase();
      const parts = name.split("⇔").map((s) => s.trim());
      const sFrom = parts[0] || "";
      const sTo = parts[1] || "";

      let matches = false;
      if (fromQ && toQ) {
        matches =
          (sFrom.includes(fromQ) && sTo.includes(toQ)) ||
          (name.includes(fromQ) && name.includes(toQ));
      }

      if (matches) {
        seenRoutes.add(rNo);
        let defaultStops: string[] = [];
        for (const [k, v] of Object.entries(sData)) {
          if (k !== "name" && Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
            defaultStops = v[0] as string[];
            break;
          }
        }
        const stopsCount = Math.max(defaultStops.length, 12);
        directResults.push({
          routeNo: rNo,
          name: (sData.name as string) || `Route ${rNo}`,
          from: parts[0] || "",
          to: parts[1] || "",
          boardingStop: parts[0] || fromRaw,
          dropoffStop: parts[1] || toRaw,
          stopsCount,
          estimatedMinutes: Math.max(12, Math.round(stopsCount * 2)),
          fare: 25,
          co2Savings: "-1.1kg CO₂",
          frequency: "Every 12-18 min",
          stopIds: defaultStops,
          isTransfer: false,
        });
      }
      if (directResults.length >= limit) break;
    }
  }

  directResults.sort((a, b) => a.stopsCount - b.stopsCount);

  // 3. If direct routes are few (< 3) and both places provided, compute 1-transfer connections via major hubs
  const transferResults: PlaceToPlaceRouteResult[] = [];
  if (directResults.length < 3 && fromIds.size > 0 && toIds.size > 0) {
    for (const hubQuery of MAJOR_HUBS) {
      const hubIds = new Set(
        stopsList
          .filter((s) => s.name.toLowerCase().includes(hubQuery))
          .map((s) => s.id)
      );
      if (hubIds.size === 0) continue;

      let bestLeg1: {
        routeNo: string;
        name: string;
        boardingStop: string;
        dropoffStop: string;
        stopsCount: number;
        stopIds: string[];
      } | null = null;

      let bestLeg2: {
        routeNo: string;
        name: string;
        boardingStop: string;
        dropoffStop: string;
        stopsCount: number;
        stopIds: string[];
      } | null = null;

      for (const [rNo, sData] of Object.entries(rawServices)) {
        for (const [k, v] of Object.entries(sData)) {
          if (k !== "name" && Array.isArray(v)) {
            for (const stopArr of v) {
              if (Array.isArray(stopArr) && stopArr.length > 1) {
                // Leg 1: from -> hub
                if (!bestLeg1 || bestLeg1.stopsCount > 8) {
                  let fIdx = -1;
                  let hIdx1 = -1;
                  for (let i = 0; i < stopArr.length; i++) {
                    if (fIdx === -1 && fromIds.has(stopArr[i])) fIdx = i;
                    if (fIdx !== -1 && hubIds.has(stopArr[i])) {
                      hIdx1 = i;
                      break;
                    }
                  }
                  if (fIdx !== -1 && hIdx1 !== -1 && fIdx < hIdx1) {
                    const sc = hIdx1 - fIdx;
                    if (!bestLeg1 || sc < bestLeg1.stopsCount) {
                      bestLeg1 = {
                        routeNo: rNo,
                        name: (sData.name as string) || `Route ${rNo}`,
                        boardingStop: cachedStops?.get(stopArr[fIdx])?.name || "Boarding Stop",
                        dropoffStop: cachedStops?.get(stopArr[hIdx1])?.name || "Hub Stop",
                        stopsCount: sc,
                        stopIds: stopArr as string[],
                      };
                    }
                  }
                }

                // Leg 2: hub -> to
                if (!bestLeg2 || bestLeg2.stopsCount > 25) {
                  let hIdx2 = -1;
                  let tIdx = -1;
                  for (let i = 0; i < stopArr.length; i++) {
                    if (hIdx2 === -1 && hubIds.has(stopArr[i])) hIdx2 = i;
                    if (hIdx2 !== -1 && toIds.has(stopArr[i])) {
                      tIdx = i;
                      break;
                    }
                  }
                  if (hIdx2 !== -1 && tIdx !== -1 && hIdx2 < tIdx) {
                    const sc = tIdx - hIdx2;
                    if (!bestLeg2 || sc < bestLeg2.stopsCount) {
                      bestLeg2 = {
                        routeNo: rNo,
                        name: (sData.name as string) || `Route ${rNo}`,
                        boardingStop: cachedStops?.get(stopArr[hIdx2])?.name || "Hub Stop",
                        dropoffStop: cachedStops?.get(stopArr[tIdx])?.name || "Drop-off Stop",
                        stopsCount: sc,
                        stopIds: stopArr as string[],
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (bestLeg1 && bestLeg2 && bestLeg1.routeNo !== bestLeg2.routeNo) {
        const totalStops = bestLeg1.stopsCount + bestLeg2.stopsCount;
        const estMin = Math.max(16, Math.round(totalStops * 2.2 + 8));
        transferResults.push({
          routeNo: `${bestLeg1.routeNo} ➔ ${bestLeg2.routeNo}`,
          name: `${bestLeg1.routeNo} to ${bestLeg1.dropoffStop}, transfer to ${bestLeg2.routeNo}`,
          from: fromRaw,
          to: toRaw,
          boardingStop: bestLeg1.boardingStop,
          dropoffStop: bestLeg2.dropoffStop,
          stopsCount: totalStops,
          estimatedMinutes: estMin,
          fare: 35,
          co2Savings: `-${(totalStops * 0.08).toFixed(1)}kg CO₂`,
          frequency: "Every 8-12 min",
          stopIds: [...bestLeg1.stopIds, ...bestLeg2.stopIds],
          isTransfer: true,
          transferHub: bestLeg1.dropoffStop,
          leg1: bestLeg1,
          leg2: bestLeg2,
        });
      }
    }

    transferResults.sort((a, b) => a.stopsCount - b.stopsCount);
  }

  const combined = [...directResults, ...transferResults.slice(0, 5)];
  return combined.slice(0, limit);
}

/**
 * Get full dual-direction route diagram data (outward and return)
 * Matches TransitRouter dual-track layout (Image 2)
 */
export async function getDualDirectionRoute(routeNo: string): Promise<DetailedDualRoute | null> {
  if (isMetroRoute(routeNo)) {
    return getMetroDualDirectionRoute(routeNo);
  }

  const [stopsList, rawServices] = await Promise.all([
    loadAllStops(),
    loadRawServices(),
  ]);

  const cleanNo = routeNo.trim().toUpperCase();
  let sData = rawServices[cleanNo];

  if (!sData) {
    for (const [k, v] of Object.entries(rawServices)) {
      if (k.toUpperCase() === cleanNo || k.toUpperCase().replace(/\s+/g, "") === cleanNo.replace(/\s+/g, "")) {
        sData = v;
        break;
      }
    }
  }

  if (!sData) return null;

  const name = (sData.name as string) || `Route ${routeNo}`;
  const directions: RouteDirectionData[] = [];

  for (const [k, v] of Object.entries(sData)) {
    if (k !== "name" && Array.isArray(v)) {
      for (const arr of v) {
        if (Array.isArray(arr) && arr.length > 0) {
          const stopList: BusStopItem[] = [];
          for (const id of arr) {
            const stop = cachedStops?.get(id as string);
            if (stop) {
              stopList.push(stop);
            } else {
              stopList.push({
                id: id as string,
                name: `Stop ${id}`,
                desc: "",
                lat: 12.9716,
                lng: 77.5946,
              });
            }
          }

          const termStop = cachedStops?.get(k);
          const terminalName = termStop ? termStop.name : stopList[stopList.length - 1]?.name || k;

          directions.push({
            terminalId: k,
            terminalName,
            stops: stopList,
          });
        }
      }
    }
  }

  return {
    routeNo,
    name,
    outward: directions[0] || null,
    returnDir: directions[1] || null,
    totalDirections: directions.length,
  };
}

/**
 * Load decoded real route geometry for a given route number
 */
export async function loadRouteGeometry(routeNo: string): Promise<[number, number][]> {
  if (isMetroRoute(routeNo)) {
    const { lines } = await loadMetroNetwork();
    const clean = routeNo.toLowerCase();
    const line = lines.find(
      (l) => l.name.toLowerCase().includes(clean) || clean.includes(l.id.toLowerCase())
    );
    if (line) return line.coordinates;
  }

  if (!cachedRawRoutes) {
    try {
      const res = await fetch("/data/transit/routes.min.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cachedRawRoutes = await res.json();
    } catch (err) {
      console.error("Failed to load routes.min.json", err);
      return [];
    }
  }

  const encodedList = cachedRawRoutes?.[routeNo];
  if (!encodedList || encodedList.length === 0) return [];

  try {
    const encoded = encodedList[0];
    const decoded = decodePolyline(encoded);
    return decoded as [number, number][];
  } catch (err) {
    console.error(`Failed to decode polyline for ${routeNo}`, err);
    return [];
  }
}

/**
 * Load Namma Metro lines & stations from rail.json
 */
export async function loadMetroNetwork(): Promise<{
  lines: MetroLineItem[];
  stations: MetroStationItem[];
}> {
  if (cachedRailData) return cachedRailData;

  try {
    const res = await fetch("/data/transit/rail.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const lines: MetroLineItem[] = [];
    const stations: MetroStationItem[] = [];

    for (const f of data.features || []) {
      const props = f.properties || {};
      if (f.geometry.type === "LineString") {
        const coords = f.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]) as [
          number,
          number,
        ][];
        const ref = (props.ref || "").toLowerCase();
        const name = props.name || "Metro Line";
        let color = props.stroke || "#9333EA";

        if (ref.includes("purple") || name.toLowerCase().includes("purple")) {
          color = "#9333EA";
        } else if (ref.includes("green") || name.toLowerCase().includes("green")) {
          color = "#16A34A";
        } else if (ref.includes("yellow") || name.toLowerCase().includes("yellow")) {
          color = "#EAB308";
        }

        lines.push({
          id: props.ref || name,
          name,
          color,
          coordinates: coords,
        });
      } else if (f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates;
        stations.push({
          id: props.name || "station",
          name: props.name || "Metro Station",
          lat,
          lng,
          color: props["station-color"] || "#9333EA",
          isInterchange: props.interchange === true,
        });
      }
    }

    cachedRailData = { lines, stations };
    return cachedRailData;
  } catch (err) {
    console.error("Failed to load rail.json", err);
    return { lines: [], stations: [] };
  }
}

/**
 * Check if a route string corresponds to Namma Metro
 */
export function isMetroRoute(routeNo?: string): boolean {
  if (!routeNo) return false;
  const lower = routeNo.toLowerCase();
  return (
    lower.includes("metro") ||
    lower.includes("purple") ||
    lower.includes("green") ||
    lower.includes("yellow")
  );
}

export interface MetroLineSummary {
  ref: "Purple" | "Green" | "Yellow";
  name: string;
  fullName: string;
  terminals: string;
  stationsCount: number;
  distanceKm: number;
  color: string;
  activeTrainsCount: number;
  firstTrain: string;
  lastTrain: string;
}

export const METRO_LINES_DATA: MetroLineSummary[] = [
  {
    ref: "Purple",
    name: "Purple Line",
    fullName: "Purple Line (Challaghatta ↔ Whitefield (Kadugodi))",
    terminals: "Challaghatta ↔ Whitefield (Kadugodi)",
    stationsCount: 37,
    distanceKm: 43.5,
    color: "#9333EA",
    activeTrainsCount: 6,
    firstTrain: "05:00 AM",
    lastTrain: "11:30 PM",
  },
  {
    ref: "Green",
    name: "Green Line",
    fullName: "Green Line (Madavara ↔ Silk Institute)",
    terminals: "Madavara ↔ Silk Institute",
    stationsCount: 32,
    distanceKm: 33.5,
    color: "#16A34A",
    activeTrainsCount: 5,
    firstTrain: "05:00 AM",
    lastTrain: "11:30 PM",
  },
  {
    ref: "Yellow",
    name: "Yellow Line",
    fullName: "Yellow Line (Bommasandra ↔ Rashtreeya Vidyalaya Road)",
    terminals: "Delta Electronics Bommasandra ↔ RV Road",
    stationsCount: 16,
    distanceKm: 19.1,
    color: "#EAB308",
    activeTrainsCount: 4,
    firstTrain: "05:00 AM",
    lastTrain: "11:30 PM",
  },
];

/**
 * Get ordered Metro stations for a specific line
 */
export async function getMetroStationsForLine(lineRef: string): Promise<BusStopItem[]> {
  const { lines, stations } = await loadMetroNetwork();
  const clean = lineRef.toLowerCase();
  const line = lines.find(
    (l) => l.name.toLowerCase().includes(clean) || clean.includes(l.id.toLowerCase())
  );
  if (!line || line.coordinates.length === 0) return [];

  const coords = line.coordinates;
  const lineStations: { stop: BusStopItem; idx: number }[] = [];

  for (const st of stations) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const d = Math.hypot(coords[i][0] - st.lat, coords[i][1] - st.lng);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    // Within ~800m of line
    if (minDist < 0.008) {
      lineStations.push({
        stop: {
          id: `metro-${st.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
          name: st.name,
          lat: st.lat,
          lng: st.lng,
          desc: st.isInterchange ? "Namma Metro Interchange Station" : "Namma Metro Station",
        },
        idx: bestIdx,
      });
    }
  }

  lineStations.sort((a, b) => a.idx - b.idx);
  return lineStations.map((s) => s.stop);
}

/**
 * Get full route details for a Metro Line
 */
export async function getMetroRouteDetails(routeNo: string): Promise<{
  service: RouteServiceItem | null;
  stops: BusStopItem[];
  timings: RouteTiming[];
  geometry: [number, number][];
}> {
  const { lines } = await loadMetroNetwork();
  const clean = routeNo.toLowerCase();
  const line = lines.find(
    (l) => l.name.toLowerCase().includes(clean) || clean.includes(l.id.toLowerCase())
  );

  if (!line) {
    return { service: null, stops: [], timings: [], geometry: [] };
  }

  const stops = await getMetroStationsForLine(line.id);
  const from = stops[0]?.name || "Origin";
  const to = stops[stops.length - 1]?.name || "Terminus";

  return {
    service: {
      routeNo: `${line.id} Line`,
      name: line.name,
      from,
      to,
      stopIds: stops.map((s) => s.id),
      isReturn: false,
    },
    stops,
    timings: [
      {
        routeNo: `${line.id} Line`,
        firstBus: "05:00 AM",
        lastBus: "11:30 PM",
      },
    ],
    geometry: line.coordinates,
  };
}

/**
 * Get dual-direction route for Metro (for DualDirectionTransitDiagram)
 */
export async function getMetroDualDirectionRoute(routeNo: string): Promise<DetailedDualRoute | null> {
  const details = await getMetroRouteDetails(routeNo);
  if (!details.service || details.stops.length === 0) return null;

  return {
    routeNo: details.service.routeNo,
    title: details.service.name,
    outwardStops: details.stops,
    returnStops: [...details.stops].reverse(),
    outwardOrigin: details.service.from,
    outwardDestination: details.service.to,
    returnOrigin: details.service.to,
    returnDestination: details.service.from,
  };
}

/**
 * Get all 83 Namma Metro stations as BusStopItems
 */
export async function loadAllMetroStations(): Promise<BusStopItem[]> {
  const { stations } = await loadMetroNetwork();
  return stations.map((s) => ({
    id: `metro-${s.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    desc: s.isInterchange ? "Namma Metro Interchange Station" : "Namma Metro Station",
  }));
}

/**
 * Load first & last bus schedules for a stop
 */
export async function loadTimingsForStop(stopId: string): Promise<RouteTiming[]> {
  if (!cachedTimings) {
    try {
      const res = await fetch("/data/transit/firstlast.min.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: Record<string, string[]> = await res.json();
      const map = new Map<string, string[]>();
      for (const [k, v] of Object.entries(raw)) {
        map.set(k, v);
      }
      cachedTimings = map;
    } catch (err) {
      console.error("Failed to load firstlast.min.json", err);
      return [];
    }
  }

  const entries = cachedTimings.get(stopId) || [];
  const results: RouteTiming[] = [];

  for (const entry of entries) {
    const parts = entry.split(" ");
    if (parts.length >= 3) {
      const routeNo = parts[0];
      const rawFirst = parts[1];
      const rawLast = parts[2];

      const formatTime = (t: string) => {
        if (t.length === 4) {
          const h = parseInt(t.slice(0, 2), 10);
          const m = t.slice(2);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${m} ${ampm}`;
        }
        return t;
      };

      results.push({
        routeNo,
        firstBus: formatTime(rawFirst),
        lastBus: formatTime(rawLast),
        frequency: "Every 15-20 min",
      });
    }
  }

  return results;
}

/**
 * Find nearest stop to user location
 */
export async function findNearestStop(lat: number, lng: number): Promise<BusStopItem | null> {
  const stops = await loadAllStops();
  let nearest: BusStopItem | null = null;
  let minDistance = Infinity;

  for (const s of stops) {
    const d = Math.hypot(s.lat - lat, s.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = s;
    }
  }

  return nearest;
}

/**
 * Get comprehensive route details for a route number
 * Including route info, ordered stops, timetable, and decoded polyline geometry
 */
export async function getRouteDetails(routeNo: string): Promise<{
  service: RouteServiceItem | null;
  stops: BusStopItem[];
  timings: RouteTiming[];
  geometry: [number, number][];
}> {
  if (isMetroRoute(routeNo)) {
    return getMetroRouteDetails(routeNo);
  }

  const [allServices, geometry] = await Promise.all([
    loadAllServices(),
    loadRouteGeometry(routeNo),
  ]);

  const cleanNo = routeNo.trim().toUpperCase();
  const service =
    allServices.find((s) => s.routeNo.toUpperCase() === cleanNo) ||
    allServices.find((s) => s.routeNo.toUpperCase().replace(/\s+/g, "") === cleanNo.replace(/\s+/g, "")) ||
    null;

  if (!service) {
    return {
      service: null,
      stops: [],
      timings: [],
      geometry,
    };
  }

  // Resolve all stop objects
  const stops: BusStopItem[] = [];
  for (const id of service.stopIds) {
    const stop = await getStopById(id);
    if (stop) stops.push(stop);
  }

  // Query timings from the first stop
  let timings: RouteTiming[] = [];
  if (service.stopIds.length > 0) {
    const firstStopTimings = await loadTimingsForStop(service.stopIds[0]);
    timings = firstStopTimings.filter((t) => t.routeNo.toUpperCase() === cleanNo);
  }

  // If no exact match found in first stop, search next stops
  if (timings.length === 0 && service.stopIds.length > 1) {
    for (let i = 1; i < Math.min(service.stopIds.length, 5); i++) {
      const stopTimings = await loadTimingsForStop(service.stopIds[i]);
      const found = stopTimings.filter((t) => t.routeNo.toUpperCase() === cleanNo);
      if (found.length > 0) {
        timings = found;
        break;
      }
    }
  }

  // Default fallback if not in firstlast.min.json
  if (timings.length === 0) {
    timings = [
      {
        routeNo: service.routeNo,
        firstBus: "05:30 AM",
        lastBus: "10:30 PM",
        frequency: "Every 12-18 min",
      },
    ];
  }

  return {
    service,
    stops,
    timings,
    geometry,
  };
}

export interface UpcomingBusArrival {
  id: string;
  routeNo: string;
  direction: string;
  vehicleNo: string;
  etaMinutes: number;
  seatStatus: "Seats Free" | "Few Seats" | "Standing Only";
  seatCount: number;
  crowdLevel: "Low" | "Medium" | "High";
}

/**
 * Generate simulated live bus arrivals for any BMTC stop
 * Seats are dynamically provided (faked for now per user requirement)
 */
export function getUpcomingBusesForStop(
  stopName: string,
  activeRouteNo = "500-D",
  destination = "Hebbala Bridge"
): UpcomingBusArrival[] {
  if (
    isMetroRoute(activeRouteNo) ||
    stopName.toLowerCase().includes("station") ||
    stopName.toLowerCase().includes("metro")
  ) {
    const isPurple = activeRouteNo.toLowerCase().includes("purple");
    const isGreen = activeRouteNo.toLowerCase().includes("green");
    const lineTag = isPurple ? "Purple Line" : isGreen ? "Green Line" : "Yellow Line";
    const prefix = isPurple ? "P" : isGreen ? "G" : "Y";
    const dest =
      destination.replace(/^towards\s+/i, "").split("⇔")[1]?.trim() ||
      destination.replace(/^towards\s+/i, "").trim() ||
      (isPurple ? "Whitefield (Kadugodi)" : isGreen ? "Silk Institute" : "Rashtreeya Vidyalaya Road");

    return [
      {
        id: "metro-train-1",
        routeNo: lineTag,
        direction: `Towards ${dest}`,
        vehicleNo: `Train ${prefix}-04 (6 Coaches)`,
        etaMinutes: 2,
        seatStatus: "Seats Free",
        seatCount: 42,
        crowdLevel: "Low",
      },
      {
        id: "metro-train-2",
        routeNo: lineTag,
        direction: `Towards ${dest}`,
        vehicleNo: `Train ${prefix}-11 (6 Coaches)`,
        etaMinutes: 6,
        seatStatus: "Rush",
        seatCount: 0,
        crowdLevel: "High",
      },
      {
        id: "metro-train-3",
        routeNo: lineTag,
        direction: `Towards ${dest}`,
        vehicleNo: `Train ${prefix}-18 (6 Coaches)`,
        etaMinutes: 11,
        seatStatus: "Seats Free",
        seatCount: 18,
        crowdLevel: "Medium",
      },
      {
        id: "metro-train-4",
        routeNo: lineTag,
        direction: `Towards ${dest}`,
        vehicleNo: `Train ${prefix}-25 (6 Coaches)`,
        etaMinutes: 16,
        seatStatus: "Seats Free",
        seatCount: 35,
        crowdLevel: "Low",
      },
    ];
  }

  const cleanRoute = activeRouteNo.toUpperCase();

  const arrivals: UpcomingBusArrival[] = [
    {
      id: "bus-1",
      routeNo: cleanRoute,
      direction: `Towards ${destination.split("⇔")[1]?.trim() || destination.trim() || "Hebbala"}`,
      vehicleNo: "KA51AJ9862",
      etaMinutes: 9,
      seatStatus: "Seats Free",
      seatCount: 18,
      crowdLevel: "Low",
    },
    {
      id: "bus-2",
      routeNo: cleanRoute.startsWith("500") ? "500-EB ELC-HBL" : "KIA-9",
      direction: `Towards ${destination.split("⇔")[1]?.trim() || destination.trim() || "Hebbala"}`,
      vehicleNo: "KA57F4572",
      etaMinutes: 1,
      seatStatus: "Seats Free",
      seatCount: 22,
      crowdLevel: "Low",
    },
    {
      id: "bus-3",
      routeNo: "KIA-8",
      direction: "Towards Electronic City KIA",
      vehicleNo: "KA57F8920",
      etaMinutes: 2,
      seatStatus: "Seats Free",
      seatCount: 14,
      crowdLevel: "Low",
    },
    {
      id: "bus-4",
      routeNo: cleanRoute === "335-E" ? "500-D" : "335-E",
      direction: "Towards Kempegowda Bus Station",
      vehicleNo: "KA53F3841",
      etaMinutes: 6,
      seatStatus: "Few Seats",
      seatCount: 5,
      crowdLevel: "Medium",
    },
    {
      id: "bus-5",
      routeNo: "201-G",
      direction: "Towards Banashankari",
      vehicleNo: "KA01F9912",
      etaMinutes: 14,
      seatStatus: "Standing Only",
      seatCount: 0,
      crowdLevel: "High",
    },
  ];

  return arrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);
}
