import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useStream } from '../lib/stream';
import { Btn } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▚', end: true },
  { to: '/inbox', label: 'Care inbox', icon: '⬤' },
  { to: '/animals', label: 'Animals', icon: '🐕' },
  { to: '/pens', label: 'Pens', icon: '▦' },
  { to: '/litters', label: 'Litters', icon: '⬢' },
  { to: '/buyers', label: 'Buyers', icon: '👥' },
  { to: '/meds', label: 'Medications', icon: '💊' },
  { to: '/vaccinations', label: 'Vaccinations', icon: '💉' },
  { to: '/rules', label: 'Rules', icon: '⚙' },
  { to: '/devices', label: 'Devices', icon: '📟' },
  { to: '/ops', label: 'Ops', icon: '🛠' },
  { to: '/website', label: 'Website', icon: '🌐' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [inboxPulse, setInboxPulse] = useState(false);

  // a tiny global signal so the sidebar dot flashes when something lands
  useStream((e) => {
    if (e.type === 'exception' && e.action === 'created') {
      setInboxPulse(true);
      setTimeout(() => setInboxPulse(false), 4000);
    }
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 p-3 sm:flex">
        <div className="px-3 pb-6 pt-3">
          <div className="text-lg font-bold text-white">🐾 Smart Pet</div>
          <div className="text-xs text-slate-500">Breeder console</div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <span className="w-4 text-center text-xs opacity-70">{n.icon}</span>
              <span>{n.label}</span>
              {n.to === '/inbox' && inboxPulse && (
                <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-rose-400 motion-reduce:animate-none" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-3">
          <div className="px-3 pb-2 text-xs">
            <div className="truncate text-slate-300">{user?.name || user?.email}</div>
            <div className="text-slate-500 capitalize">{user?.role}</div>
          </div>
          <Btn
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await logout();
              nav('/login');
            }}
          >
            Sign out
          </Btn>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
