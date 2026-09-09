import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStream } from '../lib/stream';
import { LocaleSwitch } from './LocaleSwitch';
import { Btn } from './ui';

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: '▚' },
  { to: '/inbox', key: 'nav.inbox', icon: '⬤' },
  { to: '/animals', key: 'nav.animals', icon: '🐕' },
  { to: '/pens', key: 'nav.pens', icon: '▦' },
  { to: '/litters', key: 'nav.litters', icon: '⬢' },
  { to: '/calendar', key: 'nav.calendar', icon: '📅' },
  { to: '/buyers', key: 'nav.buyers', icon: '👥' },
  { to: '/meds', key: 'nav.meds', icon: '💊' },
  { to: '/vaccinations', key: 'nav.vaccinations', icon: '💉' },
  { to: '/rules', key: 'nav.rules', icon: '⚙' },
  { to: '/devices', key: 'nav.devices', icon: '📟' },
  { to: '/fleet', key: 'nav.fleet', icon: '📡' },
  { to: '/ops', key: 'nav.ops', icon: '🛠' },
  { to: '/website', key: 'nav.website', icon: '🌐' },
  { to: '/templates', key: 'nav.templates', icon: '📄' },
  { to: '/notifications', key: 'nav.notifications', icon: '🔔' },
  { to: '/privacy', key: 'nav.privacy', icon: '🔒' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️' },
] as const;

export function Layout() {
  const { user, logout } = useAuth();
  const { t, label } = useT();
  const nav = useNavigate();
  const [inboxPulse, setInboxPulse] = useState(false);

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
          <div className="text-lg font-bold text-white">🐾 {t('app.brand')}</div>
          <div className="text-xs text-slate-500">{t('app.console')}</div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <span className="w-4 text-center text-xs opacity-70">{n.icon}</span>
              <span>{t(n.key)}</span>
              {n.to === '/inbox' && inboxPulse && (
                <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-rose-400 motion-reduce:animate-none" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-3">
          <div className="px-3 pb-2 text-xs">
            <div className="truncate text-slate-300">{user?.name || user?.email}</div>
            <div className="text-slate-500">{label('role', user?.role)}</div>
          </div>
          <LocaleSwitch className="mb-2 px-1" />
          <Btn
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await logout();
              nav('/login');
            }}
          >
            {t('nav.signOut')}
          </Btn>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="flex justify-end px-4 pt-4 sm:hidden">
          <LocaleSwitch />
        </div>
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
