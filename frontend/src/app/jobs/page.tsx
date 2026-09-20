'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Job } from '@/types/job';
import { JDInput } from '@/components/jobs/JDInput';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

const IMPORTANCE_BADGES: Record<string, string> = {
  MANDATORY: 'bg-zinc-800 text-zinc-100 border-zinc-600',
  PREFERRED: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  NICE_TO_HAVE: 'bg-zinc-950 text-zinc-500 border-zinc-800',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .list()
      .then(setJobs)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load jobs.'));
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Target Job Postings
        </h1>
        <p className="text-sm text-zinc-400">
          Ingest and parse job descriptions. Extract mandatory skills, preferred qualifications, seniority, and ATS keywords for automated matching.
        </p>
      </div>

      <JDInput onAnalyzed={(job) => setJobs((prev) => [job, ...(prev || [])])} />

      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold text-white tracking-tight">
          Analyzed Jobs {jobs ? `(${jobs.length})` : ''}
        </h2>

        {error && <ErrorBanner message={error} />}
        {!error && jobs === null && <LoadingSpinner label="Loading parsed job postings..." />}

        {jobs && jobs.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center border border-zinc-800">
            <p className="font-display font-bold text-white mb-1">No job postings analyzed yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Paste a job description or URL above to extract requirements and evaluate candidate match.
            </p>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((j) => {
              const jd = j.parsed_data || {};
              const skills = jd.skills || [];
              return (
                <div
                  key={j.id}
                  className="glass-card glass-card-hover rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <h3 className="font-display font-bold text-base text-white">
                          {j.title}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium">
                          {j.company} {jd.location ? `• ${jd.location}` : ''} {jd.work_arrangement ? `(${jd.work_arrangement})` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 shrink-0">
                        {new Date(j.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {jd.summary && (
                      <p className="text-xs text-zinc-300 my-2.5 line-clamp-2 leading-relaxed">
                        {jd.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 my-3">
                      {skills.slice(0, 6).map((s) => (
                        <span
                          key={s.name}
                          className={`text-[11px] font-medium border rounded-md px-2 py-0.5 ${
                            IMPORTANCE_BADGES[s.importance] || 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {s.name}
                        </span>
                      ))}
                      {skills.length > 6 && (
                        <span className="text-[11px] text-zinc-500 px-1 py-0.5">
                          +{skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                    <Link
                      href={`/jobs/${j.id}`}
                      className="text-xs font-semibold text-zinc-300 hover:text-white hover:underline flex items-center gap-1"
                    >
                      View Details & Match →
                    </Link>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-semibold transition-all shadow-sm"
                    >
                      Match Resume
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
