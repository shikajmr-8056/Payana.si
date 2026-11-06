import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MiniMapPreview() {
  return (
    <div className="relative w-full h-[160px] rounded-xl border border-border overflow-hidden pointer-events-none bg-secondary z-0">
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
      </MapContainer>

      {/* Floating Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 glass-panel text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm z-[1000] bg-background/90 text-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Bengaluru Network
      </div>
    </div>
  );
}
