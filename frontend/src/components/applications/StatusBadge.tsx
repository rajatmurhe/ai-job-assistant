import type { ApplicationStatus } from '@/types/application';

const STYLES: Record<ApplicationStatus, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: 'bg-zinc-950', text: 'text-zinc-400', border: 'border-zinc-800', dot: 'bg-zinc-600' },
  READY: { bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-zinc-700', dot: 'bg-zinc-500' },
  APPLIED: { bg: 'bg-zinc-800', text: 'text-zinc-200', border: 'border-zinc-600', dot: 'bg-zinc-400' },
  IN_REVIEW: { bg: 'bg-zinc-800', text: 'text-zinc-200', border: 'border-zinc-600', dot: 'bg-zinc-400' },
  INTERVIEWING: { bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-500', dot: 'bg-zinc-200' },
  OFFER: { bg: 'bg-white', text: 'text-black', border: 'border-white', dot: 'bg-black' },
  REJECTED: { bg: 'bg-zinc-950', text: 'text-zinc-500', border: 'border-zinc-800', dot: 'bg-zinc-700' },
  WITHDRAWN: { bg: 'bg-zinc-950', text: 'text-zinc-500', border: 'border-zinc-800', dot: 'bg-zinc-700' },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const style = STYLES[status] || STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{status.replace('_', ' ')}</span>
    </span>
  );
}
