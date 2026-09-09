import { useState } from 'react';
import { DocumentsPanel } from '../components/Documents';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { useMutation, useQuery } from '../lib/useApi';

interface Buyer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  deposit_paid: boolean;
  waitlist_rank: number | null;
  litter_name: string | null;
  puppy_name: string | null;
  puppy_id: string | null;
  wants_litter_id: string | null;
  notes: string | null;
}
interface Litter {
  id: string;
  name: string | null;
  dam_name: string | null;
  sire_name: string | null;
}
interface Message {
  id: string;
  buyer_id: string;
  buyer_name: string | null;
  kind: string;
  subject: string;
  body: string;
  delivery_status: string | null;
  created_at: string;
}
interface Sub {
  id: string;
  buyer_id: string;
  puppy_id: string;
  buyer_name: string | null;
  puppy_name: string | null;
  active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
}

const STATUSES = ['waitlist', 'reserved', 'matched', 'placed', 'withdrawn'];
const STATUS_TONE: Record<string, string> = {
  waitlist: 'bg-slate-800 text-slate-300 ring-slate-700',
  reserved: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  matched: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  placed: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  withdrawn: 'bg-slate-800 text-slate-500 ring-slate-700',
};

export function Buyers() {
  const { t, label } = useT();
  const { shortDate, timeAgo } = useDates();
  const q = useQuery<{ buyers: Buyer[] }>('/breeder/litters/buyers/list');
  const litters = useQuery<{ litters: Litter[] }>('/breeder/litters');
  const messages = useQuery<{ messages: Message[] }>('/breeder/buyers/messages');
  const subs = useQuery<{ subscriptions: Sub[] }>('/breeder/buyers/update-pack/subscriptions');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', notes: '' });
  const [broadcast, setBroadcast] = useState(false);
  const [bc, setBc] = useState({ subject: '', body: '', litterId: '', status: '' });
  const [msgFor, setMsgFor] = useState<Buyer | null>(null);
  const [dm, setDm] = useState({ subject: '', body: '' });
  const [papersFor, setPapersFor] = useState<Buyer | null>(null);

  async function create() {
    const r = await run(() =>
      api('/breeder/litters/buyers', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          city: form.city || undefined,
          notes: form.notes || undefined,
        },
      }),
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', email: '', phone: '', city: '', notes: '' });
      q.reload();
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const r = await run(() => api(`/breeder/litters/buyers/${id}`, { method: 'PATCH', body }));
    if (r) q.reload();
  }

  async function sendBroadcast() {
    const r = await run(() =>
      api<{ sent: number }>('/breeder/buyers/messages/broadcast', {
        method: 'POST',
        body: {
          subject: bc.subject,
          body: bc.body,
          litterId: bc.litterId || undefined,
          status: bc.status || undefined,
        },
      }),
    );
    if (r) {
      alert(r.sent === 1 ? t('buyers.queuedOne') : t('buyers.queuedMany', { n: r.sent }));
      setBroadcast(false);
      setBc({ subject: '', body: '', litterId: '', status: '' });
      messages.reload();
    }
  }

  async function sendDirect() {
    if (!msgFor) return;
    const r = await run(() =>
      api(`/breeder/buyers/messages/${msgFor.id}`, {
        method: 'POST',
        body: { subject: dm.subject, body: dm.body },
      }),
    );
    if (r) {
      setMsgFor(null);
      setDm({ subject: '', body: '' });
      messages.reload();
    }
  }

  function subFor(b: Buyer): Sub | undefined {
    if (!b.puppy_id) return undefined;
    return (subs.data?.subscriptions ?? []).find((s) => s.buyer_id === b.id && s.puppy_id === b.puppy_id);
  }

  async function togglePack(b: Buyer) {
    if (!b.puppy_id) return;
    const existing = subFor(b);
    const r = await run(() =>
      existing
        ? api(`/breeder/buyers/update-pack/subscriptions/${existing.id}`, {
            method: 'PATCH',
            body: { active: !existing.active },
          })
        : api('/breeder/buyers/update-pack/subscribe', {
            method: 'POST',
            body: { buyerId: b.id, puppyId: b.puppy_id },
          }),
    );
    if (r) subs.reload();
  }

  async function runSweep() {
    const r = await run(() => api<{ sent: number }>('/breeder/buyers/update-pack/run', { method: 'POST' }));
    if (r) {
      alert(r.sent === 1 ? t('buyers.sentOne') : t('buyers.sentMany', { n: r.sent }));
      subs.reload();
      messages.reload();
    }
  }

  const buyers = q.data?.buyers ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('buyers.title')}>
        <Btn onClick={() => setBroadcast(true)}>{t('buyers.broadcast')}</Btn>
        <Btn variant="primary" onClick={() => setAdding(true)}>{t('buyers.add')}</Btn>
      </PageHeader>

      {broadcast && (
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">{t('buyers.broadcast')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('buyers.litterOptional')}>
              <Select value={bc.litterId} onChange={(e) => setBc({ ...bc, litterId: e.target.value })}>
                <option value="">{t('buyers.allLitters')}</option>
                {(litters.data?.litters ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || `${l.dam_name ?? '?'} × ${l.sire_name ?? '?'}`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('buyers.statusOptional')}>
              <Select value={bc.status} onChange={(e) => setBc({ ...bc, status: e.target.value })}>
                <option value="">{t('buyers.anyStatus')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{label('buyerStatus', s)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('common.subject')}>
              <Input value={bc.subject} onChange={(e) => setBc({ ...bc, subject: e.target.value })} />
            </Field>
            <Field label={t('common.body')} hint={t('buyers.bodyHint')}>
              <Input value={bc.body} onChange={(e) => setBc({ ...bc, body: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !bc.subject || !bc.body} onClick={sendBroadcast}>
              {t('common.send')}
            </Btn>
            <Btn variant="ghost" onClick={() => setBroadcast(false)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('common.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t('common.email')}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label={t('common.phone')}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={t('common.city')}><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label={t('common.notes')}><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.name} onClick={create}>{t('common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      {msgFor && (
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">{t('buyers.message', { name: msgFor.name })}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('common.subject')}>
              <Input value={dm.subject} onChange={(e) => setDm({ ...dm, subject: e.target.value })} />
            </Field>
            <Field label={t('common.body')}>
              <Input value={dm.body} onChange={(e) => setDm({ ...dm, body: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !dm.subject || !dm.body} onClick={sendDirect}>
              {t('common.send')}
            </Btn>
            <Btn variant="ghost" onClick={() => setMsgFor(null)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : buyers.length === 0 ? (
        <EmptyState title={t('buyers.empty')} hint={t('buyers.emptyHint')} />
      ) : (
        <ul className="space-y-2">
          {buyers.map((b) => {
            const sub = subFor(b);
            return (
              <li key={b.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {b.waitlist_rank != null && <span className="text-xs text-slate-600">#{b.waitlist_rank}</span>}
                      <span className="font-medium text-slate-100">{b.name}</span>
                      <Badge className={STATUS_TONE[b.status] ?? STATUS_TONE.waitlist}>{label('buyerStatus', b.status)}</Badge>
                      {b.deposit_paid && <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">{t('buyers.deposit')}</Badge>}
                      {sub?.active && <Badge className="bg-indigo-500/15 text-indigo-300 ring-indigo-500/30">{t('buyers.weeklyPack')}</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {b.email && <span>{b.email}</span>}
                      {b.phone && <span>{b.phone}</span>}
                      {b.city && <span>{b.city}</span>}
                      {b.litter_name && <span>{t('buyers.wants', { name: b.litter_name })}</span>}
                      {b.puppy_name && <span>→ {b.puppy_name}</span>}
                      {sub?.active && sub.next_run_at && <span>{t('buyers.nextPack', { date: shortDate(sub.next_run_at) })}</span>}
                      {sub?.last_sent_at && <span>{t('buyers.lastPack', { date: shortDate(sub.last_sent_at) })}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Select
                      className="w-32 !py-1 text-xs"
                      value={b.status}
                      disabled={busy}
                      onChange={(e) => patch(b.id, { status: e.target.value })}
                      aria-label={t('buyers.statusOf', { name: b.name })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{label('buyerStatus', s)}</option>)}
                    </Select>
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => patch(b.id, { depositPaid: !b.deposit_paid })}>
                      {b.deposit_paid ? t('buyers.clearDeposit') : t('buyers.markDeposit')}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setMsgFor(b); setDm({ subject: '', body: '' }); }}>
                      {t('buyers.messageBtn')}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setPapersFor(b)}>{t('common.papers')}</Btn>
                    {b.puppy_id && (
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => togglePack(b)}>
                        {sub?.active ? t('buyers.stopPack') : t('buyers.startPack')}
                      </Btn>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-slate-200">{t('buyers.subs')}</h2>
          <Btn size="sm" disabled={busy} onClick={runSweep}>{t('buyers.sendDue')}</Btn>
        </div>
        {(subs.data?.subscriptions ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">{t('buyers.noSubs')}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {(subs.data?.subscriptions ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-t border-slate-800 py-2 first:border-0">
                <span className="text-slate-100">{s.buyer_name}</span>
                <span className="text-slate-500">→ {s.puppy_name}</span>
                <Badge className={s.active ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30' : 'bg-slate-800 text-slate-500 ring-slate-700'}>
                  {s.active ? t('common.active') : t('common.paused')}
                </Badge>
                <span className="text-xs text-slate-500">
                  {s.last_sent_at ? t('buyers.last', { date: shortDate(s.last_sent_at) }) : t('buyers.neverSent')}
                  {s.next_run_at ? ` · ${t('buyers.next', { date: shortDate(s.next_run_at) })}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">{t('buyers.msgLog')}</h2>
        {(messages.data?.messages ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">{t('buyers.nothingSent')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(messages.data?.messages ?? []).map((m) => (
              <li key={m.id} className="border-t border-slate-800 pt-2 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{m.subject}</span>
                  <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{m.kind}</Badge>
                  {m.delivery_status && (
                    <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{m.delivery_status}</Badge>
                  )}
                  <span className="text-xs text-slate-500">{m.buyer_name} · {timeAgo(m.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Drawer open={!!papersFor} onClose={() => setPapersFor(null)} title={papersFor ? t('buyers.papersTitle', { name: papersFor.name }) : t('common.papers')}>
        {papersFor && <DocumentsPanel subjectType="buyer" subjectId={papersFor.id} defaultKind="contract" generate />}
      </Drawer>
    </div>
  );
}
