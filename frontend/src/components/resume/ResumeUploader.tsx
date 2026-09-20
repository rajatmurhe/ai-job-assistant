'use client';

import { useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Resume } from '@/types/resume';

export function ResumeUploader({ onUploaded }: { onUploaded: (resume: Resume) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setError(null);
    try {
      const resume = await api.resume.upload(file);
      onUploaded(resume);
      setFileName(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload and parsing failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative overflow-hidden border border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${
        dragOver
          ? 'border-zinc-400 bg-zinc-800/60 shadow-glow'
          : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-600 glass-card'
      } ${uploading ? 'cursor-wait opacity-90' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        {uploading ? (
          <div>
            <p className="font-display font-bold text-white mb-1">
              Extracting structured profile...
            </p>
            <p className="text-xs text-zinc-400 font-mono">{fileName || 'Parsing resume with AI and deterministic extractors'}</p>
          </div>
        ) : (
          <>
            <p className="font-display font-bold text-base text-white mb-1.5">
              Drop your resume here, or <span className="text-zinc-200 underline underline-offset-4">browse</span>
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Supports PDF, DOCX, or TXT up to 10MB. Instant structured parsing of skills, experience, and education.
            </p>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 text-xs text-left w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
