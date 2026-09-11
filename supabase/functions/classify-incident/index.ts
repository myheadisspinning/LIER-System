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

type CachedResult = Classification & { autoDispatch: boolean; criticalFlag: boolean; thresholds: unknown; aiError: string | null };
const resultCache = new Map<string, { ts: number; payload: CachedResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;

function getCacheKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

type AiConfig = Record<string, { enabled?: boolean; name?: string; value?: number; mode?: string; level?: string }>;

type Classification = {
  category: string;
  confidence: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  threat: number;
  actions: string[];
  user_actions: string[];
  dispatch: string;
  unit: string | null;
  eta: string | null;
  source: 'gemini' | 'fallback';
};

const SYSTEM_PROMPT = `You are the Barangay Culiat Tactical AI dispatcher. Analyze the citizen incident report and respond with STRICT JSON only (no markdown). Schema:
{
  "category": one of "Fire Hazard" | "Medical Emergency" | "Crime & Theft" | "Traffic Incident" | "Natural Disaster" | "Public Disturbance" | "Infrastructure" | "Missing Person" | "Animal Incident" | "Other/Uncategorized",
  "confidence": integer 0-100,
  "priority": one of "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "threat": integer 0-100,
  "user_actions": array of 2-4 CONCRETE, situation-specific actions the citizen reporter should take RIGHT NOW for this exact incident (e.g. where to evacuate to, which hotline to call, what to avoid, how to stay safe) written as short imperative commands — do NOT reuse or paraphrase the dispatch actions,
  "actions": array of 2-4 short recommended response/dispatch actions for barangay responders (unit staging, scene control, coordination),
  "dispatch": short dispatch instruction line, e.g. "AI Dispatch routed T-04 · ETA 4 min",
  "unit": suggested unit name or null,
  "eta": ETA string like "4 min" or null
}
Rules:
- Read the WHOLE report: the TITLE carries as much weight as the description and often holds the most specific information — use it to judge what happened, how severe it is, and the correct category.
- The citizen also selected a category (shown with the report). Cross-check the full title and description against that selection: if the content clearly fits a different category, return the better-fitting category and lower "confidence".
- Filipino/Taglish reports are the norm: words like "sumisigaw", "lasing", "away", "videoke", "nagkagulo", "baha", "sunog" are common and valid. Match meaning, not just exact keywords — use inflections (nag-, na-, -in, -an), synonyms, and contextual clues.
- ALWAYS choose the single best-fitting category. Use "Other/Uncategorized" ONLY when none of the other nine categories apply even loosely. When in doubt between two categories, pick the one that better describes the primary safety concern.
- Categories and what they cover:
  Fire Hazard: any fire, explosion, gas leak, electrical short, smoke
  Medical Emergency: injury, illness, accident with injuries, unconscious person, birth, poisoning
  Crime & Theft: theft, robbery, assault, shooting, stabbing, vandalism, threats, drugs, any crime
  Traffic Incident: vehicle collision, road obstruction, traffic jam, road hazard
  Natural Disaster: typhoon, earthquake, flood, landslide, storm, volcanic, volcanic eruption
  Public Disturbance: shouting, noise, fighting, brawls, drunkenness, protests, gatherings, unruly persons, loud music/videoke, public intoxication, any peace-and-order issue not a violent crime
  Infrastructure: power outage, road damage, broken pipes, fallen trees/posts, faulty streetlights
  Missing Person: lost person, missing child, unaccounted individual
  Animal Incident: stray/abusive animals, bites, animal attacks
- Set "priority" and "threat" from the actual severity described across the title AND description together, so they match what the report really says — not just its category.
Base decisions on severity, risk to life/property, and proximity. Threat >= 85 => CRITICAL, >= 70 => HIGH, >= 45 => MEDIUM, else LOW.`;

const CATEGORY_ALIASES: Record<string, string[]> = {
  'Fire Hazard': [
    'fire', 'burning', 'flames', 'blaze', 'smoke', 'burnt', 'explosion', 'exploded', 'bomb', 'blast',
    'gas leak', 'gas', 'fuel', 'gasoline', 'short circuit', 'electrical fire',
    'sunog', 'apoy', 'nasusunog', 'nagliliyab', 'usok', 'nagniningas', 'siga', 'umuusok',
    'sunugin', 'nagsusunog', 'panununog', 'sinunog', 'pagsabog', 'sumabog', 'bomba',
    'tagas ng gas', 'gasolina', 'nakuryente', 'kuryente', 'nagreresponsive na wire',
    'agnasusunog', 'naapoy', 'sinusunog', 'tinutupok', 'nabulog', 'nag-aalab',
  ],
  'Medical Emergency': [
    'medical', 'emergency', 'ambulance', 'injury', 'injured', 'bleed', 'bleeding', 'wound',
    'unconscious', 'heart attack', 'stroke', 'seizure', 'convulsion', 'accident',
    'vehicular accident', 'hit and run', 'fell', 'fell down', 'drown', 'drowning', 'drowned',
    'poison', 'poisoning', 'overdose', 'dog bite', 'snake bite', 'bite', 'pregnant',
    'labor', 'giving birth', 'asthma', 'sugatan', 'nasugatan', 'dugo', 'dumudugo', 'himatay',
    'nasaktan', 'atake', 'hurt', 'malubhang sugat', 'atake sa puso', 'high blood',
     'kombulsyon', 'nagko-kombulsiyon', 'aksidente', 'naaksidente', 'nahulog', 'nahulugan', 'nalunod', 'nalulunod', 'nalason', 'pagkalason',
    'lason', 'kagat', 'nakagat', 'tinuka', 'buntis',
    'manganganak', 'nanganganak', 'nanganak', 'hika', 'atake ng hika',
    'hirap huminga', 'nahilo', 'pagkahilo', 'pagsusuka', 'sinusuka', 'nagsusuka',
    'naghihingalo', 'hindi makatayo', 'hindi makagalaw', 'blood pressure',
    'masakit ang dibdib', 'pananakit ng dibdib', 'nahimatay', 'nawalan ng malay',
    'injured person', 'need help', 'tulong', 'save', 'pagluluas',
    'drowning', 'na-drown', 'nalunod sa ilog', 'nalunod sa dagat',
  ],
  'Crime & Theft': [
    'crime', 'robbery', 'theft', 'stolen', 'stole', 'holdup', 'hold-up', 'armed', 'gun',
    'knife', 'weapon', 'threat', 'stab', 'stabbing', 'stabbed', 'shoot', 'shooting', 'shot',
    'gunshot', 'assault', 'maul', 'mauling', 'attacked', 'kill', 'killed', 'murder',
    'homicide', 'dead body', 'kidnap', 'kidnapping', 'abducted', 'carnap', 'carnapping',
    'hijack', 'drugs', 'drug', 'shabu', 'pusher', 'vandalism', 'vandal', 'riot',
    'nakaw', 'ninakaw', 'ninanakaw', 'magnanakaw', 'pagnanakaw', 'holdap', 'snatcher',
    'mandurukot', 'kutsilyo', 'patalim', 'baril', 'armas', 'pananakot', 'nananakot',
    'kawatan', 'nakawan', 'saksak', 'saksakin', 'saksakan', 'sinaksak', 'nasaksak',
    'pananaksak', 'nanaksak', 'pinagsasaksak', 'pamamaril', 'namaril', 'barilin',
    'binaril', 'gulpi', 'ginulpi', 'binugbog', 'bugbog', 'bugbugan', 'suntukan', 'suntok',
    'sinalakay', 'patay', 'pinatay', 'patayan', 'pumatay', 'nasawi', 'natagpuang patay',
    'bangkay', 'natagpuang bangkay', 'cadaver', 'deceased', 'patay na tao', 'walang buhay',
    'dinukot', 'nangikidnap', 'kinarnap', 'droga', 'ipinagbabawal na gamot',
    'basag', 'sinira', 'kaguluhan', 'nagkagulo', 'pagnanakaw', 'tinorture', 'tinortor',
    'nanakit', 'sinaktan', 'pinatay', 'pinatay ng', 'nanunutok', 'may baril', 'may armas',
    'snatch', 'snatched', 'pickpocket', 'wallet', 'celphone', 'kinaltas', 'nanloloko',
    'forcible', 'force', 'violence', 'napilitan', 'pinilit', 'kinuha',
    'scam', 'nanloloko', 'nandaraya', 'fraud', 'cheat',
  ],
  'Traffic Incident': [
    'traffic', 'accident', 'collision', 'crash', 'car crash', 'vehicular', 'road block',
    'roadblock', 'traffic jam', 'gridlock', 'congestion', 'bottleneck', 'overturned',
    'hazard', 'road hazard', 'pothole', 'debris', 'flooded road',
    'akidente', 'banggaan', 'sasakyan', 'sasakyang pangkalsada', 'trapiko', 'bara',
    'barado', 'sira ng sasakyan', 'nasirang sasakyan', 'nabangga', 'nabanggaan',
    'nabangga ang sasakyan', 'aksidente sa kalsada', 'counterflow', 'overspeed',
    'speeding', 'nakaharang', 'naka-block', 'blocked', 'harang sa daan',
    'stranded', 'nabigla', 'banggaan ng motor', 'banggaan ng kotse',
    'flat tire', 'tumagilid', 'na-overturn', 'head-on', 'rear-end',
  ],
  'Natural Disaster': [
    'typhoon', 'earthquake', 'flood', 'landslide', 'storm', 'hurricane', 'tornado',
    'tsunami', 'volcano', 'eruption', 'bagyo', 'baha', 'pagbaha', 'umuulan', 'ulan',
    'strong winds', 'hangin', 'mabagyo', 'nabaha', 'lumubog', 'lumubog sa baha',
    'landslide', 'pagguho', 'nagguho', 'naguho', 'pagguho ng lupa', 'earthquake',
    'lindol', 'yumanig', 'nagyanig', 'bagyo', 'krisis sa panahon',
    'habagat', 'amihan', 'habagat season', 'low pressure area', 'lahar',
    'ashfall', 'ash fall', 'volcanic', 'seismic', 'tremor', ' aftershock',
    'flash flood', 'storm surge', 'bumaha', 'nalunod sa baha', 'naanod sa baha',
    'fallen tree', 'natumbang puno', 'natumba ang puno', 'bumagsak na puno',
  ],
  'Public Disturbance': [
    'disturbance', 'noise', 'loud', 'fight', 'brawl', 'riot', 'protest', 'demonstration',
    'gathering', 'crowd', 'drunk', 'intoxicated', 'vandalism', 'graffiti',
    'gulo', 'ingay', 'maingay', 'palakpakan', 'away', 'sagupaan', 'gyera', 'awayan',
    'nag-aaway', 'nagkakagulo', 'sigaw', 'sumisigaw', 'lakas ng tunog', 'mabaho', 'amoy',
    'basura', 'kalat', 'nagkakalat', 'kalat sa kalsada',
    'videoke', 'sound system', 'karaoke', 'istambay', 'tambay', 'disturbance',
    'lasing', 'lasingan', 'alak', 'inuman', 'drinking', 'drunk person',
    'nag-iingay', 'maingay ang kapitbahay', 'maingay sa gabi', 'maingay sa umaga',
    'suntukan', 'bugbugan', 'rambol', 'rumble', 'sabunutan', 'nagsasagawan',
    'nagkakagalitan', 'tahulan', 'nagtatakbuhan', 'nagsisigawan',
    'rally', 'marcha', 'protesta', 'demanda', 'reklamo', 'nagrereklamo',
    'loitering', 'asal hayop', 'hindi matakaw', 'wala sa sarili',
    'sirena', 'alarm', 'honk', 'busina', 'nag-ho-honk', 'gumigising sa madaling araw',
    'nakakaistorbo', 'nakakagambala', 'salbahe', 'bastos',
  ],
  'Infrastructure': [
    'infrastructure', 'power outage', 'blackout', 'no electricity', 'no water',
    'broken pipe', 'water pipe', 'sewage', 'drainage', 'road damage', 'bridge',
    'collapsed', 'fallen tree', 'fallen post', 'street light', 'streetlight',
    'traffic light', 'utility', 'kuryente', 'walang kuryente', 'brownout', 'tubig',
    'walang tubig', 'sira ng tubo', 'sirang tubo', 'sirang kable', 'sirang poste',
    'sirang ilaw', 'sirang traffic light', 'sirang tulay', 'sirang kalsada', 'lubak',
    'lubak sa kalsada', 'butas sa kalsada',
    'putol ang linya', 'putol ang cable', 'downed wire', 'falling debris',
    'manhole', 'drainage', 'baradong kanal', 'leaking', 'tumutulo', 'tagas',
    'nabasag na bintana', 'nabasag ang poste', 'putol ang tubo',
  ],
  'Missing Person': [
    'missing', 'lost', 'missing person', 'lost child', 'lost person',
    'nawawala', 'nawawalang tao', 'nawawalang bata', 'hinahanap',
    'hinahanap na tao', 'hindi makita', 'hindi mahanap', 'nawala',
    'nawala ang tao', 'nawala ang bata', 'missing child', 'missing elderly',
    'senior citizen lost', 'amnesia', 'disoriented', 'confused person',
    'nawawalang matanda', 'nawawalang senior', 'hindi na umuwi',
    'di na bumalik', 'hindi dumarating', 'tinakasan', 'tumakas',
  ],
  'Animal Incident': [
    'animal', 'dog', 'cat', 'snake', 'stray', 'rabid', 'rabies', 'animal bite',
    'animal attack', 'hayop', 'aso', 'pusa', 'ahas', 'ligaw na hayop',
    'ligaw na aso', 'ligaw na pusa', 'galok', 'nagagalok', 'kagat ng hayop',
    'kagat ng aso', 'kagat ng pusa', 'kagat ng ahas', 'hayop na umuungol',
    'hayop na nakakagulo', 'daga', 'ipos', 'buwaya', 'monkey', 'unggoy',
    'tahol', 'maingay ang aso', 'umiiyak ang pusa', 'nangangagat',
    'nangangagat ng tao', 'angry dog', 'aggressive dog', 'wild animal',
  ],
  'Other/Uncategorized': [],
};

const CANONICAL_CATEGORIES = [
  'Fire Hazard', 'Medical Emergency', 'Crime & Theft', 'Traffic Incident',
  'Natural Disaster', 'Public Disturbance', 'Infrastructure', 'Missing Person',
  'Animal Incident', 'Other/Uncategorized',
];

// Short aliases (e.g. "siga" = flame) only match whole words so they can't hit
// unrelated substrings like "suMI SIGAw" ("sumisigaw") or "bara" in "barangay".
// Longer aliases (>= 5 chars, e.g. "sigaw", "sunog", "nakaw") match anywhere in
// the text so Filipino inflections (sumisigaw, nasusunog, ninakaw) still hit.
function aliasMatches(text: string, alias: string): boolean {
  if (alias.length >= 5) return text.includes(alias);
  const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(text);
}

function matchesAnyAlias(text: string, words: string[]): boolean {
  return words.some((w) => aliasMatches(text, w));
}

function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase().trim();

  // 1. Exact canonical match (covers "other/uncategorized" safely).
  const exact = CANONICAL_CATEGORIES.find((c) => c.toLowerCase() === s);
  if (exact) return exact;

  // 1b. Legacy/loose labels used by older rule seeds ("Others", ...).
  const LEGACY: Record<string, string> = {
    other: 'Other/Uncategorized',
    others: 'Other/Uncategorized',
    miscellaneous: 'Other/Uncategorized',
    uncategorized: 'Other/Uncategorized',
  };
  if (LEGACY[s]) return LEGACY[s];

  // 2. Alias match — skip "Other/Uncategorized" (empty alias list).
  for (const [cat, words] of Object.entries(CATEGORY_ALIASES)) {
    if (cat === 'Other/Uncategorized') continue;
    if (matchesAnyAlias(s, words)) return cat;
  }

  return 'Other/Uncategorized';
}

async function callGemini(
  model: string,
  maxTokens: number,
  temperature: number,
  title: string,
  description: string,
  categoryHint: string,
  lat: number | null,
  lng: number | null,
): Promise<Classification> {
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
            { text: `Citizen report:\nTITLE (analyze fully — it often carries the most specific information): ${title || '(none)'}\nDESCRIPTION: ${description || '(none)'}\nCITIZEN-SELECTED CATEGORY (cross-check the text against this): ${categoryHint || 'none'}${location}\nReturn JSON only.` },
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
            category: { type: 'STRING', enum: ['Fire Hazard', 'Medical Emergency', 'Crime & Theft', 'Traffic Incident', 'Natural Disaster', 'Public Disturbance', 'Infrastructure', 'Missing Person', 'Animal Incident', 'Other/Uncategorized'] },
            confidence: { type: 'INTEGER' },
            priority: { type: 'STRING', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            threat: { type: 'INTEGER' },
            user_actions: { type: 'ARRAY', items: { type: 'STRING' } },
            actions: { type: 'ARRAY', items: { type: 'STRING' } },
            dispatch: { type: 'STRING' },
            unit: { type: 'STRING', nullable: true },
            eta: { type: 'STRING', nullable: true },
          },
          required: ['category', 'confidence', 'priority', 'threat', 'user_actions', 'actions', 'dispatch'],
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
  const clean = (s: unknown) =>
    typeof s === 'string' ? s.replace(/^"|"$/g, '') : '';
  const num = (v: unknown, d = 0, max = 100) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : d;
  };
  const priority = (parsed.priority ?? 'MEDIUM').toString().toUpperCase();
  const validPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority as Classification['priority'] : 'MEDIUM';
  let category = normalizeCategory(clean(parsed.category));
  // If Gemini fell back to "Other/Uncategorized", try re-classifying from the
  // actual report text so Filipino/Taglish wording (e.g. "may sumisigaw") still
  // lands on the right category before giving up.
  if (category === 'Other/Uncategorized') {
    const byText = normalizeCategory(`${title} ${description} ${categoryHint}`);
    if (byText !== 'Other/Uncategorized') category = byText;
  }
  const actions = Array.isArray(parsed.actions) ? parsed.actions.map((a: unknown) => String(a)) : [];
  const userActions = Array.isArray(parsed.user_actions)
    ? parsed.user_actions.map((a: unknown) => String(a))
    : [];

  return {
    category,
    confidence: num(parsed.confidence),
    priority: validPriority,
    threat: num(parsed.threat),
    actions: actions.slice(0, 4),
    user_actions: (userActions.length ? userActions : actions).slice(0, 4),
    dispatch: clean(parsed.dispatch) || 'AI Dispatch awaiting manual assignment',
    unit: parsed.unit ? clean(parsed.unit) : null,
    eta: parsed.eta ? clean(parsed.eta) : null,
    source: 'gemini',
  };
}

async function fallbackRules(supabase: ReturnType<typeof createClient>, reportText: string): Promise<Classification> {
  const { data: rules } = await supabase.from('fallback_rules').select('*').eq('enabled', true);
  const lower = reportText.toLowerCase();
  let hit: (typeof rules)[number] | null = null;
  for (const rule of rules ?? []) {
    if ((rule.keywords as string[]).some((k) => lower.includes(k.toLowerCase()))) {
      hit = rule;
      break;
    }
  }

  const priorityMap: Record<string, Classification['priority']> = {
    CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW',
  };
  const priority = hit ? priorityMap[hit.priority] ?? 'MEDIUM' : 'MEDIUM';
  const category = hit ? normalizeCategory(hit.category) : normalizeCategory(reportText);
  const threat = hit ? (priority === 'CRITICAL' ? 90 : priority === 'HIGH' ? 75 : 50) : 30;
  const actions = hit
    ? ['Notify barangay command center', `${hit.action} assigned unit to pin`]
    : ['Log to case master', 'Assign barangay tanod unit for verification'];

  const matched = new Set<string>();
  if (hit) {
    for (const k of hit.keywords as string[]) {
      if (lower.includes(k.toLowerCase())) matched.add(k.toLowerCase());
    }
  }
  for (const words of Object.values(CATEGORY_ALIASES)) {
    for (const w of words) if (aliasMatches(lower, w)) matched.add(w);
  }

  const matchedCount = matched.size;
  const confidence = matchedCount === 0 ? 45 : matchedCount === 1 ? 70 : matchedCount === 2 ? 80 : 88;
  const userActions: Record<string, string[]> = {
    'Fire Hazard': ['Evacuate to a safe area immediately', 'Call 911 if the fire is life-threatening', 'Avoid the affected area and keep others away'],
    'Medical Emergency': ['Keep the person calm and still', 'Call an ambulance or emergency hotline', 'Do not give food or drink unless told to'],
    'Crime & Theft': ['Keep a safe distance from the suspects', 'Do not approach or intervene', 'Note any descriptions without putting yourself at risk'],
    'Traffic Incident': ['Turn on hazard lights', 'Move to a safe location if possible', 'Call traffic authorities if blocking the road'],
    'Natural Disaster': ['Move to higher ground or shelter immediately', 'Monitor local news and emergency alerts', 'Avoid floodwaters and damaged structures'],
    'Public Disturbance': ['Keep a safe distance from the disturbance', 'Do not intervene or escalate the situation', 'Contact barangay officials or local authorities'],
    'Infrastructure': ['Avoid the affected area if hazardous', 'Report to local utility services', 'Do not attempt to repair electrical or water infrastructure yourself'],
    'Missing Person': ['Contact local authorities immediately', 'Provide a recent photo and description', 'Check with neighbors and local establishments'],
    'Animal Incident': ['Keep a safe distance from the animal', 'Do not attempt to capture or handle the animal', 'Contact animal control or barangay officials'],
    'Other/Uncategorized': ['Avoid the affected area', 'Notify barangay officials or authorities', 'Monitor for any change in the situation'],
  };

  return {
    category,
    confidence,
    priority,
    threat,
    actions,
    user_actions: userActions[category] ?? userActions['Other/Uncategorized'],
    dispatch: `AI Dispatch routed via rule engine · ${priority} priority`,
    unit: null,
    eta: null,
    source: 'fallback',
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
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;
    const reportText = `${title} ${description} ${categoryHint}`.trim() || 'Unspecified incident report';
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
    const cfg = new Map<string, unknown>((cfgRows ?? []).map((r) => [r.key, r.value])) as AiConfig;
    const maxTokens = Number(cfg.max_tokens?.value) || 1024;
    const temperature = Number(cfg.temperature?.value) ?? 0.1;
    const criticalThreshold = Number(cfg.critical_threshold?.value) || 85;
    const autoDispatchThreshold = Number(cfg.auto_dispatch_threshold?.value) || 95;

    let result: Classification;
    let aiError: string | null = null;
    if (GEMINI_API_KEY) {
      // Try the configured model first, then a known-good fallback so a stale
      // model alias (e.g. "gemini-flash-latest") can't kill the whole call.
      const deadAliases = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      const configured = (cfg.model?.name ?? '').trim();
      const primary = deadAliases.includes(configured) ? DEFAULT_MODEL : configured || DEFAULT_MODEL;
      const models = Array.from(new Set([primary, DEFAULT_MODEL]));
      const errs: string[] = [];
      for (const m of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await callGemini(m, maxTokens, temperature, title, description, categoryHint, lat, lng);
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
          ? 'Gemini quota reached (free tier 20/day) — using configured rule-based management.'
          : 'Gemini request failed: ' + msg;
        result = await fallbackRules(supabase, reportText);
      }
    } else {
      aiError = 'GEMINI_API_KEY is not configured — using configured rule-based management.';
      result = await fallbackRules(supabase, reportText);
    }

    const autoDispatch = result.confidence >= autoDispatchThreshold;
    const criticalFlag = result.threat >= criticalThreshold;

    await supabase.from('ai_audit_logs').insert({
      actor: 'AI_System',
      action: aiError ? 'Classified via fallback rules' : 'Classified Report',
      detail: `Classified as "${result.category}" (${result.confidence}%) - ${result.priority} priority`,
      metadata: { title, source: result.source, aiError, autoDispatch, criticalFlag },
    });

    const payload: CachedResult = {
      ...result,
      autoDispatch,
      criticalFlag,
      thresholds: { autoDispatchThreshold, criticalThreshold },
      aiError,
    };

    if (resultCache.size >= CACHE_MAX) {
      const oldestKey = resultCache.keys().next().value;
      if (oldestKey) resultCache.delete(oldestKey);
    }
    resultCache.set(cacheKey, { ts: Date.now(), payload });

    return Response.json({ ok: true, ...payload }, { headers: corsHeaders });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: corsHeaders },
    );
  }
});
