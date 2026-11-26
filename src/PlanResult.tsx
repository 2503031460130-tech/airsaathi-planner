import { Callout } from "./ui";
import type { DataSource, PlannerResult } from "./contracts";
import type { Strings } from "./messages";
import { formatHour } from "./format";

export type PlanResultProps = {
  strings: Strings;
  hindi: boolean;
  city: string;
  error: string;
  planShown: boolean;
  planResult: PlannerResult | null;
  dataSource: DataSource;
  combineTrip: boolean;
  errandKm: number;
  workStart: number;
  workEnd: number;
};

export function PlanResultSection({
  strings,
  hindi,
  city,
  error,
  planShown,
  planResult,
  dataSource,
  combineTrip,
  errandKm,
  workStart,
  workEnd,
}: PlanResultProps) {
  return (
    <section className="air-output" aria-labelledby="result">
      <div className="air-status">
        <span className="air-dot" />{" "}
        {hindi ? "नियम-आधारित प्लानर" : "Deterministic planner"}
        <span>{strings.ai}</span>
      </div>
      <h2 id="result">
        {city}
        {hindi ? " के लिए आपका प्लान" : " / Your realistic day"}
      </h2>
      <p role="status" aria-live="polite" className="air-sr-only">
        {error
          ? hindi
            ? "इनपुट जांचें"
            : "Check your inputs"
          : planShown
            ? hindi
              ? "प्लान अपडेट हुआ"
              : "Plan updated"
            : ""}
      </p>
      <div>
        {error ? (
          <Callout id="plan-error" title={strings.check} tone="warning">
            {hindi
              ? "06–20 के बीच पूरे घंटे, सही समय क्रम, 0–200 किमी दूरी दर्ज करें।"
              : error}
          </Callout>
        ) : !planShown ? (
          <div className="air-empty">
            <span>↗</span>
            <h3>
              {hindi
                ? "पहले अपनी सीमाएं तय करें"
                : "Set the limits. Then see what fits."}
            </h3>
            <p>
              {hindi
                ? "तय काम का समय नहीं बदलेगा, न किसी खरीद की जरूरत होगी।"
                : "We will not move your locked work block or require a paid purchase."}
            </p>
            <p>{strings.tryConflict}</p>
          </div>
        ) : planResult ? (
          <>
            <div className="air-summary">
              <div>
                <small>
                  {hindi ? "तय समय सुरक्षित" : "Locked time preserved"}
                </small>
                <strong>
                  {formatHour(workStart)}–{formatHour(workEnd)}
                </strong>
              </div>
              <div>
                <small>{hindi ? "जरूरी खर्च" : "Required spend"}</small>
                <strong>₹0</strong>
              </div>
            </div>
            <article className="air-action">
              <span className="air-kicker">{strings.optional}</span>
              <h3>
                {planResult.best
                  ? `${formatHour(planResult.best.h)}–${formatHour(planResult.best.h + 1)}`
                  : planResult.reason === "conflict"
                    ? strings.conflict
                    : planResult.reason === "missing"
                      ? strings.noForecast
                      : planResult.reason === "insufficient-coverage"
                        ? strings.coverage
                        : strings.tooOld}
              </h3>
              <p>
                {planResult.reason === "improved"
                  ? hindi
                    ? `${planResult.trace.candidateHours} उपलब्ध घंटों में इस समय ${dataSource === "demo" ? "काल्पनिक PM2.5" : "आसपास के नमूनों का तुलना स्कोर"} सबसे कम है (${planResult.best?.pm} µg/m³)। कम का मतलब सुरक्षित नहीं। तय ${formatHour(workStart)}–${formatHour(workEnd)} नहीं बदला।`
                    : `Among ${planResult.trace.candidateHours} feasible one-hour windows, this has the lowest ${dataSource === "demo" ? "fictional PM2.5" : "bracketing-sample ranking score"} (${planResult.best?.pm} µg/m³). Lower does not mean safe. Your ${formatHour(workStart)}–${formatHour(workEnd)} block stays unchanged.`
                  : planResult.reason === "no-improvement"
                    ? strings.noImprovement
                    : planResult.reason === "conflict"
                      ? strings.conflictText
                      : planResult.reason === "insufficient-coverage"
                        ? hindi
                          ? `केवल ${planResult.coverage.available}/${planResult.coverage.total} उपलब्ध घंटों के मान हैं। गायब घंटे: ${planResult.coverage.missingHours.map(formatHour).join(", ")}। अधूरी तुलना से समय का सुझाव नहीं दिया गया।`
                          : `Only ${planResult.coverage.available}/${planResult.coverage.total} feasible hours have pollutant values. Missing hours: ${planResult.coverage.missingHours.map(formatHour).join(", ")}. No best-hour recommendation is made from an incomplete comparison.`
                        : planResult.reason === "missing"
                          ? strings.missingText
                          : strings.oldText}
              </p>
            </article>
            <article className="air-action">
              <span className="air-kicker">{strings.source}</span>
              <h3>{combineTrip ? strings.trip : strings.idling}</h3>
              <p>
                {combineTrip
                  ? hindi
                    ? `आपके अनुसार मौजूदा यात्रा में यह काम जुड़ सकता है। आपके परिदृश्य की दूरी: ${errandKm} किमी। यह दर्ज व्यवहार नहीं है। CO₂ या स्वास्थ्य लाभ का अनुमान नहीं।`
                    : `You said an existing trip can absorb this errand. User-entered scenario distance: ${errandKm} km. This is your scenario input, not tracked behavior. No CO₂ or health reduction is estimated.`
                  : strings.idlingText}
              </p>
            </article>
            <article className="air-action">
              <span className="air-kicker">{strings.indoor}</span>
              <h3>
                {hindi ? "घर के अंदर धुआं कम करें" : "Reduce indoor smoke first"}
              </h3>
              <p>{strings.indoorText}</p>
              <a
                href="https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home"
                target="_blank"
                rel="noreferrer"
              >
                {strings.epa} ↗
              </a>
            </article>
            <details className="air-trace">
              <summary>
                {hindi ? "प्लान की जांच देखें" : "Inspect the decision trace"}
              </summary>
              <dl>
                <dt>{strings.candidate}</dt>
                <dd>
                  {planResult.coverage.available}/{planResult.coverage.total}
                </dd>
                <dt>{strings.freshness}</dt>
                <dd>{strings.unknown}</dd>
                <dt>{strings.windows}</dt>
                <dd>{planResult.trace.candidateHours}</dd>
                <dt>{strings.locked}</dt>
                <dd>{planResult.trace.lockedHours}</dd>
                <dt>{strings.violations}</dt>
                <dd>0</dd>
                <dt>{strings.paid}</dt>
                <dd>0</dd>
                <dt>{strings.requests}</dt>
                <dd>0</dd>
              </dl>
              <p>{strings.trace}</p>
            </details>
          </>
        ) : null}
      </div>
    </section>
  );
}
