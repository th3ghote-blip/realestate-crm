import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { leads as leadsApi } from '../api/client.js';
import { STAGES, formatRelative } from '../lib/leadConstants.js';

export default function Pipeline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    leadsApi
      .list()
      .then((d) => setItems(d.leads || []))
      .catch(() => setError('No se pudieron cargar los leads'))
      .finally(() => setLoading(false));
  }, []);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, []]));
    for (const l of items) {
      if (map[l.status]) map[l.status].push(l);
    }
    return map;
  }, [items]);

  if (loading) return <div className="text-sm text-slate-500">Cargando…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <span className="text-sm text-slate-500">{items.length} {items.length === 1 ? 'lead' : 'leads'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STAGES.map((stage) => {
          const leads = byStage[stage.key];
          return (
            <div key={stage.key} className="bg-slate-100 rounded-2xl p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                <span className="text-xs text-slate-500 bg-white rounded-full px-1.5 min-w-[20px] text-center">{leads.length}</span>
              </div>
              <ul className="space-y-1.5 mt-1">
                {leads.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/leads/${l.id}`}
                      className="block bg-white rounded-lg p-2.5 border border-transparent hover:border-slate-300"
                    >
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {l.listing?.title || 'Sin inmueble'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{formatRelative(l.lastActivityAt)}</div>
                    </Link>
                  </li>
                ))}
                {leads.length === 0 && (
                  <li className="text-xs text-slate-400 px-2.5 py-3 text-center">vacío</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
