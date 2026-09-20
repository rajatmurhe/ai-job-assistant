export interface SubScores {
  required_skills: number;
  preferred_skills: number;
  experience: number;
  education: number;
  projects: number;
  semantic: number;
  ats_keywords: number;
}

export interface GapAnalysis {
  strong: string[];
  partial: string[];
  missing: string[];
  transferable: string[];
}

export interface AtsAnalysis {
  ats_score: number;
  keyword_coverage_score: number;
  keywords_present: string[];
  keywords_missing: string[];
  formatting_issues: string[];
}

export type Recommendation =
  | 'STRONGLY_APPLY'
  | 'APPLY'
  | 'APPLY_WITH_CAUTION'
  | 'IMPROVE_FIRST'
  | 'DO_NOT_APPLY';

export interface MatchReport {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  recommendation: Recommendation;
  sub_scores: SubScores;
  gap_analysis: GapAnalysis;
  ats_analysis: AtsAnalysis;
}
