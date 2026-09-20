'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Application } from '@/types/application';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.applications
      .list()
      .then(setApplications)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load applications.'));
  }

  useEffect(refresh, []);

  const counts = {
    total: applications?.length || 0,
    active: applications?.filter(a => !['REJECTED', 'WITHDRAWN'].includes(a.status)).length || 0,
    interviews: applications?.filter(a => a.status === 'INTERVIEWING').length || 0,
    offers: applications?.filter(a => a.status === 'OFFER').length || 0,
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Application Tracking FSM
        </h1>
        <p className="text-sm text-zinc-400">
          Manage your live job applications through a strictly validated finite state machine: Draft → Ready → Applied → In Review → Interviewing → Offer.
        </p>
      </div>

      {/* Pipeline summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Total Pipeline" value={counts.total} />
        <StatPill label="Active In-Flight" value={counts.active} />
        <StatPill label="Interviewing" value={counts.interviews} />
        <StatPill label="Offers Secured" value={counts.offers} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white tracking-tight">
            Tracked Applications
          </h2>
          <Link
            href="/jobs"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-all shadow-sm"
          >
            + Start from Job Match
          </Link>
        </div>

        {error && <ErrorBanner message={error} />}
        {!error && applications === null && <LoadingSpinner label="Loading application pipeline..." />}

        {applications && applications.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center border border-zinc-800">
            <p className="font-display font-bold text-white mb-1">No applications tracked yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Match a resume against any target job posting to automatically create a tracked application entry.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200"
            >
              Go to Job Postings →
            </Link>
          </div>
        )}

        {applications && applications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onUpdated={(updated) => {
                  setApplications((prev) =>
                    prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated]
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
      <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-display font-extrabold mt-1 text-white">{value}</span>
    </div>
  );
}
