import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { DocumentsPanel } from '../components/Documents';
import { shortDate, titleCase } from '../lib/format';
import { ProgesteroneForm, RecordMating } from './Calendar';

interface Litter {
  id: string;
  name: string | null;
  status: string;
  dam_name: string | null;
  sire_name: string | null;
  due_on: string | null;
  mated_on: string | null;
  mating_method: string | null;
  whelped_at: string | null;
  puppy_count: number;
  available_count: number;
  placed_count: number;
}
interface Animal {
  id: string;
  name: string;
  sex: string | null;
}
interface Puppy {
  id: string;
  name: string;
  collar_color: string | null;
  sex: string | null;
  status: string;
  birth_weight_g: number | null;
  weights: Array<{ grams: number; taken_at: string }>;
  dailyGainG: number | null;
  assessment: { flag?: string; expectedG?: number } | null;
}

const STATUS_TONE: Record<string, string> = {
  planned: 'bg-slate-800 text-slate-300 ring-slate-700',
  expecting: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  mated: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  whelped: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  nursing: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  weaning: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  done: 'bg-slate-800 text-slate-400 ring-slate-700',
};

export function Litters() {
  const q = useQuery<{ litters: Litter[] }>('/breeder/litters');
  const animals = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mateId, setMateId] = useState<string | null>(null);
  const [progId, setProgId] = useState<string | null>(null);
  const [papersId, setPapersId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', damId: '', sireId: '', dueOn: '' });

  async function create() {
    const r = await run(() =>
      api('/breeder/litters', {
        method: 'POST',
        body: {
          name: form.name || undefined,
          damId: form.damId || undefined,
          sireId: form.sireId || undefined,
          dueOn: form.dueOn || undefined,
          status: form.dueOn ? 'mated' : 'planned',
        },
      })
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', damId: '', sireId: '', dueOn: '' });
      q.reload();
    }
  }

  async function whelp(l: Litter) {
    const born = prompt('Puppies born alive?');
    if (born == null) return;
    const r = await run(() =>
      api(`/breeder/litters/${l.id}/whelp`, { method: 'POST', body: { countBorn: Number(born), countAlive: Number(born) } })
    );
    if (r) q.reload();
  }

  const litters = q.data?.litters ?? [];
  const dams = (animals.data?.animals ?? []).filter((a) => a.sex === 'female');
  const sires = (animals.data?.animals ?? []).filter((a) => a.sex === 'male');

  return (
    <div className="space-y-5">
      <PageHeader title="Litters">
        <Link to="/calendar" className="text-sm text-indigo-400 hover:text-indigo-300">Calendar →</Link>
        <Btn variant="primary" onClick={() => setAdding(true)}>Plan litter</Btn>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : litters.length === 0 ? (
        <EmptyState title="No litters yet" hint="Plan a litter to track the pregnancy, whelping and puppies." />
      ) : (
        <ul className="space-y-2">
          {litters.map((l) => (
            <li key={l.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(l.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">{l.name || `${l.dam_name ?? '?'} × ${l.sire_name ?? '?'}`}</span>
                    <Badge className={STATUS_TONE[l.status] ?? STATUS_TONE.planned}>{titleCase(l.status)}</Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>{l.dam_name ?? '?'} × {l.sire_name ?? '?'}</span>
                    {l.whelped_at ? <span>whelped {shortDate(l.whelped_at)}</span> : l.due_on ? <span>due {shortDate(l.due_on)}</span> : l.mated_on ? <span>mated {shortDate(l.mated_on)}</span> : null}
                    <span>{l.puppy_count} pups · {l.available_count} available · {l.placed_count} placed</span>
                  </div>
                </button>
                {l.status === 'planned' && !l.mated_on && (
                  <Btn size="sm" variant="primary" onClick={() => setMateId(l.id)}>Record mating</Btn>
                )}
                {(['expecting', 'mated'].includes(l.status) || l.mated_on) && !l.whelped_at && (
                  <Btn size="sm" variant="ghost" onClick={() => setProgId(l.id)}>Progesterone</Btn>
                )}
                {['planned', 'expecting', 'mated'].includes(l.status) && (
                  <Btn size="sm" disabled={busy} onClick={() => whelp(l)}>Mark whelped</Btn>
                )}
                <Btn size="sm" variant="ghost" onClick={() => setPapersId(l.id)}>Papers</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={adding} onClose={() => setAdding(false)} title="Plan litter">
        <div className="space-y-3">
          <Field label="Name (optional)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Dam">
            <Select value={form.damId} onChange={(e) => setForm({ ...form, damId: e.target.value })}>
              <option value="">—</option>
              {dams.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Sire">
            <Select value={form.sireId} onChange={(e) => setForm({ ...form, sireId: e.target.value })}>
              <option value="">—</option>
              {sires.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Due date"><Input type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} /></Field>
          <Btn variant="primary" disabled={busy} onClick={create}>Save</Btn>
        </div>
      </Drawer>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title="Puppies">
        {openId && <LitterPuppies litterId={openId} />}
      </Drawer>
      <Drawer open={!!mateId} onClose={() => setMateId(null)} title="Record mating">
        {mateId && (
          <RecordMating
            litterId={mateId}
            onDone={() => {
              setMateId(null);
              q.reload();
            }}
          />
        )}
      </Drawer>
      <Drawer open={!!progId} onClose={() => setProgId(null)} title="Progesterone">
        {progId && <ProgesteroneForm litterId={progId} onDone={() => q.reload()} />}
      </Drawer>
      <Drawer open={!!papersId} onClose={() => setPapersId(null)} title="Litter papers">
        {papersId && <DocumentsPanel subjectType="litter" subjectId={papersId} defaultKind="other" />}
      </Drawer>
    </div>
  );
}

function LitterPuppies({ litterId }: { litterId: string }) {
  const q = useQuery<{ puppies: Puppy[] }>(`/breeder/litters/${litterId}/puppies`);
  const [run, busy] = useMutation();
  const [form, setForm] = useState({ name: '', collarColor: '', sex: 'female', birthWeightG: '' });
  const [papersPup, setPapersPup] = useState<Puppy | null>(null);

  async function addPuppy() {
    const r = await run(() =>
      api(`/breeder/litters/${litterId}/puppies`, {
        method: 'POST',
        body: {
          name: form.name,
          collarColor: form.collarColor || undefined,
          sex: form.sex,
          birthWeightG: form.birthWeightG ? Number(form.birthWeightG) : undefined,
        },
      })
    );
    if (r) {
      setForm({ name: '', collarColor: '', sex: 'female', birthWeightG: '' });
      q.reload();
    }
  }

  async function addWeight(pupId: string) {
    const g = prompt('Weight in grams?');
    if (!g) return;
    const r = await run(() => api(`/breeder/litters/puppies/${pupId}/weights`, { method: 'POST', body: { grams: Number(g) } }));
    if (r) q.reload();
  }

  const puppies = q.data?.puppies ?? [];
  const chart = puppies
    .flatMap((p) => p.weights.map((w) => ({ pup: p.name, taken: w.taken_at.slice(5, 10), grams: w.grams })))
    .reduce<Record<string, Record<string, number | string>>>((acc, row) => {
      (acc[row.taken] ??= { taken: row.taken })[row.pup] = row.grams;
      return acc;
    }, {});
  const chartData = Object.values(chart).sort((a, b) => String(a.taken).localeCompare(String(b.taken)));
  const palette = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#a78bfa', '#fb7185', '#4ade80'];

  return (
    <div className="space-y-4 text-sm">
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Collar colour"><Input value={form.collarColor} onChange={(e) => setForm({ ...form, collarColor: e.target.value })} /></Field>
          <Field label="Sex">
            <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </Field>
          <Field label="Birth weight (g)"><Input type="number" value={form.birthWeightG} onChange={(e) => setForm({ ...form, birthWeightG: e.target.value })} /></Field>
        </div>
        <Btn className="mt-2" variant="primary" size="sm" disabled={busy || !form.name} onClick={addPuppy}>Add puppy</Btn>
      </Card>

      {q.loading && !q.data ? (
        <Spinner />
      ) : puppies.length === 0 ? (
        <p className="text-slate-500">No puppies recorded yet.</p>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="taken" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }} />
                  {puppies.map((p, i) => (
                    <Line key={p.id} type="monotone" dataKey={p.name} stroke={palette[i % palette.length]} dot={{ r: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="space-y-2">
            {puppies.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-wrap items-center gap-2 p-3">
                  <span className="font-medium text-slate-100">{p.name}</span>
                  {p.collar_color && <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{p.collar_color}</Badge>}
                  <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{p.sex === 'male' ? '♂' : '♀'}</Badge>
                  {p.assessment?.flag && (
                    <Badge
                      className={
                        p.assessment.flag === 'concern'
                          ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
                          : p.assessment.flag === 'watch'
                            ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                      }
                    >
                      {p.assessment.flag}
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500">
                    {p.weights.length ? `${p.weights[p.weights.length - 1].grams} g` : 'no weight'}
                    {p.dailyGainG != null && ` · +${Math.round(p.dailyGainG)} g/d`}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{p.status}</Badge>
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => addWeight(p.id)}>+ weight</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setPapersPup(p)}>Papers</Btn>
                    <Link
                      to={`/go-home/${p.id}`}
                      className="rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Go-home pack
                    </Link>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {papersPup && (
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium text-slate-200">{papersPup.name} · papers</h3>
            <Btn size="sm" variant="ghost" onClick={() => setPapersPup(null)}>Close</Btn>
          </div>
          <DocumentsPanel subjectType="puppy" subjectId={papersPup.id} defaultKind="certificate" generate />
        </div>
      )}
    </div>
  );
}
