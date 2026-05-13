import { getAgent } from '../auth.js';
import InboundEmailBanner from '../components/InboundEmailBanner.jsx';

export default function Settings() {
  const agent = getAgent();
  if (!agent) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <InboundEmailBanner address={agent.inboundEmailAddress} />

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Perfil</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium">{agent.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{agent.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Teléfono</dt>
            <dd className="font-medium">{agent.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Idealista</dt>
            <dd className="font-medium truncate">{agent.idealistaProfileUrl || 'Sin conectar'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fotocasa</dt>
            <dd className="font-medium truncate">{agent.fotocasaProfileUrl || 'Sin conectar'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
