/**
 * DocumentViewer.tsx
 * Displays generated resume markdown, cover letter, and application email in a clean monochrome UI.
 */
'use client';

import { useState } from 'react';
import type { GeneratedDocuments } from '@/types/generation';

type Tab = 'resume' | 'cover_letter' | 'email';

export function DocumentViewer({ docs }: { docs: GeneratedDocuments }) {
  const [tab, setTab] = useState<Tab>('resume');
  const [copied, setCopied] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: 'resume', label: 'Tailored Resume', available: !!docs.resume_markdown },
    { key: 'cover_letter', label: 'Cover Letter', available: !!docs.cover_letter },
    { key: 'email', label: 'Application Email', available: !!docs.application_email },
  ];

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Truthfulness Guarantee Badge */}
      <div className="flex items-center gap-3 rounded-2xl p-4 border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200">
        <div>
          <div className="font-bold text-white">
            {docs.truthfulness_check_passed
              ? 'Truthfulness Contract Verified: Passed'
              : 'Truthfulness Flag: Review Required'}
          </div>
          <p className="text-[11px] text-zinc-400 font-normal mt-0.5">
            {docs.truthfulness_check_passed
              ? 'All metrics, job titles, and skills have been verified against your source resume data.'
              : 'One or more claims could not be directly matched to your source profile. Please review manually.'}
          </p>
        </div>
      </div>

      {/* Changes Made Breakdown */}
      {docs.changes_made.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Optimizations & Changes Applied
          </h3>
          <ul className="space-y-1.5">
            {docs.changes_made.map((change, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-zinc-500 font-bold shrink-0 mt-0.5">-</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 max-w-md">
        {tabs
          .filter((t) => t.available)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center text-xs py-2 rounded-xl font-semibold transition-all ${
                tab === t.key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
      </div>

      {/* Document Content View */}
      <div className="glass-card rounded-2xl border border-zinc-800 overflow-hidden shadow-card">
        {tab === 'resume' && docs.resume_markdown && (
          <DocumentPane
            content={docs.resume_markdown}
            label="Resume Markdown"
            onCopy={() => copyToClipboard(docs.resume_markdown!, 'Resume')}
            copied={copied === 'Resume'}
          />
        )}
        {tab === 'cover_letter' && docs.cover_letter && (
          <DocumentPane
            content={docs.cover_letter}
            label="Cover Letter"
            onCopy={() => copyToClipboard(docs.cover_letter!, 'Cover Letter')}
            copied={copied === 'Cover Letter'}
          />
        )}
        {tab === 'email' && docs.application_email && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 font-semibold uppercase">Subject:</span>
                <span className="font-display font-bold text-white text-sm">
                  {docs.application_email.subject}
                </span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${docs.application_email!.subject}\n\n${docs.application_email!.body}`,
                    'Email'
                  )
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors font-medium"
              >
                {copied === 'Email' ? 'Copied' : 'Copy Full Email'}
              </button>
            </div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Email Body
            </div>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-950 p-5 rounded-xl border border-zinc-800 overflow-auto max-h-[500px]">
              {docs.application_email.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentPane({
  content,
  label,
  onCopy,
  copied,
}: {
  content: string;
  label: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs font-mono text-zinc-400">{label}</span>
        <button
          onClick={onCopy}
          className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-semibold shadow-sm transition-all"
        >
          {copied ? 'Copied to Clipboard' : 'Copy Text'}
        </button>
      </div>
      <pre className="p-6 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans overflow-auto max-h-[600px] bg-zinc-950">
        {content}
      </pre>
    </div>
  );
}
