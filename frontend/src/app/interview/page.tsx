'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

import type { InterviewQuestion, InterviewGuide } from '@/types/interview';

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Technical:  { color: 'text-blue-300',  bg: 'bg-blue-950/60',  border: 'border-blue-800',  icon: '⚙️' },
  Behavioral: { color: 'text-violet-300',bg: 'bg-violet-950/60',border: 'border-violet-800',icon: '🧠' },
  Experience: { color: 'text-emerald-300',bg: 'bg-emerald-950/60',border: 'border-emerald-800',icon: '💼' },
  Culture:    { color: 'text-amber-300',  bg: 'bg-amber-950/60', border: 'border-amber-800',  icon: '🤝' },
  General:    { color: 'text-zinc-300',   bg: 'bg-zinc-900',     border: 'border-zinc-700',   icon: '❓' },
};

const DIFFICULTY_CONFIG: Record<string, { badge: string }> = {
  Easy:   { badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
  Medium: { badge: 'bg-amber-900/60 text-amber-300 border-amber-700' },
  Hard:   { badge: 'bg-red-900/60 text-red-300 border-red-700' },
};

export default function InterviewPrepPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [guide, setGuide] = useState<InterviewGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.resume.list(), api.jobs.list()]).then(([r, j]) => {
      if (r.status === 'fulfilled') setResumes(r.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setFetchingData(false);
    });
  }, []);

  const toggleQuestion = useCallback((id: number) => {
    setOpenQuestions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleGenerate = async () => {
    if (!selectedResumeId || !selectedJobId) return;
    setLoading(true);
    setError(null);
    setGuide(null);
    setOpenQuestions(new Set());
    setActiveCategory('All');
    try {
      const result = await api.interview.prepare(selectedResumeId, selectedJobId);
      setGuide(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate interview prep guide.');
    } finally {
      setLoading(false);
    }
  };

  const categories = guide
    ? ['All', ...Array.from(new Set(guide.questions.map(q => q.category)))]
    : ['All'];

  const filteredQuestions = guide
    ? (activeCategory === 'All' ? guide.questions : guide.questions.filter(q => q.category === activeCategory))
    : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-3 border border-zinc-700">
          🎯 AI Interview Coach
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Interview Preparation Guide
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Generate a personalized interview guide with 12–15 targeted questions, coaching notes grounded in your actual experience, and a ready-to-use elevator pitch.
        </p>
      </div>

      {/* Selector Card */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Configure Your Session</h2>
        {fetchingData ? (
          <LoadingSpinner label="Loading your resumes and jobs..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resume selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Select Resume</label>
              <select
                id="interview-resume-select"
                value={selectedResumeId}
                onChange={e => setSelectedResumeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all"
              >
                <option value="">— Choose a resume —</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.parsed_data?.candidate?.name || r.file_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Job selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Select Target Job</label>
              <select
                id="interview-job-select"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all"
              >
                <option value="">— Choose a job posting —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.company ? `@ ${j.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button
          id="generate-interview-btn"
          onClick={handleGenerate}
          disabled={!selectedResumeId || !selectedJobId || loading}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-black rounded-full animate-spin" />
              Generating Guide...
            </>
          ) : (
            '🎯 Generate Interview Guide'
          )}
        </button>

        {error && <ErrorBanner message={error} />}
      </div>

      {/* Results */}
      {guide && (
        <div className="space-y-6 animate-fadeIn">
          {/* Job header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {guide.job_title}
                {guide.company && <span className="text-zinc-400 font-normal"> @ {guide.company}</span>}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">{guide.questions.length} questions generated</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
              Ready to Practice
            </span>
          </div>

          {/* Elevator pitch */}
          {guide.opening_pitch && (
            <div className="glass-card rounded-2xl p-5 border border-zinc-700 bg-zinc-900/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎤</span>
                  <h3 className="font-display font-bold text-white text-sm">Your 60-Second Elevator Pitch</h3>
                </div>
                <button
                  id="copy-pitch-btn"
                  onClick={() => copyToClipboard(guide.opening_pitch, 'pitch')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all"
                >
                  {copied === 'pitch' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{guide.opening_pitch}</p>
            </div>
          )}

          {/* Company prep notes */}
          {guide.company_prep_notes && (
            <div className="glass-card rounded-2xl p-5 border border-zinc-700 bg-zinc-900/40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔍</span>
                <h3 className="font-display font-bold text-white text-sm">Company & Role Research Notes</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{guide.company_prep_notes}</p>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                id={`cat-tab-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {cat === 'All' ? `All (${guide.questions.length})` : `${CATEGORY_CONFIG[cat]?.icon || ''} ${cat}`}
              </button>
            ))}
          </div>

          {/* Question accordion */}
          <div className="space-y-3">
            {filteredQuestions.map(q => {
              const catCfg = CATEGORY_CONFIG[q.category] ?? CATEGORY_CONFIG.General;
              const diffCfg = DIFFICULTY_CONFIG[q.difficulty] ?? DIFFICULTY_CONFIG.Medium;
              const isOpen = openQuestions.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border ${catCfg.border} ${catCfg.bg} overflow-hidden transition-all`}
                >
                  {/* Question header */}
                  <button
                    id={`question-${q.id}-toggle`}
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                    onClick={() => toggleQuestion(q.id)}
                  >
                    <span className="text-base mt-0.5 shrink-0">{catCfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${catCfg.color}`}>
                          {q.category}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${diffCfg.badge}`}>
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600">Q{q.id}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-100 leading-snug">{q.question}</p>
                    </div>
                    <span className={`text-zinc-500 text-lg shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>

                  {/* Coaching note (collapsible) */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-zinc-800/60">
                      <div className="mt-4 bg-zinc-950/60 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            💡 Coaching Note
                          </p>
                          <button
                            id={`copy-q${q.id}-btn`}
                            onClick={() => copyToClipboard(`Q: ${q.question}\n\nCoaching: ${q.coaching_note}`, `q-${q.id}`)}
                            className="text-[10px] px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all"
                          >
                            {copied === `q-${q.id}` ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{q.coaching_note}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!guide && !loading && (
        <div className="glass-card rounded-2xl p-10 text-center border border-zinc-800">
          <p className="text-4xl mb-4">🎯</p>
          <p className="font-display font-bold text-white mb-2">Ready to Prep for Your Interview?</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Select a resume and target job above, then click Generate to receive your personalised interview guide with coaching notes.
          </p>
        </div>
      )}
    </div>
  );
}
