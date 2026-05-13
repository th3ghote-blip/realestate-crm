import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client.js';
import { setSession } from '../auth.js';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
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
      const data = await auth.signup(form);
      setSession(data);
      navigate('/inbox', { replace: true });
    } catch (err) {
      const code = err.response?.data?.error;
      setError(
        code === 'email_taken'
          ? 'Ya existe una cuenta con ese email'
          : code === 'invalid_input'
          ? 'Revisa los datos introducidos'
          : 'No se pudo crear la cuenta'
      );
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
            <div className="text-xs text-slate-500">2 minutos para estar operativo</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-1">Crear cuenta</h1>
        <p className="text-sm text-slate-600 mb-4">Recibirás tu dirección única para reenviar leads de Idealista y Fotocasa.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.name} onChange={update('name')} autoComplete="name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={update('password')} autoComplete="new-password" />
            <div className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres</div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-sm text-slate-600 mt-4 text-center">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-700 font-medium">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
