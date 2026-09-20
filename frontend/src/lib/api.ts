/**
 * lib/api.ts — type-safe client for the backend REST API.
 */
import type { Resume } from '@/types/resume';
import type { Job } from '@/types/job';
import type { MatchReport } from '@/types/match';
import type { GeneratedDocuments } from '@/types/generation';
import type { Application, ApplicationStatus } from '@/types/application';
import type { InterviewGuide } from '@/types/interview';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    let message = res.statusText;
    let errorCode: string | undefined;
    try {
      const body = await res.json();
      message = body.message || message;
      errorCode = body.error_code;
    } catch {
      // response wasn't JSON; keep default message
    }
    throw new ApiError(res.status, message, errorCode);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; version: string; db: string; llm_provider: string }>('/health'),

  resume: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<Resume>('/api/v1/resume', { method: 'POST', body: formData });
    },
    list: () => request<Resume[]>('/api/v1/resume'),
    get: (id: string) => request<Resume>(`/api/v1/resume/${id}`),
    remove: (id: string) => request<void>(`/api/v1/resume/${id}`, { method: 'DELETE' }),
  },

  jobs: {
    analyze: (input: { text?: string; url?: string }) =>
      request<Job>('/api/v1/jobs/analyze', { method: 'POST', body: JSON.stringify(input) }),
    list: () => request<Job[]>('/api/v1/jobs'),
    get: (id: string) => request<Job>(`/api/v1/jobs/${id}`),
  },

  match: {
    run: (resumeId: string, jobId: string) =>
      request<MatchReport>('/api/v1/match', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      }),
  },

  generate: {
    all: (resumeId: string, jobId: string, applicationId?: string) =>
      request<GeneratedDocuments>('/api/v1/generate', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId, application_id: applicationId }),
      }),
  },

  applications: {
    create: (resumeId: string, jobId: string, notes?: string) =>
      request<Application>('/api/v1/applications', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId, notes }),
      }),
    list: () => request<Application[]>('/api/v1/applications'),
    get: (id: string) => request<Application>(`/api/v1/applications/${id}`),
    updateStatus: (id: string, status: ApplicationStatus, note?: string) =>
      request<Application>(`/api/v1/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),
  },

  reports: {
    get: (id: string) => request<MatchReport & { report_markdown: string | null }>(`/api/v1/reports/${id}`),
    narrate: (id: string) =>
      request<{ report_markdown: string; score_verified: boolean }>(`/api/v1/reports/${id}/narrative`, {
        method: 'POST',
      }),
    masterPrompt: (id: string, userRules: string) =>
      request<{ master_prompt: string }>(`/api/v1/reports/${id}/master-prompt`, {
        method: 'POST',
        body: JSON.stringify({ user_rules: userRules }),
      }),
    send: (id: string, toEmail: string) =>
      request<{ sent: boolean }>(`/api/v1/reports/${id}/send?to_email=${encodeURIComponent(toEmail)}`, {
        method: 'POST',
      }),
  },

  interview: {
    prepare: (resumeId: string, jobId: string) =>
      request<InterviewGuide>('/api/v1/interview/prepare', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      }),
  },

  analytics: {
    summary: () => request<Record<string, unknown>>('/api/v1/analytics/summary'),
  },

  roadmap: {
    generate: (reportId: string) =>
      request<Record<string, unknown>>(`/api/v1/roadmap/${reportId}`, { method: 'POST' }),
  },

  linkedin: {
    optimize: (resumeId: string, jobId: string) =>
      request<Record<string, unknown>>('/api/v1/linkedin/optimize', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      }),
  },

  salary: {
    benchmark: (jobId: string, resumeId: string) =>
      request<Record<string, unknown>>('/api/v1/salary/benchmark', {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId, resume_id: resumeId }),
      }),
  },

  outreach: {
    generateEmail: (resumeId: string, jobId: string, recruiterName?: string) =>
      request<Record<string, unknown>>('/api/v1/outreach/cold-email', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId, recruiter_name: recruiterName }),
      }),
  },

  followup: {
    generate: (applicationId: string) =>
      request<Record<string, unknown>>(`/api/v1/followup/${applicationId}`, { method: 'POST' }),
  },

  ats: {
    preview: (resumeId: string, jobId: string) =>
      request<Record<string, unknown>>('/api/v1/ats/preview', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      }),
  },

  tailoredResume: {
    generate: (resumeId: string, jobId: string) =>
      request<Record<string, unknown>>('/api/v1/tailored-resume/generate', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      }),
    saveVariant: (resumeId: string, jobId: string, customVariantName?: string) =>
      request<Record<string, unknown>>('/api/v1/tailored-resume/save-variant', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId, custom_variant_name: customVariantName }),
      }),
    downloadPdf: (resumeId: string, jobId: string, fileName?: string) => {
      /**
       * Navigate directly to the Next.js GET proxy endpoint.
       * The server responds with Content-Disposition: attachment; filename="..."
       * so the browser downloads the file with the correct .pdf name — no blob
       * URL tricks needed, no UUID filenames.
       */
      const params = new URLSearchParams({ resume_id: resumeId, job_id: jobId });
      if (fileName) params.set('filename', fileName);

      // Open in the current tab — browser detects attachment and downloads without navigation
      window.location.href = `/api/download-tailored-pdf?${params.toString()}`;
    },
  },

  mockInterview: {
    start: (jobId: string, resumeId?: string) =>
      request<Record<string, unknown>>('/api/v1/mock-interview/start', {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId, resume_id: resumeId || null }),
      }),
    evaluateAnswer: (payload: {
      job_title: string;
      company?: string;
      question_id: number;
      question: string;
      category: string;
      answer: string;
    }) =>
      request<Record<string, unknown>>('/api/v1/mock-interview/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    complete: (jobTitle: string, company: string, answers: unknown[]) =>
      request<Record<string, unknown>>('/api/v1/mock-interview/complete', {
        method: 'POST',
        body: JSON.stringify({ job_title: jobTitle, company, answers }),
      }),
  },
};

