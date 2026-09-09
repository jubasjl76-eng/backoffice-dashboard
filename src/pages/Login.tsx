import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LocaleSwitch } from '../components/LocaleSwitch';
import { Btn, Field, Input } from '../components/ui';
import { useT } from '../i18n';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login, session } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('owner@smartpet.local');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={loc.state?.from || '/'} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-200">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-white">🐾 {t('app.brand')}</div>
            <div className="text-sm text-slate-500">{t('app.console')}</div>
          </div>
          <LocaleSwitch />
        </div>
        <Field label={t('login.email')}>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t('login.password')}>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <Btn type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? t('login.busy') : t('login.submit')}
        </Btn>
      </form>
    </div>
  );
}
