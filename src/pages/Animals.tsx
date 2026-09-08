import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { shortDate, titleCase } from '../lib/format';

interface Animal {
  id: string;
  name: string;
  call_name: string | null;
  sex: string | null;
  role: string;
  status: string;
  dob: string | null;
  breed: string | null;
  adult_weight_kg: number | null;
  pen_name: string | null;
}
interface CarePlan {
  food_sku: string | null;
  grams_per_day: number | null;
  meals_per_day: number | null;
  allergies: string | null;
  diet_notes: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
}

export function Animals() {
  const q = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', sex: 'female', role: 'breeding', adultWeightKg: '', dob: '' });

  async function create() {
    const r = await run(() =>
      api('/breeder/animals', {
        method: 'POST',
        body: {
          name: form.name,
          sex: form.sex,
          role: form.role,
          adultWeightKg: form.adultWeightKg ? Number(form.adultWeightKg) : undefined,
          dob: form.dob || undefined,
        },
      })
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', sex: 'female', role: 'breeding', adultWeightKg: '', dob: '' });
      q.reload();
    }
  }

  const animals = q.data?.animals ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Animals">
        <Btn variant="primary" onClick={() => setAdding(true)}>Add dog</Btn>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : animals.length === 0 ? (
        <EmptyState title="No dogs yet" hint="Add your breeding dogs to start tracking care plans and weights." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => (
            <button key={a.id} className="text-left" onClick={() => setOpenId(a.id)}>
              <Card className="p-4 transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{a.name}</span>
                  <span className="text-xs text-slate-500">{a.sex === 'male' ? '♂' : a.sex === 'female' ? '♀' : ''}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{titleCase(a.role)}</Badge>
                  {a.status !== 'active' && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{a.status}</Badge>}
                  {a.pen_name && <Badge className="bg-sky-500/10 text-sky-300 ring-sky-500/30">{a.pen_name}</Badge>}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {a.breed || 'Unknown breed'} · {a.dob ? shortDate(a.dob) : 'DOB unknown'}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Drawer open={adding} onClose={() => setAdding(false)} title="Add dog">
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Sex">
            <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="breeding">Breeding</option>
              <option value="retired">Retired</option>
              <option value="guardian">Guardian</option>
            </Select>
          </Field>
          <Field label="Adult weight (kg)" hint="Used for puppy growth curves">
            <Input type="number" value={form.adultWeightKg} onChange={(e) => setForm({ ...form, adultWeightKg: e.target.value })} />
          </Field>
          <Field label="Date of birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Btn variant="primary" disabled={busy || !form.name} onClick={create}>Save</Btn>
        </div>
      </Drawer>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={animals.find((a) => a.id === openId)?.name ?? 'Dog'}>
        {openId && <AnimalDetail id={openId} />}
      </Drawer>
    </div>
  );
}

function AnimalDetail({ id }: { id: string }) {
  const detail = useQuery<{ animal: Animal; carePlan: CarePlan | null }>(`/breeder/animals/${id}`);
  const growth = useQuery<{ curve: Array<Record<string, number>>; adultTrend: unknown }>(`/breeder/animals/${id}/growth`);
  const [run, busy] = useMutation();
  const [tab, setTab] = useState<'plan' | 'weight'>('plan');
  const [grams, setGrams] = useState('');
  const [plan, setPlan] = useState<Partial<CarePlan>>({});

  const cp = detail.data?.carePlan;
  const merged = { ...cp, ...plan };

  async function savePlan() {
    const ok = await run(() =>
      api(`/breeder/animals/${id}/care-plan`, {
        method: 'PUT',
        body: {
          foodSku: merged.food_sku ?? undefined,
          gramsPerDay: merged.grams_per_day ? Number(merged.grams_per_day) : undefined,
          mealsPerDay: merged.meals_per_day ? Number(merged.meals_per_day) : undefined,
          allergies: merged.allergies ?? undefined,
          dietNotes: merged.diet_notes ?? undefined,
          vetName: merged.vet_name ?? undefined,
          vetPhone: merged.vet_phone ?? undefined,
          emergencyContact: merged.emergency_contact ?? undefined,
          emergencyPhone: merged.emergency_phone ?? undefined,
          notes: merged.notes ?? undefined,
        },
      })
    );
    if (ok) {
      setPlan({});
      detail.reload();
    }
  }

  async function addWeight() {
    const ok = await run(() => api(`/breeder/animals/${id}/weights`, { method: 'POST', body: { grams: Number(grams) } }));
    if (ok) {
      setGrams('');
      growth.reload();
    }
  }

  if (detail.loading && !detail.data) return <Spinner />;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-1">
        <Btn size="sm" variant={tab === 'plan' ? 'primary' : 'ghost'} onClick={() => setTab('plan')}>Care plan</Btn>
        <Btn size="sm" variant={tab === 'weight' ? 'primary' : 'ghost'} onClick={() => setTab('weight')}>Weight & growth</Btn>
      </div>

      {tab === 'plan' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Food SKU"><Input value={merged.food_sku ?? ''} onChange={(e) => setPlan({ ...plan, food_sku: e.target.value })} /></Field>
            <Field label="Grams / day"><Input type="number" value={merged.grams_per_day ?? ''} onChange={(e) => setPlan({ ...plan, grams_per_day: Number(e.target.value) })} /></Field>
            <Field label="Meals / day"><Input type="number" value={merged.meals_per_day ?? ''} onChange={(e) => setPlan({ ...plan, meals_per_day: Number(e.target.value) })} /></Field>
            <Field label="Allergies"><Input value={merged.allergies ?? ''} onChange={(e) => setPlan({ ...plan, allergies: e.target.value })} /></Field>
          </div>
          <Field label="Diet notes"><Input value={merged.diet_notes ?? ''} onChange={(e) => setPlan({ ...plan, diet_notes: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vet name"><Input value={merged.vet_name ?? ''} onChange={(e) => setPlan({ ...plan, vet_name: e.target.value })} /></Field>
            <Field label="Vet phone"><Input value={merged.vet_phone ?? ''} onChange={(e) => setPlan({ ...plan, vet_phone: e.target.value })} /></Field>
            <Field label="Emergency contact"><Input value={merged.emergency_contact ?? ''} onChange={(e) => setPlan({ ...plan, emergency_contact: e.target.value })} /></Field>
            <Field label="Emergency phone"><Input value={merged.emergency_phone ?? ''} onChange={(e) => setPlan({ ...plan, emergency_phone: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Input value={merged.notes ?? ''} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} /></Field>
          <Btn variant="primary" disabled={busy} onClick={savePlan}>Save care plan</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <Field label="New weight (grams)"><Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} /></Field>
            <Btn variant="primary" disabled={busy || !grams} onClick={addWeight}>Log</Btn>
          </div>
          <div className="h-56 w-full">
            {growth.data && growth.data.curve.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth.data.curve} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="ageDays" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="grams" name="actual" stroke="#818cf8" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="expectedG" name="expected" stroke="#475569" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-8 text-center text-slate-500">No weight readings yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
