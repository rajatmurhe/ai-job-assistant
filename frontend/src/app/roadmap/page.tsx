'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface Resource {
  title: string;
  platform: string;
  url_hint: string;
  type: string;
  duration_hours: number;
}

interface LearningPath {
  skill: string;
  priority: string;
  current_level: string;
  target_level: string;
  estimated_weeks: number;
  resources: Resource[];
  mini_project: string;
  outcome: string;
}

interface RoadmapData {
  summary: string;
  estimated_weeks_total: number;
  learning_paths: LearningPath[];
  weekly_schedule_suggestion: string;
  quick_wins: string[];
  job_title?: string;
  company?: string;
}

const PRIORITY_STYLES: Record<string, { badge: string }> = {
  Critical: { badge: 'bg-red-950/70 text-red-300 border-red-800' },
  High:     { badge: 'bg-amber-950/70 text-amber-300 border-amber-800' },
  Medium:   { badge: 'bg-blue-950/70 text-blue-300 border-blue-800' },
  Low:      { badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
};

export default function RoadmapPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
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

  const handleGenerateRoadmap = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a target job.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: selectedResumeId, job_id: selectedJobId }),
      });
      if (!res.ok) throw new Error('Failed to generate roadmap');
      const data = await res.json();
      setRoadmap(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not generate learning roadmap.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-lg">
            🗺️
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Skill Gap Learning Roadmap
            </h1>
            <p className="text-sm text-zinc-400">
              Personalized, step-by-step curriculum and project milestones to close skill gaps for your target role.
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
            <LoadingSpinner size="sm" /> Loading data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"
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
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"
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
          onClick={handleGenerateRoadmap}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-orange-600 hover:bg-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Building Personalized Curriculum...' : 'Generate Learning Roadmap'}
        </button>
      </div>

      {/* Results */}
      {roadmap && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Banner */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  Target Curriculum
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Roadmap for {roadmap.job_title} at {roadmap.company}
                </h3>
              </div>
              <div className="px-4 py-2 rounded-xl bg-orange-950/50 border border-orange-800/60 text-right">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">Estimated Timeline</span>
                <span className="text-xl font-bold font-display text-orange-400">
                  {roadmap.estimated_weeks_total} Weeks
                </span>
              </div>
            </div>

            <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
              {roadmap.summary}
            </p>

            {roadmap.quick_wins.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  ⚡ Quick Wins:
                </span>
                {roadmap.quick_wins.map((qw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                  >
                    {qw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Schedule Callout */}
          {roadmap.weekly_schedule_suggestion && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3">
              <span className="text-lg">🗓️</span>
              <div>
                <strong className="block text-zinc-200 mb-0.5">Recommended Weekly Rhythm:</strong>
                {roadmap.weekly_schedule_suggestion}
              </div>
            </div>
          )}

          {/* Learning Paths */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Target Skills & Resources</h3>
            <div className="grid grid-cols-1 gap-4">
              {roadmap.learning_paths.map((path, idx) => {
                const priority = PRIORITY_STYLES[path.priority] || PRIORITY_STYLES.Medium;
                return (
                  <div key={idx} className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold text-white">{path.skill}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${priority.badge}`}>
                          {path.priority} Priority
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {path.current_level} → <span className="text-orange-400 font-semibold">{path.target_level}</span> ({path.estimated_weeks} wks)
                      </div>
                    </div>

                    {/* Resources */}
                    {path.resources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                          Curated Learning Resources
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {path.resources.map((res, rIdx) => (
                            <div key={rIdx} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex flex-col justify-between gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-zinc-200">{res.title}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                  {res.platform}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                                <span>{res.type} • {res.duration_hours}h</span>
                                {res.url_hint && (
                                  <span className="text-orange-400 hover:underline">{res.url_hint}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project & Outcome */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                        <strong className="block text-zinc-300 font-semibold mb-1">🛠️ Practice Project:</strong>
                        <p className="text-zinc-400 leading-relaxed">{path.mini_project}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                        <strong className="block text-emerald-400 font-semibold mb-1">🎯 Demonstrable Outcome:</strong>
                        <p className="text-zinc-400 leading-relaxed">{path.outcome}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
