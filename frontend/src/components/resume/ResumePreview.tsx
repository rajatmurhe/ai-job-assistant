/**
 * ResumePreview.tsx
 * Displays parsed resume data in a clean monochrome card layout.
 */
'use client';

import type { ResumeData } from '@/types/resume';

export function ResumePreview({ data }: { data: ResumeData }) {
  const { candidate, summary, education, experience, skills, projects, certifications } = data;

  return (
    <div className="space-y-6">
      {/* Candidate Info Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 relative overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {candidate.name || 'Unnamed Candidate'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs text-zinc-400">
              {candidate.email && <span>{candidate.email}</span>}
              {candidate.phone && <span>{candidate.phone}</span>}
              {candidate.location && <span>{candidate.location}</span>}
              {candidate.linkedin && (
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 hover:underline"
                >
                  LinkedIn
                </a>
              )}
              {candidate.github && (
                <a
                  href={candidate.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 hover:underline"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        {summary && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{summary}</p>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <Section title={`Extracted Skills (${skills.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, idx) => (
              <span
                key={`${s.name}-${idx}`}
                className="text-xs bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-xl px-3 py-1.5 font-medium flex items-center gap-1.5"
              >
                <span>{s.name}</span>
                {s.years && (
                  <span className="text-[10px] text-zinc-400 font-mono">({s.years}y)</span>
                )}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <Section title={`Work Experience (${experience.length})`}>
          <div className="space-y-6">
            {experience.map((exp, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-zinc-800 space-y-2">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-950" />
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">{exp.title}</h4>
                    <p className="text-xs text-zinc-400 font-medium">
                      {exp.company} {exp.location ? `• ${exp.location}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 shrink-0">
                    {exp.start_date ?? '?'} – {exp.is_current ? 'Present' : exp.end_date ?? '?'}
                  </span>
                </div>

                {exp.bullets.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="text-xs text-zinc-300 leading-relaxed flex gap-2">
                        <span className="text-zinc-500 shrink-0 font-bold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {exp.technologies.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md px-2 py-0.5 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="Education">
          <div className="space-y-3.5">
            {education.map((edu, i) => (
              <div
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-2 flex-wrap"
              >
                <div>
                  <div className="font-display font-bold text-sm text-white">
                    {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{edu.institution}</div>
                  {edu.gpa && <div className="text-[11px] text-zinc-500 mt-1 font-mono">GPA: {edu.gpa}</div>}
                </div>
                <span className="text-[11px] text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 shrink-0">
                  {edu.start_date ?? ''}{edu.end_date ? ` – ${edu.end_date}` : ''}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="Featured Projects">
          <div className="space-y-3">
            {projects.map((p, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white">{p.name}</span>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-300 hover:underline"
                    >
                      ↗ Live Link
                    </a>
                  )}
                </div>
                {p.description && <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{p.description}</p>}
                {p.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.technologies.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Section title="Certifications">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {certifications.map((c, i) => (
              <div
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{c.name}</span>
                  {c.issuer && <span className="text-zinc-400 block text-[11px]">{c.issuer}</span>}
                </div>
                {c.date && <span className="text-zinc-500 font-mono text-[10px]">{c.date}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
      <h3 className="font-display font-bold text-base text-white">{title}</h3>
      {children}
    </div>
  );
}
