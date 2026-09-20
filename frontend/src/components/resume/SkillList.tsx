'use client';

import type { SkillEntry } from '@/types/resume';

export function SkillList({ skills }: { skills: SkillEntry[] }) {
  if (!skills || skills.length === 0) {
    return <p className="text-xs text-zinc-500">No skills listed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s, idx) => (
        <span
          key={`${s.name}-${idx}`}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1 text-zinc-200 inline-flex items-center gap-1"
        >
          <span>{s.name}</span>
          {s.years && (
            <span className="text-zinc-500 text-[10px]">({s.years}y)</span>
          )}
        </span>
      ))}
    </div>
  );
}
