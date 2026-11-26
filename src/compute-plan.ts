import { plan } from "./planner.mjs";
import { planForecast } from "./forecast-plan.mjs";
import type { DataSource, ForecastData, PlannerResult } from "./contracts";

export type PlanInputs = {
  dataSource: DataSource;
  forecast: ForecastData | null;
  city: string;
  forecastDate: string;
  scenario: string;
  walkStart: number;
  walkEnd: number;
  workStart: number;
  workEnd: number;
  combineTrip: boolean;
  errandKm: number;
};

/**
 * Pure, fail-safe calculation wrapper bridging UI input state and planner logic.
 * Ensures consistent error handling without unhandled runtime exceptions.
 *
 * @param input - Complete planning configuration and scenario state
 * @returns Object containing the computed PlannerResult or an intuitive error message
 */
export function computePlan(input: PlanInputs): {
  planResult: PlannerResult | null;
  error: string;
} {
  const common = {
    start: input.walkStart,
    end: input.walkEnd,
    commute: input.workStart,
    workEnd: input.workEnd,
    combine: input.combineTrip,
    distance: input.combineTrip ? input.errandKm : 0,
  };
  if (input.dataSource !== "demo" && input.dataSource !== "forecast")
    return { planResult: null, error: "Unknown data source" };
  try {
    const forecast = input.forecast;
    const useForecast =
      input.dataSource === "forecast" &&
      forecast !== null &&
      forecast.city === input.city;
    const planResult =
      useForecast && forecast
        ? planForecast({
            data: forecast,
            date: input.forecastDate,
            ...common,
          })
        : plan({
            ...common,
            mode: input.dataSource === "forecast" ? "missing" : input.scenario,
          });
    return { planResult, error: "" };
  } catch (e: unknown) {
    return {
      planResult: null,
      error: e instanceof Error ? e.message : "Check your inputs",
    };
  }
}
