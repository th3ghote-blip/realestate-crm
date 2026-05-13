import { useState } from 'react';
import { auth as authApi } from '../api/client.js';
import { getAgent, getToken, setSession } from '../auth.js';
import InboundEmailBanner from '../components/InboundEmailBanner.jsx';

export default function Settings() {
  const initial = getAgent();
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    idealistaProfileUrl: initial?.idealistaProfileUrl || '',
    fotocasaProfileUrl: initial?.fotocasaProfileUrl || '',
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  if (!initial) return null;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name || undefined,
        phone: form.phone || null,
        idealistaProfileUrl: form.idealistaProfileUrl || null,
        fotocasaProfileUrl: form.fotocasaProfileUrl || null,
      };
      const { agent } = await authApi.updateProfile(payload);
      setSession({ token: getToken(), agent });
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <InboundEmailBanner address={initial.inboundEmailAddress} />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Perfil</h2>

        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input" value={initial.email} disabled />
        </div>

        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={form.phone} onChange={update('phone')} type="tel" placeholder="+34 600 000 000" />
        </div>

        <h2 className="font-semibold pt-2">Perfiles portales</h2>
        <p className="text-xs text-slate-500 -mt-2">
          Guarda aquí tus URLs de perfil. Cuando la API oficial de Idealista esté aprobada, las usaremos para sincronizar tu cartera automáticamente.
        </p>

        <div>
          <label className="label">URL Idealista Pro</label>
          <input
            className="input"
            value={form.idealistaProfileUrl}
            onChange={update('idealistaProfileUrl')}
            placeholder="https://www.idealista.com/pro/tu-agencia/"
            type="url"
          />
        </div>

        <div>
          <label className="label">URL Fotocasa</label>
          <input
            className="input"
            value={form.fotocasaProfileUrl}
            onChange={update('fotocasaProfileUrl')}
            placeholder="https://www.fotocasa.es/es/inmobiliaria/tu-agencia/"
            type="url"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {savedAt && <div className="text-sm text-emerald-700">Guardado · {savedAt.toLocaleTimeString('es-ES')}</div>}

        <button className="btn-primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
