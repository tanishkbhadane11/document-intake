export default function LoadingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10" className="animate-spin origin-center" />
        </svg>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-4" role="status" aria-label="Assistant is typing">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-1" />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-2" />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-3" />
        </div>
      </div>
    </div>
  );
}
