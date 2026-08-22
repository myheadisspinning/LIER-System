import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { checkDuplicateReport, classifyIncident, insertIncidentReport, uploadEvidence, type AiAnalysis, type EvidenceFile } from '../../../lib/ai';
import Toast from '../../../components/Toast';
import { BARANGAY_HALL_CENTER, BARANGAY_HALL_ADDRESS } from '../../../lib/geo';

const EVIDENCE_ACCEPT = {
  video: 'video/*',
  photo: 'image/png,image/jpeg,image/jpg',
  audio: 'audio/mpeg,audio/wav,audio/x-wav',
} as const;

const MEDIA_TYPES: Record<string, string> = {
  video: 'videocam',
  photo: 'photo_camera',
  audio: 'mic',
};

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const timeAgo = (ts: number) => {
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ${mins % 60} min ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

type DraftPayload = {
  savedAt: string;
  step: number;
  category: string;
  customCategory: string;
  incidentStatus: string;
  reportTitle: string;
  reportDescription: string;
  additionalContext: string;
  incidentTime: string;
  location: [number, number];
  address: string;
  anonymous: boolean;
  confirm1: boolean;
  confirm2: boolean;
  evidenceMeta: { name: string; type: string; size: number }[];
  analysis: AiAnalysis | null;
  manualSave: boolean;
};

const DRAFT_KEY = 'lier_incident_draft_v1';

function loadDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed || typeof parsed.savedAt !== 'string' || !Array.isArray(parsed.location)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(payload: DraftPayload): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore storage failures
  }
}

const CATEGORIES = [
  { icon: 'local_fire_department', label: 'Fire Hazard' },
  { icon: 'medical_services', label: 'Medical Emergency' },
  { icon: 'gavel', label: 'Crime & Theft' },
  { icon: 'traffic', label: 'Traffic Incident' },
  { icon: 'cyclone', label: 'Natural Disaster' },
  { icon: 'record_voice_over', label: 'Public Disturbance' },
  { icon: 'construction', label: 'Infrastructure' },
  { icon: 'person_search', label: 'Missing Person' },
  { icon: 'pets', label: 'Animal Incident' },
  { icon: 'more_horiz', label: 'Other/Uncategorized' },
];

const CATEGORY_ICONS: Record<string, string> = {
  'Fire Hazard': 'local_fire_department',
  'Medical Emergency': 'medical_services',
  'Crime & Theft': 'gavel',
  'Traffic Incident': 'traffic',
  'Natural Disaster': 'cyclone',
  'Public Disturbance': 'record_voice_over',
  'Infrastructure': 'construction',
  'Missing Person': 'person_search',
  'Animal Incident': 'pets',
  'Other/Uncategorized': 'more_horiz',
};

const PRIORITY_STYLES: Record<AiAnalysis['priority'], string> = {
  CRITICAL: 'bg-error/10 text-error border-error/20',
  HIGH: 'bg-secondary/10 text-secondary border-secondary/20',
  MEDIUM: 'bg-secondary/10 text-secondary border-secondary/20',
  LOW: 'bg-secondary/10 text-secondary border-secondary/20',
};

const THREAT_SEGMENTS = [
  { label: 'Low', color: 'bg-success-green' },
  { label: 'Med', color: 'bg-secondary' },
  { label: 'High', color: 'bg-tertiary' },
  { label: 'Crit', color: 'bg-error' },
];

function localFallback(category: string): AiAnalysis {
  const map: Record<string, AiAnalysis> = {
    'Fire Hazard': {
      category: 'Fire Hazard',
      confidence: 90,
      priority: 'CRITICAL',
      threat: 90,
      actions: ['Evacuate nearest block', 'Dispatch BFP engine to pin'],
      user_actions: ['Evacuate to a safe area immediately', 'Call 911 if the fire is life-threatening', 'Avoid the affected area and keep others away'],
      dispatch: 'AI Dispatch routed T-04 · ETA 4 min',
      unit: 'BFP Engine T-04',
      eta: '4 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Medical Emergency': {
      category: 'Medical Emergency',
      confidence: 88,
      priority: 'HIGH',
      threat: 78,
      actions: ['Alert General Hospital ER', 'Route ambulance to pin'],
      user_actions: ['Keep the person calm and still', 'Call an ambulance or emergency hotline', 'Do not give food or drink unless told to'],
      dispatch: 'AI Dispatch routed M-02 · ETA 6 min',
      unit: 'Medical Ambulance M-02',
      eta: '6 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Crime & Theft': {
      category: 'Crime & Theft',
      confidence: 86,
      priority: 'CRITICAL',
      threat: 86,
      actions: ['Notify local precinct', 'Keep reporter at safe distance'],
      user_actions: ['Keep a safe distance from the suspects', 'Do not approach or intervene', 'Note any descriptions without putting yourself at risk'],
      dispatch: 'AI Dispatch routed T-07 · ETA 3 min',
      unit: 'Mobile Alpha (PNP)',
      eta: '3 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Traffic Incident': {
      category: 'Traffic Incident',
      confidence: 85,
      priority: 'MEDIUM',
      threat: 60,
      actions: ['Dispatch traffic management unit', 'Clear route if needed'],
      user_actions: ['Stay in safe area', 'Do not move vehicles if accident', 'Wait for traffic enforcer'],
      dispatch: 'AI Dispatch routed TM-02 · ETA 8 min',
      unit: 'Traffic Management Unit 2',
      eta: '8 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Natural Disaster': {
      category: 'Natural Disaster',
      confidence: 92,
      priority: 'CRITICAL',
      threat: 95,
      actions: ['Activate disaster response team', 'Open evacuation centers', 'Coordinate with DRRMO'],
      user_actions: ['Move to higher ground if flooding', 'Prepare emergency kit', 'Listen to official announcements'],
      dispatch: 'AI Dispatch routed DR-01 · ETA 5 min',
      unit: 'Disaster Response Team 1',
      eta: '5 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: true,
      aiError: null,
    },
    'Public Disturbance': {
      category: 'Public Disturbance',
      confidence: 80,
      priority: 'LOW',
      threat: 40,
      actions: ['Dispatch barangay tanod for mediation', 'Monitor situation'],
      user_actions: ['Avoid the area if possible', 'Do not intervene directly', 'Report if situation escalates'],
      dispatch: 'AI Dispatch routed BT-03 · ETA 10 min',
      unit: 'Barangay Tanod Unit 3',
      eta: '10 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Infrastructure': {
      category: 'Infrastructure',
      confidence: 75,
      priority: 'LOW',
      threat: 30,
      actions: ['Log to public works', 'Schedule repair crew'],
      user_actions: ['Mark the area if hazardous', 'Avoid damaged infrastructure', 'Report to barangay office during hours'],
      dispatch: 'AI Dispatch routed PW-01 · ETA 24 hrs',
      unit: 'Public Works Crew 1',
      eta: '24 hrs',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Missing Person': {
      category: 'Missing Person',
      confidence: 89,
      priority: 'HIGH',
      threat: 70,
      actions: ['Alert all patrol units', 'Check CCTV coverage', 'Coordinate with social workers'],
      user_actions: ['Provide last known location', 'Share recent photo', 'Contact barangay immediately'],
      dispatch: 'AI Dispatch routed MP-01 · ETA 2 min',
      unit: 'Missing Person Response Team',
      eta: '2 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Animal Incident': {
      category: 'Animal Incident',
      confidence: 78,
      priority: 'MEDIUM',
      threat: 50,
      actions: ['Dispatch animal control', 'Alert veterinary services'],
      user_actions: ['Keep safe distance', 'Do not approach aggressive animals', 'Secure pets and children'],
      dispatch: 'AI Dispatch routed AC-01 · ETA 15 min',
      unit: 'Animal Control Unit 1',
      eta: '15 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
    'Other/Uncategorized': {
      category: 'Other/Uncategorized',
      confidence: 70,
      priority: 'MEDIUM',
      threat: 55,
      actions: ['Assign barangay tanod unit', 'Log to case master'],
      user_actions: ['Avoid the affected area', 'Notify barangay officials or authorities', 'Monitor for any change in the situation'],
      dispatch: 'AI Dispatch routed T-09 · ETA 9 min',
      unit: 'Tanod Patrol Unit 2',
      eta: '9 min',
      source: 'fallback',
      autoDispatch: false,
      criticalFlag: false,
      aiError: null,
    },
  };
  return map[category] ?? map['Other/Uncategorized'];
}

const pinIcon = divIcon({
  className: '',
  html: '<div class="relative w-8 h-8"><span class="absolute inset-0 rounded-full bg-error animate-ping opacity-75"></span><span class="absolute inset-0 m-auto w-5 h-5 rounded-full bg-error/30 border-2 border-white"></span><span class="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-error"></span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapEvents({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function MapSizeSync() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => map.invalidateSize());
          }
        });
      },
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FlyTo({ target, onDone }: { target: [number, number] | null; onDone: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 1.2 });
      onDone();
    }
  }, [map, target, onDone]);
  return null;
}


export default function ReportIncident({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const customCategoryInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisSeq = useRef(0);
  const analysisCache = useRef<Map<string, AiAnalysis>>(new Map());
  const forceAnalyzeRef = useRef(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('Fire Hazard');
  const [incidentStatus, setIncidentStatus] = useState('Ongoing');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<'draft-prompt' | 'draft-saved' | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [incidentTime, setIncidentTime] = useState(() => toLocalInput(new Date()));
  const [customCategory, setCustomCategory] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'video' | 'photo' | 'audio'>('photo');
  const [location, setLocation] = useState<[number, number]>(BARANGAY_HALL_CENTER);
  const [address, setAddress] = useState(BARANGAY_HALL_ADDRESS);
  const [usingCurrent, setUsingCurrent] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [tile, setTile] = useState<'street' | 'satellite'>('street');
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeTick, setAnalyzeTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [missingField, setMissingField] = useState<'category' | 'title' | 'description' | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setDraftSavedAt(new Date(d.savedAt).getTime());
      setNotice('draft-prompt');
    }
  }, []);

  useEffect(() => {
    if (notice !== 'draft-saved') return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const existing = loadDraft();
      if (existing?.manualSave) return;
      const hasData = reportTitle.trim() || reportDescription.trim() || additionalContext.trim() || evidenceFiles.length > 0;
      if (!hasData) return;
      saveDraft({
        savedAt: new Date().toISOString(),
        step,
        category,
        customCategory,
        incidentStatus,
        reportTitle,
        reportDescription,
        additionalContext,
        incidentTime,
        location: [location[0], location[1]],
        address,
        anonymous,
        confirm1,
        confirm2,
        evidenceMeta: evidenceFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        analysis,
        manualSave: false,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step, category, customCategory, incidentStatus, reportTitle, reportDescription, additionalContext, incidentTime, location, address, anonymous, confirm1, confirm2, evidenceFiles, analysis]);

  const ai = analysis ?? localFallback(category);
  const effectiveCategory =
    category === 'Other/Uncategorized' && customCategory.trim() ? customCategory.trim() : category;
  const threatActive = Math.ceil((ai.threat / 100) * 4);
  const priorityTone = PRIORITY_STYLES[ai.priority];

  const handlePick = useCallback((lat: number, lng: number) => {
    setLocation([lat, lng]);
  }, []);

  const handleFlyDone = useCallback(() => setFlyTarget(null), []);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setToast({ type: 'error', message: 'Geolocation is not supported by this browser.' });
      return;
    }
    setUsingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation([latitude, longitude]);
        setFlyTarget([latitude, longitude]);
        setUsingCurrent(false);
      },
      () => {
        setUsingCurrent(false);
        setToast({ type: 'error', message: 'Location access denied. Please enable location, or use the "Barangay Hall" button to set a default location.' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    let cancelled = false;
    const [lat, lng] = location;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=0&lat=${lat}&lon=${lng}`,
        );
        const data = await res.json();
        if (!cancelled && data?.display_name) {
          setAddress(data.display_name.split(',').slice(0, 3).join(', '));
        }
      } catch {
        // keep last known address
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location]);

  useEffect(() => {
    const forced = forceAnalyzeRef.current;
    forceAnalyzeRef.current = false;
    if (reportTitle.trim().length < 3 && reportDescription.trim().length < 3) return;
    const seq = ++analysisSeq.current;
    const key = `${reportTitle}|${reportDescription}`.toLowerCase().trim();
    if (!forced) {
      const cached = analysisCache.current.get(key);
      if (cached) {
        setAnalysis(cached);
        setAnalyzing(false);
        return;
      }
    }
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await classifyIncident({
          title: reportTitle,
          description: reportDescription,
          lat: location[0],
          lng: location[1],
        });
        if (analysisSeq.current !== seq) return;
        if (res.source === 'gemini') analysisCache.current.set(key, res);
        setAnalysis(res);
        setAnalyzing(false);
      } catch {
        if (analysisSeq.current !== seq) return;
      }
    }, forced ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [reportTitle, reportDescription, analyzeTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...evidenceFiles];
    for (const file of Array.from(list)) {
      if (file.size > 50 * 1024 * 1024) {
        setToast({ type: 'error', message: `${file.name} exceeds the 50MB limit.` });
        continue;
      }
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
    }
    setEvidenceFiles(next);
  };

  const removeFile = (name: string, size: number) => {
    setEvidenceFiles((files) => files.filter((f) => !(f.name === name && f.size === size)));
  };

  const handleSaveDraft = () => {
    const ok = saveDraft({
      savedAt: new Date().toISOString(),
      step,
      category,
      customCategory,
      incidentStatus,
      reportTitle,
      reportDescription,
      additionalContext,
      incidentTime,
      location: [location[0], location[1]],
      address,
      anonymous,
      confirm1,
      confirm2,
      evidenceMeta: evidenceFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      analysis,
      manualSave: true,
    });
    if (ok) {
      setDraftSavedAt(Date.now());
      setNotice('draft-saved');
    } else {
      setToast({ type: 'error', message: 'Could not save draft (storage unavailable).' });
    }
  };

  const handleResumeDraft = () => {
    const d = loadDraft();
    if (!d) {
      setDraftSavedAt(null);
      setNotice(null);
      setToast({ type: 'error', message: 'Draft could not be loaded.' });
      return;
    }
    setStep(d.step >= 1 && d.step <= 3 ? d.step : 1);
    setCategory(d.category);
    setCustomCategory(d.customCategory);
    setIncidentStatus(d.incidentStatus);
    setReportTitle(d.reportTitle);
    setReportDescription(d.reportDescription);
    setAdditionalContext(d.additionalContext ?? '');
    setIncidentTime(d.incidentTime);
    setLocation([d.location[0], d.location[1]]);
    setAddress(d.address);
    setAnonymous(d.anonymous);
    setConfirm1(d.confirm1);
    setConfirm2(d.confirm2);
    setAnalysis(d.analysis);
    setEvidenceFiles([]);
    clearDraft();
    setDraftSavedAt(null);
    setNotice(null);
    if (d.evidenceMeta.length) {
      setToast({ type: 'success', message: 'Draft restored. Re-attach your evidence files \u2014 they can\u2019t be stored in a draft.' });
    } else {
      setToast({ type: 'success', message: 'Draft restored.' });
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftSavedAt(null);
    setNotice(null);
    setToast({ type: 'success', message: 'Draft discarded.' });
  };

  const handleSubmit = async () => {
    if (!confirm1 || !confirm2) {
      setToast({ type: 'error', message: 'Please confirm the two validation checkboxes before submitting.' });
      return;
    }
    if (!reportTitle.trim()) {
      setToast({ type: 'error', message: 'A report title is required.' });
      return;
    }
    setSubmitting(true);
    try {
      const dup = await checkDuplicateReport(reportTitle.trim(), location[0], location[1]);
      if (dup.duplicate) {
        setToast({
          type: 'error',
          message: dup.report_no
            ? `Duplicate report detected — a similar report (${dup.report_no}) was submitted within the last 24 hours. Check My Incident Reports.`
            : 'Duplicate report detected — a similar report was submitted within the last 24 hours. Check My Incident Reports.',
        });
        return;
      }
      let evidence: EvidenceFile[] = [];
      if (evidenceFiles.length) {
        setToast({ type: 'success', message: `Uploading ${evidenceFiles.length} evidence file(s)…` });
        evidence = await uploadEvidence(evidenceFiles);
      }
      const result = await insertIncidentReport({
        title: reportTitle.trim(),
        description: reportDescription.trim() || null,
        category: effectiveCategory,
        priority: ai.priority,
        threat: ai.threat,
        confidence: ai.confidence,
        status: 'Pending',
        incident_status: incidentStatus,
        incident_time: incidentTime ? new Date(incidentTime).toISOString() : null,
        lat: location[0],
        lng: location[1],
        address,
        additional_context: additionalContext.trim() || null,
        ai_actions: ai.actions,
        ai_dispatch: ai.dispatch,
        evidence,
        anonymous,
      });
      setToast({ type: 'success', message: `Report ${result.report_no} submitted successfully.` });
      clearDraft();
      setDraftSavedAt(null);
      setTimeout(() => navigate('/user/my-incident-reports'), 1500);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToField = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToStep = (target: number) => {
    if (step === 1) {
      if (category === 'Others' && !customCategory.trim()) {
        setMissingField('category');
        scrollToField(customCategoryInputRef.current);
        return;
      }
      if (!reportTitle.trim()) {
        setMissingField('title');
        scrollToField(titleInputRef.current);
        return;
      }
    }
    if (step === 2 && !reportDescription.trim()) {
      setMissingField('description');
      scrollToField(descriptionTextareaRef.current);
      return;
    }
    setMissingField(null);
    setStep(target);
  };

  return (
    <div className={`bg-surface w-full h-full ${className} rounded-2xl shadow-xl overflow-hidden flex flex-col relative border border-outline-variant/30`}>
      {/* Critical Notice */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-caption text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-error">warning</span>
          <p>For immediate life-threatening situations, dial 911 immediately.</p>
        </div>
        {notice === 'draft-prompt' && (
          <div className="bg-secondary/10 border-l-4 border-l-secondary px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded shadow-sm">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="material-symbols-outlined text-secondary shrink-0">draft</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant min-w-0 flex-1 sm:truncate">
                You have a saved draft{draftSavedAt ? ` · ${timeAgo(draftSavedAt)}` : ''}.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={handleResumeDraft} className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm text-[12px] font-bold hover:opacity-90 transition-colors">Resume Draft</button>
              <button type="button" onClick={handleDiscardDraft} className="px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-sm text-[12px] font-medium">Discard</button>
            </div>
          </div>
        )}
        {/* Stepper */}
        <div className="flex items-center gap-2 font-label-sm text-[12px]">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low border border-outline-variant text-on-surface-variant'}`}>1</span>
            <span>Classification</span>
          </div>
          <div className="w-8 h-[1px] bg-outline-variant/30"></div>
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low border border-outline-variant text-on-surface-variant'}`}>2</span>
            <span>Details</span>
          </div>
          <div className="w-8 h-[1px] bg-outline-variant/30"></div>
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low border border-outline-variant text-on-surface-variant'}`}>3</span>
            <span>Review</span>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">
                    Incident Category <span className="text-error">*</span>
                  </label>
                  <div className="relative" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className={`w-full bg-white border rounded-lg py-[10px] px-3 pr-10 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary transition-all cursor-pointer text-left ${
                        missingField === 'category' ? 'border-error' : 'border-outline-variant'
                      }`}
                    >
                      {category}
                    </button>
                    <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    {isCategoryOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-outline-variant rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {CATEGORIES.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setCategory(opt.label);
                              setMissingField((m) => (m === 'category' ? null : m));
                              if (opt.label !== 'Other/Uncategorized') setCustomCategory('');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 font-label-md text-label-md hover:bg-surface-container-low transition-colors ${
                              category === opt.label ? 'bg-surface-container-low text-secondary font-bold' : 'text-on-surface'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {category === 'Other/Uncategorized' && (
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Specify Incident Type <span className="text-error">*</span></label>
                    <input ref={customCategoryInputRef} className={`w-full bg-white border rounded-lg py-[10px] px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary placeholder:text-xs placeholder:text-on-surface-variant placeholder:font-light placeholder:tracking-normal placeholder:italic transition-all ${missingField === 'category' ? 'border-error' : 'border-outline-variant'}`} type="text" value={customCategory} placeholder="e.g. Flood, Landslide, Electrical outage" onChange={(e) => { setCustomCategory(e.target.value); setMissingField((m) => (m === 'category' ? null : m)); if (e.target.value.trim()) setAiExpanded(true); }} />
                  </div>
                )}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Incident Status</label>
                  <div className="flex bg-white rounded-lg p-1 border border-outline-variant">
                    {['Ongoing', 'Happened', 'Unconfirmed'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setIncidentStatus(s)}
                        className={`flex-1 py-2 text-center rounded-md font-label-sm text-label-sm transition-colors ${incidentStatus === s ? 'bg-surface shadow-sm border border-outline-variant text-secondary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Date &amp; Time</label>
                  <input className="w-full bg-white border border-outline-variant rounded-lg py-[10px] px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary transition-all" type="datetime-local" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Report Title <span className="text-error">*</span></label>
                  <input ref={titleInputRef} className={`w-full bg-white border rounded-lg py-[10px] px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary placeholder:text-xs placeholder:text-on-surface-variant placeholder:font-light placeholder:tracking-normal placeholder:italic transition-all ${missingField === 'title' ? 'border-error' : 'border-outline-variant'}`} type="text" value={reportTitle} placeholder="e.g. Sunog sa barangay" onChange={(e) => { setReportTitle(e.target.value); setMissingField((m) => (m === 'title' ? null : m)); if (e.target.value.trim()) setAiExpanded(true); }} />
                </div>
              </div>
            </div>

            {/* ===== REALTIME LOCATION MAP ===== */}
            <div className="flex flex-col rounded-xl border border-outline-variant/30 relative shadow-xl overflow-hidden">
              <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 z-10 relative">
                <h3 className="font-label-sm text-[12px] text-on-surface flex items-center gap-2 tracking-wide uppercase font-bold">
                  <span className="material-symbols-outlined text-[16px] text-secondary">map</span>
                  Realtime Location Map
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:w-auto">
                    <button type="button" onClick={useCurrentLocation} disabled={usingCurrent} className="bg-surface-container-low border border-outline-variant hover:border-secondary rounded px-2 py-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] leading-none text-on-surface transition-colors disabled:opacity-60 sm:justify-start">
                      <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-secondary">{usingCurrent ? 'progress_activity' : 'my_location'}</span>
                      {usingCurrent ? 'Locating…' : 'Use Current'}
                    </button>
                    <button type="button" onClick={() => { setLocation(BARANGAY_HALL_CENTER); setFlyTarget(BARANGAY_HALL_CENTER); }} className="bg-surface-container-low border border-outline-variant hover:border-secondary rounded px-2 py-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] leading-none text-on-surface transition-colors sm:justify-start">
                      <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-secondary">pin_drop</span>
                      Barangay Hall
                    </button>
                    <button type="button" onClick={() => setTile((t) => (t === 'street' ? 'satellite' : 'street'))} className="bg-surface-container-low border border-outline-variant hover:border-secondary rounded px-2 py-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] leading-none text-on-surface transition-colors sm:justify-start">
                      <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-secondary">layers</span>
                      {tile === 'street' ? 'Satellite' : 'Street'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative w-full min-h-[380px] sm:min-h-[460px] bg-surface-container-low">
                <MapContainer center={BARANGAY_HALL_CENTER} zoom={15} className="absolute inset-0 z-0" scrollWheelZoom zoomControl={false}>
                  <MapSizeSync />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {tile === 'satellite' && (
                    <TileLayer
                      attribution="Tiles &copy; Esri"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      opacity={0.9}
                    />
                  )}
                  <MapEvents onPick={handlePick} />
                  <FlyTo target={flyTarget} onDone={handleFlyDone} />
                  <Marker
                    position={location}
                    icon={pinIcon}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = (e.target as LeafletMarker).getLatLng();
                        handlePick(ll.lat, ll.lng);
                      },
                    }}
                  />
                </MapContainer>

                {/* crosshair reticle */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/30"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-outline-variant/30"></div>
                </div>

                {/* legend */}
                <div className="absolute left-4 top-[5.5rem] sm:left-auto sm:right-4 sm:top-4 z-[600] rounded-lg bg-surface/95 border border-outline-variant shadow-xl px-3 py-2 text-[10px] font-bold text-on-surface">
                  <div className="flex items-center gap-2 mb-1.5"><span className="w-2 h-2 rounded-full bg-error"></span> Incident</div>
                  <div className="flex items-center gap-2 mb-1.5"><span className="w-2 h-2 rounded-full bg-secondary"></span> Unit</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-0.5 border-t-2 border-dashed border-on-surface-variant/50"></span> District</div>
                </div>

                {/* address + coordinates chip */}
                <div className="absolute top-4 left-4 z-[600] bg-surface/95 border border-outline-variant rounded-lg shadow-xl px-3 py-2 flex items-center gap-2 max-w-[calc(100%-2rem)] sm:max-w-[260px]" title={address}>
                  <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">near_me</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-on-surface font-semibold truncate">{address}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold tracking-wide">{location[0].toFixed(5)}°N, {location[1].toFixed(5)}°E</p>
                  </div>  
                </div>

                {/* ===== AI TACTICAL ANALYSIS ===== */}
                <div className="absolute bottom-4 right-4 z-[600] w-64 lg:w-72 bg-surface-container-low/95 backdrop-blur-md rounded-xl border-l-4 border-l-tertiary border-y border-r border-outline-variant/30 shadow-xl overflow-hidden">
                  <div className="bg-tertiary/5 border-b border-outline-variant/30 p-3 flex items-center justify-between cursor-pointer" onClick={() => setAiExpanded((v) => !v)}>
                    <h3 className="font-caps-xs text-[10px] text-on-surface tracking-widest uppercase flex items-center gap-2 font-bold">
                      <span className="w-6 h-6 rounded-md bg-tertiary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px] text-tertiary">psychology</span>
                      </span>
                      AI Tactical Analysis
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                      </span>
                      <button type="button" className="text-on-surface-variant hover:text-on-surface transition-colors">
                        <span className={`material-symbols-outlined text-sm transition-transform ${aiExpanded ? '' : '-rotate-180'}`}>expand_less</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${aiExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden min-h-0">
                      <div className="p-3 space-y-3 max-h-[320px] overflow-y-auto">
                        {analyzing && (
                          <p className="text-[10px] text-secondary font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px]">progress_activity</span> Analyzing live…
                          </p>
                        )}
                        {!analyzing && analysis != null && (
                        <>
                        {reportTitle.trim() && (
                          <div className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-secondary mt-[1px]">summarize</span>
                            <div className="min-w-0">
                              <p className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">Report Summary</p>
                              <p className="text-[11px] font-semibold text-on-surface leading-tight truncate">{reportTitle}</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Auto-detected Category</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-label-md text-[14px] text-on-surface font-bold">
                              <span className="material-symbols-outlined text-[15px] text-secondary">{CATEGORY_ICONS[ai.category] ?? 'more_horiz'}</span>
                              {ai.category}
                            </span>
                            <span className="text-[11px] font-bold text-secondary">{ai.confidence}%</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full" style={{ width: `${ai.confidence}%` }}></div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant">
                          <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Response Priority</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-[2px] rounded text-[9px] font-bold tracking-wide border ${priorityTone}`}>{ai.priority}</span>
                            <span className={`text-[12px] font-bold leading-tight ${ai.priority === 'CRITICAL' ? 'text-error' : ai.priority === 'HIGH' ? 'text-secondary' : 'text-secondary'}`}>{ai.priority} Priority</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant">
                          <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Threat Level</p>
                          <div className="grid grid-cols-4 gap-1">
                            {THREAT_SEGMENTS.map((seg, i) => (
                              <div key={seg.label} className={`h-1.5 rounded-full ${i < threatActive ? seg.color : 'bg-outline-variant/30'}`}></div>
                            ))}
                          </div>
                          <div className="flex justify-between mt-1">
                            {THREAT_SEGMENTS.map((seg) => (
                              <span key={seg.label} className="text-[9px] font-bold text-on-surface-variant uppercase">{seg.label}</span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant">
                          <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Recommended Actions for You</p>
                          <ul className="space-y-1.5">
                            {(ai.user_actions?.length ? ai.user_actions : localFallback(ai.category).user_actions).map((action) => (
                              <li key={action} className="flex items-start gap-1.5 text-[11px] text-on-surface-variant leading-tight">
                                <span className="material-symbols-outlined text-[13px] text-success-green mt-[1px]">check_circle</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-outline-variant">
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
                            <span className="material-symbols-outlined text-[14px] text-secondary">route</span>
                            <span className="text-[10px] font-bold text-on-surface leading-tight">{ai.dispatch}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { forceAnalyzeRef.current = true; setAnalyzeTick((t) => t + 1); }} disabled={analyzing} className="flex-1 py-1.5 rounded-lg border border-secondary bg-secondary/10 text-secondary text-[11px] font-bold hover:bg-secondary/10 transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
                            <span className="material-symbols-outlined text-[13px]">refresh</span> {analyzing ? 'Analyzing…' : 'Re-analyze'}
                          </button>
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Tactical AI {ai.source === 'gemini' ? 'v5 (Gemini)' : 'v4.2 (Rules)'}</span>
                        </div>
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            <div className="flex flex-col gap-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">Step 2: Details &amp; Media</h2>
              <div className="space-y-3">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Primary Description <span className="text-error">*</span></label>
                  <textarea ref={descriptionTextareaRef} value={reportDescription} onChange={(e) => { setReportDescription(e.target.value); setMissingField((m) => (m === 'description' ? null : m)); }} className={`w-full min-h-[150px] bg-white border rounded-lg p-3 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary resize-none placeholder:text-xs placeholder:text-on-surface-variant placeholder:font-light placeholder:tracking-normal placeholder:italic transition-all ${missingField === 'description' ? 'border-error' : 'border-outline-variant'}`} placeholder="Provide a detailed account of the incident, including specific actions observed, individuals involved, and immediate risks..."></textarea>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Additional Context (Optional)</label>
                  <input value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} className="w-full bg-white border border-outline-variant rounded-lg py-3 px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary placeholder:text-xs placeholder:text-on-surface-variant placeholder:font-light placeholder:tracking-normal placeholder:italic transition-all" placeholder="e.g. Weather conditions, lighting, or nearby landmarks" type="text" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 pb-6">
              <div className="bg-surface-container-low rounded-xl border border-outline-variant p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">attachment</span>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface">Evidence Upload</h3>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(EVIDENCE_ACCEPT) as (keyof typeof EVIDENCE_ACCEPT)[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMediaType(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${mediaType === key ? 'border-2 border-secondary bg-secondary/10 text-secondary' : 'border border-outline-variant bg-surface-container-low hover:border-secondary text-on-surface-variant'}`}
                    >
                      <span className="material-symbols-outlined text-lg">{MEDIA_TYPES[key]}</span>
                      <span className="text-[10px] font-bold uppercase">{key === 'video' ? 'CCTV / Video' : key === 'photo' ? 'Photo / Image' : 'Audio'}</span>
                    </button>
                  ))}
                </div>
                <input ref={fileInputRef} className="hidden" multiple type="file" accept={EVIDENCE_ACCEPT[mediaType]} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                  className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-surface/50 hover:bg-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_upload</span>
                  <div className="text-center">
                    <p className="font-label-sm text-label-sm font-bold text-on-surface">Click to upload or drag and drop</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">PNG, JPG, MP4 or WAV (Max 50MB)</p>
                  </div>
                </div>
                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">{evidenceFiles.length} file(s) selected</p>
                    {evidenceFiles.map((f) => {
                      const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
                      return (
                        <div key={`${f.name}-${f.size}`} className="flex items-center gap-3 bg-surface border border-outline-variant/30 rounded-lg p-2 pr-3">
                          {previewUrl ? (
                            <img className="w-12 h-12 rounded object-cover border border-outline-variant/30" src={previewUrl} alt={f.name} />
                          ) : (
                            <div className="w-12 h-12 rounded bg-surface-container-low border border-outline-variant/30 flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl text-secondary">{f.type.startsWith('video') ? 'videocam' : 'mic'}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-on-surface truncate">{f.name}</p>
                            <p className="text-[10px] text-on-surface-variant font-bold uppercase">{formatBytes(f.size)}</p>
                          </div>
                          <button type="button" onClick={() => removeFile(f.name, f.size)} className="text-on-surface-variant hover:text-error transition-colors shrink-0">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 shadow-xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${ai.priority === 'CRITICAL' ? 'bg-error' : 'bg-secondary'}`}></div>
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error">smart_toy</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-1">AI Tactical Analysis Complete</div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{ai.priority} {ai.category} Detected</h3>
                    <div className="flex flex-wrap gap-3">
                      <span className={`px-2 py-1 rounded font-caps-xs text-caps-xs uppercase border ${priorityTone}`}>Priority: {ai.priority}</span>
                      <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded font-caps-xs text-caps-xs uppercase border border-outline-variant">Confidence: {ai.confidence}%</span>
                      <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded font-caps-xs text-caps-xs uppercase border border-outline-variant">Threat: {ai.threat}%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-outline-variant">
                  <div>
                    <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Auto-detected Category</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-label-md text-[14px] text-on-surface font-bold">
                        <span className="material-symbols-outlined text-[15px] text-secondary">{CATEGORY_ICONS[ai.category] ?? 'more_horiz'}</span>
                        {ai.category}
                      </span>
                      <span className="text-[11px] font-bold text-secondary">{ai.confidence}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${ai.confidence}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Threat Level</p>
                    <div className="grid grid-cols-4 gap-1">
                      {THREAT_SEGMENTS.map((seg, i) => (
                        <div key={seg.label} className={`h-1.5 rounded-full ${i < threatActive ? seg.color : 'bg-outline-variant/30'}`}></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {THREAT_SEGMENTS.map((seg) => (
                        <span key={seg.label} className="text-[9px] font-bold text-on-surface-variant uppercase">{seg.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-outline-variant">
                  <p className="font-label-sm text-[11px] text-on-surface-variant mb-1.5">Recommended Actions for You</p>
                  <ul className="space-y-1.5">
                    {(ai.user_actions?.length ? ai.user_actions : localFallback(ai.category).user_actions).map((action) => (
                      <li key={action} className="flex items-start gap-1.5 text-[11px] text-on-surface-variant leading-tight">
                        <span className="material-symbols-outlined text-[13px] text-success-green mt-[1px]">check_circle</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
                  <span className="material-symbols-outlined text-[14px] text-secondary">route</span>
                  <span className="text-[10px] font-bold text-on-surface leading-tight">{ai.dispatch}</span>
                </div>
              </div>
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 shadow-xl">
                <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 pb-1 border-b border-outline-variant">Incident Summary</div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-1">Category</div>
                    <div className="font-body-md text-on-surface font-medium">{effectiveCategory}</div>
                  </div>
                  <div>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-1">Status</div>
                    <div className="font-body-md text-on-surface font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                      {incidentStatus}
                    </div>
                  </div>
                  <div>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-1">Date &amp; Time</div>
                    <div className="font-body-md text-on-surface font-medium">{incidentTime ? new Date(incidentTime).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                  </div>
                  <div>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-1">Reporter</div>
                    <div className="font-body-md text-on-surface font-medium">Signed-in Resident</div>
                  </div>
                </div>
                <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 pb-1 border-b border-outline-variant">Location Details</div>
                <div className="mb-6">
                  <div className="h-48 rounded bg-surface-container-low mb-3 relative overflow-hidden border border-outline-variant/30">
                    <MapContainer center={location} zoom={15} className="w-full h-full" zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false}>
                      <MapSizeSync />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={location} icon={pinIcon} />
                    </MapContainer>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary">location_on</span>
                      <span className="font-label-sm text-label-sm text-on-surface">{address}</span>
                    </div>
                  </div>
                </div>
                <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 pb-1 border-b border-outline-variant">Detailed Description</div>
                <div className="mb-6">
                  <p className="font-body-md text-on-surface-variant bg-surface-container-low p-3 rounded border border-outline-variant/30">
                    {reportDescription.trim() || reportTitle.trim() || 'No detailed description provided.'}
                  </p>
                </div>
                {additionalContext.trim() && (
                  <>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 pb-1 border-b border-outline-variant">Additional Context</div>
                    <div className="mb-6">
                      <p className="font-body-md text-on-surface-variant bg-surface-container-low p-3 rounded border border-outline-variant/30">{additionalContext}</p>
                    </div>
                  </>
                )}
                <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 pb-1 border-b border-outline-variant">Attached Evidence</div>
                {evidenceFiles.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant bg-surface-container-low p-3 rounded border border-outline-variant/30">No evidence attached.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {evidenceFiles.map((f) => {
                      const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
                      return previewUrl ? (
                        <div key={`${f.name}-${f.size}`} className="w-24 h-24 rounded border border-outline-variant/30 relative overflow-hidden group">
                          <img className="w-full h-full object-cover" alt={f.name} src={previewUrl} />
                          <a href={previewUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-cc-bg/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-on-surface">visibility</span>
                          </a>
                        </div>
                      ) : (
                        <div key={`${f.name}-${f.size}`} className="w-32 rounded border border-outline-variant/30 bg-surface-container-low flex flex-col items-center justify-center gap-1 px-2 py-3 text-on-surface-variant">
                          <span className="material-symbols-outlined">{f.type.startsWith('video') ? 'videocam' : 'mic'}</span>
                          <span className="font-caps-xs text-caps-xs text-center break-all">{f.name}</span>
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase">{formatBytes(f.size)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-xl lg:sticky lg:top-24">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-1">Final Validation</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Please review all details carefully before submitting your report.</p>
                <div className="space-y-3 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input checked={confirm1} onChange={(e) => setConfirm1(e.target.checked)} className="mt-1 rounded text-secondary border-outline-variant focus:ring-secondary bg-white" type="checkbox" />
                    <span className="font-label-sm text-label-sm text-on-surface group-hover:text-secondary transition-colors flex items-center gap-2">
                      I confirm that the location and details provided are accurate to the best of my knowledge.
                      <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-error/10 text-error">Required</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input checked={confirm2} onChange={(e) => setConfirm2(e.target.checked)} className="mt-1 rounded text-secondary border-outline-variant focus:ring-secondary bg-white" type="checkbox" />
                    <span className="font-label-sm text-label-sm text-on-surface group-hover:text-secondary transition-colors flex items-center gap-2">
                      I understand this will trigger an official command center response.
                      <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-error/10 text-error">Required</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group mt-6 pt-3 border-t border-outline-variant/30">
                    <input checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 rounded text-secondary border-outline-variant focus:ring-secondary bg-white" type="checkbox" />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface group-hover:text-secondary transition-colors flex items-center gap-2">
                        Post Anonymously
                        <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-on-surface-variant/10 text-on-surface-variant">Optional</span>
                      </span>
                      <span className="font-caps-xs text-caps-xs text-on-surface-variant mt-1">Hide your identity from public records for this report.</span>
                    </div>
                  </label>
                  <p className="text-[10px] text-on-surface-variant pt-1">Check both Required boxes to enable Submit.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Overlay Success Notification */}
      {notice === 'draft-saved' && (
        <div className="fixed top-5 right-5 z-[150] w-[min(280px,calc(100vw-2rem))] sm:w-[min(360px,calc(100vw-2rem))] bg-secondary text-white rounded-lg shadow-2xl p-4 animate-toast-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0">check_circle</span>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-label-md font-bold mb-0.5">Success</p>
              <p className="text-caption text-white/90 break-words">Draft saved on this device.</p>
            </div>
            <button type="button" onClick={() => setNotice(null)} className="ml-auto shrink-0 text-white/70 hover:text-white transition-colors" aria-label="Close notification">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
      {/* Footer Actions */}
      <div className="bg-surface-container-low border-t border-outline-variant/30 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0">
        {step === 1 && (
          <>
            <button type="button" onClick={handleSaveDraft} className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-[13px] font-medium w-full sm:w-auto">Save Draft</button>
            <button type="button" onClick={() => goToStep(2)} className="px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md text-[13px] hover:shadow-lg transition-all shadow-md flex items-center justify-center gap-1.5 font-medium w-full sm:w-auto">Next Step <span className="material-symbols-outlined text-[16px]">arrow_forward</span></button>
          </>
        )}
        {step === 2 && (
          <>
            <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md flex items-center justify-center gap-1 w-full sm:w-auto">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back
            </button>
            <button type="button" onClick={handleSaveDraft} className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-[13px] font-medium w-full sm:w-auto">Save Draft</button>
            <button type="button" onClick={() => goToStep(3)} className="px-6 py-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md hover:shadow-lg transition-all shadow-md flex items-center justify-center gap-1 w-full sm:w-auto">Next: Final Review <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
          </>
        )}
        {step === 3 && (
          <>
            <button type="button" onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md flex items-center justify-center gap-1 w-full sm:w-auto">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button type="button" onClick={handleSaveDraft} className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-[13px] font-medium">Save Draft</button>
              <button type="button" onClick={handleSubmit} disabled={submitting || !confirm1 || !confirm2} className="px-6 py-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md hover:shadow-lg transition-all shadow-md flex items-center justify-center gap-1 flex-1 sm:flex-initial disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? 'Submitting…' : 'Submit Report'} <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </>
        )}
      </div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}





