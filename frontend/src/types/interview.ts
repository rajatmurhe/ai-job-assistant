export interface InterviewQuestion {
  id: number;
  category: string;
  question: string;
  coaching_note: string;
  difficulty: string;
}

export interface InterviewGuide {
  resume_id: string;
  job_id: string;
  job_title: string;
  company: string;
  questions: InterviewQuestion[];
  company_prep_notes: string;
  opening_pitch: string;
}
