const statusLabels = {
  new: { label: 'Nuevo', cls: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contactado', cls: 'bg-slate-100 text-slate-700' },
  qualified: { label: 'Cualificado', cls: 'bg-amber-100 text-amber-800' },
  viewing: { label: 'Visita', cls: 'bg-violet-100 text-violet-800' },
  offer: { label: 'Oferta', cls: 'bg-emerald-100 text-emerald-800' },
  closed: { label: 'Cerrado', cls: 'bg-emerald-200 text-emerald-900' },
  lost: { label: 'Perdido', cls: 'bg-slate-200 text-slate-600' },
};

const sourceLabels = {
  idealista: 'Idealista',
  fotocasa: 'Fotocasa',
  direct: 'Directo',
};

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-ES');
}

export default function LeadCard({ lead }) {
  const status = statusLabels[lead.status] || statusLabels.new;
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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {sourceLabels[lead.source] || lead.source}
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
