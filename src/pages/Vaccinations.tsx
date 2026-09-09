import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { shortDate, titleCase } from '../lib/format';

type Status = 'overdue' | 'due' | 'upcoming' | 'done';
type Kind = 'vaccine' | 'worming';

interface Dose {
  name: string;
  atAgeDays: number;
  kind?: Kind;
}
interface Protocol {
  id: string;
  name: string;
  species: string | null;
  doses: Dose[];
  is_default: boolean;
}
interface RecordRow {
  id: string;
  name: string;
  kind: Kind;
  status: Status;
  due_on: string | null;
  given_on: string | null;
  batch_no: string | null;
  vet_name: string | null;
  certificate_url: string | null;
  notes: string | null;
  animal_id: string | null;
  puppy_id: string | null;
}
interface Animal {
  id: string;
  name: string;
}
interface Litter {
  id: string;
  name: string | null;
  dam_name: string | null;
  sire_name: string | null;
  puppy_count: number;
}

const TABS = [
  { key: 'records', label: 'Records' },
  { key: 'protocols', label: 'Protocols' },
] as const;

const STATUS_TONE: Record<Status, string> = {
  overdue: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  due: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  upcoming: 'bg-slate-800 text-slate-300 ring-slate-700',
  done: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
};

const GROUPS: Status[] = ['overdue', 'due', 'upcoming', 'done'];

function litterLabel(l: Litter): string {
  return l.name || `${l.dam_name ?? '?'} × ${l.sire_name ?? '?'}`;
}

export function Vaccinations() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('records');
  const overdue = useQuery<{ records: RecordRow[] }>('/breeder/vaccinations?status=overdue');
  const n = overdue.data?.records.length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Vaccinations">
        {n > 0 && (
          <Badge className={STATUS_TONE.overdue}>
            {n} overdue
          </Badge>
        )}
      </PageHeader>
      <div className="flex gap-1">
        {TABS.map((t) => (
          <Btn key={t.key} size="sm" variant={tab === t.key ? 'primary' : 'ghost'} onClick={() => setTab(t.key)}>
            {t.label}
          </Btn>
        ))}
      </div>
      {tab === 'records' && <Records />}
      {tab === 'protocols' && <Protocols />}
    </div>
  );
}

function Records() {
  const records = useQuery<{ records: RecordRow[] }>('/breeder/vaccinations');
  const protocols = useQuery<{ protocols: Protocol[] }>('/breeder/vaccinations/protocols');
  const animals = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const litters = useQuery<{ litters: Litter[] }>('/breeder/litters');
  const [run, busy] = useMutation();
  const [filter, setFilter] = useState('');
  const [applyTo, setApplyTo] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [giving, setGiving] = useState<string | null>(null);
  const [given, setGiven] = useState({ batchNo: '', vetName: '', certificateUrl: '', notes: '' });

  const animalName = new Map((animals.data?.animals ?? []).map((a) => [a.id, a.name]));

  function subject(r: RecordRow): string {
    if (r.animal_id) return animalName.get(r.animal_id) ?? 'Dog';
    return 'Puppy';
  }

  async function apply() {
    const [kind, id] = applyTo.split(':');
    const body: Record<string, string> = {};
    if (protocolId) body.protocolId = protocolId;
    if (kind === 'animal') body.animalId = id;
    if (kind === 'litter') body.litterId = id;
    const r = await run(() => api<{ created: number; subjects: number }>('/breeder/vaccinations/apply', { method: 'POST', body }));
    if (r) {
      alert(`Created ${r.created} record${r.created === 1 ? '' : 's'} across ${r.subjects} subject${r.subjects === 1 ? '' : 's'}. Dogs without a birth date are skipped.`);
      records.reload();
    }
  }

  async function markGiven(id: string) {
    const r = await run(() =>
      api(`/breeder/vaccinations/${id}`, {
        method: 'PATCH',
        body: {
          givenOn: new Date().toISOString().slice(0, 10),
          batchNo: given.batchNo || undefined,
          vetName: given.vetName || undefined,
          certificateUrl: given.certificateUrl || undefined,
          notes: given.notes || undefined,
        },
      }),
    );
    if (r) {
      setGiving(null);
      setGiven({ batchNo: '', vetName: '', certificateUrl: '', notes: '' });
      records.reload();
    }
  }

  const [kind, id] = filter.split(':');
  const list = (records.data?.records ?? []).filter((r) => {
    if (!filter) return true;
    if (kind === 'animal') return r.animal_id === id;
    return false;
  });

  return (
    <>
      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Apply a protocol</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Protocol">
            <Select value={protocolId} onChange={(e) => setProtocolId(e.target.value)}>
              <option value="">Default</option>
              {(protocols.data?.protocols ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_default ? ' (default)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Apply to">
            <Select value={applyTo} onChange={(e) => setApplyTo(e.target.value)}>
              <option value="">—</option>
              <optgroup label="Dogs">
                {(animals.data?.animals ?? []).map((a) => (
                  <option key={a.id} value={`animal:${a.id}`}>{a.name}</option>
                ))}
              </optgroup>
              <optgroup label="Litters (every puppy)">
                {(litters.data?.litters ?? []).map((l) => (
                  <option key={l.id} value={`litter:${l.id}`}>
                    {litterLabel(l)} · {l.puppy_count} pups
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <Btn variant="primary" disabled={busy || !applyTo} onClick={apply}>
            Apply
          </Btn>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Expands doses from the birth date. Existing dose names are left alone.
        </p>
      </Card>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Show">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All records</option>
            {(animals.data?.animals ?? []).map((a) => (
              <option key={a.id} value={`animal:${a.id}`}>{a.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      {records.loading && !records.data ? (
        <Spinner />
      ) : records.error ? (
        <EmptyState title="Couldn't load records" hint={records.error} />
      ) : list.length === 0 ? (
        <EmptyState title="No vaccination records" hint="Apply a protocol to a dog or a litter." />
      ) : (
        GROUPS.map((g) => {
          const rows = list.filter((r) => r.status === g);
          if (!rows.length) return null;
          return (
            <Card key={g} className="p-4">
              <h2 className="mb-3 font-medium text-slate-200">
                {titleCase(g)} <span className="text-slate-500">· {rows.length}</span>
              </h2>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id} className="border-t border-slate-800 pt-2 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-slate-100">{r.name}</span>
                      <span className="text-slate-500">{subject(r)}</span>
                      <Badge className={STATUS_TONE[r.status]}>{r.kind}</Badge>
                      <span className="text-xs text-slate-500">
                        {r.given_on ? `given ${shortDate(r.given_on)}` : r.due_on ? `due ${shortDate(r.due_on)}` : 'no due date'}
                      </span>
                      {r.status !== 'done' && (
                        <Btn size="sm" className="ml-auto" disabled={busy} onClick={() => setGiving(giving === r.id ? null : r.id)}>
                          Mark given
                        </Btn>
                      )}
                    </div>
                    {giving === r.id && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Field label="Batch no.">
                          <Input value={given.batchNo} onChange={(e) => setGiven({ ...given, batchNo: e.target.value })} />
                        </Field>
                        <Field label="Vet">
                          <Input value={given.vetName} onChange={(e) => setGiven({ ...given, vetName: e.target.value })} />
                        </Field>
                        <Field label="Certificate URL">
                          <Input
                            type="url"
                            placeholder="https://…"
                            value={given.certificateUrl}
                            onChange={(e) => setGiven({ ...given, certificateUrl: e.target.value })}
                          />
                        </Field>
                        <Field label="Notes">
                          <Input value={given.notes} onChange={(e) => setGiven({ ...given, notes: e.target.value })} />
                        </Field>
                        <div className="flex gap-2 sm:col-span-2">
                          <Btn size="sm" variant="primary" disabled={busy} onClick={() => markGiven(r.id)}>
                            Save
                          </Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setGiving(null)}>
                            Cancel
                          </Btn>
                        </div>
                      </div>
                    )}
                    {r.status === 'done' && (r.batch_no || r.vet_name || r.certificate_url) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {[r.vet_name, r.batch_no && `batch ${r.batch_no}`, r.certificate_url].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </>
  );
}

function emptyDose(): Dose {
  return { name: '', atAgeDays: 42, kind: 'vaccine' };
}

function Protocols() {
  const q = useQuery<{ protocols: Protocol[] }>('/breeder/vaccinations/protocols');
  const [run, busy] = useMutation();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', isDefault: false, doses: [emptyDose()] });

  function startNew() {
    setEditing('new');
    setForm({ name: '', isDefault: false, doses: [emptyDose()] });
  }
  function startEdit(p: Protocol) {
    setEditing(p.id);
    setForm({
      name: p.name,
      isDefault: p.is_default,
      doses: (p.doses ?? []).map((d) => ({
        name: d.name,
        atAgeDays: d.atAgeDays,
        kind: d.kind === 'worming' ? 'worming' : 'vaccine',
      })),
    });
  }

  async function save() {
    const doses = form.doses.filter((d) => d.name && Number.isFinite(d.atAgeDays));
    const body = { name: form.name, doses, isDefault: form.isDefault };
    const r = await run(() =>
      editing === 'new'
        ? api('/breeder/vaccinations/protocols', { method: 'POST', body })
        : api(`/breeder/vaccinations/protocols/${editing}`, { method: 'PATCH', body }),
    );
    if (r) {
      setEditing(null);
      q.reload();
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this protocol? Records already created stay.')) return;
    const r = await run(() => api(`/breeder/vaccinations/protocols/${id}`, { method: 'DELETE' }));
    if (r) q.reload();
  }

  const protocols = q.data?.protocols ?? [];

  return (
    <>
      <div className="flex justify-end">
        <Btn variant="primary" onClick={startNew}>New protocol</Btn>
      </div>
      {editing && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-950 text-indigo-500"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Default protocol
            </label>
          </div>
          <h3 className="mb-2 mt-4 text-sm font-medium text-slate-300">Doses</h3>
          <div className="mb-1 hidden grid-cols-[1fr_7rem_8rem_auto] gap-2 text-xs text-slate-500 sm:grid">
            <span>Name</span>
            <span>Age (days)</span>
            <span>Kind</span>
            <span />
          </div>
          <ul className="space-y-2">
            {form.doses.map((d, i) => (
              <li key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_8rem_auto]">
                <Input
                  aria-label="Dose name"
                  placeholder="Dose name"
                  value={d.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      doses: form.doses.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  aria-label="Age in days"
                  value={d.atAgeDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      doses: form.doses.map((x, j) => (j === i ? { ...x, atAgeDays: Number(e.target.value) || 0 } : x)),
                    })
                  }
                />
                <Select
                  aria-label="Kind"
                  value={d.kind ?? 'vaccine'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      doses: form.doses.map((x, j) => (j === i ? { ...x, kind: e.target.value as Kind } : x)),
                    })
                  }
                >
                  <option value="vaccine">Vaccine</option>
                  <option value="worming">Worming</option>
                </Select>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm({ ...form, doses: form.doses.filter((_, j) => j !== i) })}
                >
                  Remove
                </Btn>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={() => setForm({ ...form, doses: [...form.doses, emptyDose()] })}>
              Add dose
            </Btn>
            <Btn variant="primary" disabled={busy || !form.name || !form.doses.some((d) => d.name)} onClick={save}>
              Save
            </Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : protocols.length === 0 ? (
        <EmptyState title="No protocols" hint="The kennel seed usually installs a default puppy schedule." />
      ) : (
        <ul className="space-y-2">
          {protocols.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{p.name}</span>
                  {p.is_default && <Badge className="bg-indigo-500/15 text-indigo-300 ring-indigo-500/30">default</Badge>}
                  <span className="text-xs text-slate-500">{(p.doses ?? []).length} doses</span>
                  <span className="ml-auto flex gap-1">
                    <Btn size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Btn>
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(p.id)}>Delete</Btn>
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {(p.doses ?? []).map((d, i) => (
                    <li key={i}>
                      {d.name} · day {d.atAgeDays} · {d.kind === 'worming' ? 'worming' : 'vaccine'}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
