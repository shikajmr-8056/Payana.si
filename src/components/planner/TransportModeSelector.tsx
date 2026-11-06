/**
 * TransportModeSelector Component
 *
 * Allows user to filter preferred modes:
 * - BMTC Only
 * - Metro Only
 * - BMTC + Metro
 */

import { Bus, Train, Layers } from "lucide-react";
import type { TransportModeFilter } from "../../types/journeyPlanner";

interface TransportModeSelectorProps {
  selectedMode: TransportModeFilter;
  onChange: (mode: TransportModeFilter) => void;
  className?: string;
}

export function TransportModeSelector({
  selectedMode,
  onChange,
  className = "",
}: TransportModeSelectorProps) {
  const options: { id: TransportModeFilter; label: string; icon: any; desc: string; activeColor: string }[] = [
    {
      id: "all",
      label: "BMTC + Metro",
      icon: Layers,
      desc: "Fastest combination with transfers",
      activeColor: "bg-[#4F46E5] text-white shadow-indigo/25",
    },
    {
      id: "bmtc",
      label: "BMTC Only",
      icon: Bus,
      desc: "Direct & connecting city buses",
      activeColor: "bg-[#2563EB] text-white shadow-blue-600/25",
    },
    {
      id: "metro",
      label: "Metro Only",
      icon: Train,
      desc: "Rapid subway corridors with walk",
      activeColor: "bg-[#9333EA] text-white shadow-purple-600/25",
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Transport Mode
        </label>
        <span className="text-[11px] text-slate-400 font-semibold">
          {selectedMode === "all" ? "Multi-modal active" : `${selectedMode.toUpperCase()} preferred`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedMode === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 ${
                isSelected
                  ? `${opt.activeColor} border-transparent shadow-lg scale-[1.01]`
                  : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-xl ${
                    isSelected ? "bg-white/20" : "bg-white dark:bg-slate-700 shadow-2xs text-indigo"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm">{opt.label}</span>
              </div>
              <span
                className={`text-[11px] font-medium hidden sm:block ${
                  isSelected ? "text-white/80" : "text-slate-400"
                }`}
              >
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

