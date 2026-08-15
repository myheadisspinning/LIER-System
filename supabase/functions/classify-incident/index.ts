import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const DEFAULT_MODEL = 'gemini-flash-latest';

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
  "category": one of "Fire Hazard" | "Medical" | "Crime" | "Others",
  "confidence": integer 0-100,
  "priority": one of "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "threat": integer 0-100,
  "user_actions": array of 2-4 CONCRETE, situation-specific actions the citizen reporter should take RIGHT NOW for this exact incident (e.g. where to evacuate to, which hotline to call, what to avoid, how to stay safe) written as short imperative commands — do NOT reuse or paraphrase the dispatch actions,
  "actions": array of 2-4 short recommended response/dispatch actions for barangay responders (unit staging, scene control, coordination),
  "dispatch": short dispatch instruction line, e.g. "AI Dispatch routed T-04 · ETA 4 min",
  "unit": suggested unit name or null,
  "eta": ETA string like "4 min" or null
}
Base decisions on severity, risk to life/property, and proximity. Threat >= 85 => CRITICAL, >= 70 => HIGH, >= 45 => MEDIUM, else LOW.`;

const CATEGORY_ALIASES: Record<string, string[]> = {
  'Fire Hazard': ['fire', 'burning', 'flames', 'blaze', 'smoke', 'burnt', 'explosion', 'exploded', 'bomb', 'blast', 'gas leak', 'gas', 'fuel', 'gasoline', 'short circuit', 'electrical fire', 'sunog', 'apoy', 'nasusunog', 'nagliliyab', 'usok', 'nagniningas', 'siga', 'umuusok', 'sunugin', 'nagsusunog', 'panununog', 'sinunog', 'pagsabog', 'sumabog', 'bomba', 'tagas ng gas', 'gasolina', 'nakuryente', 'kuryente'],
  Medical: ['medical', 'emergency', 'ambulance', 'injury', 'injured', 'bleed', 'bleeding', 'wound', 'unconscious', 'heart attack', 'stroke', 'seizure', 'convulsion', 'accident', 'vehicular accident', 'hit and run', 'fell', 'fell down', 'drown', 'drowning', 'drowned', 'poison', 'poisoning', 'overdose', 'dog bite', 'snake bite', 'bite', 'pregnant', 'labor', 'giving birth', 'asthma', 'sugatan', 'nasugatan', 'dugo', 'dumudugo', 'himatay', 'nasaktan', 'atake', 'hurt', 'malubhang sugat', 'atake sa puso', 'high blood', 'kombulsyon', 'nagko-kombulsiyon', 'aksidente', 'naaksidente', 'nabangga', 'nasagasaan', 'nakabangga', 'nahulog', 'nahulugan', 'nalunod', 'nalulunod', 'nalason', 'pagkalason', 'lason', 'kagat', 'nakagat', 'kagat ng aso', 'kagat ng ahas', 'tinuka', 'buntis', 'manganganak', 'nanganganak', 'nanganak', 'hika', 'atake ng hika'],
  Crime: ['crime', 'robbery', 'theft', 'stolen', 'stole', 'holdup', 'hold-up', 'armed', 'gun', 'knife', 'weapon', 'threat', 'stab', 'stabbing', 'stabbed', 'shoot', 'shooting', 'shot', 'gunshot', 'assault', 'maul', 'mauling', 'attacked', 'kill', 'killed', 'murder', 'homicide', 'dead body', 'kidnap', 'kidnapping', 'abducted', 'carnap', 'carnapping', 'hijack', 'drugs', 'drug', 'shabu', 'pusher', 'vandalism', 'vandal', 'riot', 'nakaw', 'ninakaw', 'ninanakaw', 'magnanakaw', 'pagnanakaw', 'holdap', 'snatcher', 'mandurukot', 'kutsilyo', 'patalim', 'baril', 'armas', 'pananakot', 'nananakot', 'kawatan', 'nakawan', 'saksak', 'saksakin', 'saksakan', 'sinaksak', 'nasaksak', 'pananaksak', 'nanaksak', 'pinagsasaksak', 'pamamaril', 'namaril', 'barilin', 'binaril', 'gulpi', 'ginulpi', 'binugbog', 'bugbog', 'bugbugan', 'suntukan', 'suntok', 'sinalakay', 'patay', 'pinatay', 'patayan', 'pumatay', 'nasawi', 'natagpuang patay', 'bangkay', 'natagpuang bangkay', 'cadaver', 'deceased', 'patay na tao', 'walang buhay', 'dinukot', 'nangikidnap', 'kinarnap', 'droga', 'ipinagbabawal na gamot', 'basag', 'sinira', 'kaguluhan', 'nagkagulo'],
};

function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase().trim();
  for (const [cat, words] of Object.entries(CATEGORY_ALIASES)) {
    if (s === cat.toLowerCase()) return cat;
    if (words.some((w) => s.includes(w))) return cat;
  }
  return 'Others';
}

async function callGemini(
  model: string,
  maxTokens: number,
  temperature: number,
  reportText: string,
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
            { text: `Citizen report: ${reportText}.${location} Return JSON only.` },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', enum: ['Fire Hazard', 'Medical', 'Crime', 'Others'] },
            confidence: { type: 'INTEGER' },
            priority: { type: 'STRING', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            threat: { type: 'INTEGER' },
            user_actions: { type: 'ARRAY', items: { type: 'STRING' } },
            actions: { type: 'ARRAY', items: { type: 'STRING' } },
            dispatch: { type: 'STRING' },
            unit: { type: ['STRING', 'NULL'] },
            eta: { type: ['STRING', 'NULL'] },
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

  const parsed = JSON.parse(text);
  const clean = (s: unknown) =>
    typeof s === 'string' ? s.replace(/^"|"$/g, '') : '';
  const num = (v: unknown, d = 0, max = 100) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : d;
  };
  const priority = (parsed.priority ?? 'MEDIUM').toString().toUpperCase();
  const validPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority as Classification['priority'] : 'MEDIUM';
  const category = normalizeCategory(clean(parsed.category));
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
    for (const w of words) if (lower.includes(w)) matched.add(w);
  }

  const matchedCount = matched.size;
  const confidence = matchedCount === 0 ? 45 : matchedCount === 1 ? 70 : matchedCount === 2 ? 80 : 88;
  const userActions: Record<string, string[]> = {
    'Fire Hazard': ['Evacuate to a safe area immediately', 'Call 911 if the fire is life-threatening', 'Avoid the affected area and keep others away'],
    Medical: ['Keep the person calm and still', 'Call an ambulance or emergency hotline', 'Do not give food or drink unless told to'],
    Crime: ['Keep a safe distance from the suspects', 'Do not approach or intervene', 'Note any descriptions without putting yourself at risk'],
    Others: ['Avoid the affected area', 'Notify barangay officials or authorities', 'Monitor for any change in the situation'],
  };

  return {
    category,
    confidence,
    priority,
    threat,
    actions,
    user_actions: userActions[category] ?? userActions['Others'],
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
    const model = cfg.model?.name ?? DEFAULT_MODEL;
    const maxTokens = Number(cfg.max_tokens?.value) || 1024;
    const temperature = Number(cfg.temperature?.value) ?? 0.1;
    const criticalThreshold = Number(cfg.critical_threshold?.value) || 85;
    const autoDispatchThreshold = Number(cfg.auto_dispatch_threshold?.value) || 95;

    let result: Classification;
    let aiError: string | null = null;
    if (GEMINI_API_KEY) {
      try {
        result = await callGemini(model, maxTokens, temperature, reportText, lat, lng);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        aiError = /429|RESOURCE_EXHAUSTED|quota/i.test(msg)
          ? 'Gemini quota reached (free tier 20/day) — using configured rule-based management.'
          : msg;
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
