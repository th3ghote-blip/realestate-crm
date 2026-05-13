import { STAGE_BY_KEY, SOURCE_LABELS, formatRelative } from '../lib/leadConstants.js';

export default function LeadCard({ lead }) {
  const stage = STAGE_BY_KEY[lead.status] || STAGE_BY_KEY.new;
  const needsQualification =
    lead.listing?.financingEligible === false && lead.qualificationStatus !== 'qualified';

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0">
          {lead.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{lead.name}</div>
            <div className="text-xs text-slate-500 shrink-0">{formatRelative(lead.lastActivityAt)}</div>
          </div>
          <div className="text-sm text-slate-600 truncate">
            {lead.listing?.title || 'Sin inmueble vinculado'}
          </div>
          {lead.lastMessage?.body && (
            <div className="text-sm text-slate-500 truncate mt-0.5">{lead.lastMessage.body}</div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.cls}`}>{stage.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {SOURCE_LABELS[lead.source] || lead.source}
            </span>
            {needsQualification && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                ⚠ Cualificar financiación
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
