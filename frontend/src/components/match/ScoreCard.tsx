'use client';

import type { Recommendation, SubScores } from '@/types/match';

const RECOMMENDATION_COPY: Record<Recommendation, { label: string; badgeClass: string }> = {
  STRONGLY_APPLY: { label: 'Strong Fit — High Priority Application', badgeClass: 'bg-white text-black border-white' },
  APPLY: { label: 'Good Fit — Recommended to Apply', badgeClass: 'bg-zinc-800 text-zinc-100 border-zinc-600' },
  APPLY_WITH_CAUTION: { label: 'Moderate Fit — Address Missing Qualifications', badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
  IMPROVE_FIRST: { label: 'Gap Identified — Tailor Experience First', badgeClass: 'bg-zinc-900 text-zinc-300 border-zinc-700' },
  DO_NOT_APPLY: { label: 'Low Compatibility — Missing Core Requirements', badgeClass: 'bg-zinc-950 text-zinc-400 border-zinc-800' },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0 -rotate-90">
        <circle cx="75" cy="75" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="#fafafa"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-3xl font-black text-white block">
          {Math.round(score)}
        </span>
        <span className="text-[11px] font-mono text-zinc-500 uppercase">/ 100 Match</span>
      </div>
    </div>
  );
}

export function ScoreCard({
  overallScore,
  recommendation,
  subScores,
}: {
  overallScore: number;
  recommendation: Recommendation;
  subScores: SubScores;
}) {
  const rec = RECOMMENDATION_COPY[recommendation] || RECOMMENDATION_COPY.APPLY;
  const rows: [string, number][] = [
    ['Required Skills (30%)', subScores.required_skills],
    ['Preferred Skills (15%)', subScores.preferred_skills],
    ['Experience Depth (15%)', subScores.experience],
    ['Education Level (10%)', subScores.education],
    ['Project Relevance (10%)', subScores.projects],
    ['Semantic Fit (10%)', subScores.semantic],
    ['ATS Keywords (10%)', subScores.ats_keywords],
  ];

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        <ScoreRing score={overallScore} />
        <div className="flex-1 w-full text-center sm:text-left">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${rec.badgeClass} mb-2`}>
            {rec.label}
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-1">
            Deterministic Match Assessment
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Strict weighted calculation across 7 dimensions. Mathematical certainty with zero LLM score drift.
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
          7-Dimension Score Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
          {rows.map(([label, value]) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">{label}</span>
                <span className="font-mono font-bold text-zinc-200">{Math.round(value)}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-300"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%`, transition: 'width 0.8s ease-out' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
