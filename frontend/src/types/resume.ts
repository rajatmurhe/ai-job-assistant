export interface CandidateInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field?: string | null;
  gpa?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  achievements: string[];
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  bullets: string[];
  technologies: string[];
}

export interface SkillEntry {
  name: string;
  category?: string | null;
  years?: number | null;
  proficiency?: string | null;
  context?: string | null;
}

export interface ProjectEntry {
  name: string;
  description?: string | null;
  technologies: string[];
  url?: string | null;
}

export interface CertificationEntry {
  name: string;
  issuer?: string | null;
  date?: string | null;
}

export interface ResumeData {
  candidate: CandidateInfo;
  summary?: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  variant_name?: string;
  target_role?: string;
  notes?: string;
}

export interface Resume {
  id: string;
  file_name: string;
  parsed_data: ResumeData;
  created_at: string;
  is_active_version?: boolean;
}

