import { supabase } from '../supabaseClient';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface EvidenceFile {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface AiAnalysis {
  category: string;
  confidence: number;
  priority: Priority;
  threat: number;
  actions: string[];
  user_actions: string[];
  dispatch: string;
  unit: string | null;
  eta: string | null;
  source: 'gemini' | 'fallback';
  autoDispatch: boolean;
  criticalFlag: boolean;
  aiError: string | null;
}

export interface ClassifyInput {
  title: string;
  description?: string;
  categoryHint?: string;
  lat?: number | null;
  lng?: number | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-incident`;

export async function classifyIncident(input: ClassifyInput): Promise<AiAnalysis> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in to use AI analysis.');

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json?.error ?? 'AI service is unavailable.');
  }
  return json as AiAnalysis;
}

export interface IncidentReportRow {
  title: string;
  description?: string | null;
  category: string;
  priority: Priority;
  threat: number;
  confidence: number;
  status: string;
  incident_status: string;
  incident_time?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  additional_context?: string | null;
  ai_actions: string[];
  ai_dispatch?: string | null;
  evidence?: EvidenceFile[] | null;
  reporter_confidence?: string | null;
  anonymous?: boolean;
}

export async function uploadEvidence(files: File[]): Promise<EvidenceFile[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to upload evidence.');

  const items: EvidenceFile[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from('evidence')
      .upload(path, file, { cacheControl: '3600', contentType: file.type || 'application/octet-stream' });
    if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    const { data } = supabase.storage.from('evidence').getPublicUrl(path);
    items.push({ name: file.name, type: file.type, size: file.size, url: data.publicUrl });
  }
  return items;
}

export async function insertIncidentReport(
  row: IncidentReportRow,
): Promise<{ report_no: string; id: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to submit a report.');

  const { data, error } = await supabase
    .from('incident_reports')
    .insert({
      ...row,
      anonymous: row.anonymous ?? false,
      user_id: session.user.id,
    })
    .select('report_no, id')
    .single();

  if (error) throw new Error(error.message);
  return data as { report_no: string; id: string };
}

const normalizeTitle = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export interface DuplicateCheckResult {
  duplicate: boolean;
  report_no?: string;
}

export async function checkDuplicateReport(
  title: string,
  lat?: number | null,
  lng?: number | null,
): Promise<DuplicateCheckResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to submit a report.');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('incident_reports')
    .select('report_no, title, lat, lng')
    .eq('user_id', session.user.id)
    .gte('created_at', since)
    .limit(50);

  if (error) throw new Error(error.message);

  const needle = normalizeTitle(title);
  for (const r of data ?? []) {
    if (normalizeTitle(r.title) !== needle) continue;
    if (lat == null || lng == null || r.lat == null || r.lng == null) {
      return { duplicate: true, report_no: r.report_no };
    }
    if (Math.abs(r.lat - lat) <= 0.001 && Math.abs(r.lng - lng) <= 0.001) {
      return { duplicate: true, report_no: r.report_no };
    }
  }
  return { duplicate: false };
}
