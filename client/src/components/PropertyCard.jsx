const typeLabels = {
  apartment: 'Piso',
  house: 'Casa',
  finca: 'Finca',
  commercial: 'Comercial',
  land: 'Terreno',
  other: 'Otro',
};

function formatPrice(price) {
  if (!price) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
}

export default function PropertyCard({ listing, onToggleFinancing }) {
  const cover = listing.images?.[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="aspect-[4/3] bg-slate-100 relative">
        {cover ? (
          <img src={cover} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Sin foto</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/95 text-slate-700 font-medium">
            {typeLabels[listing.propertyType] || listing.propertyType}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/95 text-slate-700 font-medium capitalize">
            {listing.source}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-semibold truncate">{listing.title}</div>
          <div className="font-semibold text-slate-900 shrink-0">{formatPrice(listing.price)}</div>
        </div>
        {listing.location && <div className="text-xs text-slate-500 truncate">{listing.location}</div>}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={listing.financingEligible}
              onChange={onToggleFinancing}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Apto financiación
          </label>
          {listing.url && (
            <a href={listing.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 font-medium hover:underline">
              Ver anuncio →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
