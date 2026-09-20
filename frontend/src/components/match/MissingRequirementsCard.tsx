'use client';

import { useState } from 'react';
import type { GapAnalysis, AtsAnalysis } from '@/types/match';

interface MissingRequirementsProps {
  gapAnalysis: GapAnalysis;
  atsAnalysis: AtsAnalysis;
}

export function MissingRequirementsCard({ gapAnalysis, atsAnalysis }: MissingRequirementsProps) {
  const [checkedGaps, setCheckedGaps] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'skills' | 'keywords'>('all');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const missingSkills = gapAnalysis.missing || [];
  const missingKeywords = atsAnalysis.keywords_missing || [];
  const formattingIssues = atsAnalysis.formatting_issues || [];

  // Combine unique missing items
  const allMissingItems = Array.from(new Set([...missingSkills, ...missingKeywords]));

  const toggleCheck = (item: string) => {
    setCheckedGaps((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const completedCount = allMissingItems.filter((item) => checkedGaps[item]).length;
  const progressPercent = allMissingItems.length > 0 ? Math.round((completedCount / allMissingItems.length) * 100) : 100;

  // Helper to generate context-aware bridge tips
  const getActionTip = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes('excel') || lower.includes('spreadsheet') || lower.includes('table')) {
      return {
        category: 'Data Analysis & Spreadsheets',
        tip: 'Highlight analytical problem-solving, structured data manipulation, and metrics reporting from your past projects.',
        badge: 'Bridge via Analytics',
      };
    }
    if (lower.includes('tableau') || lower.includes('powerbi') || lower.includes('alteryx') || lower.includes('bi')) {
      return {
        category: 'Business Intelligence & Visualization',
        tip: 'Mention Python data libraries (Pandas, Seaborn, Matplotlib) or dashboard/reporting experience to demonstrate rapid tool mastery.',
        badge: 'Transferable Tooling',
      };
    }
    if (lower.includes('carbon') || lower.includes('esg') || lower.includes('sustainability') || lower.includes('ghg') || lower.includes('csrd')) {
      return {
        category: 'Domain & Regulatory Compliance',
        tip: 'Emphasize structured regulatory compliance, auditing standards, greenhouse gas accounting foundations, and metric modeling.',
        badge: 'Domain Specific',
      };
    }
    if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure') || lower.includes('gcp')) {
      return {
        category: 'Cloud & Distributed Infrastructure',
        tip: 'Frame your containerization (Docker, Kubernetes) and microservice backend experience as foundational cloud competencies.',
        badge: 'Core Infra',
      };
    }
    if (lower.includes('sql') || lower.includes('database') || lower.includes('nosql')) {
      return {
        category: 'Database & Data Storage',
        tip: 'Demonstrate relational schema design, query optimization, indexing, and transactional integrity.',
        badge: 'Data Layer',
      };
    }
    return {
      category: 'Core Job Qualification',
      tip: 'If you have relevant coursework, personal projects, or parallel experience, highlight it explicitly in your portfolio or interview answers.',
      badge: 'Actionable Gap',
    };
  };

  const copyMissingList = () => {
    const text = `Missing Requirements for Target Role:\n\n- Missing Skills:\n${missingSkills.map((s) => `  - ${s}`).join('\n')}\n\n- Missing ATS Keywords:\n${missingKeywords.map((k) => `  - ${k}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    const dateStr = new Date().toLocaleString();
    const lines: string[] = [];

    lines.push('================================================================================');
    lines.push('JOB MATCH GAP ANALYSIS & REMEDIATION ACTION PLAN');
    lines.push('AI Job Assistant — Autonomous Application Intelligence');
    lines.push(`Generated: ${dateStr}`);
    lines.push('================================================================================');
    lines.push('');
    lines.push('EXECUTIVE SUMMARY & PROGRESS METRICS');
    lines.push('--------------------------------------------------------------------------------');
    lines.push(`- Total Gaps Detected            : ${allMissingItems.length}`);
    lines.push(`- Missing Technical/Domain Skills : ${missingSkills.length}`);
    lines.push(`- Missing ATS Keywords           : ${missingKeywords.length}`);
    lines.push(`- Formatting/Parsing Warnings    : ${formattingIssues.length}`);
    lines.push(`- Preparation & Bridge Progress  : ${completedCount} of ${allMissingItems.length} addressed (${progressPercent}%)`);
    lines.push('');
    lines.push('================================================================================');
    lines.push('SECTION 1: MISSING TECHNICAL & DOMAIN SKILLS (JOB REQUIREMENTS)');
    lines.push('================================================================================');
    lines.push('The following skills are specified in the job posting but not found in your resume:');
    lines.push('');

    if (missingSkills.length === 0) {
      lines.push('No missing technical skills detected. All target requirements are present.');
    } else {
      missingSkills.forEach((skill, idx) => {
        const { category, tip } = getActionTip(skill);
        const status = checkedGaps[skill] ? '[STATUS: ADDRESSED / PREPARED]' : '[STATUS: PENDING]';
        lines.push(`${idx + 1}. ${skill} - ${category}: Required qualification by target job posting. Remediation & Bridge Strategy: ${tip} ${status}`);
        lines.push('');
      });
    }

    lines.push('================================================================================');
    lines.push('SECTION 2: MISSING ATS TARGET KEYWORDS (SEARCH & FILTERING DENSITY)');
    lines.push('================================================================================');
    lines.push('The following keywords are expected by Applicant Tracking Systems for this posting:');
    lines.push('');

    if (missingKeywords.length === 0) {
      lines.push('All target ATS keywords are covered in your resume.');
    } else {
      missingKeywords.forEach((kw, idx) => {
        const { category, tip } = getActionTip(kw);
        const status = checkedGaps[kw] ? '[STATUS: ADDRESSED / PREPARED]' : '[STATUS: PENDING]';
        lines.push(`${idx + 1}. ${kw} - ${category}: Relevant keyword for ATS indexing. Context & Talking Points: ${tip} ${status}`);
        lines.push('');
      });
    }

    if (formattingIssues.length > 0) {
      lines.push('================================================================================');
      lines.push('SECTION 3: ATS FORMATTING & PARSING WARNINGS');
      lines.push('================================================================================');
      formattingIssues.forEach((issue, idx) => {
        lines.push(`${idx + 1}. ${issue} - Formatting Warning: This structural pattern may hinder automated resume parsers. Recommend adopting standard single-column headers without complex tables.`);
        lines.push('');
      });
    }

    lines.push('================================================================================');
    lines.push('TRUTHFULNESS CONTRACT & ETHICAL APPLICATION GUIDELINES');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('1. Never fabricate or insert skills you do not possess into your resume.');
    lines.push('2. Use the detailed strategies above to articulate how your existing competencies');
    lines.push('   (e.g. Python, SQL, Cloud Architecture) transfer directly to the missing tools.');
    lines.push('3. When preparing for technical or behavioral interviews, use this document as a');
    lines.push('   study guide to proactively address any perceived qualification gaps.');
    lines.push('================================================================================');

    const fileContent = lines.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-match-gap-remediation-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const displayedItems =
    activeTab === 'skills'
      ? missingSkills
      : activeTab === 'keywords'
      ? missingKeywords
      : allMissingItems;

  return (
    <div className="glass-card rounded-2xl p-6 border border-zinc-800 bg-zinc-900/60 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            Gap Analysis & Remediation
          </div>
          <h3 className="font-display font-bold text-xl text-white tracking-tight flex items-center gap-2">
            <span>Missing Requirements & Keyword Gaps</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {allMissingItems.length} Total
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            These required skills and ATS keywords from the target job posting were not detected in your selected resume. Use the action tips, checklist, or downloadable report to bridge them before applying.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={downloadTextFile}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all"
          >
            {downloaded ? 'Downloaded' : 'Download Report (.txt)'}
          </button>
          <button
            onClick={copyMissingList}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all"
          >
            {copied ? 'Copied' : 'Copy Gap List'}
          </button>
        </div>
      </div>

      {/* Progress & Stats Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 w-full sm:w-1/2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Preparation Progress</span>
            <span className="font-mono font-bold text-zinc-200">
              {completedCount} of {allMissingItems.length} addressed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-zinc-200 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({allMissingItems.length})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'skills' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Missing Skills ({missingSkills.length})
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'keywords' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ATS Keywords ({missingKeywords.length})
          </button>
        </div>
      </div>

      {/* Missing Items Interactive Grid */}
      {displayedItems.length === 0 ? (
        <div className="p-8 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800 text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-300">No missing items in this view</p>
          <p className="text-xs text-zinc-500">Your resume satisfies the target criteria in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedItems.map((item) => {
            const isChecked = !!checkedGaps[item];
            const { category, tip, badge } = getActionTip(item);
            const isSkill = missingSkills.includes(item);
            const isKeyword = missingKeywords.includes(item);

            return (
              <div
                key={item}
                onClick={() => toggleCheck(item)}
                className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                  isChecked
                    ? 'bg-zinc-950 border-zinc-700 opacity-60'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-zinc-300 border-zinc-300 text-black font-bold text-[10px]'
                            : 'bg-zinc-950 border-zinc-700 text-transparent hover:border-zinc-500'
                        }`}
                      >
                        ✓
                      </div>
                      <span
                        className={`font-semibold text-sm tracking-tight ${
                          isChecked ? 'line-through text-zinc-500' : 'text-zinc-100'
                        }`}
                      >
                        {item}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isSkill && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Skill Gap
                        </span>
                      )}
                      {isKeyword && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800">
                          ATS Keyword
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Context:</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
                        {category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      <strong className="text-zinc-200 font-medium">Strategy:</strong> {tip}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-mono">
                    {isChecked ? 'Marked as Addressed' : 'Click card to check off'}
                  </span>
                  <span className="text-zinc-300 font-semibold">
                    {badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Truthfulness & Compliance Footer Note */}
      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-3">
        <div className="text-xs text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200 font-semibold">Truthfulness Guarantee:</strong> Our AI generator intentionally leaves out these missing skills during resume tailoring to protect you from resume fabrication. Use this list to prepare interview answers explaining how your existing competencies bridge these requirements.
        </div>
      </div>
    </div>
  );
}
