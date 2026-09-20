'use client';

import type { GapAnalysis } from '@/types/match';

const BUCKETS: { key: keyof GapAnalysis; label: string; dot: string; bg: string; text: string; border: string }[] = [
  { key: 'strong', label: 'Strong Direct Match', dot: 'bg-zinc-200', bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-600' },
  { key: 'partial', label: 'Partial / Related Match', dot: 'bg-zinc-400', bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-zinc-700' },
  { key: 'transferable', label: 'Transferable Competencies', dot: 'bg-zinc-500', bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-zinc-700' },
  { key: 'missing', label: 'Missing / Not Found', dot: 'bg-zinc-700', bg: 'bg-zinc-950', text: 'text-zinc-400', border: 'border-zinc-800' },
];

export function SkillGapChart({ gapAnalysis }: { gapAnalysis: GapAnalysis }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-white">
            Skill Gap & Competency Analysis
          </h3>
          <p className="text-xs text-zinc-400">
            Categorized by match confidence against required and preferred job posting qualifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUCKETS.map(({ key, label, dot, bg, text, border }) => {
          const skills = gapAnalysis[key] || [];
          return (
            <div key={key} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                    {skills.length}
                  </span>
                </div>

                {skills.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-1">No items in this category</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${bg} ${text} ${border}`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
