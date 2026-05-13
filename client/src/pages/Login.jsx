import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client.js';
import { setSession } from '../auth.js';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await auth.login(form);
      setSession(data);
      navigate('/inbox', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error === 'invalid_credentials' ? 'Email o contraseña incorrectos' : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">R</div>
          <div>
            <div className="font-semibold">CRM Inmobiliario</div>
            <div className="text-xs text-slate-500">Idealista · Fotocasa · WhatsApp</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" required value={form.password} onChange={update('password')} autoComplete="current-password" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="text-sm text-slate-600 mt-4 text-center">
          ¿No tienes cuenta? <Link to="/signup" className="text-brand-700 font-medium">Crear cuenta</Link>
        </div>
      </div>
    </div>
  );
}
