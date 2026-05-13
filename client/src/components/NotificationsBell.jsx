import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notifications as notificationsApi } from '../api/client.js';
import { formatRelative } from '../lib/leadConstants.js';

const TYPE_LABEL = {
  off_market: 'Fuera de mercado',
  qualification_needed: 'Cualificación',
  follow_up_reminder: 'Seguimiento',
};

export default function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60_000);
    return () => clearInterval(t);
  }, []);

  async function refreshCount() {
    try {
      const { count } = await notificationsApi.count();
      setCount(count);
    } catch {
      // ignore
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const { notifications: list } = await notificationsApi.list();
        setItems(list);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
  }

  async function dismiss(id) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setCount((c) => Math.max(0, c - 1));
    try { await notificationsApi.dismiss(id); } catch {}
  }

  async function dismissAll() {
    setItems([]);
    setCount(0);
    try { await notificationsApi.dismissAll(); } catch {}
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative text-slate-600 hover:text-slate-900 p-1.5"
        aria-label="Notificaciones"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <div className="font-medium text-sm">Notificaciones</div>
              {items.length > 0 && (
                <button onClick={dismissAll} className="text-xs text-slate-500 hover:text-slate-900">
                  Descartar todas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && <div className="p-3 text-sm text-slate-500">Cargando…</div>}
              {!loading && items.length === 0 && (
                <div className="p-6 text-sm text-slate-500 text-center">Sin notificaciones</div>
              )}
              {items.map((n) => (
                <div key={n.id} className="px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-brand-700">{TYPE_LABEL[n.type] || n.type}</div>
                      <div className="text-sm text-slate-800">{n.message || 'Notificación'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {n.lead && (
                          <Link
                            to={`/leads/${n.lead.id}`}
                            onClick={() => setOpen(false)}
                            className="text-xs text-brand-700 hover:underline"
                          >
                            Ver lead →
                          </Link>
                        )}
                        <span className="text-[10px] text-slate-400">{formatRelative(n.createdAt)}</span>
                      </div>
                    </div>
                    <button onClick={() => dismiss(n.id)} className="text-slate-400 hover:text-slate-700 text-sm" aria-label="Descartar">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
