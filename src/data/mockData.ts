export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Bus {
  id: string;
  route: string;
  routeName: string;
  lat: number;
  lng: number;
  eta: number; // minutes
  delay: number; // minutes
  occupancy: number; // 0-100
  crowdLevel: "low" | "moderate" | "crowded" | "full";
  nextBusEta: number;
  stops: string[];
  isBestRoute: boolean;
}

export interface Alert {
  id: string;
  type: "urgent" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  area: string;
  points: number;
  co2Saved: number;
}

export interface TripHistory {
  id: string;
  route: string;
  date: string;
  duration: string;
  co2Saved: number;
  crowdLevel: "low" | "moderate" | "crowded";
}

export interface TransferRoute {
  id: string;
  from: string;
  to: string;
  routes: string[];
  transfers: number;
  timeSaved: number;
}

export const stops: BusStop[] = [
  { id: "s1", name: "Majestic", lat: 12.9767, lng: 77.5713 },
  { id: "s2", name: "Shivajinagar", lat: 12.9857, lng: 77.6057 },
  { id: "s3", name: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  { id: "s4", name: "Domlur", lat: 12.9611, lng: 77.6387 },
  { id: "s5", name: "Hebbal", lat: 13.0358, lng: 77.597 },
  { id: "s6", name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { id: "s7", name: "Silk Board", lat: 12.9173, lng: 77.623 },
  { id: "s8", name: "Electronic City", lat: 12.8456, lng: 77.6603 },
  { id: "s9", name: "Whitefield", lat: 12.9698, lng: 77.75 },
  { id: "s10", name: "Jayanagar", lat: 12.9308, lng: 77.5838 },
  { id: "s11", name: "Malleshwaram", lat: 13.0031, lng: 77.5643 },
  { id: "s12", name: "Yelahanka", lat: 13.1007, lng: 77.5963 },
  { id: "s13", name: "Banashankari", lat: 12.9255, lng: 77.5468 },
  { id: "s14", name: "Marathahalli", lat: 12.9569, lng: 77.7011 },
  { id: "s15", name: "BTM Layout", lat: 12.9166, lng: 77.6101 },
];

export const initialBuses: Bus[] = [
  {
    id: "BUS-401E",
    route: "401-E",
    routeName: "Majestic → Electronic City",
    lat: 12.962,
    lng: 77.589,
    eta: 3,
    delay: 0,
    occupancy: 35,
    crowdLevel: "low",
    nextBusEta: 12,
    stops: ["Majestic", "Jayanagar", "Silk Board", "Electronic City"],
    isBestRoute: true,
  },
  {
    id: "BUS-500C",
    route: "500-C",
    routeName: "Hebbal → Silk Board",
    lat: 13.01,
    lng: 77.595,
    eta: 7,
    delay: 2,
    occupancy: 72,
    crowdLevel: "crowded",
    nextBusEta: 15,
    stops: ["Hebbal", "Shivajinagar", "Indiranagar", "Domlur", "Silk Board"],
    isBestRoute: false,
  },
  {
    id: "BUS-210D",
    route: "210-D",
    routeName: "Majestic → Whitefield",
    lat: 12.981,
    lng: 77.62,
    eta: 5,
    delay: 1,
    occupancy: 55,
    crowdLevel: "moderate",
    nextBusEta: 18,
    stops: ["Majestic", "Shivajinagar", "Indiranagar", "Whitefield"],
    isBestRoute: false,
  },
  {
    id: "BUS-335G",
    route: "335-G",
    routeName: "Koramangala → Hebbal",
    lat: 12.95,
    lng: 77.63,
    eta: 9,
    delay: 3,
    occupancy: 88,
    crowdLevel: "full",
    nextBusEta: 22,
    stops: ["Koramangala", "Domlur", "Indiranagar", "Shivajinagar", "Hebbal"],
    isBestRoute: false,
  },
  {
    id: "BUS-600B",
    route: "600-B",
    routeName: "Jayanagar → Indiranagar",
    lat: 12.94,
    lng: 77.59,
    eta: 4,
    delay: 0,
    occupancy: 28,
    crowdLevel: "low",
    nextBusEta: 10,
    stops: ["Jayanagar", "Koramangala", "Domlur", "Indiranagar"],
    isBestRoute: false,
  },
  {
    id: "BUS-201A",
    route: "201-A",
    routeName: "Electronic City → Majestic",
    lat: 12.87,
    lng: 77.65,
    eta: 11,
    delay: 4,
    occupancy: 62,
    crowdLevel: "moderate",
    nextBusEta: 25,
    stops: ["Electronic City", "Silk Board", "Koramangala", "Jayanagar", "Majestic"],
    isBestRoute: false,
  },
  {
    id: "BUS-252F",
    route: "252-F",
    routeName: "Majestic → Malleshwaram",
    lat: 12.985,
    lng: 77.568,
    eta: 6,
    delay: 1,
    occupancy: 45,
    crowdLevel: "moderate",
    nextBusEta: 18,
    stops: ["Majestic", "Malleshwaram"],
    isBestRoute: false,
  },
  {
    id: "BUS-285M",
    route: "285-M",
    routeName: "Yelahanka → Majestic",
    lat: 13.08,
    lng: 77.585,
    eta: 12,
    delay: 4,
    occupancy: 95,
    crowdLevel: "full",
    nextBusEta: 30,
    stops: ["Yelahanka", "Hebbal", "Majestic"],
    isBestRoute: false,
  },
  {
    id: "BUS-2F",
    route: "2-F",
    routeName: "Banashankari → BTM Layout",
    lat: 12.92,
    lng: 77.58,
    eta: 5,
    delay: 2,
    occupancy: 68,
    crowdLevel: "crowded",
    nextBusEta: 20,
    stops: ["Banashankari", "Jayanagar", "BTM Layout", "Silk Board"],
    isBestRoute: true,
  },
  {
    id: "BUS-500D",
    route: "500-D",
    routeName: "Silk Board → Marathahalli",
    lat: 12.94,
    lng: 77.68,
    eta: 8,
    delay: 5,
    occupancy: 82,
    crowdLevel: "full",
    nextBusEta: 15,
    stops: ["Silk Board", "Koramangala", "Marathahalli", "Whitefield"],
    isBestRoute: false,
  },
];

export const alerts: Alert[] = [
  {
    id: "a1",
    type: "urgent",
    title: "Leave Now!",
    message: "Bus 401-E arriving at your stop in 3 min. Best route with low crowd.",
    timestamp: "2 min ago",
  },
  {
    id: "a2",
    type: "warning",
    title: "Route 500-C Delayed",
    message: "Heavy traffic near Silk Board junction. Expect 5-8 min delay.",
    timestamp: "5 min ago",
  },
  {
    id: "a3",
    type: "info",
    title: "🌿 Carbon Milestone!",
    message: "You've saved 127kg CO₂ this month. That's equivalent to planting 6 trees!",
    timestamp: "1 hr ago",
  },
  {
    id: "a4",
    type: "warning",
    title: "Seat Alert",
    message: "Bus 335-G is nearly full (88% occupancy). Consider next bus at 22 min.",
    timestamp: "3 min ago",
  },
];

export const userStats = {
  co2Saved: 127,
  treesEquivalent: 6,
  tripsThisMonth: 47,
  streak: 14,
  points: 4820,
  rank: 3,
  badge: "Gold Commuter" as const,
  weeklyData: [
    { day: "Mon", co2: 4.2 },
    { day: "Tue", co2: 5.1 },
    { day: "Wed", co2: 3.8 },
    { day: "Thu", co2: 6.2 },
    { day: "Fri", co2: 4.9 },
    { day: "Sat", co2: 2.1 },
    { day: "Sun", co2: 1.5 },
  ],
};

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Arun Kumar", area: "Koramangala", points: 6240, co2Saved: 189 },
  { rank: 2, name: "Priya Sharma", area: "Indiranagar", points: 5680, co2Saved: 162 },
  { rank: 3, name: "You", area: "Jayanagar", points: 4820, co2Saved: 127 },
  { rank: 4, name: "Ravi Menon", area: "Whitefield", points: 4510, co2Saved: 118 },
  { rank: 5, name: "Sneha Reddy", area: "Hebbal", points: 3920, co2Saved: 98 },
  { rank: 6, name: "Karthik Iyer", area: "Electronic City", points: 3450, co2Saved: 87 },
  { rank: 7, name: "Divya Nair", area: "Majestic", points: 2890, co2Saved: 72 },
  { rank: 8, name: "Ananya S", area: "Malleshwaram", points: 2650, co2Saved: 65 },
  { rank: 9, name: "Vikas Rao", area: "BTM Layout", points: 2420, co2Saved: 59 },
  { rank: 10, name: "Mohammed Ali", area: "Banashankari", points: 2110, co2Saved: 51 },
  { rank: 11, name: "Neha Gupta", area: "Marathahalli", points: 1980, co2Saved: 46 },
];

export const tripHistory: TripHistory[] = [
  {
    id: "t1",
    route: "401-E",
    date: "Today, 8:32 AM",
    duration: "42 min",
    co2Saved: 2.4,
    crowdLevel: "low",
  },
  {
    id: "t2",
    route: "600-B",
    date: "Yesterday, 6:15 PM",
    duration: "28 min",
    co2Saved: 1.8,
    crowdLevel: "moderate",
  },
  {
    id: "t3",
    route: "210-D",
    date: "Yesterday, 8:45 AM",
    duration: "55 min",
    co2Saved: 3.2,
    crowdLevel: "crowded",
  },
  {
    id: "t4",
    route: "500-C",
    date: "Apr 13, 7:20 AM",
    duration: "48 min",
    co2Saved: 2.9,
    crowdLevel: "moderate",
  },
  {
    id: "t5",
    route: "401-E",
    date: "Apr 12, 8:10 AM",
    duration: "40 min",
    co2Saved: 2.4,
    crowdLevel: "low",
  },
  {
    id: "t6",
    route: "335-G",
    date: "Apr 12, 5:50 PM",
    duration: "38 min",
    co2Saved: 2.1,
    crowdLevel: "crowded",
  },
  {
    id: "t7",
    route: "201-A",
    date: "Apr 11, 9:00 AM",
    duration: "62 min",
    co2Saved: 3.8,
    crowdLevel: "moderate",
  },
  {
    id: "t8",
    route: "600-B",
    date: "Apr 10, 6:30 PM",
    duration: "30 min",
    co2Saved: 1.9,
    crowdLevel: "low",
  },
];

export const transferRoutes: TransferRoute[] = [
  {
    id: "tr1",
    from: "Majestic",
    to: "Whitefield",
    routes: ["401-E", "210-D"],
    transfers: 1,
    timeSaved: 12,
  },
  {
    id: "tr2",
    from: "Jayanagar",
    to: "Hebbal",
    routes: ["600-B", "500-C"],
    transfers: 1,
    timeSaved: 8,
  },
  {
    id: "tr3",
    from: "Electronic City",
    to: "Indiranagar",
    routes: ["201-A", "600-B"],
    transfers: 1,
    timeSaved: 15,
  },
];

export const allRoutes = [
  {
    id: "r1",
    route: "401-E",
    from: "Majestic",
    to: "Electronic City",
    frequency: "8 min",
    crowdLevel: "low" as const,
    duration: "45 min",
    area: "Majestic",
  },
  {
    id: "r2",
    route: "500-C",
    from: "Hebbal",
    to: "Silk Board",
    frequency: "12 min",
    crowdLevel: "crowded" as const,
    duration: "55 min",
    area: "Hebbal",
  },
  {
    id: "r3",
    route: "210-D",
    from: "Majestic",
    to: "Whitefield",
    frequency: "15 min",
    crowdLevel: "moderate" as const,
    duration: "60 min",
    area: "Majestic",
  },
  {
    id: "r4",
    route: "335-G",
    from: "Koramangala",
    to: "Hebbal",
    frequency: "10 min",
    crowdLevel: "crowded" as const,
    duration: "50 min",
    area: "Koramangala",
  },
  {
    id: "r5",
    route: "600-B",
    from: "Jayanagar",
    to: "Indiranagar",
    frequency: "7 min",
    crowdLevel: "low" as const,
    duration: "30 min",
    area: "Jayanagar",
  },
  {
    id: "r6",
    route: "201-A",
    from: "Electronic City",
    to: "Majestic",
    frequency: "20 min",
    crowdLevel: "moderate" as const,
    duration: "65 min",
    area: "Electronic City",
  },
  {
    id: "r7",
    route: "314-F",
    from: "Indiranagar",
    to: "Jayanagar",
    frequency: "9 min",
    crowdLevel: "low" as const,
    duration: "25 min",
    area: "Indiranagar",
  },
  {
    id: "r8",
    route: "450-K",
    from: "Whitefield",
    to: "Majestic",
    frequency: "18 min",
    crowdLevel: "moderate" as const,
    duration: "70 min",
    area: "Whitefield",
  },
  {
    id: "r9",
    route: "252-F",
    from: "Majestic",
    to: "Malleshwaram",
    frequency: "12 min",
    crowdLevel: "moderate" as const,
    duration: "20 min",
    area: "Malleshwaram",
  },
  {
    id: "r10",
    route: "285-M",
    from: "Yelahanka",
    to: "Majestic",
    frequency: "25 min",
    crowdLevel: "full" as const,
    duration: "50 min",
    area: "Yelahanka",
  },
  {
    id: "r11",
    route: "2-F",
    from: "Banashankari",
    to: "BTM Layout",
    frequency: "10 min",
    crowdLevel: "crowded" as const,
    duration: "35 min",
    area: "Banashankari",
  },
  {
    id: "r12",
    route: "500-D",
    from: "Silk Board",
    to: "Marathahalli",
    frequency: "5 min",
    crowdLevel: "full" as const,
    duration: "40 min",
    area: "Marathahalli",
  },
];

export const peakData = {
  hourlyHeatmap: [
    { hour: "6 AM", mon: 20, tue: 25, wed: 22, thu: 28, fri: 30, sat: 15, sun: 10 },
    { hour: "7 AM", mon: 55, tue: 60, wed: 58, thu: 62, fri: 65, sat: 25, sun: 15 },
    { hour: "8 AM", mon: 85, tue: 88, wed: 82, thu: 90, fri: 92, sat: 35, sun: 20 },
    { hour: "9 AM", mon: 95, tue: 92, wed: 90, thu: 94, fri: 96, sat: 40, sun: 22 },
    { hour: "10 AM", mon: 70, tue: 68, wed: 65, thu: 72, fri: 75, sat: 45, sun: 30 },
    { hour: "11 AM", mon: 45, tue: 42, wed: 40, thu: 48, fri: 50, sat: 50, sun: 35 },
    { hour: "12 PM", mon: 50, tue: 48, wed: 45, thu: 52, fri: 55, sat: 55, sun: 40 },
    { hour: "1 PM", mon: 55, tue: 52, wed: 50, thu: 58, fri: 60, sat: 48, sun: 35 },
    { hour: "2 PM", mon: 45, tue: 42, wed: 40, thu: 48, fri: 50, sat: 42, sun: 30 },
    { hour: "3 PM", mon: 50, tue: 48, wed: 45, thu: 52, fri: 55, sat: 38, sun: 25 },
    { hour: "4 PM", mon: 65, tue: 62, wed: 60, thu: 68, fri: 70, sat: 35, sun: 20 },
    { hour: "5 PM", mon: 88, tue: 85, wed: 82, thu: 90, fri: 95, sat: 30, sun: 18 },
    { hour: "6 PM", mon: 92, tue: 90, wed: 88, thu: 94, fri: 98, sat: 28, sun: 15 },
    { hour: "7 PM", mon: 75, tue: 72, wed: 70, thu: 78, fri: 80, sat: 22, sun: 12 },
    { hour: "8 PM", mon: 50, tue: 48, wed: 45, thu: 52, fri: 55, sat: 18, sun: 10 },
    { hour: "9 PM", mon: 30, tue: 28, wed: 25, thu: 32, fri: 35, sat: 12, sun: 8 },
  ],
  delayTrends: [
    { day: "Mon", avg: 4.2, peak: 8.5 },
    { day: "Tue", avg: 3.8, peak: 7.2 },
    { day: "Wed", avg: 3.5, peak: 6.8 },
    { day: "Thu", avg: 4.5, peak: 9.1 },
    { day: "Fri", avg: 5.2, peak: 11.3 },
    { day: "Sat", avg: 2.1, peak: 4.2 },
    { day: "Sun", avg: 1.5, peak: 3.0 },
  ],
  carbonOverTime: [
    { month: "Oct", saved: 82 },
    { month: "Nov", saved: 95 },
    { month: "Dec", saved: 88 },
    { month: "Jan", saved: 105 },
    { month: "Feb", saved: 112 },
    { month: "Mar", saved: 120 },
    { month: "Apr", saved: 127 },
  ],
};

export function moveBus(bus: Bus): Bus {
  return bus;
}

export interface MetroStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  line: "purple" | "green";
}

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  path: [number, number][];
}

export interface MetroTrain {
  id: string;
  line: "purple" | "green";
  lat: number;
  lng: number;
  nextStation: string;
  status: "Arriving" | "Departed" | "On Time";
}

export const metroStations: MetroStation[] = [];

export const metroLines: MetroLine[] = [];

export const initialMetroTrains: MetroTrain[] = [];

export function moveMetroTrain(train: MetroTrain): MetroTrain {
  return train;
}
// Payana.ai
