'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface LinkedInData {
  headline: string;
  about: string;
  experience_bullets: string[];
  skills_to_add: string[];
  open_to_work_tagline: string;
  connection_note_template: string;
  tips: string[];
  job_title?: string;
  company?: string;
}

export default function LinkedInOptimizerPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [data, setData] = useState<LinkedInData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.resume.list(), api.jobs.list()]).then(([r, j]) => {
      if (r.status === 'fulfilled') setResumes(r.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setFetchingData(false);
    });
  }, []);

  const handleOptimize = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a job.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.linkedin.optimize(selectedResumeId, selectedJobId) as unknown as LinkedInData;
      setData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate LinkedIn optimization.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
            in
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              LinkedIn Profile Optimizer
            </h1>
            <p className="text-sm text-zinc-400">
              Align your LinkedIn headline, about section, and keywords with target roles to rank higher in recruiter searches.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Selectors */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Target Role & Resume Selection
        </h2>
        {fetchingData ? (
          <div className="flex items-center gap-3 py-4 text-zinc-500 text-sm">
            <LoadingSpinner size="sm" /> Loading resumes and jobs...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose Resume --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.file_name} ({new Date(r.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Job</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
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
          onClick={handleOptimize}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Optimizing Profile with AI...' : 'Optimize LinkedIn Profile'}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Target Role Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-sm">
            <span className="text-zinc-300">
              Tailored for <strong className="text-white">{data.job_title}</strong> at <strong className="text-white">{data.company}</strong>
            </span>
            <span className="text-xs text-blue-400 font-medium">Recruiter SEO Ready</span>
          </div>

          {/* Headline Card */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Targeted Headline</h3>
                <p className="text-xs text-zinc-400">High-converting headline with your core stack and value pitch.</p>
              </div>
              <button
                onClick={() => copy(data.headline, 'headline')}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                {copiedKey === 'headline' ? '✓ Copied' : 'Copy Headline'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 font-medium text-sm leading-relaxed">
              {data.headline}
            </div>
            <div className="flex justify-end text-[11px] text-zinc-500">
              {data.headline.length} / 220 characters
            </div>
          </div>

          {/* About Section Card */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Optimized "About" Summary</h3>
                <p className="text-xs text-zinc-400">Captures attention in the first 3 lines before the "see more" cutoff.</p>
              </div>
              <button
                onClick={() => copy(data.about, 'about')}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                {copiedKey === 'about' ? '✓ Copied' : 'Copy About'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-sm whitespace-pre-line leading-relaxed font-sans">
              {data.about}
            </div>
          </div>

          {/* Open to Work & Connection Request Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Open to Work Pitch */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">"Open to Work" Tagline</h3>
                <button
                  onClick={() => copy(data.open_to_work_tagline, 'open_to_work')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  {copiedKey === 'open_to_work' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
                {data.open_to_work_tagline || 'Open to high-impact opportunities in this space.'}
              </div>
            </div>

            {/* Recruiter DM / Connection Note */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Connection Note (&lt;300 chars)</h3>
                <button
                  onClick={() => copy(data.connection_note_template, 'note')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  {copiedKey === 'note' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
                {data.connection_note_template}
              </div>
              <div className="flex justify-end text-[11px] text-zinc-500">
                {data.connection_note_template?.length || 0} / 300 characters
              </div>
            </div>
          </div>

          {/* Experience Bullets & Recommended Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experience Bullets */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">Tailored Experience Bullets</h3>
              <p className="text-xs text-zinc-400">Add these impactful statements to your latest experience entries.</p>
              <ul className="space-y-2.5">
                {data.experience_bullets.map((bullet, idx) => (
                  <li key={idx} className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-300 flex items-start justify-between gap-2">
                    <span>{bullet}</span>
                    <button
                      onClick={() => copy(bullet, `b-${idx}`)}
                      className="shrink-0 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800"
                    >
                      {copiedKey === `b-${idx}` ? '✓' : 'Copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills & SEO Tips */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
                <h3 className="text-sm font-semibold text-white">High-Demand Skills to Add</h3>
                <p className="text-xs text-zinc-400">Include these in your Top Skills section for recruiter searches.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.skills_to_add.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800"
                    >
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
                <h3 className="text-sm font-semibold text-white">Algorithm & Visibility Tips</h3>
                <ul className="space-y-2 text-xs text-zinc-400">
                  {data.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
