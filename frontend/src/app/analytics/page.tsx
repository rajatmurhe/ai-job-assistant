'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

interface StageMetric {
  status: string;
  count: number;
  percentage: number;
}

interface RecentApp {
  id: string;
  job_title: string;
  company: string;
  status: string;
  created_at: string;
}

interface SkillGap {
  name: string;
  count: number;
}

interface AnalyticsSummary {
  total_applications: number;
  total_resumes: number;
  total_jobs: number;
  status_counts: Record<string, number>;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
  average_match_score: number;
  total_matches_run: number;
  high_matches_count: number;
  stage_breakdown: StageMetric[];
  recent_applications: RecentApp[];
  top_missing_skills: SkillGap[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  DRAFT:        { label: 'Draft',        color: 'text-zinc-400',    bg: 'bg-zinc-800/60',    dot: 'bg-zinc-500' },
  READY:        { label: 'Ready',        color: 'text-blue-300',    bg: 'bg-blue-950/60',    dot: 'bg-blue-400' },
  APPLIED:      { label: 'Applied',      color: 'text-violet-300',  bg: 'bg-violet-950/60',  dot: 'bg-violet-400' },
  IN_REVIEW:    { label: 'In Review',    color: 'text-amber-300',   bg: 'bg-amber-950/60',   dot: 'bg-amber-400' },
  INTERVIEWING: { label: 'Interviewing', color: 'text-emerald-300', bg: 'bg-emerald-950/60', dot: 'bg-emerald-400' },
  OFFER:        { label: 'Offer',        color: 'text-green-300',   bg: 'bg-green-950/60',   dot: 'bg-green-400' },
  REJECTED:     { label: 'Rejected',     color: 'text-red-400',     bg: 'bg-red-950/60',     dot: 'bg-red-400' },
  WITHDRAWN:    { label: 'Withdrawn',    color: 'text-zinc-500',    bg: 'bg-zinc-900',        dot: 'bg-zinc-600' },
};

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-zinc-800 flex flex-col gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-3xl font-display font-bold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.analytics.summary()
      .then((res) => setData(res as unknown as AnalyticsSummary))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load analytics.'));
  }, []);

  if (error) return (
    <div className="space-y-4 animate-fadeIn">
      <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
      <ErrorBanner message={error} />
    </div>
  );

  if (!data) return (
    <div className="space-y-4 animate-fadeIn">
      <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
      <LoadingSpinner label="Loading analytics..." />
    </div>
  );

  const maxStageCount = Math.max(...data.stage_breakdown.map((s) => s.count), 1);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Application Analytics
        </h1>
        <p className="text-sm text-zinc-400">
          Track your job search pipeline, conversion rates, and match performance at a glance.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Applications" value={data.total_applications} sub="total tracked" />
        <MetricCard label="Jobs Analyzed" value={data.total_jobs} sub="job postings" />
        <MetricCard label="Resumes" value={data.total_resumes} sub="uploaded" />
        <MetricCard
          label="Avg Match Score"
          value={data.total_matches_run > 0 ? `${data.average_match_score}%` : '—'}
          sub={data.total_matches_run > 0 ? `${data.total_matches_run} matches run` : 'no matches yet'}
          accent={
            data.average_match_score >= 75 ? 'text-emerald-300'
            : data.average_match_score >= 60 ? 'text-amber-300'
            : 'text-red-300'
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Funnel / Conversion Rates */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider">Application Funnel</h2>
            <span className="text-[11px] text-zinc-500 bg-zinc-800 rounded-lg px-2 py-1">Based on submitted apps</span>
          </div>
          <div className="space-y-4">
            <RateBar label="Response Rate" value={data.response_rate} color="bg-violet-500" />
            <RateBar label="Interview Rate" value={data.interview_rate} color="bg-emerald-500" />
            <RateBar label="Offer Rate" value={data.offer_rate} color="bg-green-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-xl font-bold text-violet-300">{data.response_rate}%</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Response</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-300">{data.interview_rate}%</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Interview</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-300">{data.offer_rate}%</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Offer</div>
            </div>
          </div>
        </div>

        {/* Match Quality */}
        <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
          <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider">Match Quality</h2>
          {data.total_matches_run === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm py-8">
              No match analyses run yet. Run a match from the Resume page.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-display font-bold text-white">{data.high_matches_count}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">High-match jobs (≥75%)</div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-300">{data.total_matches_run > 0 ? Math.round(data.high_matches_count / data.total_matches_run * 100) : 0}%</span>
                  </div>
                </div>
                <RateBar
                  label="High match ratio"
                  value={data.total_matches_run > 0 ? Math.round(data.high_matches_count / data.total_matches_run * 100) : 0}
                  color="bg-emerald-500"
                />
              </div>
              {data.top_missing_skills.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Top Skill Gaps</div>
                  <div className="flex flex-wrap gap-2">
                    {data.top_missing_skills.map((sk) => (
                      <span key={sk.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-900/60 text-red-300 text-xs">
                        {sk.name}
                        <span className="text-red-500/80 text-[10px]">×{sk.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pipeline Stage Breakdown */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-5">Pipeline Breakdown</h2>
        {data.total_applications === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">
            No applications tracked yet.{' '}
            <Link href="/applications" className="text-violet-400 hover:underline">Create your first application →</Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.stage_breakdown.filter(s => s.count > 0 || ['APPLIED','INTERVIEWING','OFFER'].includes(s.status)).map((stage) => {
              const cfg = STATUS_CONFIG[stage.status] || STATUS_CONFIG.DRAFT;
              const barWidth = maxStageCount > 0 ? (stage.count / maxStageCount) * 100 : 0;
              return (
                <div key={stage.status} className={`rounded-xl p-4 border border-zinc-800 ${cfg.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className={`text-2xl font-display font-bold ${cfg.color}`}>{stage.count}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800/60">
                    <div className={`h-full rounded-full ${cfg.dot} transition-all duration-700`} style={{ width: `${barWidth}%` }} />
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1">{stage.percentage}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Applications */}
      {data.recent_applications.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-zinc-800">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider">Recent Activity</h2>
            <Link href="/applications" className="text-xs text-zinc-400 hover:text-white transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {data.recent_applications.map((app) => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={app.id}
                  href={`/applications`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{app.job_title}</div>
                      <div className="text-xs text-zinc-500 truncate">{app.company}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color} border border-zinc-800`}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-zinc-600">{app.created_at}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
