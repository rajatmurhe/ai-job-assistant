export function LoadingSpinner({
  label = 'Loading...',
  size = 'md',
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (size === 'sm') {
    return <span className="inline-block h-4 w-4 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />;
  }
  return (
    <div className="flex items-center justify-center gap-3 text-xs font-medium text-zinc-400 py-12 glass-card rounded-2xl border border-zinc-800 my-4">
      <span className={`rounded-full border-2 border-zinc-600 border-t-white animate-spin ${size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'}`} />
      <span>{label}</span>
    </div>
  );
}
