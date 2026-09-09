import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { titleCase } from '../lib/format';

interface Pen {
  id: string;
  name: string;
  kind: string;
  capacity: number;
  occupancy: number;
}
interface Animal {
  id: string;
  name: string;
  current_pen_id: string | null;
  status: string;
}

const KINDS = ['whelping', 'run', 'yard', 'quarantine', 'kitchen'];

export function Pens() {
  const pens = useQuery<{ pens: Pen[] }>('/breeder/animals/pens');
  const animals = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', kind: 'run', capacity: '1' });

  async function create() {
    const r = await run(() =>
      api('/breeder/animals/pens', { method: 'POST', body: { name: form.name, kind: form.kind, capacity: Number(form.capacity) } })
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', kind: 'run', capacity: '1' });
      pens.reload();
    }
  }

  async function move(animalId: string, penId: string) {
    const r = await run(() => api(`/breeder/animals/${animalId}/move`, { method: 'POST', body: { penId } }));
    if (r) {
      animals.reload();
      pens.reload();
    }
  }

  const list = pens.data?.pens ?? [];
  const dogs = (animals.data?.animals ?? []).filter((a) => a.status === 'active');
  const byPen = (penId: string) => dogs.filter((d) => d.current_pen_id === penId);
  const unassigned = dogs.filter((d) => !d.current_pen_id);

  return (
    <div className="space-y-5">
      <PageHeader title="Pens">
        <Btn variant="primary" onClick={() => setAdding(true)}>Add pen</Btn>
      </PageHeader>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Kind">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k} value={k}>{titleCase(k)}</option>)}
              </Select>
            </Field>
            <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <div className="flex items-end gap-2">
              <Btn variant="primary" disabled={busy || !form.name} onClick={create}>Save</Btn>
              <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {pens.loading && !pens.data ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No pens yet" hint="Add whelping rooms, runs and yards so you can place dogs." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const occ = byPen(p.id);
            const over = occ.length > p.capacity;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{p.name}</span>
                  <Badge className={over ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' : 'bg-slate-800 text-slate-300 ring-slate-700'}>
                    {occ.length}/{p.capacity}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{titleCase(p.kind)}</div>
                <ul className="mt-3 space-y-1.5">
                  {occ.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-slate-200">{d.name}</span>
                      <Select
                        className="w-28 !py-1 text-xs"
                        value={p.id}
                        onChange={(e) => move(d.id, e.target.value)}
                        disabled={busy}
                        aria-label={`Move ${d.name}`}
                      >
                        {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </Select>
                    </li>
                  ))}
                  {occ.length === 0 && <li className="text-xs text-slate-600">empty</li>}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {unassigned.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-200">Unassigned dogs</h2>
          <ul className="space-y-1.5">
            {unassigned.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-200">{d.name}</span>
                <Select className="w-40 !py-1 text-xs" defaultValue="" onChange={(e) => e.target.value && move(d.id, e.target.value)} disabled={busy}>
                  <option value="" disabled>Place in pen…</option>
                  {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
