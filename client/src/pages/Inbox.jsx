import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leads as leadsApi } from '../api/client.js';
import { getAgent } from '../auth.js';
import LeadCard from '../components/LeadCard.jsx';
import InboundEmailBanner from '../components/InboundEmailBanner.jsx';

export default function Inbox() {
  const agent = getAgent();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    leadsApi
      .list()
      .then((data) => {
        if (!cancelled) setLeads(data.leads || []);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los leads');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <InboundEmailBanner address={agent?.inboundEmailAddress} />

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Bandeja</h1>
        <span className="text-sm text-slate-500">{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</span>
      </div>

      {loading && <div className="text-sm text-slate-500">Cargando…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && leads.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-slate-700 font-medium mb-1">Aún no hay leads</div>
          <p className="text-sm text-slate-500">
            Reenvía un email de Idealista o Fotocasa a tu dirección única y aparecerá aquí en segundos.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link to={`/leads/${lead.id}`} className="block">
              <LeadCard lead={lead} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
