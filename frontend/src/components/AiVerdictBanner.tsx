import Ph from './PhIcon';
import type { IncidentAssessment } from '../lib/ai';

type VerdictMeta = {
  label: string;
  icon: string;
  banner: string;
  text: string;
};

const VERDICT_META: Record<string, VerdictMeta> = {
  legitimate: {
    label: 'Genuine Report',
    icon: 'verified',
    banner: 'bg-success-green/10 border-success-green/30',
    text: 'text-success-green',
  },
  ambiguous: {
    label: 'Unclear Â· Needs Verification',
    icon: 'help',
    banner: 'bg-warning-amber/10 border-warning-amber/30',
    text: 'text-warning-amber',
  },
  spam_or_troll: {
    label: 'Possible Spam / Troll',
    icon: 'report',
    banner: 'bg-error-red/10 border-error-red/30',
    text: 'text-error-red',
  },
};

/**
 * Adaptive AI credibility banner. Shows the verdict and the specific findings
 * (flags) from the credibility check â€” for every report, not only flagged ones.
 *
 * `compact` renders a tight layout for map pin popups.
 */
export default function AiVerdictBanner({
  assessment,
  compact = false,
}: {
  assessment: IncidentAssessment;
  compact?: boolean;
}) {
  const meta = VERDICT_META[assessment.verdict] ?? VERDICT_META.ambiguous;
  const flags = (assessment.flags ?? []).filter(Boolean);

  if (compact) {
    // Map popups stay minimal: verdict warning only, no surrounding box.
    return (
      <p className={`text-[10px] font-bold uppercase leading-tight flex items-center gap-1 ${meta.text}`}>
        <Ph className="text-[11px]" name={meta.icon} />
        {meta.label}
      </p>
    );
  }

  return (
    <div className={`${meta.banner} border rounded-lg p-3 flex items-start gap-2`}>
      <Ph className={` ${meta.text} text-[18px] shrink-0`} name={meta.icon} />
      <div className={`text-sm ${meta.text} leading-snug min-w-0`}>
        <p className="font-semibold">{meta.label}</p>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {flags.map((f) => (
              <span key={f} className="text-[10px] bg-white/70 text-slate-600 rounded-full px-1.5 py-0.5">{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}