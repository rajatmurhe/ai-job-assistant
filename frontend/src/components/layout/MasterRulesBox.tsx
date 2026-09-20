'use client';

import { useState } from 'react';
import { useMasterPrompt } from '@/context/MasterPromptContext';

export function MasterRulesBox() {
  const { userRules, setUserRules } = useMasterPrompt();
  const [expanded, setExpanded] = useState(false);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Use local draft while editing; fallback to context value
  const displayValue = localValue ?? userRules;
  const isDirty = localValue !== null && localValue !== userRules;

  const handleSave = () => {
    if (localValue !== null) {
      setUserRules(localValue);
      setLocalValue(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left group hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs font-semibold text-zinc-200 tracking-tight">Master Rules</span>
          {userRules.trim() && (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-400 leading-relaxed pt-2">
            Write your fixed resume rules here — tone, format, priorities, constraints. These will be combined with job data to generate a master AI prompt.
          </p>
          <textarea
            value={displayValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`e.g.\n- Always lead with impact metrics\n- Target senior backend roles only\n- Prefer Python over Node.js\n- Keep bullet points concise (max 20 words)\n- Include all cloud/devops experience`}
            rows={7}
            className="w-full text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-y transition-all leading-relaxed"
          />
          <div className="flex items-center gap-2 justify-between">
            <span className="text-[10px] text-zinc-500 font-mono">
              {displayValue.trim().split(/\s+/).filter(Boolean).length} words · Ctrl+S to save
            </span>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                saved
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                  : isDirty
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-zinc-950 text-zinc-600 border border-zinc-800 cursor-not-allowed'
              }`}
            >
              {saved ? 'Saved' : isDirty ? 'Save Rules' : 'Saved'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
