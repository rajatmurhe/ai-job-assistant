'use client';

import type { Application, ApplicationStatus } from '@/types/application';
import { StatusBadge } from './StatusBadge';
import { api, ApiError } from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';

const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['READY', 'WITHDRAWN'],
  READY: ['APPLIED', 'WITHDRAWN'],
  APPLIED: ['IN_REVIEW', 'REJECTED', 'WITHDRAWN'],
  IN_REVIEW: ['INTERVIEWING', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['WITHDRAWN'],
  REJECTED: [],
  WITHDRAWN: [],
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready to Apply',
  APPLIED: 'Applied',
  IN_REVIEW: 'In Review',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer Received',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export function ApplicationCard({
  application,
  onUpdated,
}: {
  application: Application;
  onUpdated: (updated: Application) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStates = TRANSITIONS[application.status] || [];

  async function advance(status: ApplicationStatus) {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.applications.updateStatus(application.id, status);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update application status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="font-mono text-[11px] text-zinc-500 mb-0.5">
              ID: {application.id.slice(0, 8)}...
            </div>
            <h3 className="font-display font-bold text-base text-white">
              Application Pipeline
            </h3>
          </div>
          <StatusBadge status={application.status} />
        </div>

        {application.notes && (
          <p className="text-xs text-zinc-300 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 my-2">
            {application.notes}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono my-2">
          <span>Created: {new Date(application.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated: {new Date(application.updated_at).toLocaleDateString()}</span>
        </div>

        {nextStates.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              State Machine Transitions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nextStates.map((s) => (
                <button
                  key={s}
                  disabled={loading}
                  onClick={() => advance(s)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-40"
                >
                  → {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 text-xs mt-2">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-3 flex items-center justify-between text-xs">
        <Link
          href={`/generate/${application.resume_id}?jobId=${application.job_id}`}
          className="text-zinc-200 hover:underline font-semibold"
        >
          Tailored Documents →
        </Link>
        <Link
          href={`/applications/${application.id}`}
          className="text-zinc-500 hover:text-zinc-300 font-medium"
        >
          History Details
        </Link>
      </div>
    </div>
  );
}
