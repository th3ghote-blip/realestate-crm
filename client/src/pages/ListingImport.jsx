import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listings as listingsApi } from '../api/client.js';
import { getAgent } from '../auth.js';

export default function ListingImport() {
  const navigate = useNavigate();
  const agent = getAgent();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const data = await listingsApi.uploadCsv(file);
      setResult(data);
      // Auto-navigate to the listings grid after a brief pause so they see the toast.
      setTimeout(() => navigate('/listings'), 1200);
    } catch (err) {
      const body = err.response?.data;
      setError(body?.message || 'No se pudo procesar el CSV');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Importar cartera</h1>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <strong>Próximamente:</strong> conexión directa con la API oficial de Idealista (en proceso de aprobación).
        Por ahora, sube tu CSV exportado desde el panel pro.
      </div>

      <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div>
          <h2 className="font-semibold mb-1">Sube tu CSV</h2>
          <p className="text-sm text-slate-600">
            Exporta tu cartera desde el panel pro de Idealista o Fotocasa y sube el archivo aquí.
            Detectamos las columnas automáticamente (Referencia, Precio, Tipo, URL, Imágenes…).
          </p>
        </div>

        <div
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            file ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div className="font-medium text-slate-800">{file.name}</div>
              <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-brand-700 mt-1 hover:underline"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              <div className="font-medium">Haz clic para seleccionar tu CSV</div>
              <div className="text-xs text-slate-500 mt-1">.csv hasta 10 MB</div>
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {result?.ok && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
            <div className="font-medium text-emerald-900">
              Importados {result.job.imported} inmuebles
            </div>
            {result.skipped > 0 && (
              <div className="text-emerald-800 text-xs mt-1">
                {result.skipped} filas omitidas (sin referencia ni URL).
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button className="btn-primary" disabled={!file || busy}>
            {busy ? 'Importando…' : 'Importar inmuebles'}
          </button>
          <a
            href="https://developers.idealista.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-700 hover:underline"
          >
            Solicitar API de Idealista →
          </a>
        </div>
      </form>

      <div className="text-xs text-slate-500 space-y-1">
        <div className="font-medium text-slate-700">Cómo exportar tu CSV</div>
        <div>
          <strong>Idealista:</strong> Panel pro → Inmuebles → "Exportar a CSV"
        </div>
        <div>
          <strong>Fotocasa:</strong> Panel agencia → Anuncios → "Descargar listado"
        </div>
      </div>

      {(agent?.idealistaProfileUrl || agent?.fotocasaProfileUrl) && (
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
          {agent.idealistaProfileUrl && <div>Idealista: <code>{agent.idealistaProfileUrl}</code></div>}
          {agent.fotocasaProfileUrl && <div>Fotocasa: <code>{agent.fotocasaProfileUrl}</code></div>}
        </div>
      )}
    </div>
  );
}
