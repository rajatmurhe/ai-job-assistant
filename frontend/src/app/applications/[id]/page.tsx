'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Application, ApplicationStatus } from '@/types/application';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['READY', 'WITHDRAWN'],
  READY: ['APPLIED', 'WITHDRAWN'],
  APPLIED: ['IN_REVIEW', 'REJECTED', 'WITHDRAWN'],
  IN_REVIEW: ['INTERVIEWING', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['WITHDRAWN'],
  REJECTED: [],
  WITHDRAWN: [],
};

const STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  DRAFT: 'Application has been drafted. Review match score and tailored documents before applying.',
  READY: 'Resume and cover letter tailored and verified. Ready for submission to company portal or recruiter.',
  APPLIED: 'Application submitted. Awaiting recruiter review or initial ATS processing.',
  IN_REVIEW: 'Application is being reviewed by hiring manager or talent team.',
  INTERVIEWING: 'Active interview rounds in progress (recruiter screen, technical, or leadership).',
  OFFER: 'Formal job offer received! Review compensation and terms.',
  REJECTED: 'Application not moving forward at this time.',
  WITHDRAWN: 'Application voluntarily withdrawn.',
};

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function refresh() {
    api.applications
      .get(params.id)
      .then(setApplication)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this application.'));
  }

  useEffect(refresh, [params.id]);

  async function handleTransition(status: ApplicationStatus) {
    setUpdating(true);
    setError(null);
    try {
      const updated = await api.applications.updateStatus(params.id, status);
      setApplication(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the application status.');
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!application) return <LoadingSpinner label="Loading application state machine..." />;

  const nextStatuses = VALID_TRANSITIONS[application.status] || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            FSM Lifecycle Tracker
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap">
            Application Status
            <StatusBadge status={application.status} />
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Application ID: {application.id}
          </p>
        </div>

        <Link
          href={`/generate/${application.resume_id}?jobId=${application.job_id}&appId=${application.id}`}
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl px-5 py-2.5 transition-all self-start sm:self-auto"
        >
          <span>Tailored Documents →</span>
        </Link>
      </div>

      {/* State Machine Action Panel */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 space-y-5">
        <div>
          <h2 className="font-display font-bold text-base text-white mb-1">
            Current Stage
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {STATUS_DESCRIPTIONS[application.status] || 'Active application stage.'}
          </p>
        </div>

        {application.notes && (
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-200">
            <strong>Notes:</strong> {application.notes}
          </div>
        )}

        <div className="border-t border-zinc-800 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Advance State Machine
          </h3>

          {nextStatuses.length === 0 ? (
            <p className="text-xs text-zinc-500">
              This application has reached a terminal status ({application.status}).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleTransition(status)}
                  disabled={updating}
                  className="text-xs px-4 py-2 rounded-xl font-semibold border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-40"
                >
                  Mark as {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        <Link href="/applications" className="text-xs text-zinc-400 hover:text-white font-medium">
          ← Back to All Applications
        </Link>
        <Link
          href={`/resume/${application.resume_id}`}
          className="text-xs text-zinc-300 font-semibold hover:underline"
        >
          View Source Resume Profile →
        </Link>
      </div>
    </div>
  );
}
