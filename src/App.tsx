import owLogo from "./assets/openweather-logo.png";
import React, { useEffect, useState, useRef } from "react";
import { PrivateTools } from "./PrivateTools";
import {
  FileCard,
  Header,
  Group,
  Paragraph,
  Callout,
  Closing,
  TextLink,
} from "./ui";
import { forecastStatus } from "./forecast-status.mjs";
import "./style.css";
import { messages } from "./messages";
import { loadForecast } from "./api";
import { computePlan } from "./compute-plan";
import { NumberField } from "./NumberField";
import { PlanResultSection } from "./PlanResult";
import { EvidenceGroup } from "./EvidenceGroup";
import type { DataSource, ForecastData } from "./contracts";
import { classify, indiaDate } from "./air-data.mjs";
/** `__DEMO_ONLY__` is replaced at build time (see build.mjs / build-demo.mjs). */
export function App() {
  const demoOnly = __DEMO_ONLY__;
  const [hindi, setHindi] = useState(false),
    [city, setCity] = useState("Delhi"),
    [scenario, setScenario] = useState("normal"),
    [walkStart, setWalkStart] = useState(7),
    [walkEnd, setWalkEnd] = useState(19),
    [workStart, setWorkStart] = useState(8),
    [workEnd, setWorkEnd] = useState(17),
    [combineTrip, setCombineTrip] = useState(false),
    [errandKm, setErrandKm] = useState(4),
    [planShown, setPlanShown] = useState(false),
    [forecast, setForecast] = useState<ForecastData | null>(null),
    [fetchPhase, setFetchPhase] = useState("idle"),
    [fetchError, setFetchError] = useState(""),
    [dataSource, setDataSource] = useState<DataSource>("demo");
  const requestId = useRef(0);
  const base = hindi ? messages.hi : messages.en;
  // Keep the page language in sync so assistive technology reads the whole page in the chosen language.
  useEffect(() => {
    document.documentElement.lang = hindi ? "hi" : "en";
  }, [hindi]);
  const strings = demoOnly
    ? {
        ...base,
        ...(hindi
          ? {
              ai: "AI जानबूझकर बंद",
              demoStatus: "सार्वजनिक डेमो · कोई बाहरी अनुरोध नहीं · AI जानबूझकर बंद।",
              demoWarning:
                "काल्पनिक मान प्लानर की जांच के लिए हैं। शहर बदलने से केवल डेमो का संदर्भ बदलता है। इस सार्वजनिक डेमो में AI जानबूझकर बंद है। स्वास्थ्य या यात्रा के फैसले डेमो डेटा से न लें।",
            }
          : {
              ai: "AI intentionally off",
              demoStatus:
                "Public demo · no external request · AI intentionally off.",
              demoWarning:
                "Fictional values test planner behavior. City changes demo context only. AI is intentionally off in this public demo. Do not use demo values for health or travel decisions.",
            }),
      }
    : base;
  const forecastDate = indiaDate(Date.now(), 1);
  const currentStatus = classify(forecast);
  // Dropped from the public demo bundle at build time.
  const fetchPublic = __DEMO_ONLY__
    ? undefined
    : async () => {
        const id = ++requestId.current;
        setDataSource("forecast");
        setFetchPhase("loading");
        setFetchError("");
        setPlanShown(false);
        const requested = city;
        try {
          const result = await loadForecast(requested);
          if (id !== requestId.current) return;
          setForecast({ ...result, city: requested });
          setDataSource("forecast");
          setFetchPhase("ready");
        } catch (e: unknown) {
          if (id !== requestId.current) return;
          setFetchError(e instanceof Error ? e.message : strings.noForecast);
          setFetchPhase("error");
          setForecast(null);
          setDataSource("forecast");
        }
      };
  const { planResult, error } = computePlan({
    dataSource,
    forecast,
    city,
    forecastDate,
    scenario,
    walkStart,
    walkEnd,
    workStart,
    workEnd,
    combineTrip,
    errandKm,
  });
  const numberField = (
    label: string,
    value: number,
    set: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number,
  ) => (
    <NumberField
      label={label}
      value={value}
      min={min}
      max={max}
      onChange={(v) => {
        set(v);
        setPlanShown(false);
      }}
    />
  );
  return (
    <FileCard>
      <div lang={hindi ? "hi" : "en"} className="air-content">
        <div className="air-top">
          <span className="air-word">
            airsaathi<span> / एयर साथी</span>
          </span>
          <button type="button" onClick={() => setHindi(!hindi)}>
            {hindi ? "English" : "हिंदी"}
          </button>
        </div>
        <Header
          title={
            hindi
              ? "ज़िंदगी रुकती नहीं। प्लान बदल सकता है।"
              : "Life stays busy. Your plan can adapt."
          }
          fact={
            demoOnly
              ? hindi
                ? "सार्वजनिक डेमो · 04"
                : "PUBLIC DEMO · 04"
              : hindi
                ? "निजी प्रोटोटाइप · 04"
                : "PRIVATE PROTOTYPE · 04"
          }
          intro={
            hindi
              ? "काम का समय तय है। हर कदम ₹0 में। ऐसा दिन बनाएं जो असल में मुमकिन हो।"
              : "Fixed work hours. Every step costs ₹0. Make room for a more practical day."
          }
        />
        <Callout
          title={
            dataSource === "demo" ? strings.demoTitle : strings.forecastTitle
          }
        >
          {dataSource === "demo"
            ? strings.demoWarning
            : `${strings.forecastWarning} ${strings.date}: ${forecastDate}.`}
        </Callout>
        <div className="air-data-controls">
          {demoOnly ? (
            <p role="note">
              <strong>
                {hindi
                  ? "सार्वजनिक डेमो: केवल कृत्रिम नमूना डेटा। लाइव पूर्वानुमान और AI इस संस्करण में नहीं हैं।"
                  : "Public demo: synthetic sample data only. Live forecasts and AI are not part of this version."}
              </strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={fetchPublic}
              disabled={fetchPhase === "loading"}
            >
              {fetchPhase === "loading"
                ? strings.loading
                : `${city} · ${strings.load}`}
            </button>
          )}
          {!demoOnly && (
            <button
              type="button"
              onClick={() => {
                ++requestId.current;
                setDataSource("demo");
                setPlanShown(false);
                setFetchError("");
                setFetchPhase("idle");
              }}
            >
              {strings.demo}
            </button>
          )}
        </div>
        <div className="air-provenance" role="status" aria-live="polite">
          {dataSource === "forecast" ? (
            <>
              <strong>
                {
                  strings[
                    forecastStatus({
                      phase: fetchPhase,
                      data: forecast,
                      currentStatus,
                    })
                  ]
                }
              </strong>
              <p>
                {fetchError
                  ? hindi
                    ? "पूर्वानुमान लाने में समस्या हुई। डेमो उपलब्ध है।"
                    : fetchError
                  : forecast?.error
                    ? hindi
                      ? "रीफ्रेश नहीं हुआ, पिछला पूर्वानुमान रखा गया।"
                      : forecast.error
                    : strings.privacy}
              </p>
              {forecast && (
                <p>
                  {strings.retrieved}:{" "}
                  {new Date(forecast.retrievedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST. {strings.unknownRun} {forecast.city} · {forecastDate}
                </p>
              )}
            </>
          ) : (
            <p>{strings.demoStatus}</p>
          )}
        </div>
        <div className="air-layout">
          <section className="air-panel" aria-labelledby="setup">
            <h2 id="setup">{hindi ? "01 / आपका दिन" : "01 / Your day"}</h2>
            <label className="air-field" htmlFor="city-select">
              {hindi ? "शहर" : "City"}
              <select
                id="city-select"
                aria-label={hindi ? "शहर चुनें" : "Select city"}
                value={city}
                onChange={(e) => {
                  ++requestId.current;
                  setCity(e.target.value);
                  setPlanShown(false);
                  setForecast(null);
                  setFetchPhase("idle");
                  setFetchError("");
                }}
              >
                {[
                  "Delhi",
                  "Vadodara",
                  "Mumbai",
                  "Lucknow",
                  "Kanpur",
                  "Kolkata",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <fieldset className="air-pair">
              <legend className="air-label">
                {hindi
                  ? "काम + आने-जाने का तय समय"
                  : "Locked work + commute block"}
              </legend>
              <div className="air-two">
                {numberField(
                  hindi ? "शुरू / घंटा" : "Starts / hour",
                  workStart,
                  setWorkStart,
                  6,
                  19,
                )}
                {numberField(
                  hindi ? "अंत / घंटा" : "Ends / hour",
                  workEnd,
                  setWorkEnd,
                  7,
                  20,
                )}
              </div>
            </fieldset>
            <fieldset className="air-pair">
              <legend className="air-label">
                {hindi
                  ? "एक घंटे की सैर के लिए उपलब्ध समय"
                  : "Available range for a one-hour walk"}
              </legend>
              <div className="air-two">
                {numberField(strings.from, walkStart, setWalkStart, 6, 19)}
                {numberField(strings.until, walkEnd, setWalkEnd, 7, 20)}
              </div>
            </fieldset>

            <label className="air-check" htmlFor="combine-trip-checkbox">
              <input
                id="combine-trip-checkbox"
                type="checkbox"
                checked={combineTrip}
                onChange={(e) => {
                  setCombineTrip(e.target.checked);
                  setPlanShown(false);
                }}
              />
              {hindi
                ? "मौजूदा यात्रा में काम जोड़कर अलग गाड़ी-यात्रा बच सकती है"
                : "I can combine an errand with an existing trip and avoid a separate vehicle trip"}
            </label>
            {combineTrip &&
              numberField(strings.distance, errandKm, setErrandKm, 0, 200)}
            <label className="air-field" htmlFor="scenario-select">
              {hindi ? "विश्वसनीयता टेस्ट" : "Demo-only integrity scenario"}
              <select
                id="scenario-select"
                aria-label={hindi ? "विश्वसनीयता परिदृश्य" : "Integrity scenario"}
                disabled={dataSource !== "demo"}
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  setPlanShown(false);
                }}
              >
                <option value="normal">{strings.changing}</option>
                <option value="partial">{strings.partialDemo}</option>
                <option value="flat">{strings.flat}</option>
                <option value="missing">{strings.missing}</option>
                <option value="stale">{strings.stale}</option>
              </select>
            </label>
            <button
              className="air-primary"
              type="button"
              disabled={
                Boolean(error) ||
                (dataSource === "forecast" && fetchPhase === "loading")
              }
              onClick={() => setPlanShown(true)}
            >
              {hindi ? "मेरा प्लान देखें" : "Make my plan"} →
            </button>
          </section>
          <PlanResultSection
            strings={strings}
            hindi={hindi}
            city={city}
            error={error}
            planShown={planShown}
            planResult={planResult}
            dataSource={dataSource}
            combineTrip={combineTrip}
            errandKm={errandKm}
            workStart={workStart}
            workEnd={workEnd}
          />
        </div>
        <EvidenceGroup
          strings={strings}
          hindi={hindi}
          dataSource={dataSource}
          forecastDate={forecastDate}
          forecast={forecast}
          planResult={planResult}
        />
        <Group label={strings.trust}>
          <Paragraph>{strings.trustText}</Paragraph>
          {dataSource === "forecast" && (
            <>
              <Paragraph>
                Weather data provided by{" "}
                <TextLink href="https://openweathermap.org/">
                  OpenWeather
                </TextLink>
              </Paragraph>
              <Paragraph>
                <a href="https://openweathermap.org/">
                  <img
                    src={owLogo}
                    alt="OpenWeather logo"
                    width="106"
                    height="60"
                  />
                </a>
              </Paragraph>
            </>
          )}
          <Paragraph>
            <TextLink href="https://openweathermap.org/api/air-pollution">
              {strings.docs}
            </TextLink>
          </Paragraph>
          <Paragraph>
            <TextLink href="https://aistudio.google.com/docs/terms">
              {strings.terms}
            </TextLink>
          </Paragraph>
        </Group>
        {!demoOnly && <PrivateTools hindi={hindi} combineTrip={combineTrip} />}
        <Closing>
          {demoOnly
            ? hindi
              ? "सार्वजनिक डेमो · कृत्रिम डेटा · AI बंद।"
              : "Public demo · synthetic data · AI off."
            : hindi
              ? "निजी लॉगिन मूल्यांकन · प्रतियोगिता में जमा नहीं किया।"
              : "Private login evaluation · Not submitted to the contest."}
        </Closing>
      </div>
    </FileCard>
  );
}
