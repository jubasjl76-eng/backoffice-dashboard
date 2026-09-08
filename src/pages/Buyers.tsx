import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { titleCase } from '../lib/format';

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
  notes: string | null;
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
  const q = useQuery<{ buyers: Buyer[] }>('/breeder/litters/buyers/list');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', notes: '' });

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
      })
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

  const buyers = q.data?.buyers ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Buyers & waitlist">
        <Btn variant="primary" onClick={() => setAdding(true)}>Add buyer</Btn>
      </PageHeader>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.name} onClick={create}>Save</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : buyers.length === 0 ? (
        <EmptyState title="No buyers yet" hint="Add prospective puppy buyers to build your waitlist." />
      ) : (
        <ul className="space-y-2">
          {buyers.map((b) => (
            <li key={b.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {b.waitlist_rank != null && <span className="text-xs text-slate-600">#{b.waitlist_rank}</span>}
                    <span className="font-medium text-slate-100">{b.name}</span>
                    <Badge className={STATUS_TONE[b.status] ?? STATUS_TONE.waitlist}>{titleCase(b.status)}</Badge>
                    {b.deposit_paid && <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">deposit</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    {b.email && <span>{b.email}</span>}
                    {b.phone && <span>{b.phone}</span>}
                    {b.city && <span>{b.city}</span>}
                    {b.litter_name && <span>wants {b.litter_name}</span>}
                    {b.puppy_name && <span>→ {b.puppy_name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    className="w-32 !py-1 text-xs"
                    value={b.status}
                    disabled={busy}
                    onChange={(e) => patch(b.id, { status: e.target.value })}
                    aria-label={`${b.name} status`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </Select>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => patch(b.id, { depositPaid: !b.deposit_paid })}
                  >
                    {b.deposit_paid ? 'Clear deposit' : 'Mark deposit'}
                  </Btn>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
