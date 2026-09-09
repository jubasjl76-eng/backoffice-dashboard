import { useState } from 'react';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMutation, useQuery } from '../lib/useApi';

interface SetupStatus {
  setupComplete: boolean;
  canAdminister: boolean;
  kennel: { slug: string; name: string; breedFocus: string | null; timezone: string } | null;
  steps: Record<string, boolean>;
  counts: { pens: number; animals: number; rules: number; devices: number };
}
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  created_at: string;
}
interface Invite {
  token: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function Settings() {
  const { t, label } = useT();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const status = useQuery<SetupStatus>('/setup/status');
  const [run, busy] = useMutation();

  // saved values come from the server; `edit` is an overlay of unsaved changes
  const saved = {
    name: status.data?.kennel?.name ?? '',
    breedFocus: status.data?.kennel?.breedFocus ?? '',
    timezone: status.data?.kennel?.timezone ?? 'UTC',
  };
  const [edit, setEdit] = useState<Partial<typeof saved>>({});
  const k = { ...saved, ...edit };

  async function saveKennel() {
    const r = await run(() =>
      api('/setup/kennel', { method: 'POST', body: { name: k.name, breedFocus: k.breedFocus || undefined, timezone: k.timezone } })
    );
    if (r) {
      setEdit({});
      status.reload();
    }
  }
  async function complete() {
    const r = await run(() => api('/setup/complete', { method: 'POST' }));
    if (r) status.reload();
  }
  async function seedDemo() {
    if (!confirm(t('settings.seedConfirm'))) return;
    const r = await run(() => api('/setup/seed-demo', { method: 'POST' }));
    if (r) status.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} />

      <Card className="p-5">
        <h2 className="mb-3 font-medium text-slate-200">{t('settings.kennel')}</h2>
        {status.loading && !status.data ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('common.name')}><Input value={k.name} disabled={!status.data?.canAdminister} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label={t('settings.breedFocus')}><Input value={k.breedFocus} disabled={!status.data?.canAdminister} onChange={(e) => setEdit({ ...edit, breedFocus: e.target.value })} /></Field>
              <Field label={t('settings.timezone')}><Input value={k.timezone} disabled={!status.data?.canAdminister} onChange={(e) => setEdit({ ...edit, timezone: e.target.value })} /></Field>
            </div>
            {status.data?.canAdminister && (
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" disabled={busy || !k.name} onClick={saveKennel}>{t('common.save')}</Btn>
                {!status.data.setupComplete && (
                  <Btn disabled={busy} onClick={complete}>{t('settings.markComplete')}</Btn>
                )}
                <Btn variant="ghost" disabled={busy} onClick={seedDemo}>{t('settings.seed')}</Btn>
              </div>
            )}
            {status.data && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {Object.entries(status.data.steps).map(([step, done]) => (
                  <Badge
                    key={step}
                    className={done ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' : 'bg-slate-800 text-slate-500 ring-slate-700'}
                  >
                    {done ? '✓' : '○'} {label('setupStep', step)}
                  </Badge>
                ))}
                <span className="text-slate-600">
                  {t('settings.counts', {
                    pens: status.data.counts.pens,
                    dogs: status.data.counts.animals,
                    rules: status.data.counts.rules,
                    devices: status.data.counts.devices,
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {isOwner ? <Team busy={busy} run={run} /> : (
        <Card className="p-5 text-sm text-slate-500">{t('settings.ownersOnly')}</Card>
      )}
    </div>
  );
}

function Team({ busy, run }: { busy: boolean; run: ReturnType<typeof useMutation>[0] }) {
  const { t, label } = useT();
  const { shortDate, timeAgo } = useDates();
  const users = useQuery<{ users: User[] }>('/users');
  const invites = useQuery<{ invites: Invite[] }>('/users/invites');
  const { user: me } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [lastLink, setLastLink] = useState<string | null>(null);

  async function invite() {
    const r = await run(() => api<{ invite: { acceptUrl: string } }>('/users/invite', { method: 'POST', body: { email, role } }));
    if (r) {
      setLastLink(r.invite.acceptUrl);
      setEmail('');
      invites.reload();
    }
  }
  async function patchUser(id: string, body: Record<string, unknown>) {
    const r = await run(() => api(`/users/${id}`, { method: 'PATCH', body }));
    if (r) users.reload();
  }
  async function revoke(token: string) {
    const r = await run(() => api(`/users/invites/${token}`, { method: 'DELETE' }));
    if (r) invites.reload();
  }

  const openInvites = (invites.data?.invites ?? []).filter((i) => !i.accepted_at);

  return (
    <>
      <Card className="p-5">
        <h2 className="mb-3 font-medium text-slate-200">{t('settings.team')}</h2>
        {users.loading && !users.data ? (
          <Spinner />
        ) : (
          <ul className="space-y-1.5">
            {(users.data?.users ?? []).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 border-t border-slate-800 py-2 text-sm first:border-0">
                <div className="min-w-0 flex-1">
                  <span className="text-slate-100">{u.name || u.email}</span>
                  <span className="ml-2 text-xs text-slate-500">{u.email}</span>
                </div>
                {!u.active && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{t('common.inactive')}</Badge>}
                <Select
                  className="w-24 !py-1 text-xs"
                  value={u.role}
                  disabled={busy || u.id === me?.id}
                  onChange={(e) => patchUser(u.id, { role: e.target.value })}
                  aria-label={t('settings.roleOf', { email: u.email })}
                >
                  <option value="staff">{label('role', 'staff')}</option>
                  <option value="owner">{label('role', 'owner')}</option>
                </Select>
                {u.id !== me?.id && (
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => patchUser(u.id, { active: !u.active })}>
                    {u.active ? t('settings.deactivate') : t('settings.reactivate')}
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-medium text-slate-200">{t('settings.invite')}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('common.email')}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t('common.role')}>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">{label('role', 'staff')}</option>
              <option value="owner">{label('role', 'owner')}</option>
            </Select>
          </Field>
          <Btn variant="primary" disabled={busy || !email} onClick={invite}>{t('settings.createInvite')}</Btn>
        </div>
        {lastLink && (
          <p className="mt-3 break-all rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
            {t('settings.inviteHint')}<br />
            <span className="text-indigo-300">{lastLink}</span>
          </p>
        )}
        {openInvites.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {openInvites.map((i) => (
              <li key={i.token} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-300">{i.email}</span>
                <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{label('role', i.role)}</Badge>
                <span className="text-xs text-slate-600">{t('settings.exp', { date: shortDate(i.expires_at) })} · {timeAgo(i.created_at)}</span>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => revoke(i.token)}>{t('settings.revoke')}</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
