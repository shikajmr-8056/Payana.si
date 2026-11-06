import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Bus,
  Users,
  ChevronDown,
  ChevronUp,
  Navigation,
  ArrowRight,
  Train,
} from "lucide-react";
import {
  initialBuses,
  transferRoutes,
  type Bus as BusType,
  initialMetroTrains,
  type MetroTrain,
} from "../data/mockData";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    (Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * (1 - Math.cos(dLon))) /
      2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
const MY_LOCATION = { lat: 12.9716, lng: 77.5946 }; // Central Bengaluru

function CrowdBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: "badge-green",
    moderate: "badge-amber",
    crowded: "badge-pink",
    full: "badge-red",
  };
  const labels: Record<string, string> = {
    low: "Seats Free",
    moderate: "Moderate",
    crowded: "Crowded",
    full: "Standing Only",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function OccupancyBar({ value }: { value: number }) {
  const color = value < 40 ? "#00FF9D" : value < 70 ? "#FACC15" : "#FF007A";
  return (
    <div className="occupancy-bar w-full">
      <div 
        className="occupancy-fill" 
        ref={(el) => {
          if (el) {
            el.style.width = `${value}%`;
            el.style.background = color;
          }
        }} 
      />
    </div>
  );
}

function TransitCard({
  item,
  isExpanded,
  onToggle,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [showSaving, setShowSaving] = useState(false);
  const isMetro = item.type === "metro";

  return (
    <motion.div
      layout
      className={`p-3 rounded-xl border transition-colors ${item.isBestRoute ? "border-hyper-green/40 bg-hyper-green/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {isMetro ? (
              <span
                className={`flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm border ${item.line === "purple" ? "bg-purple-500/10 text-purple-700 border-purple-200" : "bg-emerald-500/10 text-emerald-700 border-emerald-200"}`}
              >
                <Train size={10} strokeWidth={3} /> {item.line} Line
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo/10 text-indigo rounded shadow-sm border border-indigo/20">
                <Bus size={10} strokeWidth={3} /> BMTC
              </span>
            )}
            <span className="font-heading font-bold text-sm leading-none">{item.route}</span>
            {item.isBestRoute && (
              <>
                <span className="badge-green px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                  Best Route
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSaving(!showSaving);
                  }}
                  className="flex items-center gap-1 bg-[#FFD700]/20 text-[#B8860B] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-[0_0_8px_rgba(255,215,0,0.4)] shrink-0 transition-transform active:scale-95"
                >
                  ⚡ Saves 14m
                </button>
              </>
            )}
            {showSaving && item.isBestRoute && (
              <p className="text-[10px] text-muted-foreground w-full mt-0.5 bg-surface p-1.5 rounded-md border border-border leading-relaxed">
                Saves 8m by avoiding Silk Board congestion + 6m due to real-time GPS arrival
                accuracy.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{item.routeName}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-foreground">
            <Clock size={12} />
            <span className="metric-value text-lg">
              {item.eta}
              <span className="text-xs text-muted-foreground ml-0.5">min</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <OccupancyBar value={item.occupancy} />
        <span className="metric-value text-xs text-muted-foreground shrink-0">
          {item.occupancy}%
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CrowdBadge level={item.crowdLevel} />
          {item.delay > 0 && (
            <span className="badge-amber px-2 py-0.5 rounded-full text-[10px] font-medium">
              +{item.delay}m delay
            </span>
          )}
        </div>
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground p-1">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 pt-3 border-t border-border"
        >
          <p className="text-xs text-muted-foreground mb-2">
            {isMetro ? "Next Station:" : "Stops:"}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.stops?.map((stop: string, i: number) => (
              <span key={i} className="flex items-center gap-1 text-xs">
                <span className="badge-indigo px-2 py-0.5 rounded-full">{stop}</span>
                {i < item.stops.length - 1 && (
                  <ArrowRight size={10} className="text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {isMetro ? "Wait Time:" : "Next bus:"}{" "}
              <span className="metric-value">{item.nextBusEta || 4}m</span>
            </span>
            <button className="flex items-center gap-1 bg-indigo text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo/90 transition-colors">
              <Navigation size={12} />
              {isMetro ? "Navigate to Station" : "Navigate to Stop"}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function DecisionPanel() {
  const [buses] = useState(initialBuses);
  const [trains] = useState(initialMetroTrains);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transitMode, setTransitMode] = useState<"all" | "bus" | "metro">("all");

  const transitItems = [
    ...buses.map((b) => ({ ...b, type: "bus" as const })),
    ...trains.map((t) => {
      const dist = getDistance(MY_LOCATION.lat, MY_LOCATION.lng, t.lat, t.lng);
      return {
        ...t,
        type: "metro" as const,
        id: t.id,
        eta: Math.round(dist * 6) + 1,
        isBestRoute: false,
        occupancy: t.status === "Arriving" ? 70 : 40,
        crowdLevel: t.status === "Arriving" ? "crowded" : "moderate",
        route: t.line === "purple" ? "Purple Line" : "Green Line",
        routeName: `Towards ${t.nextStation}`,
        delay: 0,
        stops: [t.nextStation, "Majestic", "Indiranagar"],
      };
    }),
  ];

  const catchable = transitItems.filter((t) => t.eta <= 5).length;
  const bestEta = Math.min(...transitItems.map((t) => t.eta));
  const sorted = [...transitItems].sort((a, b) => {
    if (a.isBestRoute) return -1;
    if (b.isBestRoute) return 1;
    return a.eta - b.eta;
  });

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-[380px] max-h-[calc(100vh-5rem)] flex flex-col glass-panel-elevated overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-heading font-bold text-lg">Decision Engine</h2>
          <span className="w-2 h-2 rounded-full bg-hyper-green pulse-green" />
          <span className="text-xs text-muted-foreground ml-auto">
            {catchable}/{buses.length} catchable
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface rounded-lg p-2 text-center">
            <p className="metric-value text-lg text-hyper-green">{bestEta}m</p>
            <p className="text-[10px] text-muted-foreground">Best ETA</p>
          </div>
          <div className="bg-surface rounded-lg p-2 text-center flex flex-col justify-center gap-1.5 pt-3">
            <div className="flex justify-center items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold leading-none text-indigo">
                <Bus size={12} strokeWidth={3} /> {buses.length}
              </span>
              <div className="w-[1px] h-3 bg-border"></div>
              <span className="flex items-center gap-1 text-xs font-bold leading-none text-emerald-600">
                <Train size={12} strokeWidth={3} /> {trains.length}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-none">Live Transit</p>
          </div>
          <div className="bg-surface rounded-lg p-2 text-center">
            <p className="metric-value text-lg text-foreground">{catchable}</p>
            <p className="text-[10px] text-muted-foreground">Catchable</p>
          </div>
        </div>

        {/* Type Toggles (Switch Mode) */}
        <div className="flex bg-surface rounded-lg p-1 border border-border mt-3 grid grid-cols-3 gap-1">
          <button
            onClick={() => setTransitMode("all")}
            className={`py-1.5 rounded shadow-sm text-xs font-semibold transition-all duration-200 ${transitMode === "all" ? "bg-white text-foreground ring-1 ring-border" : "text-muted-foreground hover:bg-black/5 opacity-80"}`}
          >
            All
          </button>
          <button
            onClick={() => setTransitMode("bus")}
            className={`flex justify-center items-center gap-1.5 py-1.5 rounded shadow-sm text-xs font-semibold transition-all duration-200 ${transitMode === "bus" ? "bg-indigo text-white ring-1 ring-indigo/40" : "text-muted-foreground hover:bg-black/5 opacity-80"}`}
          >
            <Bus size={12} /> BMTC
          </button>
          <button
            onClick={() => setTransitMode("metro")}
            className={`flex justify-center items-center gap-1.5 py-1.5 rounded shadow-sm text-xs font-semibold transition-all duration-200 ${transitMode === "metro" ? "bg-emerald-600 text-white ring-1 ring-emerald-600/40" : "text-muted-foreground hover:bg-black/5 opacity-80"}`}
          >
            <Train size={12} /> Metro
          </button>
        </div>
      </div>

      {/* Transit list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Buses Section */}
        {(transitMode === "all" || transitMode === "bus") && (
          <div>
            <div className="flex items-center gap-2 mb-2 sticky -top-3 pt-2 pb-1 bg-card/95 backdrop-blur-sm z-10 border-b border-border">
              <Bus size={14} className="text-indigo" />
              <h3 className="font-heading font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                Live BMTC Buses
              </h3>
            </div>
            <div className="space-y-2">
              {sorted
                .filter((t) => t.type === "bus")
                .map((item) => (
                  <TransitCard
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                ))}
              {sorted.filter((t) => t.type === "bus").length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No buses nearby.</p>
              )}
            </div>
          </div>
        )}

        {/* Metro Section */}
        {(transitMode === "all" || transitMode === "metro") && (
          <div>
            <div className="flex items-center gap-2 mb-2 sticky -top-3 pt-2 pb-1 bg-card/95 backdrop-blur-sm z-10 border-b border-border">
              <Train size={14} className="text-emerald-600" />
              <h3 className="font-heading font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                Live Metro Trains
              </h3>
            </div>
            <div className="space-y-2">
              {sorted
                .filter((t) => t.type === "metro")
                .map((item) => (
                  <TransitCard
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                ))}
              {sorted.filter((t) => t.type === "metro").length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No trains nearby.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transfer routes */}
      <div className="p-3 border-t border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground mb-2">Multi-Route Transfers</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {transferRoutes.map((tr) => (
            <div
              key={tr.id}
              className="shrink-0 bg-surface rounded-lg p-2.5 min-w-[160px] border border-border"
            >
              <p className="text-xs font-medium truncate">
                {tr.from} → {tr.to}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {tr.routes.map((r, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="badge-indigo px-1.5 py-0.5 rounded text-[10px]">{r}</span>
                    {i < tr.routes.length - 1 && (
                      <ArrowRight size={8} className="text-muted-foreground" />
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {tr.transfers} transfer · Saves {tr.timeSaved}m
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
// Payana.ai
