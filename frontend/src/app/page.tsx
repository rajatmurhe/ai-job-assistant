'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const [health, setHealth] = useState<{ status: string; db: string; llm_provider: string } | null>(null);
  const [stats, setStats] = useState<{ resumes: number; jobs: number; apps: number }>({ resumes: 0, jobs: 0, apps: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.health(),
      api.resume.list(),
      api.jobs.list(),
      api.applications.list(),
    ]).then(([healthRes, resumesRes, jobsRes, appsRes]) => {
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      else setError('Backend API is currently unreachable. Make sure Docker is running.');

      setStats({
        resumes: resumesRes.status === 'fulfilled' ? resumesRes.value.length : 0,
        jobs: jobsRes.status === 'fulfilled' ? jobsRes.value.length : 0,
        apps: appsRes.status === 'fulfilled' ? appsRes.value.length : 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-6 md:p-8 border border-zinc-800 bg-zinc-900/60">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-4 border border-zinc-700">
            Autonomous Application Intelligence
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Accelerate Your Job Search with <span className="gradient-text">Deterministic AI</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
            Upload your resume, analyze any job description, and get instant deterministic match scores, deep skill gap analysis, and tailored, hallucination-free application documents.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/resume"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all"
            >
              Upload Resume
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold hover:bg-zinc-800 hover:text-white transition-all"
            >
              Analyze Job
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Resumes Uploaded"
          value={loading ? '...' : stats.resumes}
          subtitle="Parsed & indexed"
          href="/resume"
        />
        <MetricCard
          title="Job Postings"
          value={loading ? '...' : stats.jobs}
          subtitle="Target positions analyzed"
          href="/jobs"
        />
        <MetricCard
          title="Applications Tracked"
          value={loading ? '...' : stats.apps}
          subtitle="In pipeline"
          href="/applications"
        />
      </div>

      {/* Action Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold text-white tracking-tight">
          Application Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <WorkflowCard
            step="01"
            href="/resume"
            title="Resume Ingestion"
            description="Upload PDF, DOCX, or TXT resumes. Automatically extract structured skills, timeline, and projects."
            badge="Extraction"
          />
          <WorkflowCard
            step="02"
            href="/jobs"
            title="JD Matching & Scoring"
            description="Run our deterministic 7-dimension scoring engine with zero score fabrication or LLM score drift."
            badge="Scoring Engine"
          />
          <WorkflowCard
            step="03"
            href="/applications"
            title="Document Tailoring & FSM"
            description="Generate verified tailored resumes, cover letters, and track applications from Draft to Offer."
            badge="Document Copilot"
          />
        </div>
      </div>

      {/* System Status Banner */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            System Telemetry & Engine Status
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-zinc-300' : 'bg-zinc-600'}`} />
            <span className="text-xs font-mono text-zinc-400">
              {health?.status === 'ok' ? 'All Systems Operational' : 'Offline / Degraded'}
            </span>
          </div>
        </div>

        {error ? (
          <div className="p-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 text-xs">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusTile label="Core REST API" value={health?.status ?? 'Connecting...'} isOk={health?.status === 'ok'} />
            <StatusTile label="PostgreSQL + Vector" value={health?.db ?? 'Connecting...'} isOk={health?.db === 'up'} />
            <StatusTile label="Active LLM Provider" value={health?.llm_provider ?? 'Connecting...'} isOk={!!health?.llm_provider} />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, href }: { title: string; value: string | number; subtitle: string; href: string }) {
  return (
    <Link href={href} className="glass-card glass-card-hover rounded-2xl p-5 block border border-zinc-800">
      <div className="text-muted text-xs font-medium uppercase tracking-wider mb-2">{title}</div>
      <div className="text-2xl md:text-3xl font-display font-extrabold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-500 font-sans">{subtitle}</div>
    </Link>
  );
}

function WorkflowCard({ step, href, title, description, badge }: { step: string; href: string; title: string; description: string; badge: string }) {
  return (
    <Link href={href} className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border border-zinc-800 group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs font-bold text-zinc-400">{step}</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
            {badge}
          </span>
        </div>
        <h3 className="font-display font-bold text-base text-white mb-2 group-hover:text-zinc-200 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
      <div className="mt-5 text-xs font-semibold text-zinc-200 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
        Get Started →
      </div>
    </Link>
  );
}

function StatusTile({ label, value, isOk }: { label: string; value: string; isOk: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${isOk ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
        {value}
      </span>
    </div>
  );
}
