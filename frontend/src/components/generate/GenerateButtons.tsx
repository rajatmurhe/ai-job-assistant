/**
 * GenerateButtons.tsx
 * Trigger document generation (tailored resume + cover letter + email).
 */
'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { GeneratedDocuments } from '@/types/generation';

export function GenerateButtons({
  resumeId,
  jobId,
  applicationId,
  onGenerated,
}: {
  resumeId: string;
  jobId: string;
  applicationId?: string;
  onGenerated: (docs: GeneratedDocuments) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const docs = await api.generate.all(resumeId, jobId, applicationId);
      onGenerated(docs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        id="generate-docs-btn"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-40 transition-all"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <span>Generate application documents</span>
        )}
      </button>
      {error && <p className="text-xs text-zinc-400 mt-3">{error}</p>}
    </div>
  );
}
