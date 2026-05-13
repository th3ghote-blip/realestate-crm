export const STAGES = [
  { key: 'new', label: 'Nuevo', cls: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  { key: 'contacted', label: 'Contactado', cls: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  { key: 'qualified', label: 'Cualificado', cls: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  { key: 'viewing', label: 'Visita', cls: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' },
  { key: 'offer', label: 'Oferta', cls: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  { key: 'closed', label: 'Cerrado', cls: 'bg-emerald-200 text-emerald-900', dot: 'bg-emerald-700' },
  { key: 'lost', label: 'Perdido', cls: 'bg-slate-200 text-slate-600', dot: 'bg-slate-500' },
];

export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export const FINANCING_TYPES = [
  { key: 'unknown', label: 'Sin definir' },
  { key: 'mortgage', label: 'Hipoteca' },
  { key: 'cash', label: 'Efectivo' },
];

export const SOURCE_LABELS = {
  idealista: 'Idealista',
  fotocasa: 'Fotocasa',
  direct: 'Directo',
};

export function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-ES');
}

export function formatPrice(price) {
  if (!price) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
}
