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

type AiConfig = Record<string, { enabled?: boolean; name?: string; value?: number; mode?: string; level?: string }>;

type Classification = {
  category: string;
  confidence: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  threat: number;
  actions: string[];
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
  "actions": array of 2-4 short recommended actions,
  "dispatch": short dispatch instruction line, e.g. "AI Dispatch routed T-04 · ETA 4 min",
  "unit": suggested unit name or null,
  "eta": ETA string like "4 min" or null
}
Base decisions on severity, risk to life/property, and proximity. Threat >= 85 => CRITICAL, >= 70 => HIGH, >= 45 => MEDIUM, else LOW.`;

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
  const category = clean(parsed.category);
  const validCategories = ['Fire Hazard', 'Medical', 'Crime', 'Others'];
  const actions = Array.isArray(parsed.actions) ? parsed.actions.map((a: unknown) => String(a)) : [];

  return {
    category: validCategories.includes(category) ? category : 'Others',
    confidence: num(parsed.confidence),
    priority: validPriority,
    threat: num(parsed.threat),
    actions: actions.slice(0, 4),
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
  const category = hit ? hit.category : 'Others';
  const threat = hit ? (priority === 'CRITICAL' ? 90 : priority === 'HIGH' ? 75 : 50) : 30;
  const actions = hit
    ? ['Notify barangay command center', `${hit.action} assigned unit to pin`]
    : ['Log to case master', 'Assign barangay tanod unit for verification'];

  return {
    category,
    confidence: 60,
    priority,
    threat,
    actions,
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: cfgRows } = await supabase.from('ai_config').select('key, value');
    const cfg = new Map<string, unknown>((cfgRows ?? []).map((r) => [r.key, r.value])) as AiConfig;
    const aiEnabled = cfg.ai_enabled?.enabled ?? true;
    const model = cfg.model?.name ?? DEFAULT_MODEL;
    const maxTokens = Number(cfg.max_tokens?.value) || 1024;
    const temperature = Number(cfg.temperature?.value) ?? 0.1;
    const criticalThreshold = Number(cfg.critical_threshold?.value) || 85;
    const autoDispatchThreshold = Number(cfg.auto_dispatch_threshold?.value) || 95;

    let result: Classification;
    let aiError: string | null = null;
    if (aiEnabled && GEMINI_API_KEY) {
      try {
        result = await callGemini(model, maxTokens, temperature, reportText, lat, lng);
      } catch (e) {
        aiError = e instanceof Error ? e.message : String(e);
        result = await fallbackRules(supabase, reportText);
      }
    } else {
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

    return Response.json({
      ok: true,
      ...result,
      autoDispatch,
      criticalFlag,
      thresholds: { autoDispatchThreshold, criticalThreshold },
      aiError,
    }, { headers: corsHeaders });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: corsHeaders },
    );
  }
});
