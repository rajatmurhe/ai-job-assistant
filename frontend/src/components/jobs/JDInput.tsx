'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Job } from '@/types/job';

export function JDInput({ onAnalyzed }: { onAnalyzed: (job: Job) => void }) {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const job = await api.jobs.analyze(mode === 'text' ? { text } : { url });
      onAnalyzed(job);
      setText('');
      setUrl('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not analyze this job posting. Verify the input.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Analyze New Job Posting
        </h2>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'text'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'url'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            From Job URL
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Paste the full job posting description, requirements, responsibilities, or company details here..."
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-y font-sans leading-relaxed"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/... or company.com/careers/role"
              className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-sans"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-1 flex-wrap">
            <span>Supported:</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">LinkedIn</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">Indeed</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">Greenhouse</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">Lever</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">Workday</span>
            <span className="text-zinc-600">• Auto-extracts JSON-LD schema</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || (mode === 'text' ? !text.trim() : !url.trim())}
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>Extracting Job Requirements...</span>
            </>
          ) : (
            <span>Analyze & Extract Requirements</span>
          )}
        </button>
      </div>
    </div>
  );
}
