import {
  MapPin,
  Navigation,
  Bus,
  Train,
  Leaf,
  ArrowRight,
  User,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock,
  IndianRupee,
  Users,
  Armchair,
  Map,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { calculateJourneyPlans, type JourneyPlan } from "../lib/journeyEngine";

export function JourneyPanel({
  from,
  to,
  mode,
  isNavigating,
  setIsNavigating,
  hasMissed,
  onResetMissed,
  onSelectAlternative,
}: {
  from: string;
  to: string;
  mode?: string;
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
  hasMissed?: boolean;
  onResetMissed?: () => void;
  onSelectAlternative?: (variant: "default" | "metro") => void;
}) {
  const [activeCheckpoint, setActiveCheckpoint] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<JourneyPlan | null>(null);

  useEffect(() => {
    let isMounted = true;
    calculateJourneyPlans(from, to).then((plans) => {
      if (!isMounted) return;
      setCurrentPlan(plans[0] || null);
    });
    return () => {
      isMounted = false;
    };
  }, [from, to]);

  const toggleCheckpoint = (num: number) => {
    setActiveCheckpoint(activeCheckpoint === num ? null : num);
  };

  const durationMin = currentPlan ? currentPlan.totalDurationMinutes : 42;
  const fare = currentPlan ? currentPlan.estimatedFareRupees : 35;
  const co2 = currentPlan ? currentPlan.co2SavedKg : 1.2;
  const crowd = currentPlan ? currentPlan.overallCrowd : "Moderate";
  const seat = currentPlan ? currentPlan.seatAvailability : "Likely";

  return (
    <div className="w-[330px] bg-card/90 backdrop-blur-xl border border-border rounded-3xl shadow-xl flex flex-col pointer-events-auto h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div
        className={`p-5 border-b border-white/5 relative shrink-0 transition-colors duration-300 ${isNavigating ? "bg-[#4F46E5]/10" : "bg-transparent"}`}
      >
        <Link
          to="/plan"
          className="absolute top-5 right-5 text-indigo text-xs font-semibold uppercase tracking-wider hover:underline"
        >
          Cancel
        </Link>
        <h3 className="font-heading font-medium text-lg mb-1">
          {isNavigating ? "Navigating..." : "Active Journey"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isNavigating ? "Turn-by-turn guidance active" : "Optimized multi-modal route"}
        </p>
      </div>

      {/* Locations & Timeline */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {!isNavigating ? (
          <div className="relative isolate mb-4 bg-surface/40 p-3 rounded-2xl border border-border/60">
            <div className="absolute left-[20px] top-[20px] bottom-[20px] w-0.5 bg-border -z-10"></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 flex justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full border-[2px] bg-card border-indigo z-10"></div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-indigo mb-0.5 font-bold uppercase tracking-wider">
                    From
                  </p>
                  <p className="text-xs font-semibold truncate text-foreground">{from}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 flex justify-center shrink-0">
                  <MapPin size={14} className="text-emerald-500 fill-emerald-500/20 z-10" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-emerald-500 mb-0.5 font-bold uppercase tracking-wider">
                    To
                  </p>
                  <p className="text-xs font-semibold truncate text-foreground">{to}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative isolate mb-4 bg-surface/50 p-4 rounded-xl border border-border">
            <div className="space-y-3">
              <div
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => toggleCheckpoint(1)}
              >
                <div className="w-7 h-7 rounded-full bg-indigo/20 flex items-center justify-center shrink-0 border border-indigo/40 z-10">
                  <Bus size={13} className="text-indigo" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-indigo mb-0.5 font-bold uppercase tracking-wider">
                    Next Transfer
                  </p>
                  <p className="text-xs font-medium">Boarding stop approaching</p>
                </div>
              </div>
              <div
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => toggleCheckpoint(2)}
              >
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/40 z-10">
                  <User size={13} className="text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-cyan-400 mb-0.5 font-bold uppercase tracking-wider">
                    Walking Connection
                  </p>
                  <p className="text-xs font-medium">350m transfer walk (4 min)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status / ETA Card */}
        <div className="border border-indigo/20 bg-indigo/5 rounded-2xl p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-indigo tracking-wider uppercase">
              {mode || "Optimized"} Route
            </span>
            <span className="text-[11px] bg-hyper-green/20 text-hyper-green px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Leaf size={10} /> -{co2}kg CO₂
            </span>
          </div>

          <div className="text-2xl font-bold font-heading mb-1 text-foreground flex items-baseline gap-2">
            <span>{durationMin} min</span>
            <span className="text-xs font-normal text-muted-foreground">total travel time</span>
          </div>

          {/* Metrics Row: Fare, Crowd, Seat Probability */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50 text-center">
            <div className="bg-surface/60 rounded-xl p-2">
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5">
                <IndianRupee size={10} /> Est. Fare
              </span>
              <span className="text-xs font-bold text-foreground">₹{fare}</span>
            </div>

            <div className="bg-surface/60 rounded-xl p-2">
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5">
                <Users size={10} /> Crowd
              </span>
              <span
                className={`text-[11px] font-bold ${
                  crowd === "Low"
                    ? "text-emerald-500"
                    : crowd === "Moderate"
                    ? "text-amber-500"
                    : crowd === "Unknown"
                    ? "text-slate-400"
                    : "text-rose-500"
                }`}
              >
                {crowd}
              </span>
            </div>

            <div className="bg-surface/60 rounded-xl p-2">
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5">
                <Armchair size={10} /> Seat
              </span>
              <span
                className={`text-[11px] font-bold ${
                  seat === "Likely"
                    ? "text-emerald-500"
                    : seat === "Possible"
                    ? "text-amber-500"
                    : seat === "Unknown"
                    ? "text-slate-400"
                    : "text-rose-500"
                }`}
              >
                {seat}
              </span>
            </div>
          </div>

          {/* Segments Preview */}
          <div className="flex items-center gap-2 mt-3 pt-2 text-xs font-medium text-muted-foreground overflow-x-auto">
            {currentPlan?.segments.map((seg, i) => (
              <span key={seg.id} className="flex items-center gap-1 shrink-0">
                {seg.type === "metro" ? (
                  <Train size={12} className="text-purple-600" />
                ) : seg.type === "bus" ? (
                  <Bus size={12} className="text-blue-600" />
                ) : (
                  <User size={12} className="text-slate-500" />
                )}
                <span className="text-foreground">{seg.routeLabel}</span>
                {i < currentPlan.segments.length - 1 && (
                  <ArrowRight size={10} className="text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Turn-by-Turn Instruction Banner */}
        {isNavigating && (
          <div className="p-3.5 bg-hyper-green/10 border border-hyper-green/30 rounded-xl">
            <p className="text-[10px] text-hyper-green uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
              <Activity size={12} /> Next Step
            </p>
            <p className="text-xs font-medium text-foreground">
              {currentPlan?.segments[0]?.instructions || "Head to the boarding stop."}
            </p>
          </div>
        )}

        {/* Missed Bus Alert */}
        {hasMissed && (
          <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={15} className="text-destructive" />
              <span className="font-bold text-destructive uppercase tracking-wider text-xs">
                Bus Missed
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              The scheduled bus has departed. Select an alternative route below.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!hasMissed ? (
          <button
            onClick={() => setIsNavigating(!isNavigating)}
            className={`w-full text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 mt-2 text-sm ${
              isNavigating
                ? "bg-destructive/80 hover:bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "bg-indigo hover:bg-indigo/90 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            }`}
          >
            {isNavigating ? (
              <>End Navigation</>
            ) : (
              <>
                <Navigation size={15} /> Start Navigation
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2 mt-2">
            <button
              onClick={() => {
                onResetMissed?.();
                setIsNavigating(true);
              }}
              className="w-full bg-indigo text-white font-semibold rounded-xl py-2.5 hover:bg-indigo/90 transition-colors shadow-md flex items-center justify-center gap-2 text-xs"
            >
              <Clock size={14} /> Wait for Next Bus (~10m)
            </button>

            {/* Quick Metro Transfer Alternative */}
            <button
              onClick={() => onSelectAlternative?.("metro")}
              className="w-full bg-purple-600/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold rounded-xl py-2.5 hover:bg-purple-600/20 transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Train size={14} className="text-purple-600" />
              <span>Switch to Namma Metro Alternative</span>
            </button>

            {/* Direct Bus Alternative */}
            <button
              onClick={() => onSelectAlternative?.("default")}
              className="w-full bg-amber-600/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold rounded-xl py-2.5 hover:bg-amber-600/20 transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Bus size={14} className="text-amber-600" />
              <span>Direct Arterial Bus</span>
            </button>

            <Link
              to="/plan"
              className="w-full bg-surface text-foreground font-semibold rounded-xl py-2.5 hover:bg-surface/80 transition-colors flex items-center justify-center gap-2 border border-border text-xs"
            >
              <Map size={14} /> Plan Another Trip
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
