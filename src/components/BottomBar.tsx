import { Bus, Train, Layers } from "lucide-react";

export type TransitMode = "bmtc" | "metro" | "all";

export interface BottomBarProps {
  transitMode: TransitMode;
  onModeChange: (mode: TransitMode) => void;
}

export function BottomBar({ transitMode, onModeChange }: BottomBarProps) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-1.5 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-1.5 pointer-events-auto">
      {/* BMTC Buses Toggle */}
      <button
        type="button"
        onClick={() => onModeChange("bmtc")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
          transitMode === "bmtc"
            ? "bg-[#4F46E5] text-white shadow-md shadow-indigo/30"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <Bus size={15} />
        <span>BMTC Buses</span>
        {transitMode === "bmtc" && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        )}
      </button>

      {/* Namma Metro Toggle */}
      <button
        type="button"
        onClick={() => onModeChange("metro")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
          transitMode === "metro"
            ? "bg-[#9333EA] text-white shadow-md shadow-purple-600/30"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <Train size={15} />
        <span>Namma Metro</span>
        {transitMode === "metro" && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse shrink-0" />
        )}
      </button>

      {/* Both Networks Toggle */}
      <button
        type="button"
        onClick={() => onModeChange("all")}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          transitMode === "all"
            ? "bg-slate-800 dark:bg-slate-700 text-white shadow-md"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
        title="Show both BMTC and Namma Metro"
      >
        <Layers size={14} />
        <span>Both</span>
      </button>
    </div>
  );
}
