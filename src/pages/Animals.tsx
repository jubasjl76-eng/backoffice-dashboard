import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api, apiOpen } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { DocumentsPanel } from '../components/Documents';
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
  registration_no: string | null;
  microchip: string | null;
  sire_id: string | null;
  dam_id: string | null;
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
  const [form, setForm] = useState({
    name: '', sex: 'female', role: 'breeding', adultWeightKg: '', dob: '',
    registrationNo: '', sireId: '', damId: '',
  });

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
          registrationNo: form.registrationNo || undefined,
          sireId: form.sireId || undefined,
          damId: form.damId || undefined,
        },
      })
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', sex: 'female', role: 'breeding', adultWeightKg: '', dob: '', registrationNo: '', sireId: '', damId: '' });
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
          <Field label="Registration no."><Input value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} /></Field>
          <Field label="Sire">
            <Select value={form.sireId} onChange={(e) => setForm({ ...form, sireId: e.target.value })}>
              <option value="">—</option>
              {animals.filter((a) => a.sex === 'male').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Dam">
            <Select value={form.damId} onChange={(e) => setForm({ ...form, damId: e.target.value })}>
              <option value="">—</option>
              {animals.filter((a) => a.sex === 'female').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
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
  const [tab, setTab] = useState<'plan' | 'weight' | 'pedigree' | 'papers'>('plan');
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
      <div className="flex flex-wrap gap-1">
        <Btn size="sm" variant={tab === 'plan' ? 'primary' : 'ghost'} onClick={() => setTab('plan')}>Care plan</Btn>
        <Btn size="sm" variant={tab === 'weight' ? 'primary' : 'ghost'} onClick={() => setTab('weight')}>Weight & growth</Btn>
        <Btn size="sm" variant={tab === 'pedigree' ? 'primary' : 'ghost'} onClick={() => setTab('pedigree')}>Pedigree</Btn>
        <Btn size="sm" variant={tab === 'papers' ? 'primary' : 'ghost'} onClick={() => setTab('papers')}>Papers</Btn>
      </div>

      {tab === 'plan' && (
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
      )}

      {tab === 'weight' && (
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

      {tab === 'pedigree' && <PedigreePanel id={id} />}
      {tab === 'papers' && <DocumentsPanel subjectType="animal" subjectId={id} defaultKind="registration" />}
    </div>
  );
}

interface PedigreeNode {
  id: string;
  name: string;
  sex: string | null;
  breed: string | null;
  registrationNo: string | null;
  sire: PedigreeNode | null;
  dam: PedigreeNode | null;
}

function PedigreePanel({ id }: { id: string }) {
  const tree = useQuery<{ pedigree: PedigreeNode; generations: number }>(`/breeder/animals/${id}/pedigree?generations=4`);
  const papers = useQuery<{ documents: Array<{ id: string; subject_id: string | null; title: string | null; filename: string | null }> }>(
    '/breeder/documents?kind=registration&subjectType=animal'
  );
  const [run] = useMutation();

  if (tree.loading && !tree.data) return <Spinner />;
  if (tree.error || !tree.data?.pedigree) return <p className="text-sm text-rose-300">{tree.error ?? 'No pedigree'}</p>;

  const bySubject = new Map((papers.data?.documents ?? []).map((d) => [d.subject_id, d]));
  const root = tree.data.pedigree;
  const hasParents = !!(root.sire || root.dam);

  return (
    <div className="space-y-3">
      {!hasParents && (
        <p className="text-xs text-slate-400">
          No sire or dam on this record yet. Set them when you add a dog — the tree walks those links up to four generations.
        </p>
      )}
      <PedigreeBranch node={root} papers={bySubject} depth={0} onOpen={(docId) => run(() => apiOpen(`/breeder/documents/${docId}/download`))} />
    </div>
  );
}

function PedigreeBranch({
  node,
  papers,
  depth,
  onOpen,
}: {
  node: PedigreeNode;
  papers: Map<string | null, { id: string; title: string | null; filename: string | null }>;
  depth: number;
  onOpen: (id: string) => void;
}) {
  const paper = papers.get(node.id);
  return (
    <div className={depth ? 'ml-3 border-l border-slate-800 pl-3' : ''}>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="font-medium text-slate-100">{node.name}</span>
        {node.sex && <span className="text-xs text-slate-400">{node.sex === 'male' ? '♂' : node.sex === 'female' ? '♀' : node.sex}</span>}
        {node.breed && <span className="text-xs text-slate-500">{node.breed}</span>}
        {node.registrationNo && <span className="text-xs text-slate-400">{node.registrationNo}</span>}
        {paper && (
          <Btn size="sm" variant="ghost" onClick={() => onOpen(paper.id)}>
            Registration
          </Btn>
        )}
      </div>
      {node.sire && (
        <>
          {depth === 0 && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Sire</div>}
          <PedigreeBranch node={node.sire} papers={papers} depth={depth + 1} onOpen={onOpen} />
        </>
      )}
      {node.dam && (
        <>
          {depth === 0 && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Dam</div>}
          <PedigreeBranch node={node.dam} papers={papers} depth={depth + 1} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}
