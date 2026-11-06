/**
 * DualDirectionTransitDiagram Component
 *
 * Pixel-perfect recreation of TransitRouter's authentic dual-track subway route diagram (Image 2):
 * - Clean dark theme (#0c101a / #090d16) with high-contrast coral/rose track (#f43f5e)
 * - Green route number badge (e.g. [12], [500-D], [378])
 * - Multi-line bold route title + subtitle (2 ROUTE • 17 STOP • 14 STOP)
 * - Continuous SVG dual-direction loop:
 *   - Semicircular top U-turn loop with top terminal apex node
 *   - Continuous left track running downwards with intermediate directional arrows (v)
 *   - Continuous right track running upwards with intermediate directional arrows (^)
 *   - Semicircular bottom U-turn loop with bottom terminal apex node
 * - Circular station nodes directly on the track
 * - Outward stops right-aligned on left; Return stops left-aligned on right
 * - Active stop highlighted with dark burgundy/plum card (matching Lalbagh West Gate in Image 2)
 * - Interactive: click any stop to view live arrivals or center on map
 */

import { useState, useEffect } from "react";
import { X, MapPin, Bus, Clock } from "lucide-react";
import {
  getDualDirectionRoute,
  getUpcomingBusesForStop,
  type DetailedDualRoute,
  type BusStopItem,
  type UpcomingBusArrival,
} from "../../lib/transitService";

interface DualDirectionTransitDiagramProps {
  routeNo: string;
  onClose?: () => void;
  selectedStopId?: string;
  highlightedStopNames?: string[];
  onSelectStop?: (stop: BusStopItem) => void;
  className?: string;
}

const ROW_HEIGHT = 46; // Height in pixels for each stop row
const TRACK_TOP_OFFSET = 36; // Y position of first node row
const LEFT_TRACK_X = 22; // X coordinate of left track
const RIGHT_TRACK_X = 54; // X coordinate of right track
const SVG_WIDTH = 76; // Total width of center track column

export function DualDirectionTransitDiagram({
  routeNo,
  onClose,
  selectedStopId,
  highlightedStopNames = [],
  onSelectStop,
  className = "",
}: DualDirectionTransitDiagramProps) {
  const [data, setData] = useState<DetailedDualRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStop, setActiveStop] = useState<BusStopItem | null>(null);
  const [stopArrivals, setStopArrivals] = useState<UpcomingBusArrival[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getDualDirectionRoute(routeNo).then((res) => {
      if (isMounted) {
        setData(res);
        setIsLoading(false);

        // Pre-select if selectedStopId is provided
        if (selectedStopId && res) {
          const allStops = [
            ...(res.outward?.stops || []),
            ...(res.returnDir?.stops || []),
          ];
          const found = allStops.find((s) => s.id === selectedStopId);
          if (found) {
            setActiveStop(found);
            setStopArrivals(getUpcomingBusesForStop(found.name, routeNo, res.name));
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [routeNo, selectedStopId]);

  if (isLoading) {
    return (
      <div className="bg-[#0b0e17] text-white p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-400 font-semibold">
          Loading Route {routeNo} transit diagram...
        </span>
      </div>
    );
  }

  if (!data || (!data.outward && !data.returnDir)) {
    return (
      <div className="bg-[#0b0e17] text-white p-6 rounded-3xl border border-white/10 shadow-2xl text-center space-y-2">
        <Bus size={32} className="mx-auto text-slate-600" />
        <h3 className="font-bold text-sm text-slate-300">Route {routeNo} diagram not available</h3>
        <p className="text-xs text-slate-500">Could not extract dual stop sequence.</p>
      </div>
    );
  }

  const outwardStops = data.outward?.stops || [];
  const returnStops = data.returnDir?.stops || [];

  // Top terminal name
  const topTerminal =
    outwardStops[0]?.name || data.returnDir?.terminalName || "Top Terminal";

  // Bottom terminal name
  const bottomTerminal =
    outwardStops[outwardStops.length - 1]?.name ||
    data.outward?.terminalName ||
    "Bottom Terminal";

  // Left stops (excluding terminals)
  const leftStops = outwardStops.length > 2 ? outwardStops.slice(1, -1) : outwardStops;
  // Right stops (excluding terminals)
  const rightStops = returnStops.length > 2 ? returnStops.slice(1, -1) : returnStops;

  const maxRows = Math.max(leftStops.length, rightStops.length);
  const bottomNodeY = TRACK_TOP_OFFSET + (maxRows - 1) * ROW_HEIGHT;
  const svgTotalHeight = bottomNodeY + 44;

  const handleStopClick = (stop: BusStopItem) => {
    setActiveStop(stop);
    const arrivals = getUpcomingBusesForStop(stop.name, routeNo, data.name);
    setStopArrivals(arrivals);
    if (onSelectStop) onSelectStop(stop);
  };

  const isStopHighlighted = (stop: BusStopItem) => {
    if (activeStop && activeStop.id === stop.id) return true;
    if (highlightedStopNames && highlightedStopNames.length > 0) {
      const lower = stop.name.toLowerCase();
      return highlightedStopNames.some((h) => lower.includes(h.toLowerCase()));
    }
    return false;
  };

  return (
    <div
      className={`bg-[#0b0e17] text-slate-100 rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl flex flex-col font-sans select-none overflow-hidden ${className}`}
    >
      {/* ========================================================
          1. HEADER (Green badge, bold route name, subtitle, and close)
         ======================================================== */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          {/* Green Route Number Badge */}
          <div className="bg-[#15803d] text-white font-black text-sm sm:text-base px-2.5 py-1 rounded-lg shrink-0 shadow-sm mt-0.5">
            {data.routeNo}
          </div>

          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm sm:text-base text-white leading-tight">
              {data.name}
            </h3>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              {data.totalDirections} ROUTE • {outwardStops.length} STOP • {returnStops.length} STOP
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            title="Close diagram"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ========================================================
          2. DUAL-TRACK SUBWAY ROUTE DIAGRAM (Matching Image 2)
         ======================================================== */}
      <div className="flex-1 overflow-y-auto px-1 py-2 max-h-[600px] scrollbar-thin">
        {/* Top Terminal Title */}
        <div className="text-center mb-1">
          <button
            type="button"
            onClick={() => outwardStops[0] && handleStopClick(outwardStops[0])}
            className="text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition-colors cursor-pointer px-3 py-1 rounded-lg"
          >
            {topTerminal}
          </button>
        </div>

        {/* The Continuous Rail Loop Container */}
        <div className="relative flex justify-center py-1">
          {/* LEFT COLUMN: Outward Stop Names (Right-aligned to line) */}
          <div className="flex-1 min-w-0 pt-[14px]">
            {Array.from({ length: maxRows }).map((_, idx) => {
              const stop = leftStops[idx];
              if (!stop) return <div key={idx} style={{ height: `${ROW_HEIGHT}px` }} />;

              const active = isStopHighlighted(stop);

              return (
                <div
                  key={`left-${stop.id}-${idx}`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  className="flex items-center justify-end pr-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleStopClick(stop)}
                    className={`text-right text-xs leading-snug transition-all cursor-pointer rounded-xl max-w-full px-2.5 py-1 ${
                      active
                        ? "bg-[#2d0b16] border border-rose-500/60 text-white font-bold shadow-lg shadow-rose-900/30 scale-105"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/50 font-medium"
                    }`}
                    title={stop.name}
                  >
                    <span className="block truncate">{stop.name}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* CENTER COLUMN: Continuous SVG Dual Track Loop */}
          <div
            className="shrink-0 relative flex justify-center"
            style={{ width: `${SVG_WIDTH}px`, height: `${svgTotalHeight}px` }}
          >
            <svg
              width={SVG_WIDTH}
              height={svgTotalHeight}
              viewBox={`0 0 ${SVG_WIDTH} ${svgTotalHeight}`}
              className="absolute inset-0 pointer-events-none"
            >
              {/* TOP U-TURN LOOP (╭────╮) */}
              <path
                d={`M ${LEFT_TRACK_X},${TRACK_TOP_OFFSET} A 16,16 0 0,1 ${RIGHT_TRACK_X},${TRACK_TOP_OFFSET}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* TOP TERMINAL APEX NODE */}
              <circle
                cx="38"
                cy={TRACK_TOP_OFFSET - 16}
                r="4.5"
                fill="#0b0e17"
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* CONTINUOUS LEFT VERTICAL TRACK (Outward direction) */}
              <line
                x1={LEFT_TRACK_X}
                y1={TRACK_TOP_OFFSET}
                x2={LEFT_TRACK_X}
                y2={bottomNodeY}
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* CONTINUOUS RIGHT VERTICAL TRACK (Return direction) */}
              <line
                x1={RIGHT_TRACK_X}
                y1={TRACK_TOP_OFFSET}
                x2={RIGHT_TRACK_X}
                y2={bottomNodeY}
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* BOTTOM U-TURN LOOP (╰────╯) */}
              <path
                d={`M ${LEFT_TRACK_X},${bottomNodeY} A 16,16 0 0,0 ${RIGHT_TRACK_X},${bottomNodeY}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* BOTTOM TERMINAL APEX NODE */}
              <circle
                cx="38"
                cy={bottomNodeY + 16}
                r="4.5"
                fill="#0b0e17"
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* INTERMEDIATE STATION NODES & DIRECTIONAL ARROWS */}
              {Array.from({ length: maxRows }).map((_, idx) => {
                const y = TRACK_TOP_OFFSET + idx * ROW_HEIGHT;
                const leftStop = leftStops[idx];
                const rightStop = rightStops[idx];

                const isLeftActive = leftStop ? isStopHighlighted(leftStop) : false;
                const isRightActive = rightStop ? isStopHighlighted(rightStop) : false;

                return (
                  <g key={`track-row-${idx}`}>
                    {/* Left Stop Node */}
                    {leftStop && (
                      <circle
                        cx={LEFT_TRACK_X}
                        cy={y}
                        r={isLeftActive ? "6" : "4.5"}
                        fill={isLeftActive ? "#f43f5e" : "#0b0e17"}
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Left Downward Arrow (v) between rows */}
                    {idx < maxRows - 1 && (
                      <path
                        d={`M ${LEFT_TRACK_X - 3.5},${y + 20} L ${LEFT_TRACK_X},${y + 24} L ${LEFT_TRACK_X + 3.5},${y + 20}`}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Right Stop Node */}
                    {rightStop && (
                      <circle
                        cx={RIGHT_TRACK_X}
                        cy={y}
                        r={isRightActive ? "6" : "4.5"}
                        fill={isRightActive ? "#f43f5e" : "#0b0e17"}
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Right Upward Arrow (^) between rows */}
                    {idx < maxRows - 1 && (
                      <path
                        d={`M ${RIGHT_TRACK_X - 3.5},${y + 24} L ${RIGHT_TRACK_X},${y + 20} L ${RIGHT_TRACK_X + 3.5},${y + 24}`}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* RIGHT COLUMN: Return Stop Names (Left-aligned from line) */}
          <div className="flex-1 min-w-0 pt-[14px]">
            {Array.from({ length: maxRows }).map((_, idx) => {
              const stop = rightStops[idx];
              if (!stop) return <div key={idx} style={{ height: `${ROW_HEIGHT}px` }} />;

              const active = isStopHighlighted(stop);

              return (
                <div
                  key={`right-${stop.id}-${idx}`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  className="flex items-center justify-start pl-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleStopClick(stop)}
                    className={`text-left text-xs leading-snug transition-all cursor-pointer rounded-xl max-w-full px-2.5 py-1 ${
                      active
                        ? "bg-[#2d0b16] border border-rose-500/60 text-white font-bold shadow-lg shadow-rose-900/30 scale-105"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/50 font-medium"
                    }`}
                    title={stop.name}
                  >
                    <span className="block truncate">{stop.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Terminal Title */}
        <div className="text-center mt-2">
          <button
            type="button"
            onClick={() =>
              outwardStops[outwardStops.length - 1] &&
              handleStopClick(outwardStops[outwardStops.length - 1])
            }
            className="text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition-colors cursor-pointer px-3 py-1 rounded-lg"
          >
            {bottomTerminal}
          </button>
        </div>
      </div>

      {/* ========================================================
          3. ACTIVE STOP LIVE ARRIVALS & SEAT STATUS CARD
         ======================================================== */}
      {activeStop && (
        <div className="mt-3 bg-slate-900/90 rounded-2xl p-3 border border-rose-500/30 shadow-lg animate-in fade-in duration-150 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
              <MapPin size={12} />
              <span>Selected Station: {activeStop.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveStop(null)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          {/* Quick arrivals preview for this stop */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {stopArrivals.slice(0, 2).map((bus) => (
              <div
                key={bus.id}
                className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60 flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-white bg-indigo/80 px-1.5 py-0.5 rounded text-[10px]">
                    {bus.routeNo}
                  </span>
                  <div className="text-emerald-400 text-[10px] font-bold mt-0.5">
                    {bus.seatStatus}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-indigo-300 text-xs">
                    {bus.etaMinutes} min
                  </div>
                  <div className="text-slate-400 text-[9px]">Live ETA</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DualDirectionTransitDiagram;
