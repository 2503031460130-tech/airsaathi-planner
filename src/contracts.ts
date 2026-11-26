export type DataSource = "demo" | "forecast";
export type ForecastRow = {
  time: string;
  validAt: string;
  pm: number | null;
  pm10: number | null;
};
export type ForecastData = {
  rows: ForecastRow[];
  retrievedAt: string;
  modelRunAt: null;
  provider: string;
  kind: "forecast";
  resolution: string | null;
  timezone: string;
  fromCache?: boolean;
  error?: string;
  city?: string;
};
export type DataStatus = "unavailable" | "cached-old" | "partial" | "connected";
export type PlannerRow = { h: number; pm: number | null; allowed: boolean };
export type PlannerResult = {
  rows: PlannerRow[];
  base: PlannerRow | null;
  best: PlannerRow | null;
  improved: boolean;
  blocked: boolean;
  reason:
    | "missing"
    | "stale"
    | "conflict"
    | "insufficient-coverage"
    | "no-improvement"
    | "improved";
  locks: { start: number; end: number }[];
  cost: number;
  distanceConsolidatedKm: number;
  coverage: { available: number; total: number; missingHours: number[] };
  trace: {
    candidateHours: number;
    lockedHours: number;
  };
  actions: string[];
};
