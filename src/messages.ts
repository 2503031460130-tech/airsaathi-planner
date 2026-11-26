export const messages = {
  en: {
    demoTitle: "Synthetic demo data, not live air readings",
    demoWarning:
      "Fictional values test planner behavior. City changes demo context only. No GenAI is connected. Do not use demo values for health or travel decisions.",
    forecastTitle: "API connection · model forecast, not station observations",
    forecastWarning:
      "OpenWeather hourly pollutant samples. Exact source timestamps retained. Ranking compares bracketing samples, not predicted hourly averages. No street-level accuracy or safe-hour claim. Scope: tomorrow only, six listed Indian cities.",
    loadRequired: "Load this city’s forecast to continue",
    load: "Load public forecast",
    loading: "Loading public forecast…",
    demo: "Use labelled demo",
    privacy:
      "Only city coordinates are sent to the public provider, not your routine or budget.",
    demoStatus: "Demo mode · no external request. GenAI not connected.",
    unavailable: "Unavailable",
    old: "Cached retrieval older than 1h",
    cached: "Cached forecast",
    partial: "Partial forecast",
    connected: "API connected · forecast",
    retrieved: "Retrieved",
    unknownRun:
      "Model run: not available. Retrieval time does not establish model freshness.",
    date: "Forecast date (India time)",
    from: "From / hour",
    until: "Until / hour",
    distance: "User-entered scenario distance / km",
    changing: "Changing forecast (fictional)",
    partialDemo: "Partial data: one feasible hour missing",
    flat: "No cleaner window",
    missing: "Missing data",
    stale: "Stale data",
    check: "Check your inputs",
    ai: "AI not connected",
    tryConflict:
      "Try 09:00–16:00 against the locked 08:00–17:00 block to test an impossible window.",
    optional: "01 / OPTIONAL OUTDOOR TIME",
    conflict: "No feasible walk window",
    noForecast: "Forecast unavailable",
    coverage: "Forecast coverage incomplete",
    tooOld: "Forecast too old for timing advice",
    noImprovement:
      "No lower-pollution feasible window exists in the selected data. Keep a suitable feasible time; do not claim an improvement.",
    conflictText:
      "Your entire available range overlaps the locked block. Expand availability or skip this optional activity. We will not silently move work.",
    missingText:
      "No valid pollutant values are available. Missing is not zero. No timing optimization was made.",
    oldText:
      "This retrieval is marked old. Retrieval is not proof of a fresh forecast. No timing optimization was made.",
    source: "02 / REDUCE EMISSIONS AT THE SOURCE",
    trip: "One less separate vehicle trip",
    idling: "Avoid unnecessary vehicle idling",
    idlingText:
      "Switch off the engine when safely parked instead of unnecessary idling. Benefit is qualitative here; no unsupported emissions number is shown.",
    indoor: "03 / INDOOR SOURCE CONTROL",
    indoorText:
      "Avoid indoor smoking and unnecessary burning. Damp dust instead of dry sweeping. Do not use ozone generators. Ventilation depends on indoor sources and outdoor conditions; there is no blanket instruction to seal every window.",
    epa: "EPA source guidance",
    candidate: "Candidate coverage",
    freshness: "Model-run freshness",
    unknown: "Unknown, not inferred from retrieval",
    windows: "Feasible data windows",
    locked: "Locked hours preserved",
    violations: "Constraint violations",
    paid: "Paid actions required",
    requests: "Model requests sent",
    trace:
      "Every window must fit availability, last one hour and avoid the locked block. All feasible hours need data. Old retrievals block timing advice. Model-run freshness remains unknown.",
    evidence: "Evidence, not a magic number",
    fictional:
      "Every value below is fictional, not CPCB readings or official India AQI.",
    modelEvidence:
      "Public model pollutant forecasts, not official station observations or India AQI. Null means unavailable. Model run time is not supplied.",
    table: "Hourly data table",
    tableNote:
      "Demo: fictional PM2.5. Live: largest bracketing sample score in µg/m³. Grey bars show exclusions, not clean air.",
    hour: "Hour",
    constraint: "Scheduling constraint",
    allowed: "Within available range",
    excluded: "Outside range or locked",
    trust: "Trust boundary",
    trustText:
      "This adult-caregiver concept is not medical advice. Inputs stay in temporary page memory and are not sent to a model. Nothing is saved after reload. Public-data requests send city coordinates only. OpenWeather data needs attribution and applicable ODbL compliance. Approved adult review access, release and model quota still need verification. Rules-only output does not satisfy the contest requirement for a working GenAI demonstration.",
    docs: "Air-data documentation",
    terms: "Model terms to satisfy before integration",
    closing:
      "Private working prototype · 23 Nov 2026 · No project submitted, no public app deployed.",
  },
  hi: {
    demoTitle: "काल्पनिक डेमो डेटा, लाइव रीडिंग नहीं",
    demoWarning:
      "काल्पनिक मान प्लानर की जांच के लिए हैं। शहर बदलने से केवल डेमो का संदर्भ बदलता है। GenAI जुड़ा नहीं है। स्वास्थ्य या यात्रा के फैसले डेमो डेटा से न लें।",
    forecastTitle: "API कनेक्शन · मॉडल पूर्वानुमान, स्टेशन रीडिंग नहीं",
    forecastWarning:
      "OpenWeather के घंटेवार प्रदूषण नमूने। असली समय बनाए रखे गए हैं। तुलना आसपास के नमूनों से होती है, पूरे घंटे के औसत से नहीं। सुरक्षित हवा का दावा नहीं। दायरा: केवल कल, सूची के छह भारतीय शहर।",
    loadRequired: "आगे बढ़ने के लिए इस शहर का पूर्वानुमान लाएं",
    load: "सार्वजनिक पूर्वानुमान लाएं",
    loading: "पूर्वानुमान लाया जा रहा है…",
    demo: "काल्पनिक डेमो देखें",
    privacy: "सार्वजनिक प्रदाता को केवल शहर के निर्देशांक जाते हैं, दिनचर्या या बजट नहीं।",
    demoStatus: "डेमो मोड · कोई बाहरी अनुरोध नहीं। GenAI जुड़ा नहीं है।",
    unavailable: "उपलब्ध नहीं",
    old: "सहेजे गए अनुरोध को एक घंटे से ज्यादा हुआ",
    cached: "सहेजा गया पूर्वानुमान",
    partial: "अधूरा पूर्वानुमान",
    connected: "API जुड़ा है · पूर्वानुमान",
    retrieved: "प्राप्त किया",
    unknownRun:
      "मॉडल बनने का समय उपलब्ध नहीं। प्राप्त करने का समय मॉडल के ताजा होने का प्रमाण नहीं है।",
    date: "पूर्वानुमान की तारीख (भारतीय समय)",
    from: "शुरू / घंटा",
    until: "अंत / घंटा",
    distance: "आपके परिदृश्य की दूरी / किमी",
    changing: "बदलता पूर्वानुमान (काल्पनिक)",
    partialDemo: "अधूरा डेटा: एक उपलब्ध घंटे का मान नहीं",
    flat: "कम प्रदूषण वाला समय नहीं",
    missing: "डेटा नहीं है",
    stale: "पुराना डेटा",
    check: "दर्ज जानकारी जांचें",
    ai: "AI जुड़ा नहीं है",
    tryConflict:
      "असंभव समय की जांच: तय 08:00–17:00 के बीच उपलब्ध समय 09:00–16:00 चुनें।",
    optional: "01 / वैकल्पिक बाहरी गतिविधि",
    conflict: "सैर के लिए समय नहीं बचता",
    noForecast: "पूर्वानुमान उपलब्ध नहीं",
    coverage: "पूर्वानुमान के कुछ घंटे नहीं हैं",
    tooOld: "समय बताने के लिए डेटा पुराना है",
    noImprovement:
      "दिए गए डेटा में कम प्रदूषण वाला उपलब्ध समय नहीं मिला। सुविधाजनक समय रखें, सुधार का दावा न करें।",
    conflictText:
      "आपका पूरा उपलब्ध समय तय काम से टकराता है। उपलब्ध समय बढ़ाएं या इस वैकल्पिक गतिविधि को छोड़ें। काम का समय अपने आप नहीं बदलेगा।",
    missingText:
      "प्रदूषण के मान उपलब्ध नहीं हैं। गायब मान शून्य नहीं है। प्रदूषण के आधार पर समय नहीं चुना गया।",
    oldText:
      "यह प्राप्त डेटा पुराना चिह्नित है। प्राप्त होने का समय ताजा मॉडल का प्रमाण नहीं है। समय का सुझाव नहीं दिया गया।",
    source: "02 / स्रोत पर उत्सर्जन घटाएं",
    trip: "एक अलग वाहन-यात्रा कम",
    idling: "बेवजह चालू इंजन से बचें",
    idlingText:
      "सुरक्षित जगह खड़े हों तो इंजन बेवजह चालू रखने के बजाय बंद करें। लाभ केवल गुणात्मक है, बिना आधार का उत्सर्जन आंकड़ा नहीं दिखाया गया।",
    indoor: "03 / घर के अंदर प्रदूषण के स्रोत",
    indoorText:
      "घर में धूम्रपान और अनावश्यक चीजें जलाने से बचें। सूखी झाड़ू के बजाय नम कपड़े से धूल साफ करें। ओजोन जनरेटर न चलाएं। हवा आने देने का फैसला अंदर के स्रोत और बाहर की हवा पर निर्भर है, हर खिड़की बंद करने का निर्देश नहीं है।",
    epa: "EPA स्रोत मार्गदर्शन",
    candidate: "उपलब्ध घंटों का डेटा",
    freshness: "मॉडल कितना ताजा है",
    unknown: "अज्ञात, प्राप्त करने के समय से अनुमान नहीं",
    windows: "डेटा वाले उपलब्ध घंटे",
    locked: "तय घंटे सुरक्षित",
    violations: "सीमा उल्लंघन",
    paid: "जरूरी भुगतान वाले काम",
    requests: "मॉडल को भेजे अनुरोध",
    trace:
      "हर विकल्प एक घंटे का हो, उपलब्ध समय में आए और तय काम से न टकराए। सभी उपलब्ध घंटों के मान जरूरी हैं। पुराना प्राप्त डेटा समय का सुझाव रोकता है। मॉडल की ताजगी अज्ञात रहती है।",
    evidence: "प्रमाण, कोई जादुई संख्या नहीं",
    fictional: "नीचे सभी मान काल्पनिक हैं, CPCB रीडिंग या आधिकारिक भारतीय AQI नहीं।",
    modelEvidence:
      "सार्वजनिक मॉडल के प्रदूषण पूर्वानुमान, आधिकारिक स्टेशन रीडिंग या भारतीय AQI नहीं। खाली मान का मतलब अनुपलब्ध है। मॉडल बनने का समय नहीं दिया गया है।",
    table: "घंटेवार डेटा तालिका",
    tableNote:
      "डेमो: काल्पनिक PM2.5। लाइव: आसपास के नमूनों का सबसे बड़ा तुलना मान, µg/m³। धूसर बार समय की पाबंदी हैं, साफ हवा नहीं।",
    hour: "घंटा",
    constraint: "समय की पाबंदी",
    allowed: "उपलब्ध समय में",
    excluded: "उपलब्ध समय से बाहर या तय काम",
    trust: "भरोसे की सीमा",
    trustText:
      "यह वयस्क देखभालकर्ता के लिए विचार है, चिकित्सा सलाह नहीं। जानकारी पेज की अस्थायी मेमोरी में रहती है और मॉडल को नहीं जाती। रीलोड पर कुछ नहीं बचता। सार्वजनिक डेटा अनुरोध केवल शहर के निर्देशांक भेजते हैं। OpenWeather डेटा के लिए श्रेय और लागू ODbL शर्तें जरूरी हैं। वयस्क समीक्षक की अनुमति, रिलीज और मॉडल कोटा की जांच बाकी है। केवल नियमों का आउटपुट काम करते GenAI की प्रतियोगिता शर्त पूरी नहीं करता।",
    docs: "हवा के डेटा का दस्तावेज",
    terms: "जोड़ने से पहले मॉडल की शर्तें",
    closing:
      "निजी कार्यशील प्रोटोटाइप · 23 नवंबर 2026 · न प्रोजेक्ट जमा किया, न सार्वजनिक ऐप लॉन्च किया।",
  },
};

export type Strings = typeof messages.en;
