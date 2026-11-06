import { useEffect, useState, lazy, Suspense } from "react";
import type { BusStopItem } from "../lib/transitService";

const MapInner = lazy(() => import("./MapInner"));

interface UserLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface MapBackgroundProps {
  children?: React.ReactNode;
  from?: string;
  to?: string;
  busNumber?: string;
  userLocation?: UserLocation | null;
  selectedStop?: BusStopItem | null;
  onSelectStop?: (stop: BusStopItem) => void;
  onSelectRoute?: (routeNo: string) => void;
  isNavigating?: boolean;
  onBusReachedStop?: () => void;
  tripVariant?: "default" | "metro";
  transitMode?: "bmtc" | "metro" | "all";
}

export function MapBackground({
  children,
  from,
  to,
  busNumber,
  userLocation,
  selectedStop,
  onSelectStop,
  onSelectRoute,
  transitMode = "all",
}: MapBackgroundProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="fixed inset-0 z-0">
      {isClient && (
        <Suspense fallback={<div className="w-full h-full bg-surface" />}>
          <MapInner
            from={from}
            to={to}
            busNumber={busNumber}
            userLocation={userLocation}
            selectedStop={selectedStop}
            onSelectStop={onSelectStop}
            onSelectRoute={onSelectRoute}
            transitMode={transitMode}
          >
            {children}
          </MapInner>
        </Suspense>
      )}
    </div>
  );
}
