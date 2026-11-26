import React, { useState } from "react";
export function AiTrialPanel({
  enabled = false,
  hi = false,
  combineTrip = false,
  request = fetch,
}: {
  enabled?: boolean;
  hi?: boolean;
  combineTrip?: boolean;
  request?: typeof fetch;
}) {
  const [busy, setBusy] = useState(false),
    [text, setExplanations] = useState<string[]>([]),
    [status, setStatus] = useState("");
  async function run() {
    if (!enabled || busy) return;
    setBusy(true);
    setExplanations([]);
    setStatus(hi ? "जांच हो रही है…" : "Checking…");
    try {
      const r = await request("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionIds: [
            combineTrip ? "combine-trip" : "no-idling",
            "source-control",
          ],
          language: hi ? "hi" : "en",
        }),
      });
      const d = await r.json();
      if (!r.ok || !Array.isArray(d.explanations) || d.status !== "generated")
        throw Error();
      setExplanations(d.explanations.map((x: { text: string }) => x.text));
      setStatus(
        hi
          ? "AI से बनाई गई सामान्य व्याख्या। नियम-आधारित प्लान नहीं बदला।"
          : "AI-generated general explanation. The rules-based plan did not change.",
      );
    } catch {
      setStatus(
        hi
          ? "AI उपलब्ध नहीं। नियम-आधारित प्लान अब भी उपलब्ध है।"
          : "AI unavailable. The rules-based plan remains available.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="group" aria-labelledby="ai-trial-title">
      <h2 id="ai-trial-title">
        {hi ? "वैकल्पिक AI व्याख्या" : "Optional AI explanation"}
      </h2>
      <p>
        {hi
          ? "केवल सामान्य कार्यों के नाम और भाषा भेजी जाएगी। समय, बजट, शहर और निजी जानकारी नहीं।"
          : "Only generic action IDs and language would be sent. No schedule, budget, city or personal information."}
      </p>
      <p>
        {hi
          ? "यह चिकित्सा सलाह या हवा की सुरक्षा का दावा नहीं है। AI समय या प्रदूषण के मान नहीं बदल सकता।"
          : "This is not medical advice or a safe-air claim. AI cannot change times or pollutant values."}
      </p>
      <button type="button" disabled={!enabled || busy} onClick={run}>
        {!enabled
          ? hi
            ? "AI बंद है, अनुमति की प्रतीक्षा"
            : "AI off, awaiting approval"
          : busy
            ? hi
              ? "बन रहा है…"
              : "Generating…"
            : hi
              ? "सामान्य व्याख्या बनाएं"
              : "Generate general explanation"}
      </button>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {text.length > 0 && (
        <ul>
          {text.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
