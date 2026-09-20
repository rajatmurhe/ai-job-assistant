'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface OutreachData {
  subject_lines: string[];
  email_body: string;
  linkedin_dm: string;
  follow_up_email: string;
  personalization_hooks: string[];
  best_send_times: string;
  tips: string[];
  job_title?: string;
  company?: string;
}

export default function ColdOutreachPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [data, setData] = useState<OutreachData | null>(null);
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

  const handleGenerate = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a job.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.outreach.generateEmail(selectedResumeId, selectedJobId, recruiterName) as unknown as OutreachData;
      setData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate outreach templates.';
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
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-lg">
            ✉️
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Recruiter Outreach & Cold Email Generator
            </h1>
            <p className="text-sm text-zinc-400">
              Generate hyper-personalized emails and LinkedIn DMs that stand out to hiring managers and recruiters.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Inputs */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Target & Personalization Settings
        </h2>
        {fetchingData ? (
          <div className="flex items-center gap-3 py-4 text-zinc-500 text-sm">
            <LoadingSpinner size="sm" /> Loading data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
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
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Choose Target Job --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} at {j.company || 'Company'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recruiter Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor or Hiring Manager"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-purple-600 hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Crafting Outreach Sequences...' : 'Generate Cold Outreach'}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Timing & Personalization Callout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-center gap-3">
              <span className="text-xl">⏰</span>
              <div>
                <strong className="block text-white font-medium">Optimal Send Time:</strong>
                {data.best_send_times}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <strong className="block text-white font-medium">Target Context:</strong>
                {data.job_title} at {data.company}
              </div>
            </div>
          </div>

          {/* Subject Lines */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-semibold text-white">Subject Line Options</h3>
            <p className="text-xs text-zinc-400">Tested subject formulas to maximize recruiter open rates.</p>
            <div className="space-y-2">
              {data.subject_lines.map((subj, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
                  <span className="font-medium">Option {idx + 1}: &ldquo;{subj}&rdquo;</span>
                  <button
                    onClick={() => copy(subj, `subj-${idx}`)}
                    className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    {copiedKey === `subj-${idx}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Email Body */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Cold Email Body</h3>
                <p className="text-xs text-zinc-400">Concise, personalized, and ends with a low-friction call-to-action.</p>
              </div>
              <button
                onClick={() => copy(data.email_body, 'body')}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                {copiedKey === 'body' ? '✓ Copied' : 'Copy Email'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
              {data.email_body}
            </div>
          </div>

          {/* LinkedIn DM & Follow-Up */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LinkedIn DM */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">LinkedIn InMail / DM</h3>
                  <p className="text-[11px] text-zinc-400">Compact pitch under 300 characters.</p>
                </div>
                <button
                  onClick={() => copy(data.linkedin_dm, 'dm')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  {copiedKey === 'dm' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                {data.linkedin_dm}
              </div>
              <div className="text-right text-[11px] text-zinc-500">
                {data.linkedin_dm?.length || 0} / 300 characters
              </div>
            </div>

            {/* Follow-Up Email */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">1-Week Follow-Up Email</h3>
                  <p className="text-[11px] text-zinc-400">Polite reminder if no response after 5-7 business days.</p>
                </div>
                <button
                  onClick={() => copy(data.follow_up_email, 'followup')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  {copiedKey === 'followup' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                {data.follow_up_email}
              </div>
            </div>
          </div>

          {/* Hooks & Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400">Personalization Hooks</h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {data.personalization_hooks.map((hook, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-400">✦</span>
                    <span>{hook}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recruiter Insights</h4>
              <ul className="space-y-2 text-xs text-zinc-300">
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
      )}
    </div>
  );
}
