import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listings as listingsApi } from '../api/client.js';
import PropertyCard from '../components/PropertyCard.jsx';

export default function Listings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const { listings } = await listingsApi.list();
      setItems(listings);
    } catch {
      setError('No se pudieron cargar los inmuebles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleFinancing(listing) {
    const next = !listing.financingEligible;
    setItems((prev) => prev.map((l) => (l.id === listing.id ? { ...l, financingEligible: next } : l)));
    try {
      await listingsApi.patch(listing.id, { financingEligible: next });
    } catch {
      // revert on failure
      setItems((prev) => prev.map((l) => (l.id === listing.id ? { ...l, financingEligible: !next } : l)));
    }
  }

  const active = items.filter((l) => l.status === 'active');
  const offMarket = items.filter((l) => l.status === 'off_market');

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Inmuebles</h1>
        <Link to="/listings/import" className="btn-primary text-sm">+ Importar</Link>
      </div>

      {loading && <div className="text-sm text-slate-500">Cargando…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-slate-700 font-medium mb-1">Sin inmuebles aún</div>
          <p className="text-sm text-slate-500 mb-3">
            Importa tu cartera de Idealista o Fotocasa para empezar.
          </p>
          <Link to="/listings/import" className="btn-primary text-sm">Importar cartera</Link>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 mb-2">Activos · {active.length}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((l) => (
              <li key={l.id}>
                <PropertyCard listing={l} onToggleFinancing={() => toggleFinancing(l)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {offMarket.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 mb-2">Fuera de mercado · {offMarket.length}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
            {offMarket.map((l) => (
              <li key={l.id}>
                <PropertyCard listing={l} onToggleFinancing={() => toggleFinancing(l)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
