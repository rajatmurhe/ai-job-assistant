'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { GeneratedDocuments } from '@/types/generation';
import { DocumentViewer } from '@/components/generate/DocumentViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import Link from 'next/link';

export default function GeneratePage() {
  const params = useParams<{ id: string }>(); // resume id
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const appId = searchParams.get('appId');

  const [docs, setDocs] = useState<GeneratedDocuments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!jobId) {
      setError('Missing Job ID. Open this page from a Match Report or Job detail page.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.generate.all(params.id, jobId, appId || undefined);
      setDocs(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate tailored documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (jobId) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, jobId]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            Document Generation Suite
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
            Tailored Application Documents
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Source Resume: {params.id.slice(0, 8)}... • Target Job: {jobId ? `${jobId.slice(0, 8)}...` : 'N/A'}
          </p>
        </div>

        {docs && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all disabled:opacity-40"
          >
            Regenerate Documents
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner label="Crafting truthful, tailored resume, cover letter, and email..." />}

      {docs && <DocumentViewer docs={docs} />}

      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        <Link href="/jobs" className="text-xs text-zinc-400 hover:text-white font-medium">
          ← Back to Jobs
        </Link>
        <Link href="/applications" className="text-xs text-zinc-200 font-semibold hover:underline">
          View Applications Pipeline →
        </Link>
      </div>
    </div>
  );
}
