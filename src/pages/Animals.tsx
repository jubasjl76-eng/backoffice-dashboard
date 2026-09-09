import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DocumentsPanel } from '../components/Documents';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api, apiOpen } from '../lib/api';
import { useMutation, useQuery } from '../lib/useApi';

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
  const { t, label } = useT();
  const { shortDate } = useDates();
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
      <PageHeader title={t('animals.title')}>
        <Btn variant="primary" onClick={() => setAdding(true)}>{t('animals.add')}</Btn>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : animals.length === 0 ? (
        <EmptyState title={t('animals.empty')} hint={t('animals.emptyHint')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => (
            <button
              key={a.id}
              type="button"
              className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              onClick={() => setOpenId(a.id)}
              aria-label={t('animals.openDog', { name: a.name })}
            >
              <Card className="p-4 transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{a.name}</span>
                  <span className="text-xs text-slate-400">
                    {a.sex === 'male' ? (
                      <span title={t('common.male')}>♂<span className="sr-only"> {t('common.male')}</span></span>
                    ) : a.sex === 'female' ? (
                      <span title={t('common.female')}>♀<span className="sr-only"> {t('common.female')}</span></span>
                    ) : ''}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{label('role', a.role)}</Badge>
                  {a.status !== 'active' && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{label('animalStatus', a.status)}</Badge>}
                  {a.pen_name && <Badge className="bg-sky-500/10 text-sky-300 ring-sky-500/30">{a.pen_name}</Badge>}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {a.breed || t('animals.unknownBreed')} · {a.dob ? shortDate(a.dob) : t('animals.dobUnknown')}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Drawer open={adding} onClose={() => setAdding(false)} title={t('animals.add')}>
        <div className="space-y-3">
          <Field label={t('common.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t('common.sex')}>
            <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="female">{label('sex', 'female')}</option>
              <option value="male">{label('sex', 'male')}</option>
            </Select>
          </Field>
          <Field label={t('common.role')}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="breeding">{label('role', 'breeding')}</option>
              <option value="retired">{label('role', 'retired')}</option>
              <option value="guardian">{label('role', 'guardian')}</option>
            </Select>
          </Field>
          <Field label={t('animals.adultWeight')} hint={t('animals.adultHint')}>
            <Input type="number" value={form.adultWeightKg} onChange={(e) => setForm({ ...form, adultWeightKg: e.target.value })} />
          </Field>
          <Field label={t('animals.dob')}><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label={t('animals.regNo')}><Input value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} /></Field>
          <Field label={t('common.sire')}>
            <Select value={form.sireId} onChange={(e) => setForm({ ...form, sireId: e.target.value })}>
              <option value="">—</option>
              {animals.filter((a) => a.sex === 'male').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.dam')}>
            <Select value={form.damId} onChange={(e) => setForm({ ...form, damId: e.target.value })}>
              <option value="">—</option>
              {animals.filter((a) => a.sex === 'female').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Btn variant="primary" disabled={busy || !form.name} onClick={create}>{t('common.save')}</Btn>
        </div>
      </Drawer>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={animals.find((a) => a.id === openId)?.name ?? t('animals.dog')}>
        {openId && <AnimalDetail id={openId} />}
      </Drawer>
    </div>
  );
}

function AnimalDetail({ id }: { id: string }) {
  const { t } = useT();
  const detail = useQuery<{ animal: Animal; carePlan: CarePlan | null }>(`/breeder/animals/${id}`);
  const growth = useQuery<{ curve: Array<Record<string, number>>; adultTrend: unknown }>(`/breeder/animals/${id}/growth`);
  const [run, busy] = useMutation();
  const [tab, setTab] = useState<'plan' | 'weight' | 'wellness' | 'pedigree' | 'papers'>('plan');
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
      <div className="flex flex-wrap gap-1" role="tablist" aria-label={t('animals.tabsAria')}>
        <Btn size="sm" role="tab" aria-selected={tab === 'plan'} variant={tab === 'plan' ? 'primary' : 'ghost'} onClick={() => setTab('plan')}>{t('animals.carePlan')}</Btn>
        <Btn size="sm" role="tab" aria-selected={tab === 'weight'} variant={tab === 'weight' ? 'primary' : 'ghost'} onClick={() => setTab('weight')}>{t('animals.weightGrowth')}</Btn>
        <Btn size="sm" role="tab" aria-selected={tab === 'wellness'} variant={tab === 'wellness' ? 'primary' : 'ghost'} onClick={() => setTab('wellness')}>{t('animals.wellness')}</Btn>
        <Btn size="sm" role="tab" aria-selected={tab === 'pedigree'} variant={tab === 'pedigree' ? 'primary' : 'ghost'} onClick={() => setTab('pedigree')}>{t('animals.pedigree')}</Btn>
        <Btn size="sm" role="tab" aria-selected={tab === 'papers'} variant={tab === 'papers' ? 'primary' : 'ghost'} onClick={() => setTab('papers')}>{t('animals.papers')}</Btn>
      </div>

      {tab === 'plan' && (
        <div className="space-y-3" role="tabpanel">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('animals.foodSku')}><Input value={merged.food_sku ?? ''} onChange={(e) => setPlan({ ...plan, food_sku: e.target.value })} /></Field>
            <Field label={t('animals.gramsDay')}><Input type="number" value={merged.grams_per_day ?? ''} onChange={(e) => setPlan({ ...plan, grams_per_day: Number(e.target.value) })} /></Field>
            <Field label={t('animals.mealsDay')}><Input type="number" value={merged.meals_per_day ?? ''} onChange={(e) => setPlan({ ...plan, meals_per_day: Number(e.target.value) })} /></Field>
            <Field label={t('animals.allergies')}><Input value={merged.allergies ?? ''} onChange={(e) => setPlan({ ...plan, allergies: e.target.value })} /></Field>
          </div>
          <Field label={t('animals.dietNotes')}><Input value={merged.diet_notes ?? ''} onChange={(e) => setPlan({ ...plan, diet_notes: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('animals.vetName')}><Input value={merged.vet_name ?? ''} onChange={(e) => setPlan({ ...plan, vet_name: e.target.value })} /></Field>
            <Field label={t('animals.vetPhone')}><Input value={merged.vet_phone ?? ''} onChange={(e) => setPlan({ ...plan, vet_phone: e.target.value })} /></Field>
            <Field label={t('animals.emergencyContact')}><Input value={merged.emergency_contact ?? ''} onChange={(e) => setPlan({ ...plan, emergency_contact: e.target.value })} /></Field>
            <Field label={t('animals.emergencyPhone')}><Input value={merged.emergency_phone ?? ''} onChange={(e) => setPlan({ ...plan, emergency_phone: e.target.value })} /></Field>
          </div>
          <Field label={t('common.notes')}><Input value={merged.notes ?? ''} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} /></Field>
          <Btn variant="primary" disabled={busy} onClick={savePlan}>{t('animals.savePlan')}</Btn>
        </div>
      )}

      {tab === 'weight' && (
        <div className="space-y-4" role="tabpanel">
          <div className="flex items-end gap-2">
            <Field label={t('animals.newWeight')}><Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} /></Field>
            <Btn variant="primary" disabled={busy || !grams} onClick={addWeight}>{t('common.log')}</Btn>
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
                  <Line type="monotone" dataKey="grams" name={t('animals.actual')} stroke="#818cf8" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="expectedG" name={t('animals.expected')} stroke="#475569" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-8 text-center text-slate-500">{t('animals.noWeights')}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'wellness' && (
        <div role="tabpanel">
          <WellnessPanel id={id} />
        </div>
      )}
      {tab === 'pedigree' && <PedigreePanel id={id} />}
      {tab === 'papers' && <DocumentsPanel subjectType="animal" subjectId={id} defaultKind="registration" />}
    </div>
  );
}

interface Insight {
  metric: 'food' | 'water' | 'activity' | 'weight';
  level: 'info' | 'watch' | 'concern';
  message: string;
  changePct?: number;
}

const INSIGHT_TONE: Record<Insight['level'], string> = {
  info: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  watch: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  concern: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

function WellnessPanel({ id }: { id: string }) {
  const { t, label } = useT();
  const q = useQuery<{ insights: Insight[] }>(`/breeder/animals/${id}/wellness`);
  if (q.loading && !q.data) return <Spinner />;
  if (q.error) return <p className="text-sm text-rose-300">{q.error}</p>;
  const insights = q.data?.insights ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{t('animals.wellnessHint')}</p>
      {insights.length === 0 ? (
        <p className="text-slate-400">{t('animals.noWellness')}</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={`${ins.metric}-${i}`} className="rounded-lg border border-slate-800 p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge className={INSIGHT_TONE[ins.level]}>{label('insightLevel', ins.level)}</Badge>
                <span className="text-xs text-slate-400">{label('insightMetric', ins.metric)}</span>
                {ins.changePct != null && (
                  <span className="text-xs text-slate-500">{ins.changePct > 0 ? '+' : ''}{ins.changePct}%</span>
                )}
              </div>
              <p className="text-slate-200">{ins.message}</p>
            </li>
          ))}
        </ul>
      )}
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
  const { t } = useT();
  const tree = useQuery<{ pedigree: PedigreeNode; generations: number }>(`/breeder/animals/${id}/pedigree?generations=4`);
  const papers = useQuery<{ documents: Array<{ id: string; subject_id: string | null; title: string | null; filename: string | null }> }>(
    '/breeder/documents?kind=registration&subjectType=animal'
  );
  const [run] = useMutation();

  if (tree.loading && !tree.data) return <Spinner />;
  if (tree.error || !tree.data?.pedigree) return <p className="text-sm text-rose-300">{tree.error ?? t('animals.noPedigree')}</p>;

  const bySubject = new Map((papers.data?.documents ?? []).map((d) => [d.subject_id, d]));
  const root = tree.data.pedigree;
  const hasParents = !!(root.sire || root.dam);

  return (
    <div className="space-y-3" role="tabpanel">
      {!hasParents && (
        <p className="text-xs text-slate-400">
          {t('animals.noParents')}
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
  const { t } = useT();
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
            {t('animals.registration')}
          </Btn>
        )}
      </div>
      {node.sire && (
        <>
          {depth === 0 && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{t('common.sire')}</div>}
          <PedigreeBranch node={node.sire} papers={papers} depth={depth + 1} onOpen={onOpen} />
        </>
      )}
      {node.dam && (
        <>
          {depth === 0 && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{t('common.dam')}</div>}
          <PedigreeBranch node={node.dam} papers={papers} depth={depth + 1} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}
