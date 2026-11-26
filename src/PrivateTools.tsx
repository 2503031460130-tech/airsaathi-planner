import { useEffect, useState } from "react";
import { AiTrialPanel } from "./AiTrialPanel";

/** Private-build only: AI trial panel and the "AI is disabled" server check. */
export function PrivateTools({
  hindi,
  combineTrip,
}: {
  hindi: boolean;
  combineTrip: boolean;
}) {
  const [serverCheck, setServerCheck] = useState("");
  const [aiOn, setAiOn] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live) setAiOn(d?.aiEnabled === true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  async function checkServer() {
    if (aiOn) return;
    setServerCheck(hindi ? "जांच हो रही है…" : "Checking…");
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionIds: ["no-idling"],
          language: hindi ? "hi" : "en",
        }),
      });
      const d = await r.json();
      setServerCheck(
        r.status === 503 &&
          d.reason ===
            "Live AI disabled; deterministic planner remains available"
          ? hindi
            ? "सर्वर सुरक्षा जांच सफल: लाइव AI बंद है। मॉडल अनुरोध नहीं भेजा गया।"
            : "Server guard verified: live AI is disabled. No model request was sent."
          : hindi
            ? "सर्वर की स्थिति जांचें।"
            : "Server response needs review.",
      );
    } catch {
      setServerCheck(
        hindi ? "सर्वर जांच उपलब्ध नहीं।" : "Server check unavailable.",
      );
    }
  }
  return (
    <>
      <AiTrialPanel hi={hindi} enabled={aiOn} combineTrip={combineTrip} />
      <section className="group">
        <h2>{hindi ? "निजी सर्वर जांच" : "Private server check"}</h2>
        <p>
          {hindi
            ? "अनुमति वाले खाते का मूल्यांकन। लाइव AI बंद है; यह बटन केवल बंद स्थिति जांचता है।"
            : "Approved-account evaluation. Live AI stays disabled; this button checks the disabled state only."}
        </p>
        <button type="button" disabled={aiOn} onClick={checkServer}>
          {hindi ? "बंद AI स्थिति जांचें" : "Verify AI-disabled state"}
        </button>
        <p role="status" aria-live="polite">
          {serverCheck}
        </p>
      </section>
    </>
  );
}
