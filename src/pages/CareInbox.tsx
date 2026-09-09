import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Btn, Card, Drawer, EmptyState, Field, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { severityClass } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';
import { useStream } from '../lib/stream';

interface Exception {
  id: string;
  title: string;
  detail: string | null;
  severity: 'critical' | 'warning' | 'info';
  kind: string;
  status: string;
  created_at: string;
  snoozed_until: string | null;
  escalation_step: number;
  suggested_action: string | null;
  animal_name?: string | null;
  pen_name?: string | null;
  assigned_to?: string | null;
  livePriority?: number;
}
interface InboxResp {
  items: Exception[];
  counts: { open: number; critical: number; snoozed: number };
}
interface Notification {
  channel: string;
  status: string;
  subject: string | null;
  created_at: string;
  sent_at: string | null;
}

const FILTERS = [
  { key: 'active', label: 'inbox.needsAction' },
  { key: 'all', label: 'common.all' },
  { key: 'resolved', label: 'inbox.resolved' },
  { key: 'snoozed', label: 'inbox.snoozedFilter' },
] as const;

export function CareInbox() {
  const { t, label } = useT();
  const { timeAgo } = useDates();
  const [filter, setFilter] = useState('active');
  const q = useQuery<InboxResp>(`/breeder/inbox?status=${filter}`);
  const overdueVax = useQuery<{ records: { id: string }[] }>('/breeder/vaccinations?status=overdue');
  const overdueN = overdueVax.data?.records.length ?? 0;
  const [run, busy] = useMutation();
  const [openId, setOpenId] = useState<string | null>(null);

  useStream((e) => {
    if (e.type === 'exception' || e.type === 'notification') q.reload();
  });

  const act = useCallback(
    async (id: string, transition: string, body?: Record<string, unknown>) => {
      const r = await run(() => api(`/breeder/inbox/${id}/${transition}`, { method: 'POST', body: body ?? {} }));
      if (r) q.reload();
    },
    [run, q]
  );

  const items = useMemo(() => q.data?.items ?? [], [q.data]);
  const open = useMemo(() => items.find((i) => i.id === openId) ?? null, [items, openId]);

  return (
    <div className="space-y-5">
      <PageHeader title={t('inbox.title')}>
        <div className="flex gap-4 text-xs text-slate-400">
          <span><b className="text-slate-200">{q.data?.counts.open ?? 0}</b> {t('inbox.open')}</span>
          <span><b className="text-rose-300">{q.data?.counts.critical ?? 0}</b> {t('inbox.critical')}</span>
          <span><b className="text-slate-200">{q.data?.counts.snoozed ?? 0}</b> {t('inbox.snoozed')}</span>
          {overdueN > 0 && (
            <Link to="/vaccinations" className="text-rose-300 hover:underline">
              {t('inbox.vaxOverdue', { n: overdueN })}
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Btn key={f.key} size="sm" variant={filter === f.key ? 'primary' : 'ghost'} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {t(f.label)}
          </Btn>
        ))}
      </div>

      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <EmptyState title={t('inbox.loadError')} hint={q.error} />
      ) : items.length === 0 ? (
        <EmptyState title={t('inbox.zero')} hint={t('inbox.zeroHint')} />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Card className="p-3">
                <div className="flex items-start gap-3">
                  <button type="button" className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400" onClick={() => setOpenId(it.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={severityClass[it.severity] ?? severityClass.info}>{label('severity', it.severity)}</Badge>
                      <span className="text-xs text-slate-500">{label('kind', it.kind)}</span>
                      {it.status !== 'open' && (
                        <Badge className="bg-slate-700/40 text-slate-300 ring-slate-600/40">{label('inboxStatus', it.status)}</Badge>
                      )}
                      {it.escalation_step > 0 && (
                        <Badge className="bg-rose-500/15 text-rose-300 ring-rose-500/30">{t('inbox.esc', { n: it.escalation_step })}</Badge>
                      )}
                    </div>
                    <div className="mt-1 font-medium text-slate-100">{it.title}</div>
                    {it.detail && <div className="mt-0.5 text-sm text-slate-400">{it.detail}</div>}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {it.animal_name && <span>🐕 {it.animal_name}</span>}
                      {it.pen_name && <span>▦ {it.pen_name}</span>}
                      <span>{timeAgo(it.created_at)}</span>
                      {it.snoozed_until && <span>{t('inbox.snoozedUntil', { when: timeAgo(it.snoozed_until) })}</span>}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    {it.status === 'resolved' ? (
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => act(it.id, 'reopen')}>
                        {t('inbox.reopen')}
                      </Btn>
                    ) : (
                      <>
                        <Btn size="sm" variant="primary" disabled={busy} onClick={() => act(it.id, 'resolve')}>
                          {t('inbox.resolve')}
                        </Btn>
                        <Btn size="sm" disabled={busy} onClick={() => act(it.id, 'acknowledge')}>
                          {t('inbox.ack')}
                        </Btn>
                        <Btn size="sm" variant="ghost" disabled={busy} onClick={() => act(it.id, 'snooze', { minutes: 60 })}>
                          {t('inbox.snooze1h')}
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.title ?? t('inbox.careItem')}>
        {open && <Detail ex={open} onAct={act} busy={busy} />}
      </Drawer>
    </div>
  );
}

function Detail({
  ex,
  onAct,
  busy,
}: {
  ex: Exception;
  onAct: (id: string, t: string, body?: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const { t, label } = useT();
  const { timeAgo } = useDates();
  const q = useQuery<{ exception: Exception; notifications: Notification[] }>(`/breeder/inbox/${ex.id}`);
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge className={severityClass[ex.severity] ?? severityClass.info}>{label('severity', ex.severity)}</Badge>
        <Badge className="bg-slate-700/40 text-slate-300 ring-slate-600/40">{label('inboxStatus', ex.status)}</Badge>
        <span className="text-xs text-slate-500">{label('kind', ex.kind)} · {timeAgo(ex.created_at)}</span>
      </div>

      {ex.detail && <p className="text-slate-300">{ex.detail}</p>}
      {ex.suggested_action && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">{t('inbox.suggested')}</div>
          <div className="mt-1 text-slate-200">{ex.suggested_action}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn size="sm" variant="primary" disabled={busy} onClick={() => onAct(ex.id, 'resolve')}>{t('inbox.resolve')}</Btn>
        <Btn size="sm" disabled={busy} onClick={() => onAct(ex.id, 'acknowledge')}>{t('inbox.acknowledge')}</Btn>
        <Btn size="sm" disabled={busy} onClick={() => onAct(ex.id, 'snooze', { minutes: 60 })}>{t('inbox.snooze1h')}</Btn>
        <Btn size="sm" disabled={busy} onClick={() => onAct(ex.id, 'snooze', { minutes: 480 })}>{t('inbox.snooze8h')}</Btn>
        <Btn size="sm" variant="danger" disabled={busy} onClick={() => onAct(ex.id, 'escalate')}>{t('inbox.escalate')}</Btn>
      </div>

      <AssignRow ex={ex} onAct={onAct} busy={busy} />

      <div>
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t('inbox.notifHistory')}</div>
        {q.loading ? (
          <Spinner />
        ) : q.data && q.data.notifications.length ? (
          <ul className="space-y-1.5">
            {q.data.notifications.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{label('channel', n.channel)}</Badge>
                <span className={n.status === 'sent' ? 'text-emerald-400' : n.status === 'failed' ? 'text-rose-400' : 'text-slate-400'}>
                  {n.status}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-500">{n.subject}</span>
                <span className="text-slate-600">{timeAgo(n.sent_at ?? n.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">{t('inbox.noNotifs')}</p>
        )}
      </div>
    </div>
  );
}

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
}

function AssignRow({
  ex,
  onAct,
  busy,
}: {
  ex: Exception;
  onAct: (id: string, t: string, body?: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const { t } = useT();
  const { user } = useAuth();
  const team = useQuery<{ users: TeamUser[] }>(user?.role === 'owner' ? '/users' : null);
  const people =
    team.data?.users.filter((u) => u.active) ??
    (user ? [{ id: user.id, email: user.email, name: user.name, active: true }] : []);
  const [who, setWho] = useState(ex.assigned_to ?? user?.id ?? '');
  const assigned = people.find((p) => p.id === ex.assigned_to);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{t('inbox.assignedTo')}</div>
      <p className="mt-1 text-slate-200">
        {assigned ? assigned.name || assigned.email : ex.assigned_to ? t('inbox.someone') : t('inbox.unassigned')}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label={t('inbox.staff')}>
          <Select value={who} onChange={(e) => setWho(e.target.value)} aria-label={t('inbox.assignAria')}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name || p.email}</option>
            ))}
          </Select>
        </Field>
        <Btn size="sm" disabled={busy || !who} onClick={() => onAct(ex.id, 'assign', { userId: who })}>
          {t('inbox.assign')}
        </Btn>
        {user && (
          <Btn size="sm" variant="ghost" disabled={busy} onClick={() => onAct(ex.id, 'assign', { userId: user.id })}>
            {t('inbox.assignToMe')}
          </Btn>
        )}
      </div>
    </div>
  );
}
