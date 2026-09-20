'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface SalaryData {
  role_title: string;
  location: string;
  salary_range: {
    low: number;
    mid: number;
    high: number;
    currency: string;
    period: string;
  };
  candidate_target: number;
  experience_level: string;
  market_notes: string;
  negotiation_leverage: string[];
  negotiation_script: {
    initial_ask: string;
    counter_offer: string;
    closing: string;
  };
  negotiation_tips: string[];
  red_flags_to_watch: string[];
  total_comp_checklist: string[];
  company?: string;
}

export default function SalaryInsightsPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [data, setData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<'initial_ask' | 'counter_offer' | 'closing'>('initial_ask');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.resume.list(), api.jobs.list()]).then(([r, j]) => {
      if (r.status === 'fulfilled') setResumes(r.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setFetchingData(false);
    });
  }, []);

  const handleBenchmark = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a job.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.salary.benchmark(selectedJobId, selectedResumeId) as unknown as SalaryData;
      setData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to retrieve salary benchmark.';
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

  const formatCurrency = (val: number, cur: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `${cur} ${val.toLocaleString()}`;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
            $
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Salary Benchmarking & Negotiation Coach
            </h1>
            <p className="text-sm text-zinc-400">
              Get objective compensation ranges, identify your leverage points, and access battle-tested negotiation scripts.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Selectors */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Target Role & Resume Context
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
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
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
          onClick={handleBenchmark}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Analyzing Market Compensation...' : 'Calculate Salary Benchmarks'}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Compensation Dashboard */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {data.experience_level} Level • {data.location}
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-0.5">
                  {data.role_title} at {data.company || 'Company'}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400">Recommended Target Ask</div>
                <div className="text-2xl font-bold font-display text-emerald-400">
                  {formatCurrency(data.candidate_target, data.salary_range.currency)}
                </div>
              </div>
            </div>

            {/* Visual Range Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Low: {formatCurrency(data.salary_range.low, data.salary_range.currency)}</span>
                <span className="font-semibold text-zinc-200">
                  Median: {formatCurrency(data.salary_range.mid, data.salary_range.currency)}
                </span>
                <span>High: {formatCurrency(data.salary_range.high, data.salary_range.currency)}</span>
              </div>
              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-[15%] right-[15%] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 rounded-full" />
              </div>
              <div className="text-[11px] text-zinc-500 text-center">
                Estimated base salary range per year. Actual total compensation may include bonus and equity.
              </div>
            </div>

            {data.market_notes && (
              <p className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                {data.market_notes}
              </p>
            )}
          </div>

          {/* Leverage & Negotiation Scripts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Negotiation Leverage */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>⚡</span> Your Key Negotiation Leverage
              </h3>
              <p className="text-xs text-zinc-400">
                Concrete value points from your background to justify your target ask.
              </p>
              <ul className="space-y-2.5">
                {data.negotiation_leverage.map((lev, idx) => (
                  <li key={idx} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{lev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Total Comp Checklist */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🎁</span> Total Comp & Benefits Checklist
              </h3>
              <p className="text-xs text-zinc-400">Items to negotiate beyond base salary.</p>
              <div className="flex flex-wrap gap-2">
                {data.total_comp_checklist.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl text-xs bg-zinc-900 border border-zinc-700 text-zinc-200"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Word-for-Word Scripts */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Word-for-Word Negotiation Scripts</h3>
                <p className="text-xs text-zinc-400">Professional phrasing for each phase of the conversation.</p>
              </div>
              <button
                onClick={() => copy(data.negotiation_script[activeScriptTab], activeScriptTab)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                {copiedKey === activeScriptTab ? '✓ Copied' : 'Copy Script'}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 gap-2">
              <button
                onClick={() => setActiveScriptTab('initial_ask')}
                className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
                  activeScriptTab === 'initial_ask'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1. Initial Ask
              </button>
              <button
                onClick={() => setActiveScriptTab('counter_offer')}
                className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
                  activeScriptTab === 'counter_offer'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                2. Counter Offer
              </button>
              <button
                onClick={() => setActiveScriptTab('closing')}
                className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
                  activeScriptTab === 'closing'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                3. Closing Agreement
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
              {data.negotiation_script[activeScriptTab]}
            </div>
          </div>

          {/* Tips & Red Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Tactical Tips</h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {data.negotiation_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">✔</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400">Red Flags to Watch</h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {data.red_flags_to_watch.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400">⚠️</span>
                    <span>{flag}</span>
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
