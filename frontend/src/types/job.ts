export interface JobRequirementEntry {
  requirement_type: 'skill' | 'education' | 'experience' | 'certification';
  value: string;
  importance: 'MANDATORY' | 'PREFERRED' | 'NICE_TO_HAVE';
}

export interface JobSkillEntry {
  name: string;
  importance: 'MANDATORY' | 'PREFERRED' | 'NICE_TO_HAVE';
  years_required?: number | null;
}

export interface JobData {
  title: string;
  company: string;
  location?: string | null;
  work_arrangement?: string | null;
  seniority?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  summary?: string | null;
  requirements: JobRequirementEntry[];
  skills: JobSkillEntry[];
  ats_keywords: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  parsed_data: JobData;
  created_at: string;
}
