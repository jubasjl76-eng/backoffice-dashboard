import { useEffect, useState } from 'react';
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

const NAV_LINK =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';

function NavItems({ inboxPulse, onNavigate }: { inboxPulse: boolean; onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <>
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${NAV_LINK} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`
          }
        >
          <span className="w-4 text-center text-xs opacity-70" aria-hidden="true">{n.icon}</span>
          <span>{t(n.key)}</span>
          {n.to === '/inbox' && inboxPulse && (
            <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-rose-400 motion-reduce:animate-none" aria-label={t('nav.newCare')} />
          )}
        </NavLink>
      ))}
    </>
  );
}

function AccountBlock({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const { t, label } = useT();
  return (
    <div className="border-t border-slate-800 pt-3">
      <div className="px-3 pb-2 text-xs">
        <div className="truncate text-slate-300">{user?.name || user?.email}</div>
        <div className="text-slate-500">{label('role', user?.role)}</div>
      </div>
      <LocaleSwitch className="mb-2 px-1" />
      <Btn variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
        {t('nav.signOut')}
      </Btn>
    </div>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [inboxPulse, setInboxPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useStream((e) => {
    if (e.type === 'exception' && e.action === 'created') {
      setInboxPulse(true);
      setTimeout(() => setInboxPulse(false), 4000);
    }
  });

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function signOut() {
    await logout();
    nav('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-500 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        {t('nav.skip')}
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 p-3 sm:flex">
        <div className="px-3 pb-6 pt-3">
          <div className="text-lg font-bold text-white">🐾 {t('app.brand')}</div>
          <div className="text-xs text-slate-500">{t('app.console')}</div>
        </div>
        <nav className="flex-1 space-y-0.5" aria-label={t('nav.main')}>
          <NavItems inboxPulse={inboxPulse} />
        </nav>
        <AccountBlock onSignOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 sm:hidden">
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={t('nav.openMenu')}
          >
            ☰
          </Btn>
          <div className="flex-1 font-semibold text-white">{t('app.brand')}</div>
          <LocaleSwitch />
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-30 sm:hidden">
            <button type="button" className="absolute inset-0 bg-black/50" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)} />
            <div
              id="mobile-nav"
              className="absolute inset-y-0 left-0 flex w-60 flex-col border-r border-slate-800 bg-slate-950 p-3 shadow-xl"
            >
              <div className="flex items-center justify-between px-3 pb-4 pt-2">
                <div>
                  <div className="font-bold text-white">🐾 {t('app.brand')}</div>
                  <div className="text-xs text-slate-500">{t('app.console')}</div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setMenuOpen(false)} aria-label={t('nav.closeMenu')}>✕</Btn>
              </div>
              <nav className="flex-1 space-y-0.5" aria-label={t('nav.main')}>
                <NavItems inboxPulse={inboxPulse} onNavigate={() => setMenuOpen(false)} />
              </nav>
              <AccountBlock onSignOut={signOut} />
            </div>
          </div>
        )}

        <main id="main" className="min-w-0 flex-1" tabIndex={-1}>
          <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
