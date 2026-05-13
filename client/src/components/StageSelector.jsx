import { STAGES } from '../lib/leadConstants.js';

export default function StageSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGES.map((s) => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.key)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
              active
                ? `${s.cls} border-transparent`
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
