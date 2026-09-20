/**
 * JDDetail.tsx
 * Displays analyzed job description data in a structured monochrome layout.
 */
'use client';

import type { Job } from '@/types/job';

const IMPORTANCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  MANDATORY: { bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-600' },
  PREFERRED: { bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-zinc-700' },
  NICE_TO_HAVE: { bg: 'bg-zinc-950', text: 'text-zinc-500', border: 'border-zinc-800' },
};

export function JDDetail({ job }: { job: Job }) {
  const jd = job.parsed_data || {};
  const skills = jd.skills || [];
  const mandatory = skills.filter((s: { importance: string }) => s.importance === 'MANDATORY');
  const preferred = skills.filter((s: { importance: string }) => s.importance === 'PREFERRED');
  const niceToHave = skills.filter((s: { importance: string }) => s.importance === 'NICE_TO_HAVE');
  const atsKeywords = jd.ats_keywords || [];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">{jd.title || job.title}</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            {jd.company || job.company} {jd.location ? `• ${jd.location}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {jd.work_arrangement && <Chip label="Arrangement">{jd.work_arrangement}</Chip>}
          {jd.seniority && <Chip label="Seniority">{jd.seniority}</Chip>}
          {jd.salary_min && jd.salary_max && (
            <Chip label="Compensation">
              {jd.salary_currency ?? '$'}{jd.salary_min.toLocaleString()} – {jd.salary_currency ?? '$'}{jd.salary_max.toLocaleString()}
            </Chip>
          )}
        </div>

        {jd.summary && (
          <div className="pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{jd.summary}</p>
          </div>
        )}
      </div>

      {/* Skills Matrix */}
      {skills.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
          <h3 className="font-display font-bold text-base text-white">Required & Preferred Skills</h3>
          <div className="space-y-4">
            {mandatory.length > 0 && (
              <SkillGroup label="Mandatory Core Skills" skills={mandatory} styleKey="MANDATORY" count={mandatory.length} />
            )}
            {preferred.length > 0 && (
              <SkillGroup label="Preferred Qualifications" skills={preferred} styleKey="PREFERRED" count={preferred.length} />
            )}
            {niceToHave.length > 0 && (
              <SkillGroup label="Nice to Have" skills={niceToHave} styleKey="NICE_TO_HAVE" count={niceToHave.length} />
            )}
          </div>
        </div>
      )}

      {/* ATS Keywords */}
      {atsKeywords.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white">Target ATS Keywords</h3>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
              {atsKeywords.length} keywords
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {atsKeywords.map((kw: string) => (
              <span
                key={kw}
                className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-lg px-2.5 py-1 font-mono"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillGroup({
  label,
  skills,
  styleKey,
  count,
}: {
  label: string;
  skills: { name: string; years_required?: number | null }[];
  styleKey: string;
  count: number;
}) {
  const style = IMPORTANCE_STYLES[styleKey] || IMPORTANCE_STYLES.NICE_TO_HAVE;
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-zinc-500">{count} skills</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <span
            key={s.name}
            className={`text-xs border rounded-lg px-2.5 py-1 font-medium ${style.bg} ${style.text} ${style.border}`}
          >
            {s.name}
            {s.years_required && <span className="ml-1 opacity-70 font-mono text-[10px]">({s.years_required}y+)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 font-medium">
      {label && <span className="text-zinc-500 text-[10px] uppercase font-mono">{label}:</span>}
      <span>{children}</span>
    </span>
  );
}
