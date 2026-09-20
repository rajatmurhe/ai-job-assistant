export interface EmailContent {
  subject: string;
  body: string;
}

export interface GeneratedDocuments {
  resume_markdown?: string | null;
  cover_letter?: string | null;
  application_email?: EmailContent | null;
  changes_made: string[];
  truthfulness_check_passed: boolean;
}
