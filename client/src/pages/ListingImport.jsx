import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listings as listingsApi } from '../api/client.js';
import { getAgent, setSession, getToken } from '../auth.js';

export default function ListingImport() {
  const navigate = useNavigate();
  const agent = getAgent();
  const [profileUrl, setProfileUrl] = useState('');
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleStart(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { job: started } = await listingsApi.startImport(profileUrl);
      setJob(started);
      pollRef.current = setInterval(() => pollJob(started.id), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar la importación');
      setBusy(false);
    }
  }

  async function pollJob(jobId) {
    try {
      const { job: fresh } = await listingsApi.getJob(jobId);
      setJob(fresh);
      if (fresh.status === 'completed' || fresh.status === 'failed') {
        clearInterval(pollRef.current);
        setBusy(false);
        if (fresh.status === 'completed') {
          // Refresh agent profile so the new profile URL is stored locally.
          // Cheap re-fetch: hit /auth/me which we already have.
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${getToken()}` } })
            .then((r) => r.json())
            .then((data) => {
              if (data?.agent) setSession({ token: getToken(), agent: data.agent });
              navigate('/listings');
            });
        }
      }
    } catch {
      // transient — keep polling
    }
  }

  const portal = /idealista\.com\/pro\//i.test(profileUrl)
    ? 'idealista'
    : /fotocasa\.es\//i.test(profileUrl)
    ? 'fotocasa'
    : null;

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Importar cartera</h1>
      <p className="text-sm text-slate-600">
        Pega tu URL de perfil Idealista Pro o Fotocasa. Importaremos todos tus inmuebles activos en segundos.
      </p>

      <form onSubmit={handleStart} className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4">
        <div>
          <label className="label">URL del perfil</label>
          <input
            className="input"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.idealista.com/pro/tu-agencia/"
            required
            disabled={busy}
          />
          <div className="text-xs text-slate-500 mt-1">
            Ejemplos:
            <ul className="list-disc list-inside">
              <li>https://www.idealista.com/pro/inmobiliaria-ejemplo/</li>
              <li>https://www.fotocasa.es/es/inmobiliaria/agencia-ejemplo-12345/</li>
            </ul>
          </div>
        </div>

        {portal && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Detectado: <strong className="capitalize">{portal}</strong>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button className="btn-primary" disabled={busy || !profileUrl}>
          {busy ? 'Importando…' : 'Importar inmuebles'}
        </button>
      </form>

      {job && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="text-sm text-slate-500">Trabajo</div>
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {job.status === 'running' && `Importando ${job.imported} de ${job.total || '?'}…`}
              {job.status === 'completed' && `Importados ${job.imported} inmuebles`}
              {job.status === 'failed' && 'Importación fallida'}
            </div>
            <StatusPill status={job.status} />
          </div>
          {job.message && <div className="text-sm text-slate-600">{job.message}</div>}
          {job.status === 'running' && (
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: job.total ? `${Math.min(100, (job.imported / job.total) * 100)}%` : '10%' }}
              />
            </div>
          )}
        </div>
      )}

      {agent?.idealistaProfileUrl && (
        <div className="text-xs text-slate-500">
          Conectado Idealista: <code>{agent.idealistaProfileUrl}</code>
        </div>
      )}
      {agent?.fotocasaProfileUrl && (
        <div className="text-xs text-slate-500">
          Conectado Fotocasa: <code>{agent.fotocasaProfileUrl}</code>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    running: ['Ejecutando', 'bg-amber-100 text-amber-800'],
    completed: ['Completado', 'bg-emerald-100 text-emerald-800'],
    failed: ['Error', 'bg-red-100 text-red-700'],
  };
  const [label, cls] = map[status] || [status, 'bg-slate-100 text-slate-700'];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}
