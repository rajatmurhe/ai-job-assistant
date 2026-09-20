export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-4 flex items-center justify-between gap-2.5 my-3 shadow-sm">
      <span className="leading-relaxed font-medium">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-800"
        >
          ✕
        </button>
      )}
    </div>
  );
}
