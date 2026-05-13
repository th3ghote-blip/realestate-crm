import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getAgent } from '../auth.js';

const tabs = [
  { to: '/inbox', label: 'Bandeja' },
  { to: '/listings', label: 'Inmuebles' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/settings', label: 'Ajustes' },
];

export default function AppShell() {
  const agent = getAgent();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">R</div>
            <div className="font-semibold">CRM Inmobiliario</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-slate-600">{agent?.name}</span>
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
              Salir
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                  tab.disabled
                    ? 'text-slate-300 cursor-not-allowed border-transparent pointer-events-none'
                    : isActive
                    ? 'text-brand-700 border-brand-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
