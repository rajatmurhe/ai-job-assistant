'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface FollowupEmail {
  type: string;
  subject: string;
  body: string;
  best_time: string;
  tone: string;
}

interface FollowupData {
  situation_assessment: string;
  recommended_action: string;
  emails: FollowupEmail[];
  linkedin_dm: string;
  do_not_do: string[];
  timing_advice: string;
  job_title?: string;
  company?: string;
  current_status?: string;
  days_since_applied?: number;
}

export default function FollowupPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [manualJobId, setManualJobId] = useState('');
  const [manualStatus, setManualStatus] = useState('APPLIED');
  const [daysSince, setDaysSince] = useState(7);
  const [data, setData] = useState<FollowupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.applications.list(), api.jobs.list()]).then(([a, j]) => {
      if (a.status === 'fulfilled') setApplications(a.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setFetchingData(false);
    });
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      if (selectedAppId) {
        const res = await api.followup.generate(selectedAppId) as unknown as FollowupData;
        setData(res);
      } else if (manualJobId) {
        // Direct call
        const res = await fetch('/api/v1/followup/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: manualJobId,
            status: manualStatus,
            days_since_applied: daysSince,
          }),
        });
        if (!res.ok) throw new Error('Failed to generate follow-up templates');
        const json = await res.json();
        setData(json);
      } else {
        setError('Please select an application or target job.');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate follow-up communications.';
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
          <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-lg">
            📅
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Application Follow-Up Specialist
            </h1>
            <p className="text-sm text-zinc-400">
              Never miss a follow-up window. Get timing advice, polite check-in emails, and post-interview thank-you notes.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Selectors */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Select Application or Role
        </h2>
        {fetchingData ? (
          <div className="flex items-center gap-3 py-4 text-zinc-500 text-sm">
            <LoadingSpinner size="sm" /> Loading applications...
          </div>
        ) : (
          <div className="space-y-4">
            {applications.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Tracked Application (Recommended)
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => {
                    setSelectedAppId(e.target.value);
                    if (e.target.value) setManualJobId('');
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose from your tracked applications --</option>
                  {applications.map((app) => {
                    const job = jobs.find((j) => j.id === app.job_id);
                    return (
                      <option key={app.id} value={app.id}>
                        {app.job_title || job?.title || 'Target Role'} at {app.company || job?.company || 'Company'} (Status: {app.status})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {!selectedAppId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Job</label>
                  <select
                    value={manualJobId}
                    onChange={(e) => setManualJobId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Choose Job --</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} at {j.company || 'Company'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current Stage</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="APPLIED">Applied (No reply yet)</option>
                    <option value="IN_REVIEW">Under Review</option>
                    <option value="INTERVIEWING">After Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Days Elapsed</label>
                  <select
                    value={daysSince}
                    onChange={(e) => setDaysSince(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value={1}>1 day ago (e.g. for Thank You note)</option>
                    <option value={3}>3 days ago</option>
                    <option value={7}>7 days ago (1 week)</option>
                    <option value={14}>14 days ago (2 weeks)</option>
                    <option value={21}>21 days ago (3 weeks)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || (!selectedAppId && !manualJobId)}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-teal-600 hover:bg-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Analyzing Stage & Generating Follow-ups...' : 'Generate Follow-Up Templates'}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Situation & Advice Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs text-teal-200 space-y-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-teal-400">Situation Assessment</span>
              <p className="text-zinc-200">{data.situation_assessment}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400">Recommended Channel</span>
              <p className="text-white font-medium text-sm">{data.recommended_action}</p>
              <p className="text-zinc-400 text-[11px]">{data.timing_advice}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400">Application Info</span>
              <p className="text-zinc-200">{data.job_title} at {data.company}</p>
              <p className="text-zinc-500 text-[11px]">Stage: {data.current_status} • {data.days_since_applied} days ago</p>
            </div>
          </div>

          {/* Follow-up Emails */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Follow-Up Email Templates</h3>
            <div className="space-y-4">
              {data.emails.map((em, idx) => (
                <div key={idx} className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-800">
                        {em.type}
                      </span>
                      <span className="text-xs text-zinc-400">Tone: {em.tone}</span>
                    </div>
                    <button
                      onClick={() => copy(em.body, `em-${idx}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                    >
                      {copiedKey === `em-${idx}` ? '✓ Copied' : 'Copy Email Body'}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                    <strong className="text-zinc-400">Subject:</strong> {em.subject}
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-sans">
                    {em.body}
                  </div>

                  <div className="flex justify-end text-[11px] text-zinc-500">
                    Optimal time: {em.best_time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LinkedIn DM & Do Not Do */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">LinkedIn Check-in DM</h4>
                <button
                  onClick={() => copy(data.linkedin_dm, 'dm')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  {copiedKey === 'dm' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                {data.linkedin_dm || 'Quick polite LinkedIn check-in message.'}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h4 className="text-sm font-semibold text-rose-400">Follow-Up Pitfalls to Avoid</h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {data.do_not_do.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400">✗</span>
                    <span>{mistake}</span>
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
