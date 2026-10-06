import { ClipboardList } from 'lucide-react';
import StateField from './StateField';
import type { PersonalWishesState, Child, Executor, SpecificGift } from '../types/api';

interface Props {
  state: PersonalWishesState;
}

export default function StatePanel({ state }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <ClipboardList size={16} className="text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-700">Collected Information</h2>
      </div>

      <div className="px-4 py-2">
        <StateField label="Full Name" field={state.full_name} />

        <StateField label="Home Address" field={state.home_address} />

        <StateField
          label="Worldwide Assets"
          field={state.covers_worldwide_assets}
          renderValue={(v) => (v as boolean) ? 'Yes' : 'No'}
        />

        <StateField
          label="Has Children"
          field={state.has_children}
          renderValue={(v) => (v as boolean) ? 'Yes' : 'No'}
        />

        <StateField
          label="Children"
          field={state.children}
          renderValue={(v) => {
            const children = v as Child[];
            if (!children.length) return 'None listed';
            return children
              .map((c) => c.age !== undefined ? `${c.name} (age ${c.age})` : c.name)
              .join(', ');
          }}
        />

        <StateField
          label="Executor"
          field={state.executor}
          renderValue={(v) => {
            const exec = v as Executor;
            return `${exec.name} (${exec.relationship})`;
          }}
        />

        <StateField
          label="Specific Gifts"
          field={state.specific_gifts}
          renderValue={(v) => {
            const gifts = v as SpecificGift[];
            if (!gifts.length) return 'None listed';
            return gifts.map((g) => `${g.item} → ${g.recipient}`).join('; ');
          }}
        />

        <StateField label="Additional Wishes" field={state.additional_wishes} />
      </div>
    </div>
  );
}
