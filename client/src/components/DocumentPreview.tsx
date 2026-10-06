import { FileText, AlertTriangle } from 'lucide-react';

interface Props {
  document: string;
}

export default function DocumentPreview({ document }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <FileText size={16} className="text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-700">Draft Document</h2>
      </div>

      {/* Fictional disclaimer */}
      <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>Fictional Personal Wishes Document — Not Legal Advice.</strong>{' '}
          This is a demonstration only and has no legal standing.
        </span>
      </div>

      {/* Document content */}
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 font-mono bg-slate-50 rounded-lg p-4 border border-slate-100 max-h-[400px] overflow-y-auto scrollbar-thin">
          {document}
        </pre>
      </div>
    </div>
  );
}
