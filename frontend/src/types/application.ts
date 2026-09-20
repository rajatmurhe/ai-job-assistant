export type ApplicationStatus =
  | 'DRAFT' | 'READY' | 'APPLIED' | 'IN_REVIEW'
  | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

export interface Application {
  id: string;
  resume_id: string;
  job_id: string;
  status: ApplicationStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company?: string;
}
