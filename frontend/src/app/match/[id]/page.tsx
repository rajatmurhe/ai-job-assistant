'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { MatchReport } from '@/types/match';
import { ScoreCard } from '@/components/match/ScoreCard';
import { SkillGapChart } from '@/components/match/SkillGapChart';
import { MatchBreakdown } from '@/components/match/MatchBreakdown';
import { MissingRequirementsCard } from '@/components/match/MissingRequirementsCard';
import { MasterPromptGenerator } from '@/components/match/MasterPromptGenerator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<(MatchReport & { report_markdown: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);

  useEffect(() => {
    api.reports
      .get(params.id)
      .then(setReport)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this match report.'));
  }, [params.id]);

  async function handleNarrate() {
    setNarrating(true);
    try {
      const result = await api.reports.narrate(params.id);
      setReport((prev) => (prev ? { ...prev, report_markdown: result.report_markdown } : prev));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the narrative report.');
    } finally {
      setNarrating(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!report) return <LoadingSpinner label="Compiling deterministic match report..." />;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            Match Intelligence Report
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
            Job Match Analysis
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Report ID: {report.id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Link
            href={`/match/${report.id}/roadmap`}
            className="inline-flex items-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 text-sm font-semibold rounded-xl px-4 py-2.5 transition-all"
          >
            <span>🗺️ Learning Roadmap</span>
          </Link>
          <Link
            href={`/generate/${report.resume_id}?jobId=${report.job_id}`}
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl px-4 py-2.5 transition-all"
          >
            <span>Generate Docs →</span>
          </Link>
        </div>
      </div>

      {/* 1. Score Overview & Subscores */}
      <ScoreCard
        overallScore={report.overall_score}
        recommendation={report.recommendation}
        subScores={report.sub_scores}
      />

      {/* 2. Skill Gap Breakdown */}
      <SkillGapChart gapAnalysis={report.gap_analysis} />

      {/* 3. ATS Compatibility & Keyword Coverage */}
      <MatchBreakdown atsAnalysis={report.ats_analysis} />

      {/* 4. Missing Requirements & Remediation Advisor */}
      <MissingRequirementsCard
        gapAnalysis={report.gap_analysis}
        atsAnalysis={report.ats_analysis}
      />

      {/* 5. Master Prompt Generator */}
      <MasterPromptGenerator
        reportId={report.id}
        gapAnalysis={report.gap_analysis}
        atsAnalysis={report.ats_analysis}
        subScores={report.sub_scores}
        overallScore={report.overall_score}
      />

      {/* 6. Full Narrative AI Assessment */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              AI Narrative Briefing
            </h3>
            <p className="text-xs text-zinc-400">
              Executive summary of candidate strengths, missing requirements, and recommended interview strategy.
            </p>
          </div>
          <button
            onClick={handleNarrate}
            disabled={narrating}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-all disabled:opacity-40"
          >
            {narrating ? (
              <>
                <span className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                <span>Writing narrative...</span>
              </>
            ) : (
              <span>{report.report_markdown ? 'Regenerate Narrative' : 'Generate Narrative Summary'}</span>
            )}
          </button>
        </div>

        {report.report_markdown ? (
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-sm text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">
            {report.report_markdown}
          </div>
        ) : (
          <div className="p-6 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
            Click &quot;Generate Narrative Summary&quot; to synthesize an in-depth candidate briefing report.
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        <Link href="/jobs" className="text-xs text-zinc-400 hover:text-white font-medium">
          ← Back to Job Postings
        </Link>
        <Link
          href={`/generate/${report.resume_id}?jobId=${report.job_id}`}
          className="text-xs text-zinc-200 font-semibold hover:underline"
        >
          Proceed to Document Generation →
        </Link>
      </div>
    </div>
  );
}
