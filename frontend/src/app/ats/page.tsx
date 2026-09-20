'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface ATSPreviewData {
  resume_id: string;
  job_id: string;
  job_title: string;
  company: string;
  ats_score: number;
  keyword_coverage_percent: number;
  found_skills: string[];
  missing_skills: string[];
  detected_headings: string[];
  missing_headings: string[];
  action_verbs_detected: string[];
  metrics_detected_count: number;
  formatting_score: number;
  recommendations: string[];
}

export default function ATSPreviewPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [data, setData] = useState<ATSPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.resume.list(), api.jobs.list()]).then(([r, j]) => {
      if (r.status === 'fulfilled') setResumes(r.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setFetchingData(false);
    });
  }, []);

  const handleRunPreview = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a job.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.ats.preview(selectedResumeId, selectedJobId) as unknown as ATSPreviewData;
      setData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate ATS score preview.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', badge: 'Excellent' };
    if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', badge: 'Moderate Risk' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', badge: 'High Filter Risk' };
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-lg">
            🛡️
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Real-Time ATS Score Preview
            </h1>
            <p className="text-sm text-zinc-400">
              Audit your resume against Applicant Tracking Systems (ATS) algorithms before submitting.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Selectors */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Select Resume & Target Job to Audit
        </h2>
        {fetchingData ? (
          <div className="flex items-center gap-3 py-4 text-zinc-500 text-sm">
            <LoadingSpinner size="sm" /> Loading data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose Resume --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.file_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Job</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose Target Job --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} at {j.company || 'Company'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={handleRunPreview}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-cyan-600 hover:bg-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Simulating ATS Parse & Keyword Filter...' : 'Run ATS Audit'}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Score Hero */}
          {(() => {
            const sc = getScoreColor(data.ats_score);
            return (
              <div className={`glass-card rounded-3xl p-8 border ${sc.border} bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 flex flex-col md:flex-row items-center justify-between gap-6`}>
                <div className="space-y-2 text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
                      {sc.badge}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Evaluated against {data.job_title} at {data.company}
                    </span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white">
                    Overall ATS Compatibility Rating
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-xl">
                    Applicant Tracking Systems look for direct keyword alignment, clean parseable headings, active power verbs, and quantifiable impact metrics.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className={`w-32 h-32 rounded-full border-4 ${sc.border} flex flex-col items-center justify-center ${sc.bg}`}>
                    <span className={`text-4xl font-display font-extrabold ${sc.text}`}>
                      {Math.round(data.ats_score)}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">/ 100</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4 Pillars Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold uppercase text-zinc-500">Keyword Match Rate</div>
              <div className="text-2xl font-bold font-display text-white">
                {Math.round(data.keyword_coverage_percent)}%
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, data.keyword_coverage_percent)}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">{data.found_skills.length} matched / {data.found_skills.length + data.missing_skills.length} target</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold uppercase text-zinc-500">Section Headings</div>
              <div className="text-2xl font-bold font-display text-emerald-400">
                {data.detected_headings.length} / 4
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(data.detected_headings.length / 4) * 100}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Standard parseable layout</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold uppercase text-zinc-500">Action Verbs Found</div>
              <div className="text-2xl font-bold font-display text-purple-400">
                {data.action_verbs_detected.length}
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, data.action_verbs_detected.length * 15)}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Strong descriptive power</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold uppercase text-zinc-500">Measurable Metrics</div>
              <div className="text-2xl font-bold font-display text-teal-400">
                {data.metrics_detected_count}
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min(100, data.metrics_detected_count * 12)}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400">Numbers & percentages detected</p>
            </div>
          </div>

          {/* Action Items to Boost Score */}
          {data.recommendations.length > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>⚡</span> Recommendations to Boost Your ATS Score
              </h3>
              <ul className="space-y-2.5">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-start gap-2.5">
                    <span className="text-cyan-400 font-bold shrink-0">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords Match List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <span>✓</span> Detected Keywords ({data.found_skills.length})
              </h3>
              <p className="text-xs text-zinc-400">Present in your resume and recognized by the ATS parser.</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.found_skills.length > 0 ? (
                  data.found_skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-md text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No exact skills detected.</span>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                <span>✗</span> Missing Target Keywords ({data.missing_skills.length})
              </h3>
              <p className="text-xs text-zinc-400">Critical terms mentioned in the job post but missing from your resume.</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.missing_skills.length > 0 ? (
                  data.missing_skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-md text-xs bg-rose-950/60 text-rose-300 border border-rose-800">
                      + {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-400">All key requirements present!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
