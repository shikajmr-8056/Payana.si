/**
 * Types for Payana Personalized Multimodal Journey Planner
 */

export type TransportModeFilter = "all" | "bmtc" | "metro";

export type TravelPriority =
  | "fastest"
  | "seat"
  | "cheapest"
  | "least_walking"
  | "fewest_transfers";

export type SeatingPreference = "prefer_seat" | "no_preference";

export type DepartureTimingType = "now" | "depart_at" | "arrive_by";

export interface DepartureTimingPreference {
  type: DepartureTimingType;
  time?: string; // HH:MM in 24h or formatted string
}

export type RecommendationTag =
  | "FASTEST"
  | "BEST CHANCE OF SEAT"
  | "CHEAPEST"
  | "LEAST WALKING"
  | "FEWEST TRANSFERS"
  | "BEST MATCH";

export type LegType = "walk" | "bus" | "metro";

export type DataConfidence = "Live Verified" | "Estimated" | "Scheduled" | "Unknown";

export interface JourneyLeg {
  id: string;
  type: LegType;
  label: string; // e.g. "Walk", "BMTC 500-D", "Purple Line"
  routeNumber?: string; // e.g. "500-D", "KIA-9"
  serviceCategory?: "ordinary" | "vajra" | "vayu_vajra" | "metro";
  lineColor: string; // hex color code
  fromName: string;
  toName: string;
  fromCoords: [number, number]; // [lat, lng]
  toCoords: [number, number]; // [lat, lng]
  pathCoords: [number, number][]; // [lat, lng][]
  durationMinutes: number;
  distanceMeters: number;
  waitingMinutes?: number;
  instructions: string;
  departureTime: string;
  arrivalTime: string;
  intermediateStopsCount?: number;
  intermediateStops?: string[];
  interchangeInfo?: string;
  // Crowd & Occupancy (Must show "Unknown" when unavailable)
  occupancyStatus: "Seats Free" | "Standing Only" | "Crowded" | "Unknown";
  occupancyPercentage?: number;
  dataSource: DataConfidence;
}

export interface JourneyRecommendation {
  id: string;
  title: string;
  tags: RecommendationTag[];
  primaryTag?: RecommendationTag;
  totalDurationMinutes: number;
  walkingDurationMinutes: number;
  walkingDistanceMeters: number;
  inVehicleDurationMinutes: number;
  waitingDurationMinutes: number;
  transfersCount: number;
  estimatedFareRupees: number;
  co2SavedKg: number;
  departureTime: string;
  arrivalTime: string;
  legs: JourneyLeg[];
  transportSummary: {
    modes: LegType[];
    sequenceLabels: {
      type: LegType;
      label: string;
      color: string;
      badgeText: string;
    }[];
  };
  seatProbability: "Likely" | "Possible" | "Unlikely" | "Unknown";
  isRealtimeTracked: boolean;
  score: number;
}

export interface JourneyPlanRequest {
  from: string;
  to: string;
  departureTiming: DepartureTimingPreference;
  transportMode: TransportModeFilter;
  primaryPriority: TravelPriority;
  secondaryPriorities: TravelPriority[];
  seatingPreference: SeatingPreference;
}

