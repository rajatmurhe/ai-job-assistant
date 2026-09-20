'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Job } from '@/types/job';
import type { Resume } from '@/types/resume';
import { JDDetail } from '@/components/jobs/JDDetail';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .get(params.id)
      .then(setJob)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load job details.'));

    api.resume.list().then((r) => {
      setResumes(r);
      if (r[0]) setSelectedResumeId(r[0].id);
    });
  }, [params.id]);

  async function runMatch() {
    if (!selectedResumeId || !job) return;
    setMatching(true);
    setError(null);
    try {
      const report = await api.match.run(selectedResumeId, job.id);
      router.push(`/match/${report.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not run the match calculation.');
    } finally {
      setMatching(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!job) return <LoadingSpinner label="Loading structured job posting..." />;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            Target Position
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
            {job.title}
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            {job.company} {job.parsed_data?.location ? `• ${job.parsed_data.location}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <JDDetail job={job} />
        </div>

        {/* Right: Match Trigger Card */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 sticky top-6 space-y-4">
            <h3 className="font-display font-bold text-base text-white">
              Run Match Assessment
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Select an uploaded resume to evaluate compatibility across skills, experience, and ATS keyword metrics.
            </p>

            {resumes.length === 0 ? (
              <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center space-y-3">
                <p className="text-xs text-zinc-400">No resumes in your profile.</p>
                <Link
                  href="/resume"
                  className="inline-block text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200"
                >
                  Upload a Resume First →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Select Profile Resume
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    {resumes.map((r) => {
                      const name = r.parsed_data?.candidate?.name || r.file_name;
                      const skillsCount = r.parsed_data?.skills?.length || 0;
                      return (
                        <option key={r.id} value={r.id}>
                          {name} ({skillsCount} skills)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  onClick={runMatch}
                  disabled={matching}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl py-3 disabled:opacity-40 transition-all"
                >
                  {matching ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Computing 7-Dimension Score...</span>
                    </>
                  ) : (
                    <span>Calculate Match Score</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
