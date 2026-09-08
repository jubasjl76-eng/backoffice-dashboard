import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { titleCase } from '../lib/format';

interface DueDose {
  medicationId: string;
  animalId: string;
  animalName: string | null;
  name: string;
  dose: string | null;
  route: string | null;
  scheduledFor: string;
}
interface Medication {
  id: string;
  animal_id: string;
  animal_name: string | null;
  name: string;
  dose: string | null;
  route: string | null;
  active: boolean;
  times_of_day: string[] | null;
  instructions: string | null;
}
interface Animal {
  id: string;
  name: string;
}

function whenLabel(iso: string): { text: string; overdue: boolean } {
  const t = Date.parse(iso);
  const diffMin = Math.round((t - Date.now()) / 60000);
  if (diffMin < -1) return { text: `${Math.abs(diffMin) >= 60 ? `${Math.round(Math.abs(diffMin) / 60)}h` : `${Math.abs(diffMin)}m`} overdue`, overdue: true };
  if (diffMin <= 15) return { text: 'now', overdue: false };
  if (diffMin < 60) return { text: `in ${diffMin}m`, overdue: false };
  return { text: `in ${Math.round(diffMin / 60)}h`, overdue: false };
}

export function Meds() {
  const due = useQuery<{ due: DueDose[] }>('/breeder/medications/due?hours=24');
  const meds = useQuery<{ medications: Medication[] }>('/breeder/medications');
  const animals = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ animalId: '', name: '', dose: '', route: 'oral', times: '08:00,20:00', instructions: '' });

  async function log(d: DueDose, outcome: 'given' | 'skipped' | 'refused') {
    let note: string | undefined;
    if (outcome !== 'given') {
      const n = prompt(`Reason for "${outcome}"?`);
      if (n == null) return;
      note = n || undefined;
    }
    const r = await run(() =>
      api(`/breeder/medications/${d.medicationId}/log`, {
        method: 'POST',
        body: { scheduledFor: d.scheduledFor, outcome, note },
      })
    );
    if (r) due.reload();
  }

  async function create() {
    const r = await run(() =>
      api('/breeder/medications', {
        method: 'POST',
        body: {
          animalId: form.animalId,
          name: form.name,
          dose: form.dose || undefined,
          route: form.route || undefined,
          timesOfDay: form.times.split(',').map((s) => s.trim()).filter(Boolean),
          instructions: form.instructions || undefined,
        },
      })
    );
    if (r) {
      setAdding(false);
      setForm({ animalId: '', name: '', dose: '', route: 'oral', times: '08:00,20:00', instructions: '' });
      meds.reload();
      due.reload();
    }
  }

  async function toggleActive(m: Medication) {
    const r = await run(() => api(`/breeder/medications/${m.id}`, { method: 'PATCH', body: { active: !m.active } }));
    if (r) {
      meds.reload();
      due.reload();
    }
  }

  const dueList = due.data?.due ?? [];
  const medList = meds.data?.medications ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Medications">
        <Btn variant="primary" onClick={() => setAdding(true)}>Add medication</Btn>
      </PageHeader>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Animal">
              <Select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}>
                <option value="">—</option>
                {(animals.data?.animals ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Medication"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Dose"><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="1 tablet" /></Field>
            <Field label="Route">
              <Select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })}>
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="injection">Injection</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Times of day" hint="comma separated, 24h"><Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} /></Field>
            <Field label="Instructions"><Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.animalId || !form.name} onClick={create}>Save</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Due in the next 24h</h2>
        {due.loading && !due.data ? (
          <Spinner />
        ) : dueList.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Nothing due. Staff have nothing to give right now.</p>
        ) : (
          <ul className="space-y-2">
            {dueList.map((d, i) => {
              const w = whenLabel(d.scheduledFor);
              return (
                <li key={`${d.medicationId}-${i}`}>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-100">
                        {d.name} <span className="text-slate-500">for</span> {d.animalName ?? 'animal'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {d.dose ? `${d.dose} · ` : ''}{d.route ? `${titleCase(d.route)} · ` : ''}
                        {new Date(d.scheduledFor).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge className={w.overdue ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' : 'bg-slate-800 text-slate-300 ring-slate-700'}>
                      {w.text}
                    </Badge>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="primary" disabled={busy} onClick={() => log(d, 'given')}>Given</Btn>
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => log(d, 'skipped')}>Skip</Btn>
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => log(d, 'refused')}>Refused</Btn>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">All medications</h2>
        {meds.loading && !meds.data ? (
          <Spinner />
        ) : medList.length === 0 ? (
          <EmptyState title="No medications" hint="Add a medication schedule so it appears in the staff worklist." />
        ) : (
          <ul className="space-y-2">
            {medList.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 border-t border-slate-800 py-2 text-sm first:border-0">
                <span className="font-medium text-slate-100">{m.name}</span>
                <span className="text-slate-500">{m.animal_name}</span>
                <span className="text-xs text-slate-500">
                  {m.dose} · {(m.times_of_day ?? []).join(', ')} {m.route ? `· ${titleCase(m.route)}` : ''}
                </span>
                {m.instructions && <span className="text-xs text-slate-600">— {m.instructions}</span>}
                <span className="ml-auto flex items-center gap-2">
                  {!m.active && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">inactive</Badge>}
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => toggleActive(m)}>
                    {m.active ? 'Deactivate' : 'Reactivate'}
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
