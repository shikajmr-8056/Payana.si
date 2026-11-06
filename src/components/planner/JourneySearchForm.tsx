/**
 * JourneySearchForm Component
 *
 * Implements:
 * - From location with autocomplete
 * - Destination with autocomplete
 * - Use Current Location (GPS)
 * - Swap locations
 * - Departure time selector (Leave now / Depart at / Arrive by)
 */

import { useState, useEffect } from "react";
import { MapPin, Navigation, Crosshair, ArrowUpDown, Clock, Search } from "lucide-react";
import type { DepartureTimingPreference, DepartureTimingType } from "../../types/journeyPlanner";
import { loadAllStops, loadAllMetroStations, findNearestStop, type BusStopItem } from "../../lib/transitService";

interface JourneySearchFormProps {
  from: string;
  to: string;
  departureTiming: DepartureTimingPreference;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onTimingChange: (val: DepartureTimingPreference) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isSearching?: boolean;
  className?: string;
}

export function JourneySearchForm({
  from,
  to,
  departureTiming,
  onFromChange,
  onToChange,
  onTimingChange,
  onSubmit,
  isSearching = false,
  className = "",
}: JourneySearchFormProps) {
  const [allLocations, setAllLocations] = useState<BusStopItem[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<BusStopItem[]>([]);
  const [toSuggestions, setToSuggestions] = useState<BusStopItem[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Load stops and metro stations for rich autocomplete
  useEffect(() => {
    Promise.all([loadAllStops(), loadAllMetroStations()]).then(([stops, metro]) => {
      setAllLocations([...metro, ...stops]);
    });
  }, []);

  const handleFromInput = (val: string) => {
    onFromChange(val);
    if (!val.trim()) {
      setFromSuggestions([]);
      setShowFromDropdown(false);
      return;
    }
    const q = val.toLowerCase();
    const filtered = allLocations.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
    setFromSuggestions(filtered);
    setShowFromDropdown(true);
  };

  const handleToInput = (val: string) => {
    onToChange(val);
    if (!val.trim()) {
      setToSuggestions([]);
      setShowToDropdown(false);
      return;
    }
    const q = val.toLowerCase();
    const filtered = allLocations.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
    setToSuggestions(filtered);
    setShowToDropdown(true);
  };

  const handleSwap = () => {
    const temp = from;
    onFromChange(to);
    onToChange(temp);
  };

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = await findNearestStop(latitude, longitude);
        if (nearest) {
          onFromChange(nearest.name);
        } else {
          onFromChange("Current GPS Location");
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        onFromChange("Bengaluru Central");
      },
      { timeout: 8000 }
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className={`space-y-3 ${className}`}
    >
      {/* Origin & Destination Inputs with Swap */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-2 items-center relative">
        {/* FROM INPUT */}
        <div className="relative">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                From
              </label>
              <button
                type="button"
                onClick={handleGPSLocation}
                disabled={isLocating}
                className="text-[10px] font-bold text-indigo hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Crosshair size={11} className={isLocating ? "animate-spin" : ""} />
                <span>{isLocating ? "Locating..." : "Use Live Location"}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
              <input
                type="text"
                value={from}
                onChange={(e) => handleFromInput(e.target.value)}
                onFocus={() => from.trim() && setShowFromDropdown(true)}
                placeholder="Starting stop, metro station, or area..."
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* From Dropdown */}
          {showFromDropdown && fromSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {fromSuggestions.map((s) => (
                <button
                  key={`from-${s.id}`}
                  type="button"
                  onClick={() => {
                    onFromChange(s.name);
                    setShowFromDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {s.id.startsWith("station") ? "🚇 Metro" : "🚌 BMTC"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SWAP BUTTON */}
        <div className="flex justify-center -my-1 md:my-0">
          <button
            type="button"
            onClick={handleSwap}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo hover:border-indigo/40 transition-transform active:rotate-180 cursor-pointer"
            title="Swap Origin and Destination"
          >
            <ArrowUpDown size={14} />
          </button>
        </div>

        {/* TO INPUT */}
        <div className="relative">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-indigo/40 transition-all">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              To
            </label>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[#FF007A] shrink-0 fill-[#FF007A]/20" />
              <input
                type="text"
                value={to}
                onChange={(e) => handleToInput(e.target.value)}
                onFocus={() => to.trim() && setShowToDropdown(true)}
                placeholder="Destination stop, metro station, or area..."
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* To Dropdown */}
          {showToDropdown && toSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {toSuggestions.map((s) => (
                <button
                  key={`to-${s.id}`}
                  type="button"
                  onClick={() => {
                    onToChange(s.name);
                    setShowToDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {s.id.startsWith("station") ? "🚇 Metro" : "🚌 BMTC"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Departure Timing Selector & Submit Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        {/* Timing options: Leave now / Depart at / Arrive by */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            {(["now", "depart_at", "arrive_by"] as DepartureTimingType[]).map((type) => {
              const isSelected = departureTiming.type === type;
              const labels: Record<DepartureTimingType, string> = {
                now: "Leave now",
                depart_at: "Depart at",
                arrive_by: "Arrive by",
              };

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onTimingChange({ ...departureTiming, type })}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          {departureTiming.type !== "now" && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Clock size={12} className="text-slate-400" />
              <input
                type="time"
                value={departureTiming.time || "08:30"}
                onChange={(e) => onTimingChange({ ...departureTiming, time: e.target.value })}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSearching || (!from.trim() && !to.trim())}
          className="w-full sm:w-auto bg-[#4F46E5] hover:bg-indigo/90 text-white font-extrabold text-xs sm:text-sm py-2.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
        >
          <Search size={15} />
          <span>{isSearching ? "Planning Journey..." : "Show Route"}</span>
        </button>
      </div>
    </form>
  );
}

