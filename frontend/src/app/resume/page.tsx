'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.resume
      .list()
      .then(setResumes)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load resumes.'));
  }

  useEffect(refresh, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Resume Management
        </h1>
        <p className="text-sm text-zinc-400">
          Upload and manage your profile resumes. Each resume is parsed into structured experience, skills, and projects for deterministic job matching.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">
          Upload New Resume
        </h2>
        <ResumeUploader
          onUploaded={(resume) => setResumes((prev) => [resume, ...(prev || [])])}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white tracking-tight">
            Parsed Resumes {resumes ? `(${resumes.length})` : ''}
          </h2>
        </div>

        {error && <ErrorBanner message={error} />}
        {!error && resumes === null && <LoadingSpinner label="Loading resumes from vault..." />}

        {resumes && resumes.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center border border-zinc-800">
            <p className="font-display font-bold text-white mb-1">No resumes yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Upload your first resume above to extract skills and start matching against job postings.
            </p>
          </div>
        )}

        {resumes && resumes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map((r) => {
              const candidate = r.parsed_data?.candidate;
              const skills = r.parsed_data?.skills || [];
              const experience = r.parsed_data?.experience || [];
              return (
                <div
                  key={r.id}
                  className="glass-card glass-card-hover rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-display font-bold text-base text-white">
                          {candidate?.name || r.file_name}
                        </h3>
                        <p className="text-xs text-zinc-400">{candidate?.email || 'No email specified'}</p>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 my-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                        <strong className="text-zinc-200">{skills.length}</strong> skills
                      </span>
                      <span className="inline-flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                        <strong className="text-zinc-200">{experience.length}</strong> roles
                      </span>
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {skills.slice(0, 5).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-800"
                          >
                            {s.name}
                          </span>
                        ))}
                        {skills.length > 5 && (
                          <span className="text-[11px] text-zinc-500 px-1 py-0.5">
                            +{skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-800 pt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {r.is_active_version ? (
                        <span className="text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                          ★ Primary Active
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            await fetch(`/api/v1/resume-variants/${r.id}/set-active`, { method: 'PATCH' });
                            refresh();
                          }}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                        >
                          Set Primary
                        </button>
                      )}
                      {r.parsed_data?.variant_name && (
                        <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full">
                          {r.parsed_data.variant_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const name = prompt('Enter role variant name (e.g., "Full-Stack Specialist", "AI Engineer"):');
                          if (!name) return;
                          await fetch(`/api/v1/resume-variants/${r.id}/clone`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ variant_name: name }),
                          });
                          refresh();
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition"
                      >
                        Clone Variant
                      </button>
                      <Link
                        href={`/resume/${r.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white text-black hover:bg-zinc-200 font-medium transition"
                      >
                        Details →
                      </Link>
                    </div>
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
