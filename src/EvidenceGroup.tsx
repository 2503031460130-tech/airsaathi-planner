import { Group, Paragraph } from "./ui";
import type { DataSource, ForecastData, PlannerResult } from "./contracts";
import type { Strings } from "./messages";
import { formatHour } from "./format";

export type EvidenceProps = {
  strings: Strings;
  hindi: boolean;
  dataSource: DataSource;
  forecastDate: string;
  forecast: ForecastData | null;
  planResult: PlannerResult | null;
};

export function EvidenceGroup({
  strings,
  hindi,
  dataSource,
  forecastDate,
  forecast,
  planResult,
}: EvidenceProps) {
  return (
    <Group label={strings.evidence}>
      <Paragraph>
        {dataSource === "demo"
          ? strings.fictional
          : strings.modelEvidence + " " + forecastDate}
      </Paragraph>
      {planResult && (
        <div className="air-chart" aria-hidden="true">
          {planResult.rows.map((x) => (
            <div className={x.allowed ? "" : "air-locked"} key={x.h}>
              <i
                style={{
                  height: `${x.pm === null ? 3 : Math.min(120, Math.max(8, x.pm * 0.65))}px`,
                }}
              />
              <small>{x.h}</small>
            </div>
          ))}
        </div>
      )}
      {dataSource === "forecast" && (
        <p className="air-attribution">
          Weather data provided by{" "}
          <a
            href="https://openweathermap.org/"
            target="_blank"
            rel="noreferrer"
          >
            OpenWeather
          </a>{" "}
          ·{" "}
          <a
            href="https://openweathermap.org/guide"
            target="_blank"
            rel="noreferrer"
          >
            ODbL
          </a>
          .{" "}
          {hindi
            ? "लाइव तुलना में हर घंटे के दोनों ओर के नमूनों का सबसे बड़ा मान लिया जाता है। यह पूरे घंटे का पूर्वानुमान या सुरक्षित हवा का दावा नहीं है। असली नमूनों के समय नीचे देखें।"
            : "Live ranking uses the largest sample bracketing each one-hour window. This score is not a whole-hour forecast, exposure average or safety guarantee. Exact source sample times appear below."}
        </p>
      )}
      <details open>
        <summary>{strings.table}</summary>
        <table className="air-table">
          <caption>
            {dataSource === "demo" ? strings.changing : strings.forecastTitle}.{" "}
            {strings.tableNote}
          </caption>
          <thead>
            <tr>
              <th>{strings.hour}</th>
              <th>{dataSource === "demo" ? "PM2.5" : "Ranking score"}</th>
              <th>{strings.constraint}</th>
            </tr>
          </thead>
          <tbody>
            {planResult?.rows.map((x) => (
              <tr key={x.h}>
                <td>{formatHour(x.h)}</td>
                <td>{x.pm === null ? strings.unavailable : x.pm}</td>
                <td>{x.allowed ? strings.allowed : strings.excluded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {dataSource === "forecast" && forecast && (
        <details>
          <summary>{hindi ? "असली स्रोत नमूने" : "Exact source samples"}</summary>
          <p>
            {forecast.provider} ·{" "}
            {hindi
              ? "मॉडल रन का समय और स्थानिक रिज़ॉल्यूशन उपलब्ध नहीं है।"
              : "Model run time and spatial resolution not supplied."}
          </p>
          <table className="air-table">
            <caption>
              {hindi
                ? "बिना बदले स्रोत PM2.5 नमूने, भारतीय समय (IST)"
                : "Unmodified source PM2.5 samples, India time (IST)"}
            </caption>
            <thead>
              <tr>
                <th>{hindi ? "समय (IST)" : "Time (IST)"}</th>
                <th>{hindi ? "PM2.5 µg/m³" : "PM2.5 µg/m³"}</th>
              </tr>
            </thead>
            <tbody>
              {forecast.rows
                .filter((x) => x.time.startsWith(forecastDate))
                .map((x) => (
                  <tr key={x.validAt}>
                    <td>{x.time}</td>
                    <td>{x.pm ?? strings.unavailable}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </Group>
  );
}
