import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard as dashboardApi } from '../api/client.js';
import { STAGES, formatRelative } from '../lib/leadConstants.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch(() => setError('No se pudo cargar el resumen'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Cargando…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Resumen</h1>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Leads · 7 días" value={data.leadsThisWeek} />
        <Stat label="Leads · 30 días" value={data.leadsThisMonth} />
        <Stat label="Inmuebles activos" value={data.listingsActive} />
        <Stat label="Fuera de mercado" value={data.listingsOffMarket} muted />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Pipeline</h2>
        <div className="space-y-2">
          {STAGES.map((s) => {
            const count = data.byStage[s.key] || 0;
            const total = STAGES.reduce((acc, st) => acc + (data.byStage[st.key] || 0), 0) || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="w-24 sm:w-32 text-sm">{s.label}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.dot}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-10 text-right text-sm font-medium">{count}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-right">
          <Link to="/pipeline" className="text-xs text-brand-700 hover:underline">Ver pipeline completo →</Link>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Sin contacto en 48h+</h2>
        {data.followUps.length === 0 ? (
          <div className="text-sm text-slate-500">Todo al día.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.followUps.map((l) => (
              <li key={l.id}>
                <Link to={`/leads/${l.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{l.name}</div>
                    <div className="text-xs text-slate-500 truncate">{l.listing || 'Sin inmueble'}</div>
                  </div>
                  <div className="text-xs text-slate-400 ml-2 shrink-0">{formatRelative(l.lastActivityAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Actividad reciente</h2>
        {data.recentActivity.length === 0 ? (
          <div className="text-sm text-slate-500">Sin actividad.</div>
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((m) => (
              <li key={m.id} className="text-sm">
                <Link to={`/leads/${m.leadId}`} className="block hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        m.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {m.direction === 'inbound' ? '↓' : '↑'}
                    </span>
                    <span className="font-medium truncate">{m.leadName}</span>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">{formatRelative(m.sentAt)}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate pl-6">{m.body}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, muted }) {
  return (
    <div className={`rounded-2xl border p-3 ${muted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
