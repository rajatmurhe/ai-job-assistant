'use client';

import { useState } from 'react';
import type { GapAnalysis, AtsAnalysis, SubScores } from '@/types/match';
import { useMasterPrompt } from '@/context/MasterPromptContext';
import { api, ApiError } from '@/lib/api';

interface MasterPromptGeneratorProps {
  reportId: string;
  gapAnalysis: GapAnalysis;
  atsAnalysis: AtsAnalysis;
  subScores: SubScores;
  overallScore: number;
}

type GenerationState = 'idle' | 'generating' | 'done' | 'error';

export function MasterPromptGenerator({
  reportId,
  gapAnalysis,
  atsAnalysis,
  subScores,
  overallScore,
}: MasterPromptGeneratorProps) {
  const { userRules } = useMasterPrompt();
  const [state, setState] = useState<GenerationState>('idle');
  const [promptText, setPromptText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openedWith, setOpenedWith] = useState<'chatgpt' | 'claude' | null>(null);

  const handleGenerate = async () => {
    setState('generating');
    setError(null);
    setPromptText('');
    try {
      const res = await api.reports.masterPrompt(reportId, userRules);
      setPromptText(res.master_prompt);
      setState('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate master prompt. Please try again.');
      setState('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenAI = (platform: 'chatgpt' | 'claude') => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setOpenedWith(platform);
    const url = platform === 'chatgpt' ? 'https://chat.openai.com' : 'https://claude.ai/new';
    window.open(url, '_blank');
    setTimeout(() => { setCopied(false); setOpenedWith(null); }, 3000);
  };

  const wordCount = promptText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = promptText.length;

  return (
    <div className="glass-card rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-zinc-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2.5 border border-zinc-700">
              AI-Powered Synthesis
            </div>
            <h3 className="font-display font-bold text-xl text-white tracking-tight">
              Master Resume Rewrite Prompt
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              AI synthesizes your match intelligence, skill gaps, ATS keywords, and personal rules into one complete prompt. Paste it with your resume into any external AI to generate a tailored version.
            </p>
          </div>
        </div>

        {/* Data inclusion summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              label: 'Match Score',
              value: `${overallScore}/100`,
            },
            {
              label: 'Skill Gaps',
              value: `${gapAnalysis.missing.length} missing`,
            },
            {
              label: 'ATS Keywords',
              value: `${atsAnalysis.keywords_missing.length} gaps`,
            },
            {
              label: 'Your Rules',
              value: userRules.trim()
                ? `${userRules.trim().split(/\s+/).filter(Boolean).length} words`
                : 'Not set',
              dim: !userRules.trim(),
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl p-3 border flex flex-col gap-1 transition-all ${
                item.dim
                  ? 'border-zinc-800 bg-zinc-950/40 opacity-60'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-xs font-bold font-mono text-zinc-100">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Active rules preview */}
        {userRules.trim() ? (
          <div className="rounded-xl p-3.5 border border-zinc-700 bg-zinc-950/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                Your Master Rules (Active — will be woven into the prompt)
              </span>
            </div>
            <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed line-clamp-4">
              {userRules}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl p-3.5 border border-dashed border-zinc-800 bg-zinc-950/40 flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-300">No master rules set</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Expand <strong className="text-zinc-300">Master Rules</strong> in the sidebar to add personal constraints — tone, format, priorities. They will be embedded in the AI synthesis.
              </p>
            </div>
          </div>
        )}

        {/* What AI will combine */}
        {state === 'idle' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 divide-y divide-zinc-800">
            {[
              {
                title: 'Skill Gap & Competency Analysis',
                desc: `${gapAnalysis.strong.length} direct matches · ${(gapAnalysis.partial.length + gapAnalysis.transferable.length)} transferable · ${gapAnalysis.missing.length} missing`,
              },
              {
                title: 'ATS Compatibility Metrics',
                desc: `Parser score ${Math.round(atsAnalysis.ats_score)}% · Keyword coverage ${Math.round(atsAnalysis.keyword_coverage_score)}%`,
              },
              {
                title: 'ATS Keyword Breakdown',
                desc: `${atsAnalysis.keywords_present.length} present · ${atsAnalysis.keywords_missing.length} missing from resume`,
              },
              {
                title: 'Full Gap Remediation List',
                desc: `${gapAnalysis.missing.length + atsAnalysis.keywords_missing.length} total items with bridging strategies`,
              },
              {
                title: 'Your Personal Resume Rules',
                desc: userRules.trim() ? 'Loaded from Master Rules panel' : 'Not configured (optional)',
                dim: !userRules.trim(),
              },
            ].map((item) => (
              <div key={item.title} className={`flex items-start gap-3 px-4 py-3 ${item.dim ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{item.title}</p>
                  <p className="text-[11px] text-zinc-400">{item.desc}</p>
                </div>
                <span className="ml-auto text-zinc-400 text-sm shrink-0">{item.dim ? '○' : '✓'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {state === 'error' && error && (
          <div className="rounded-xl p-4 border border-zinc-700 bg-zinc-950 flex items-start gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Generation failed</p>
              <p className="text-[11px] text-zinc-400">{error}</p>
            </div>
          </div>
        )}

        {/* Generating animation */}
        {state === 'generating' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
            <div>
              <p className="text-sm font-bold text-zinc-200">Synthesizing master prompt...</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Analyzing job requirements, skill gaps, ATS data, and personal rules.
              </p>
            </div>
          </div>
        )}

        {/* Generated prompt output */}
        {state === 'done' && promptText && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                <span className="text-xs font-bold text-zinc-200">AI-Generated Master Prompt</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                </span>
              </div>
              <button
                onClick={handleGenerate}
                className="text-[11px] text-zinc-400 hover:text-white transition-colors underline"
              >
                Regenerate
              </button>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={18}
              className="w-full text-[11px] font-mono bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-zinc-400 resize-y leading-relaxed transition-all"
            />

            {/* Usage instruction */}
            <div className="rounded-xl p-3.5 border border-zinc-800 bg-zinc-950 flex items-start gap-3">
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                <strong className="text-white">How to use:</strong> Copy this prompt → paste it into ChatGPT, Claude, or any AI → then append{' '}
                <span className="font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-200">&quot;Here is my current resume:&quot;</span>{' '}
                and paste your full resume text. The AI will produce a tailored resume.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={handleCopy}
                className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                  copied && !openedWith
                    ? 'bg-zinc-800 text-white border border-zinc-600'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {copied && !openedWith ? 'Copied to Clipboard' : 'Copy Prompt'}
              </button>

              <button
                onClick={() => handleOpenAI('chatgpt')}
                className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center transition-all border ${
                  openedWith === 'chatgpt'
                    ? 'border-zinc-600 bg-zinc-800 text-white'
                    : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                {openedWith === 'chatgpt' ? 'Copied & Opened' : 'Copy + Open ChatGPT'}
              </button>

              <button
                onClick={() => handleOpenAI('claude')}
                className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center transition-all border ${
                  openedWith === 'claude'
                    ? 'border-zinc-600 bg-zinc-800 text-white'
                    : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                {openedWith === 'claude' ? 'Copied & Opened' : 'Copy + Open Claude'}
              </button>
            </div>
          </div>
        )}

        {/* Generate button (idle or error) */}
        {(state === 'idle' || state === 'error') && (
          <button
            onClick={handleGenerate}
            className="w-full py-4 rounded-xl font-display font-bold text-base text-black bg-white hover:bg-zinc-200 transition-all flex items-center justify-center gap-2.5"
          >
            Generate AI Master Prompt
          </button>
        )}
      </div>
    </div>
  );
}
