/**
 * MatchBreakdown.tsx
 * Monochrome ATS analysis section below the main score card.
 */
'use client';

import type { AtsAnalysis } from '@/types/match';

export function MatchBreakdown({ atsAnalysis }: { atsAnalysis: AtsAnalysis }) {
  const { ats_score, keyword_coverage_score, keywords_present, keywords_missing, formatting_issues } = atsAnalysis;

  return (
    <div className="space-y-5">
      {/* ATS Scores */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-white">
            ATS Compatibility Metrics
          </h3>
          <p className="text-xs text-zinc-400">
            Automated applicant tracking system parsing and keyword density benchmarks.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <ScoreMeter label="ATS Parser Readability Score" value={ats_score} />
          <ScoreMeter label="Target Keyword Coverage" value={keyword_coverage_score} />
        </div>
      </div>

      {/* Keywords */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-white">
            ATS Keyword Breakdown
          </h3>
          <p className="text-xs text-zinc-400">
            Keywords extracted from the job posting evaluated against your resume text.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  Detected in Resume ({keywords_present.length})
                </span>
              </div>
            </div>
            {keywords_present.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No matching keywords found</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {keywords_present.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-zinc-800 text-zinc-100 border border-zinc-600 rounded-lg px-2.5 py-1 font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Missing from Resume ({keywords_missing.length})
                </span>
              </div>
            </div>
            {keywords_missing.length === 0 ? (
              <p className="text-xs text-zinc-300 font-medium">All target keywords present</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {keywords_missing.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-lg px-2.5 py-1 font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formatting issues */}
      {formatting_issues.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-800 bg-zinc-900/40 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-zinc-200">
              Formatting & Parsing Warnings ({formatting_issues.length})
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            These structural elements might hinder automated ATS parsers from extracting your sections cleanly.
          </p>
          <ul className="space-y-1.5 pt-1">
            {formatting_issues.map((issue, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                <span className="font-mono text-zinc-500 font-bold">-</span>
                <span className="font-mono">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400">{label}</span>
        <span className="text-sm font-mono font-bold text-zinc-100">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-300 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
