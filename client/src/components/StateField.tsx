import { CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react';
import type { Field } from '../types/api';

interface Props {
  label: string;
  field: Field<unknown>;
  renderValue?: (value: unknown) => string;
}

const STATUS_CONFIG = {
  confirmed: {
    icon: CheckCircle2,
    badge: 'Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-500',
  },
  unconfirmed: {
    icon: AlertTriangle,
    badge: 'Unconfirmed',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-500',
  },
  unknown: {
    icon: HelpCircle,
    badge: 'Unknown',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    iconClass: 'text-slate-400',
  },
} as const;

export default function StateField({ label, field, renderValue }: Props) {
  const config = STATUS_CONFIG[field.status];
  const Icon = config.icon;

  const displayValue =
    field.value !== null && field.value !== undefined
      ? renderValue
        ? renderValue(field.value)
        : String(field.value)
      : null;

  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-b-0">
      <Icon size={14} className={`flex-shrink-0 mt-0.5 ${config.iconClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </span>
          <span
            className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${config.badgeClass}`}
          >
            {config.badge}
          </span>
        </div>
        {displayValue ? (
          <p className="mt-0.5 text-sm text-slate-800 break-words">{displayValue}</p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400 italic">Not yet provided</p>
        )}
      </div>
    </div>
  );
}
