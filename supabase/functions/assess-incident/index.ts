import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const DEFAULT_MODEL = 'gemini-3.6-flash';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-max-age': '86400',
};
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

type AssessmentVerdict = 'legitimate' | 'ambiguous' | 'spam_or_troll';

type Assessment = {
  verdict: AssessmentVerdict;
  spam_confidence: number;
  worth_dispatch: boolean;
  worth_reason: string;
  flags: string[];
  source: 'gemini' | 'fallback';
  aiError: string | null;
};

const resultCache = new Map<string, { ts: number; payload: Assessment & { assessed_at?: string } }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;

function getCacheKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

const SYSTEM_PROMPT = `You are the Barangay Culiat Tactical AI dispatcher's credibility reviewer. A citizen submitted the incident report below, including the category they chose. Read the WHOLE report (title, description, and category together) and judge it as one thing — do not be fooled by a single keyword. Respond with STRICT JSON only (no markdown). Schema:
{
  "verdict": one of "legitimate" | "ambiguous" | "spam_or_troll",
  "spam_confidence": integer 0-100,
  "worth_dispatch": boolean,
  "worth_reason": short phrase (max 120 chars) explaining whether dispatching responders is warranted for this exact report,
  "flags": array of 1-4 short reasons for the verdict (jokes/absurd claims, promotion or advertisement, off-topic noise, vague with no actionable details, impossible/improbable details, profanity or trolling, category mismatch)
}
Rules:
- Read the entire report carefully: title, description, AND the selected category. Judge the report as a whole.
- Absurd or trivial claims (e.g. reporting that an egg was stolen, or any mock/test language) are "spam_or_troll" EVEN IF they contain real emergency words like "rob", "fire", or "nakaw".
- If the story does not match the category the citizen picked (e.g. a theft filed under Natural Disaster), call that out in flags and treat the report as at least "ambiguous".
- A report is "spam_or_troll" only when it is clearly a joke, mock, absurd/impossible claim, advertisement, off-topic noise, pure trolling, or copy-paste gibberish.
- Be conservative: short or low-detail but plausible reports are "ambiguous", not spam.
- "spam_confidence" reflects how sure you are it is spam (not how bad it looks).
- "worth_dispatch" = true only when a real responder check is warranted (threat to life, property, or public order); false for spam, off-topic, mismatched, or truly trivial reports.
- Consider Filipino/Taglish phrasing and common misspellings; a genuine emergency written informally is still legitimate.
- Match meaning, not exact keywords: consider synonyms, slang, abbreviations, misspellings, and Filipino/Taglish inflections (na-, mag-, nag-, -an, -in). If the story plausibly describes the selected category, it matches.
- Sensitive content: when the report contains death or graphic detail, self-harm or suicide mention, sexual content, threats, or heavy profanity, include a flag starting with "sensitive:" naming the kind (e.g. "sensitive: death / gore"). Detect these even when written in Filipino/Taglish.`;
const SPAM_MARKERS = [
  'lol', 'lmao', 'haha', 'hehe', 'jk', 'joke', 'charr', 'eme', 'eme lang',
  'troll', 'bobo', 'tanga', 'gago', 'mema', 'qwerty', 'asdf', 'iykyk',
  'test', 'testing', 'sample', 'subukan', 'baliw', 'halucination',
  'follow', 'subscribe', 'like and share', 'promo', 'sale', 'benta',
  'buy 1', 'order na', 'viral', 'asdasd', 'kjd', 'xcv', 'zzz',
];

// Broad per-category keyword coverage (roots/stems so Filipino inflections
// match: 'sagasaan' covers nasagasaan/sasagasaan/masasagasaan, 'bangga'
// covers nabangga/binangga/babangga, 'aksid' covers aksidente/naaksidente,
// 'guho' covers gumuho/pagguho/nagguho, 'sunog' covers nasusunog/sinunog).
// When Gemini is available it understands phrasing on its own — these lists
// keep the rule-based fallback just as wordy.
const CATEGORY_SIGNALS: Record<string, string[]> = {
  fire: ['sunog', 'apoy', 'nasusunog', 'sinunog', 'sunugin', 'usok', 'umuusok', 'fire', 'flame', 'blaze', 'burn', 'burning', 'burnt', 'smoke', 'liyab', 'nagliliyab', 'nagniningas', 'siga', 'sumabog', 'pagsabog', 'sabog', 'explosion', 'exploded', 'bomb', 'bomba', 'blast', 'gas leak', 'tagas ng gas', 'gas', 'gasolina', 'gasoline', 'fuel', 'kuryente', 'nakuryente', 'short circuit', 'electrical fire', 'natupok'],
  medical: ['sugat', 'sugatan', 'nasugatan', 'dugo', 'dumudugo', 'dinudugo', 'bleeding', 'bleed', 'blood', 'wound', 'injured', 'injury', 'hurt', 'himatay', 'hinimatay', 'walang malay', 'unconscious', 'aksid', 'akid', 'aksidente', 'naaksidente', 'akidente', 'atake', 'atake sa puso', 'heart attack', 'stroke', 'seizure', 'kombulsyon', 'convulsion', 'hika', 'asthma', 'kagat', 'nakagat', 'tinuka', 'bite', 'bitten', 'buntis', 'nanganganak', 'manganganak', 'nanganak', 'labor', 'giving birth', 'saktan', 'nasaktan', 'saktan', 'sakit', 'masakit', 'sagasaan', 'nasagasaan', 'sasagasaan', 'bangga', 'nabangga', 'nalunod', 'nalulunod', 'drown', 'drowning', 'drowned', 'lason', 'nalason', 'pagkalason', 'poison', 'poisoning', 'overdose', 'nahulog', 'nahulugan', 'fell', 'fell down', 'binaril', 'natamaan', 'nasaksak', 'tinusok', 'high blood', 'coma', 'emergency', 'ambulan', 'ambulance', 'ambulansya', 'nagpakamatay', 'magpakamatay', 'nagbigti', 'suicide', 'bigti', 'hijaw', 'hijiw', 'self-harm', 'ginahasa', 'rape', 'nirape', 'manyakis'],
  crime: ['nakaw', 'ninakaw', 'nanakaw', 'ninanakaw', 'magnanakaw', 'nagnanakaw', 'pagnanakaw', 'nakawan', 'ninakawan', 'nanakawan', 'magnakaw', 'kawatan', 'tulisan', 'theft', 'steal', 'stole', 'stolen', 'snatch', 'snatcher', 'snatched', 'holdap', 'holdup', 'hold-up', 'holdaper', 'robbery', 'robber', 'rob', 'saksak', 'sinaksak', 'saksakin', 'nasaksak', 'saksakan', 'stab', 'stabbed', 'stabbing', 'baril', 'binaril', 'namaril', 'pamamaril', 'barilin', 'gun', 'gunshot', 'shoot', 'shot', 'shooting', 'patay', 'pinatay', 'pumatay', 'patayan', 'nasawi', 'kill', 'killed', 'murder', 'homicide', 'bangkay', 'cadaver', 'kidnap', 'kidnapped', 'kinidnap', 'kinarnap', 'nangikidnap', 'dukot', 'dinukot', 'mandurukot', 'carnap', 'carnapping', 'droga', 'drugs', 'shabu', 'pusher', 'tulak', 'vandal', 'vandalism', 'sinira', 'basag', 'binasag', 'gulpi', 'ginulpi', 'bugbog', 'binugbog', 'bugbugan', 'suntukan', 'suntok', 'assault', 'mauling', 'attacked', 'threat', 'pananakot', 'nananakot', 'armas', 'patalim', 'kutsilyo'],
  disaster: ['baha', 'bumaha', 'pagbaha', 'bahain', 'flood', 'flooded', 'flooding', 'lindol', 'lumindol', 'earthquake', 'aftershock', 'bagyo', 'bagyong', 'typhoon', 'storm', 'storm surge', 'daluyong', 'buhawi', 'tornado', 'landslide', 'landsides', 'guho', 'gumuho', 'pagguho', 'nagguho', 'natabunan', 'collapsed', 'natumba', 'fallen tree', 'natumbang puno', 'bumagsak na puno', 'ulan', 'heavy rain', 'malakas na ulan', 'habagat', 'amihan'],
  traffic: ['sagasaan', 'nasagasaan', 'sasagasaan', 'masasagasaan', 'bangga', 'nabangga', 'binangga', 'babangga', 'banggaan', 'nakabangga', 'aksid', 'akid', 'aksidente', 'naaksidente', 'akidente', 'accident', 'traffic', 'trapik', 'trapiko', 'traffic jam', 'jam', 'congestion', 'gridlock', 'bumper-to-bumper', 'collision', 'crash', 'crashed', 'car crash', 'hit and run', 'sasakyan', 'sasakyang', 'kotse', 'car', 'motor', 'motorsiklo', 'motorcycle', 'jeep', 'jeepney', 'dyip', 'bus', 'traysikel', 'tricycle', 'kuliglig', 'truck', 'ten wheeler', 'van', 'counterflow', 'overspeed', 'speeding', 'nakaharang', 'harang', 'bara', 'barado', 'aberya', 'nakaaberya', 'roadblock', 'road block', 'road hazard', 'debris', 'flooded road', 'overturned'],
  infrastructure: ['brownout', 'brown-outs', 'blackout', 'power outage', 'power interruption', 'walang kuryente', 'putol ang kuryente', 'no electricity', 'kuryente', 'elektrisidad', 'poste', 'tangke', 'tubig', 'water interruption', 'walang tubig', 'leakage', 'tagas ng tubig', 'butas', 'pothole', 'butas ng daan', 'sira ng kalsada', 'kalsada', 'damaged road', 'ilaw', 'streetlight', 'ilaw ng kalsada', 'wire', 'kable', 'cable', 'nakasabit na kable', 'manhole', 'drainage', 'kanal', 'baradong kanal', 'derelict', 'abandoned'],
  animal: ['aso', 'dog', 'dogs', 'rabid', 'ahas', 'snake', 'kagat ng aso', 'kagat ng ahas', 'kagat', 'nakagat', 'nagkagat', 'tinuka', 'bubuyog', 'bee', 'bees', 'putakte', 'hayop', 'animal', 'buwaya', 'crocodile', 'baka', 'toro', 'bull', 'kalabaw', 'baboy ramo', 'wild boar'],
  missing: ['nawawala', 'nawala', 'missing', 'wala', 'hindi na umuwi', 'di na umuwi', 'hinanap', 'hanapin', 'lost', 'lost child', 'kidnap', 'dinukot', 'dukot'],
  disturbance: ['maingay', 'ingay', 'noise', 'noisy', 'gulo', 'nagkagulo', 'kaguluhan', 'away', 'nag-aaway', 'nagaway', 'inaaway', 'brawl', 'rumble', 'rambol', 'suntukan', 'suntok', 'sapakan', 'sabunutan', 'lasing', 'drunk', 'videoke', 'sound system', 'istambay', 'tambay', 'disturbance'],
};

// Everything above is, by definition, a real incident signal.
const GENUINE_MARKERS: string[] = Array.from(new Set(Object.values(CATEGORY_SIGNALS).flat()));

// Patterns of absurd / trivial "emergency" claims — classic troll reports
// (e.g. "magnanakaw sa steal an egg" = "was robbed of an egg"). These win over
// any real keyword in the text.
const ABSURD_PATTERNS = [
  /steal[^.\n]{0,20}(an? )?(egg|itlog)/i,
  /(egg|itlog)[^.\n]{0,20}(steal|snatch|nakaw)/i,
  /(magnanakaw|nagnanakaw|ninakaw|nanakaw)[^.\n]{0,20}(itlog|egg)/i,
];

function findAbsurd(text: string): string | null {
  for (const re of ABSURD_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

function categorySignalsFor(categoryHint: string): string[] {
  const c = categoryHint.toLowerCase();
  if (c.includes('fire') || c.includes('hazard')) return CATEGORY_SIGNALS.fire;
  if (c.includes('medical') || c.includes('emergency')) return CATEGORY_SIGNALS.medical;
  if (c.includes('crime') || c.includes('theft')) return CATEGORY_SIGNALS.crime;
  if (c.includes('natural') || c.includes('disaster')) return CATEGORY_SIGNALS.disaster;
  if (c.includes('traffic')) return CATEGORY_SIGNALS.traffic;
  if (c.includes('infrastructure')) return CATEGORY_SIGNALS.infrastructure;
  if (c.includes('animal')) return CATEGORY_SIGNALS.animal;
  if (c.includes('missing')) return CATEGORY_SIGNALS.missing;
  if (c.includes('disturbance')) return CATEGORY_SIGNALS.disturbance;
  return [];
}

// Sensitive-content detection: flags graphic, profane, or otherwise sensitive
// wording so admins see what a report contains at a glance and the AI can weigh
// it properly. Detection only adds flags — it never changes the verdict on its
// own (except insults-only reports, which are troll material).
const SENSITIVE_WORDS: { word: string; kind: string }[] = [
  { word: 'putangina', kind: 'profanity / insult' }, { word: 'putang ina', kind: 'profanity / insult' }, { word: 'tangina', kind: 'profanity / insult' }, { word: 'puta', kind: 'profanity / insult' }, { word: 'gago', kind: 'profanity / insult' }, { word: 'bobo', kind: 'profanity / insult' }, { word: 'tanga', kind: 'profanity / insult' }, { word: 'gaga', kind: 'profanity / insult' }, { word: 'boba', kind: 'profanity / insult' }, { word: 'tarantado', kind: 'profanity / insult' }, { word: 'tarantada', kind: 'profanity / insult' }, { word: 'punyeta', kind: 'profanity / insult' }, { word: 'ulol', kind: 'profanity / insult' }, { word: 'ungas', kind: 'profanity / insult' }, { word: 'leche', kind: 'profanity / insult' }, { word: 'hindot', kind: 'profanity / insult' }, { word: 'puke', kind: 'profanity / insult' }, { word: 'buwisit', kind: 'profanity / insult' }, { word: 'lintik', kind: 'profanity / insult' }, { word: 'sira ulo', kind: 'profanity / insult' }, { word: 'baliw', kind: 'profanity / insult' }, { word: 'siraan', kind: 'profanity / insult' }, { word: 'bastos', kind: 'profanity / insult' }, { word: 'fuck', kind: 'profanity / insult' }, { word: 'fucking', kind: 'profanity / insult' }, { word: 'shit', kind: 'profanity / insult' }, { word: 'bitch', kind: 'profanity / insult' }, { word: 'asshole', kind: 'profanity / insult' }, { word: 'damn', kind: 'profanity / insult' }, { word: 'hell', kind: 'profanity / insult' }, { word: 'crap', kind: 'profanity / insult' }, { word: 'moron', kind: 'profanity / insult' }, { word: 'idiot', kind: 'profanity / insult' }, { word: 'dumb', kind: 'profanity / insult' }, { word: 'stupid', kind: 'profanity / insult' }, { word: 'jerk', kind: 'profanity / insult' }, { word: 'loser', kind: 'profanity / insult' }, { word: 'scumbag', kind: 'profanity / insult' }, { word: 'trash', kind: 'profanity / insult' }, { word: 'garbage', kind: 'profanity / insult' },
  { word: 'patay', kind: 'death / gore' }, { word: 'pinatay', kind: 'death / gore' }, { word: 'pumatay', kind: 'death / gore' }, { word: 'papatay', kind: 'death / gore' }, { word: 'napatay', kind: 'death / gore' }, { word: 'namatay', kind: 'death / gore' }, { word: 'kamatayan', kind: 'death / gore' }, { word: 'bangkay', kind: 'death / gore' }, { word: 'cadaver', kind: 'death / gore' }, { word: 'nasawi', kind: 'death / gore' }, { word: 'duruguan', kind: 'death / gore' }, { word: 'maraming dugo', kind: 'death / gore' }, { word: 'decapitat', kind: 'death / gore' }, { word: 'natagpuan patay', kind: 'death / gore' }, { word: 'sugat', kind: 'death / gore' }, { word: 'buto', kind: 'death / gore' }, { word: 'saksak', kind: 'death / gore' }, { word: 'ambush', kind: 'death / gore' }, { word: 'massacre', kind: 'death / gore' }, { word: 'sinaksak', kind: 'death / gore' }, { word: 'binugbog', kind: 'death / gore' }, { word: 'binaril', kind: 'death / gore' }, { word: 'tiro', kind: 'death / gore' }, { word: 'fracture', kind: 'death / gore' },
  { word: 'suicide', kind: 'self-harm / suicide' }, { word: 'magpakamatay', kind: 'self-harm / suicide' }, { word: 'nagpakamatay', kind: 'self-harm / suicide' }, { word: 'pagpapakamatay', kind: 'self-harm / suicide' }, { word: 'nagpapakamatay', kind: 'self-harm / suicide' }, { word: 'nagbigti', kind: 'self-harm / suicide' }, { word: 'bigti', kind: 'self-harm / suicide' }, { word: 'hijaw', kind: 'self-harm / suicide' }, { word: 'hijiw', kind: 'self-harm / suicide' }, { word: 'self-harm', kind: 'self-harm / suicide' }, { word: 'attempt', kind: 'self-harm / suicide' }, { word: 'cutting', kind: 'self-harm / suicide' }, { word: 'wrist', kind: 'self-harm / suicide' }, { word: 'overdose', kind: 'self-harm / suicide' }, { word: 'pills', kind: 'self-harm / suicide' },
  { word: 'rape', kind: 'sexual content' }, { word: 'ginahasa', kind: 'sexual content' }, { word: 'nirape', kind: 'sexual content' }, { word: 'manyakis', kind: 'sexual content' }, { word: 'molest', kind: 'sexual content' }, { word: 'harass', kind: 'sexual content' }, { word: 'harassment', kind: 'sexual content' }, { word: 'hubad', kind: 'sexual content' }, { word: 'bastos', kind: 'sexual content' }, { word: 'catcall', kind: 'sexual content' }, { word: 'stalker', kind: 'sexual content' }, { word: 'libog', kind: 'sexual content' }, { word: 'lascivious', kind: 'sexual content' }, { word: 'lewd', kind: 'sexual content' }, { word: 'porn', kind: 'sexual content' }, { word: 'pornography', kind: 'sexual content' }, { word: 'groping', kind: 'sexual content' }, { word: 'touching', kind: 'sexual content' }, { word: 'nanggipit', kind: 'sexual content' }, { word: 'abuse', kind: 'sexual content' }, { word: 'abuso', kind: 'sexual content' }, { word: 'kantutan', kind: 'sexual content' },
  { word: 'papatayin', kind: 'threat' }, { word: 'papapatayin', kind: 'threat' }, { word: 'ipapapatay', kind: 'threat' }, { word: 'babarilin', kind: 'threat' }, { word: 'barilin', kind: 'threat' }, { word: 'sasaktan', kind: 'threat' }, { word: 'saktan', kind: 'threat' }, { word: 'death threat', kind: 'threat' }, { word: 'banta', kind: 'threat' }, { word: 'hostage', kind: 'threat' }, { word: 'blackmail', kind: 'threat' }, { word: 'extort', kind: 'threat' }, { word: 'panggigipit', kind: 'threat' }, { word: 'killer', kind: 'threat' }, { word: 'magsasabog', kind: 'threat' }, { word: 'bomba', kind: 'threat' }, { word: 'sabog', kind: 'threat' }, { word: 'pananakot', kind: 'threat' }, { word: 'pamamaril', kind: 'threat' }, { word: 'sagasaan', kind: 'threat' }, { word: 'patayin', kind: 'threat' }, { word: 'kaladkad', kind: 'threat' }, { word: 'dukot', kind: 'threat' },
];

function findSensitive(reportText: string): { word: string; kind: string } | null {
  const lower = reportText.toLowerCase();
  return SENSITIVE_WORDS.find((s) => lower.includes(s.word)) ?? null;
}

function fallbackRules(reportText: string, categoryHint: string): Assessment {
  const lower = reportText.toLowerCase();
  // Mask words that contain unrelated category keywords as substrings
  // ('kapitbahay'/'bahay' contain 'baha' = flood) so they don't create
  // false signal hits.
  const maskedLower = lower.replace(/kapit-?bahay/g, ' neighbor ').replace(/bahay/g, ' house ');
  // Category signals must be checked against the report content only — the
  // category label is appended to reportText and its own words (e.g. "fire" in
  // "Fire Hazard") would otherwise satisfy the signal check.
  const contentLower = maskedLower.replace(categoryHint.toLowerCase(), ' ').replace(/\s+/g, ' ').trim();
  const spamHits = SPAM_MARKERS.filter((m) => lower.includes(m));
  const genuineHits = GENUINE_MARKERS.filter((m) => maskedLower.includes(m));
  const contentGenuineHits = GENUINE_MARKERS.filter((m) => contentLower.includes(m));

  const absurdMatch = findAbsurd(reportText);
  const expectedSignals = categorySignalsFor(categoryHint);
  const categoryMismatch = expectedSignals.length > 0 && !expectedSignals.some((m) => contentLower.includes(m));
  const sensitive = findSensitive(reportText);
  const profanityCount = SENSITIVE_WORDS.filter((s) => s.kind === 'profanity / insult' && lower.includes(s.word)).length;

  let verdict: AssessmentVerdict;
  let spam_confidence: number;
  let worth_dispatch: boolean;
  let worth_reason: string;
  let flags: string[];

  if (absurdMatch) {
    // Trivial/absurd claims (e.g. "steal an egg") beat any real-looking keyword.
    verdict = 'spam_or_troll';
    spam_confidence = 88;
    worth_dispatch = false;
    worth_reason = 'Trivial or absurd claim — no responders should be deployed.';
    flags = ['absurd or trivial claim', `matched "${absurdMatch.trim()}"`, 'no real emergency'];
  } else if (profanityCount >= 2 && genuineHits.length === 0) {
    // Insults without any incident details — troll material.
    verdict = 'spam_or_troll';
    spam_confidence = 78;
    worth_dispatch = false;
    worth_reason = 'Contains only insults or profanity — no actionable incident.';
    flags = ['profanity or insults only'];
  } else if (spamHits.length >= 2 && genuineHits.length === 0) {
    verdict = 'spam_or_troll';
    spam_confidence = 82;
    worth_dispatch = false;
    worth_reason = 'Very likely a joke or spam — do not deploy responders until verified.';
    flags = ['contains joke/troll markers', ...spamHits.slice(0, 3).map((m) => `matched "${m}"`)];
  } else if (categoryMismatch && genuineHits.length === 0) {
    verdict = 'ambiguous';
    spam_confidence = 60;
    worth_dispatch = false;
    worth_reason = `Content does not match the "${categoryHint}" category — verify before dispatching.`;
    flags = ['report content conflicts with its category', 'no details supporting the selected category'];
  } else if (categoryMismatch) {
    // Real incident words are present, but they disagree with the chosen category.
    verdict = 'ambiguous';
    spam_confidence = 52;
    worth_dispatch = false;
    worth_reason = `Story conflicts with the "${categoryHint}" category — verify before dispatching.`;
    flags = [
      `mentions "${(contentGenuineHits[0] ?? genuineHits[0]).trim()}" but category is ${categoryHint}`,
      'verify with the reporter before dispatching',
    ];
  } else if (spamHits.length >= 1 && genuineHits.length === 0) {
    verdict = 'ambiguous';
    spam_confidence = 55;
    worth_dispatch = false;
    worth_reason = 'Possible spam — verify with the reporter before dispatching.';
    flags = [`found one spam marker ("${spamHits[0]}")`, 'no actionable incident details'];
  } else if (genuineHits.length > 0) {
    verdict = 'legitimate';
    spam_confidence = 12 + Math.min(20, spamHits.length * 8);
    worth_dispatch = true;
    worth_reason = 'Actionable incident details present — follow the standard dispatch flow.';
    flags = [
      `matched ${genuineHits.length} real incident signal(s)`,
      ...spamHits.slice(0, 2).map((m) => `note: "${m}" present`),
    ];
  } else if (lower.trim().length < 24) {
    verdict = 'ambiguous';
    spam_confidence = 48;
    worth_dispatch = false;
    worth_reason = 'Too little information to route responders — request clarification first.';
    flags = ['very short report, no specific details'];
  } else {
    verdict = 'ambiguous';
    spam_confidence = 35;
    worth_dispatch = false;
    worth_reason = 'Plausible but low on actionable specifics — verify before dispatch.';
    flags = ['no clear key signals, low detail'];
  }

  if (sensitive) {
    // Surface sensitive wording (death/gore, self-harm, sexual, threats,
    // profanity) as a flag so the admin knows what the report contains.
    flags = [...flags, `sensitive: ${sensitive.kind} ("${sensitive.word}")`];
  }

  return {
    verdict,
    spam_confidence,
    worth_dispatch,
    worth_reason: worth_reason.trim(),
    flags: Array.from(new Set(flags.map((f) => f.trim()))).slice(0, 4),
    source: 'fallback',
    aiError: null,
  };
}
async function callGemini(
  model: string,
  maxTokens: number,
  temperature: number,
  reportText: string,
  lat: number | null,
  lng: number | null,
): Promise<Assessment> {
  const location = lat != null && lng != null ? ` Location: ${lat}, ${lng}.` : '';
  const res = await fetch(`${GEMINI_URL}${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `Citizen report: ${reportText}.${location} Return JSON only.` },
          ],
        },
      ],
      generationConfig: {
        temperature,
        // gemini-3.x uses hidden reasoning tokens that count against the output
        // budget, so never let a small configured max under-feed it.
        maxOutputTokens: Math.max(maxTokens, 2048),
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            verdict: { type: 'STRING', enum: ['legitimate', 'ambiguous', 'spam_or_troll'] },
            spam_confidence: { type: 'INTEGER' },
            worth_dispatch: { type: 'BOOLEAN' },
            worth_reason: { type: 'STRING' },
            flags: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['verdict', 'spam_confidence', 'worth_dispatch', 'worth_reason', 'flags'],
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error('Gemini request failed: ' + (await res.text()));
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON (${e instanceof Error ? e.message : String(e)}): ${JSON.stringify(text.slice(0, 400))}`);
  }
  const verdictRaw = String(parsed.verdict ?? 'ambiguous').toLowerCase();
  const verdict: AssessmentVerdict = ['legitimate', 'ambiguous', 'spam_or_troll'].includes(verdictRaw)
    ? verdictRaw as AssessmentVerdict
    : 'ambiguous';
  const num = (v: unknown, d = 0, max = 100) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : d;
  };
  const flags = Array.isArray(parsed.flags)
    ? parsed.flags.map((f: unknown) => String(f).trim()).filter(Boolean).slice(0, 4)
    : [];

  return {
    verdict,
    spam_confidence: num(parsed.spam_confidence),
    worth_dispatch: Boolean(parsed.worth_dispatch),
    worth_reason: String(parsed.worth_reason ?? '').trim() || 'No rationale provided.',
    flags,
    source: 'gemini',
    aiError: null,
  };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const title = String(body.title ?? '');
    const description = String(body.description ?? '');
    const categoryHint = String(body.categoryHint ?? '');
    const priority = String(body.priority ?? '');
    const threat = typeof body.threat === 'number' ? body.threat : null;
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;
    const reportText = `${title} ${description} ${categoryHint} ${priority} ${threat ?? ''}`.trim() || 'Unspecified incident report';
    const cacheKey = getCacheKey(reportText);

    const cached = resultCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return Response.json({ ok: true, ...cached.payload, cached: true }, { headers: corsHeaders });
    }
    if (cached) resultCache.delete(cacheKey);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: cfgRows } = await supabase.from('ai_config').select('key, value');
    const cfg = new Map<string, unknown>((cfgRows ?? []).map((r) => [r.key, r.value])) as Record<string, { enabled?: boolean; name?: string; value?: number; mode?: string; level?: string }>;
    const deadAliases = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    const configured = (cfg.model?.name ?? '').trim();
    const primary = deadAliases.includes(configured) ? DEFAULT_MODEL : configured || DEFAULT_MODEL;
    const models = Array.from(new Set([primary, DEFAULT_MODEL]));
    const maxTokens = Number(cfg.max_tokens?.value) || 1024;
    const temperature = Number(cfg.temperature?.value) ?? 0.1;

    let result: Assessment;
    let aiError: string | null = null;
    if (GEMINI_API_KEY) {
      const errs: string[] = [];
      for (const m of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await callGemini(m, maxTokens, temperature, reportText, lat, lng);
            break;
          } catch (e) {
            errs.push(`${m}: ${e instanceof Error ? e.message : String(e)}`);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          }
        }
        if (result) break;
      }
      if (!result) {
        const msg = errs.join(' | ') || 'unknown error';
        aiError = /429|RESOURCE_EXHAUSTED|quota/i.test(msg)
          ? 'Gemini quota reached — used rule-based credibility checks.'
          : 'Gemini request failed: ' + msg;
        result = fallbackRules(reportText, categoryHint);
      }
    } else {
      aiError = 'GEMINI_API_KEY is not configured — used rule-based credibility checks.';
      result = fallbackRules(reportText, categoryHint);
    }
    result = { ...result, aiError };

    await supabase.from('ai_audit_logs').insert({
      actor: 'AI_System',
      action: aiError ? 'Assessed report via fallback rules' : 'Assessed Report Credibility',
      detail: `Report judged "${result.verdict}" (spam confidence ${result.spam_confidence}%, worth dispatch: ${result.worth_dispatch}).`,
      metadata: { title, source: result.source, aiError, worth_dispatch: result.worth_dispatch },
    });

    if (resultCache.size >= CACHE_MAX) {
      const oldestKey = resultCache.keys().next().value;
      if (oldestKey) resultCache.delete(oldestKey);
    }
    resultCache.set(cacheKey, { ts: Date.now(), payload: { ...result, assessed_at: new Date().toISOString() } });

    return Response.json(
      { ok: true, ...result, assessed_at: new Date().toISOString() },
      { headers: corsHeaders },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: corsHeaders },
    );
  }
});