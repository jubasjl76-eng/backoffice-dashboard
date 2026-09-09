import { useState } from 'react';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useT } from '../i18n';
import { api } from '../lib/api';
import { bcp47 } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';

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

function whenLabel(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): { text: string; overdue: boolean } {
  const ts = Date.parse(iso);
  const diffMin = Math.round((ts - Date.now()) / 60000);
  if (diffMin < -1) {
    const n = Math.abs(diffMin) >= 60 ? `${Math.round(Math.abs(diffMin) / 60)}h` : `${Math.abs(diffMin)}m`;
    return { text: t('meds.overdue', { n }), overdue: true };
  }
  if (diffMin <= 15) return { text: t('meds.now'), overdue: false };
  if (diffMin < 60) return { text: t('meds.in', { n: `${diffMin}m` }), overdue: false };
  return { text: t('meds.in', { n: `${Math.round(diffMin / 60)}h` }), overdue: false };
}

export function Meds() {
  const { t, label, locale } = useT();
  const due = useQuery<{ due: DueDose[] }>('/breeder/medications/due?hours=24');
  const meds = useQuery<{ medications: Medication[] }>('/breeder/medications');
  const animals = useQuery<{ animals: Animal[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [compId, setCompId] = useState<string | null>(null);
  const [form, setForm] = useState({ animalId: '', name: '', dose: '', route: 'oral', times: '08:00,20:00', instructions: '' });

  async function log(d: DueDose, outcome: 'given' | 'skipped' | 'refused') {
    let note: string | undefined;
    if (outcome !== 'given') {
      const outcomeLabel = outcome === 'skipped' ? t('common.skip') : t('common.refused');
      const n = prompt(t('meds.reason', { outcome: outcomeLabel }));
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
  const openMed = medList.find((m) => m.id === compId);

  return (
    <div className="space-y-6">
      <PageHeader title={t('meds.title')}>
        <Btn variant="primary" onClick={() => setAdding(true)}>{t('meds.add')}</Btn>
      </PageHeader>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('meds.animal')}>
              <Select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}>
                <option value="">—</option>
                {(animals.data?.animals ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label={t('meds.medication')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t('meds.dose')}><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder={t('meds.dosePh')} /></Field>
            <Field label={t('meds.route')}>
              <Select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })}>
                <option value="oral">{label('medRoute', 'oral')}</option>
                <option value="topical">{label('medRoute', 'topical')}</option>
                <option value="injection">{label('medRoute', 'injection')}</option>
                <option value="other">{label('medRoute', 'other')}</option>
              </Select>
            </Field>
            <Field label={t('meds.times')} hint={t('meds.timesHint')}><Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} /></Field>
            <Field label={t('meds.instructions')}><Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.animalId || !form.name} onClick={create}>{t('common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">{t('meds.due24')}</h2>
        {due.loading && !due.data ? (
          <Spinner />
        ) : dueList.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t('meds.nothingDue')}</p>
        ) : (
          <ul className="space-y-2">
            {dueList.map((d, i) => {
              const w = whenLabel(d.scheduledFor, t);
              return (
                <li key={`${d.medicationId}-${i}`}>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-100">
                        {d.name} <span className="text-slate-500">{t('meds.for')}</span> {d.animalName ?? t('meds.animalFallback')}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {d.dose ? `${d.dose} · ` : ''}{d.route ? `${label('medRoute', d.route)} · ` : ''}
                        {new Date(d.scheduledFor).toLocaleTimeString(bcp47(locale), { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge className={w.overdue ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' : 'bg-slate-800 text-slate-300 ring-slate-700'}>
                      {w.text}
                    </Badge>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="primary" disabled={busy} onClick={() => log(d, 'given')}>{t('common.given')}</Btn>
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => log(d, 'skipped')}>{t('common.skip')}</Btn>
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => log(d, 'refused')}>{t('common.refused')}</Btn>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">{t('meds.all')}</h2>
        {meds.loading && !meds.data ? (
          <Spinner />
        ) : medList.length === 0 ? (
          <EmptyState title={t('meds.empty')} hint={t('meds.emptyHint')} />
        ) : (
          <ul className="space-y-2">
            {medList.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 border-t border-slate-800 py-2 text-sm first:border-0">
                <span className="font-medium text-slate-100">{m.name}</span>
                <span className="text-slate-500">{m.animal_name}</span>
                <span className="text-xs text-slate-500">
                  {m.dose} · {(m.times_of_day ?? []).join(', ')} {m.route ? `· ${label('medRoute', m.route)}` : ''}
                </span>
                {m.instructions && <span className="text-xs text-slate-600">— {m.instructions}</span>}
                <span className="ml-auto flex items-center gap-2">
                  {!m.active && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{t('common.inactive')}</Badge>}
                  <Btn size="sm" variant="ghost" onClick={() => setCompId(m.id)}>{t('meds.compliance')}</Btn>
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => toggleActive(m)}>
                    {m.active ? t('meds.deactivate') : t('meds.reactivate')}
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer
        open={!!compId}
        onClose={() => setCompId(null)}
        title={t('meds.complianceTitle', { name: openMed?.name ?? t('meds.medication') })}
      >
        {compId && <CompliancePanel id={compId} />}
      </Drawer>
    </div>
  );
}

interface Compliance {
  scheduled: number;
  given: number;
  skipped: number;
  missed: number;
  rate: number;
}

function CompliancePanel({ id }: { id: string }) {
  const { t, locale } = useT();
  const q = useQuery<{ compliance: Compliance; missedRecent: string[] }>(`/breeder/medications/${id}/compliance`);
  if (q.loading && !q.data) return <Spinner />;
  if (q.error) return <p className="text-sm text-rose-300">{q.error}</p>;
  const c = q.data?.compliance;
  if (!c) return <p className="text-sm text-slate-400">{t('meds.noCompliance')}</p>;
  const pct = Math.round(c.rate * 100);

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-slate-400">{t('meds.complianceHint')}</p>
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-xs text-slate-400">{t('meds.rate')}</div>
          <div className={`mt-1 text-2xl font-semibold ${pct < 80 ? 'text-rose-300' : 'text-emerald-300'}`}>{pct}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-400">{t('meds.scheduled')}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{c.scheduled}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-400">{t('common.given')}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{c.given}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-400">{t('meds.missed')}</div>
          <div className={`mt-1 text-2xl font-semibold ${c.missed ? 'text-rose-300' : 'text-slate-100'}`}>{c.missed}</div>
        </Card>
      </div>
      <p className="text-xs text-slate-400">{t('meds.skippedCount', { n: c.skipped })}</p>
      {(q.data?.missedRecent ?? []).length > 0 && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{t('meds.recentlyMissed')}</div>
          <ul className="space-y-1 text-xs text-slate-300">
            {q.data!.missedRecent.slice(0, 8).map((iso) => (
              <li key={iso}>{new Date(iso).toLocaleString(bcp47(locale))}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
