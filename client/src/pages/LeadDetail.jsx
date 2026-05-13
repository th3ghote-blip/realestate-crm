import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { leads as leadsApi } from '../api/client.js';
import ConversationThread from '../components/ConversationThread.jsx';
import StageSelector from '../components/StageSelector.jsx';
import {
  FINANCING_TYPES,
  SOURCE_LABELS,
  STAGE_BY_KEY,
  formatPrice,
} from '../lib/leadConstants.js';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notes, setNotes] = useState('');
  const [notesSavedAt, setNotesSavedAt] = useState(null);
  const notesTimer = useRef(null);

  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyResult, setReplyResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await leadsApi.get(id);
      setData(fresh);
      setNotes(fresh.lead.notes || '');
    } catch (err) {
      setError(err.response?.status === 404 ? 'Lead no encontrado' : 'No se pudo cargar el lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleNotesChange(e) {
    const next = e.target.value;
    setNotes(next);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      try {
        await leadsApi.patch(id, { notes: next });
        setNotesSavedAt(new Date());
      } catch {
        // surface in the UI later; for now stay silent
      }
    }, 800);
  }

  async function updateField(field, value) {
    setData((prev) => prev && { ...prev, lead: { ...prev.lead, [field]: value } });
    try {
      await leadsApi.patch(id, { [field]: value });
    } catch {
      // revert by reloading
      load();
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setReplyBusy(true);
    setReplyResult(null);
    try {
      const result = await leadsApi.sendMessage(id, { channel: 'email', body: reply });
      setReply('');
      setReplyResult(result.delivery);
      await load();
    } catch {
      setReplyResult({ status: 'failed', error: 'request_failed' });
    } finally {
      setReplyBusy(false);
    }
  }

  async function logWhatsAppOpened() {
    if (!data?.suggestedMessage) return;
    try {
      await leadsApi.sendMessage(id, { channel: 'whatsapp_link', body: data.suggestedMessage });
      await load();
    } catch {
      // non-fatal
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Cargando…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const { lead, waLink, suggestedMessage } = data;
  const needsQualification = lead.listing?.financingEligible === false && lead.qualificationStatus !== 'qualified';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900">
          ← Volver
        </button>
        <span className="text-xs text-slate-500">{SOURCE_LABELS[lead.source] || lead.source}</span>
      </div>

      <header className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold shrink-0">
            {lead.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{lead.name}</h1>
            <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
              {lead.email && <span className="truncate">{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
            </div>
          </div>
        </div>

        {needsQualification && (
          <div className="text-sm rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 px-3 py-2">
            ⚠ Este inmueble requiere cualificación de financiación antes de avanzar.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">Etapa</div>
            <StageSelector value={lead.status} onChange={(v) => updateField('status', v)} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">Financiación</div>
            <div className="flex gap-1.5">
              {FINANCING_TYPES.map((f) => {
                const active = f.key === lead.financingType;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => updateField('financingType', f.key)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {lead.listing && (
        <Link
          to="/listings"
          className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3 hover:border-slate-300"
        >
          {lead.listing.images?.[0] ? (
            <img src={lead.listing.images[0]} alt="" className="h-16 w-20 object-cover rounded-lg shrink-0" />
          ) : (
            <div className="h-16 w-20 bg-slate-100 rounded-lg shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{lead.listing.title}</div>
            <div className="text-sm text-slate-600">{formatPrice(lead.listing.price)}</div>
            {lead.listing.status === 'off_market' && (
              <div className="text-xs text-red-600 font-medium">Fuera de mercado</div>
            )}
          </div>
        </Link>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Notas</h2>
          {notesSavedAt && <span className="text-xs text-slate-400">Guardado · {notesSavedAt.toLocaleTimeString('es-ES')}</span>}
        </div>
        <textarea
          className="input min-h-[88px] resize-y"
          placeholder="Notas privadas sobre este lead…"
          value={notes}
          onChange={handleNotesChange}
        />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Conversación</h2>
        <ConversationThread messages={lead.messages} />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 sticky bottom-0">
        <h2 className="font-semibold">Acciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={logWhatsAppOpened}
              className="btn bg-emerald-600 text-white hover:bg-emerald-700 w-full"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <button disabled className="btn bg-slate-100 text-slate-400 w-full">
              Sin teléfono
            </button>
          )}
          {lead.listing?.url && (
            <a href={lead.listing.url} target="_blank" rel="noreferrer" className="btn-secondary w-full">
              Ver anuncio
            </a>
          )}
        </div>

        <form onSubmit={handleSendReply} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Responder por email</label>
            {!lead.email && <span className="text-xs text-slate-400">Sin email del lead</span>}
          </div>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder={lead.email ? 'Escribe tu respuesta…' : 'Este lead no tiene email registrado.'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={!lead.email || replyBusy}
          />
          {replyResult && (
            <div className={`text-xs ${replyResult.status === 'sent' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {replyResult.status === 'sent' && 'Email enviado.'}
              {replyResult.status === 'logged_only' && 'Guardado en el historial. Configura SendGrid en .env para enviar.'}
              {replyResult.status === 'failed' && `Error: ${replyResult.error}`}
            </div>
          )}
          <button className="btn-primary" disabled={!lead.email || !reply.trim() || replyBusy}>
            {replyBusy ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </form>

        {suggestedMessage && (
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">Mensaje sugerido para WhatsApp</summary>
            <pre className="whitespace-pre-wrap font-sans mt-2 text-slate-600">{suggestedMessage}</pre>
          </details>
        )}
      </section>
    </div>
  );
}
