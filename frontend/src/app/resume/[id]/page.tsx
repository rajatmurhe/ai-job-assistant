'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.resume
      .get(params.id)
      .then(setResume)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this resume.'));
  }, [params.id]);

  if (error) return <ErrorBanner message={error} />;
  if (!resume) return <LoadingSpinner label="Loading structured resume data..." />;

  const candidate = resume.parsed_data?.candidate;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            Verified Resume Profile
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
            {candidate?.name || resume.file_name}
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Uploaded: {new Date(resume.created_at).toLocaleString()} • File: {resume.file_name}
          </p>
        </div>

        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl px-5 py-2.5 transition-all self-start sm:self-auto"
        >
          <span>Match with a Job Posting →</span>
        </Link>
      </div>

      <ResumePreview data={resume.parsed_data} />

      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        <Link href="/resume" className="text-xs text-zinc-400 hover:text-white font-medium">
          ← Back to All Resumes
        </Link>
        <Link href="/jobs" className="text-xs text-zinc-200 font-semibold hover:underline">
          View Available Job Postings →
        </Link>
      </div>
    </div>
  );
}
