import { useState } from 'react';

export default function InboundEmailBanner({ address }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-brand-50 p-4">
      <div className="text-sm font-semibold text-brand-700 mb-1">Tu dirección única para reenviar leads</div>
      <p className="text-sm text-slate-700 mb-3">
        Reenvía aquí los emails de Idealista y Fotocasa. Cada lead aparecerá automáticamente en tu bandeja.
      </p>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
        <code className="text-sm flex-1 truncate">{address}</code>
        <button onClick={handleCopy} className="btn-secondary text-xs py-1 px-2">
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
