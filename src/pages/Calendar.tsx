import { useMemo, useState } from 'react';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { titleCase } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';

interface Heat {
  damId: string;
  name: string;
  lastHeat: string | null;
  predictedNextHeat: string | null;
  intervalDays: number | null;
  fertileWindow: { from: string; to: string } | null;
}
interface CalLitter {
  id: string;
  name: string | null;
  status: string;
  mated_on: string | null;
  due_on: string | null;
  whelped_at: string | null;
  dam_name: string | null;
  sire_name: string | null;
}
interface GoHome {
  id: string;
  name: string;
  go_home_on: string;
  litter_name: string | null;
}
interface CalendarFeed {
  heats: Heat[];
  litters: CalLitter[];
  goHome: GoHome[];
}
interface HeatCycle {
  id: string;
  animal_id: string;
  started_on: string;
  ended_on: string | null;
  notes: string | null;
}
interface Guidance {
  phase: string;
  note: string;
  breedOn?: string;
}

type Kind = 'heat' | 'predicted' | 'fertile' | 'mated' | 'due' | 'go-home';

interface CalEvent {
  id: string;
  date: string;
  end?: string;
  kind: Kind;
  title: string;
  detail?: string;
}

const KIND: Record<Kind, { cls: string; bar: string }> = {
  heat: { cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30', bar: 'bg-rose-400' },
  predicted: { cls: 'bg-violet-500/15 text-violet-300 ring-violet-500/30', bar: 'bg-violet-400' },
  fertile: { cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30', bar: 'bg-amber-400' },
  mated: { cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30', bar: 'bg-sky-400' },
  due: { cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', bar: 'bg-emerald-400' },
  'go-home': { cls: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30', bar: 'bg-indigo-400' },
};

const KIND_KEY: Record<Kind, string> = {
  heat: 'cal.kind.heat',
  predicted: 'cal.kind.predicted',
  fertile: 'cal.kind.fertile',
  mated: 'cal.kind.mated',
  due: 'cal.kind.due',
  'go-home': 'cal.kind.goHome',
};

const METHODS = ['natural', 'ai', 'surgical-ai'];
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return out;
  while (cur.getTime() <= end.getTime()) {
    out.push(ymd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function litterLabel(l: CalLitter): string {
  return l.name || `${l.dam_name ?? '?'} × ${l.sire_name ?? '?'}`;
}

function buildEvents(
  feed: CalendarFeed,
  t: (key: string, vars?: Record<string, string | number>) => string,
  label: (group: string, value: string | null | undefined) => string,
): CalEvent[] {
  const ev: CalEvent[] = [];
  for (const h of feed.heats) {
    const last = dayKey(h.lastHeat);
    if (last) ev.push({ id: `heat-${h.damId}-${last}`, date: last, kind: 'heat', title: h.name, detail: t('cal.detail.seasonStart') });
    const next = dayKey(h.predictedNextHeat);
    if (next) ev.push({ id: `pred-${h.damId}-${next}`, date: next, kind: 'predicted', title: h.name, detail: h.intervalDays ? t('cal.detail.cycle', { n: h.intervalDays }) : t('cal.detail.predicted') });
    if (h.fertileWindow) {
      const from = dayKey(h.fertileWindow.from);
      const to = dayKey(h.fertileWindow.to);
      if (from && to) ev.push({ id: `fert-${h.damId}-${from}`, date: from, end: to, kind: 'fertile', title: h.name, detail: `${from.slice(5)} → ${to.slice(5)}` });
    }
  }
  for (const l of feed.litters) {
    const mated = dayKey(l.mated_on);
    if (mated) ev.push({ id: `mated-${l.id}`, date: mated, kind: 'mated', title: litterLabel(l), detail: label('litterStatus', l.status) });
    const due = dayKey(l.due_on);
    if (due && !l.whelped_at) ev.push({ id: `due-${l.id}`, date: due, kind: 'due', title: litterLabel(l), detail: t('cal.detail.whelpingDue') });
  }
  for (const g of feed.goHome) {
    const on = dayKey(g.go_home_on);
    if (on) ev.push({ id: `home-${g.id}`, date: on, kind: 'go-home', title: g.name, detail: g.litter_name ?? t('cal.detail.goHome') });
  }
  return ev;
}

export function Calendar() {
  const { t, label, locale } = useT();
  const { shortDate } = useDates();
  const q = useQuery<CalendarFeed>('/breeder/breeding/calendar');
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [today] = useState(() => ymd(new Date()));
  const [heatDam, setHeatDam] = useState<Heat | null>(null);
  const [mateFor, setMateFor] = useState<CalLitter | null>(null);
  const [progFor, setProgFor] = useState<CalLitter | null>(null);

  const events = useMemo(() => (q.data ? buildEvents(q.data, t, label) : []), [q.data, t, label]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const days = e.end ? eachDay(e.date, e.end) : [e.date];
      for (const d of days) {
        const list = map.get(d) ?? [];
        list.push(e);
        map.set(d, list);
      }
    }
    return map;
  }, [events]);

  const cells = monthCells(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-GB', { month: 'long', year: 'numeric' });
  const heats = q.data?.heats ?? [];
  const litters = q.data?.litters ?? [];
  const planned = litters.filter((l) => l.status === 'planned' && !l.mated_on);
  const expecting = litters.filter((l) => ['expecting', 'mated'].includes(l.status) || (l.mated_on && !l.whelped_at));

  function shift(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('cal.title')}>
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="ghost" onClick={() => shift(-1)} aria-label={t('cal.prevMonth')}>←</Btn>
          <span className="min-w-[10rem] text-center text-sm text-slate-200">{monthLabel}</span>
          <Btn size="sm" variant="ghost" onClick={() => shift(1)} aria-label={t('cal.nextMonth')}>→</Btn>
          <Btn size="sm" onClick={() => {
            const n = new Date();
            setCursor({ y: n.getFullYear(), m: n.getMonth() });
          }}>{t('common.today')}</Btn>
        </div>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <EmptyState title={t('cal.loadError')} hint={q.error} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(KIND) as Kind[]).map((k) => (
              <Badge key={k} className={KIND[k].cls}>{t(KIND_KEY[k])}</Badge>
            ))}
          </div>

          <Card className="overflow-hidden p-3">
            <div className="grid grid-cols-7 gap-px text-center text-xs text-slate-400">
              {DOW.map((d) => <div key={d} className="py-1">{t(`cal.dow.${d}`)}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {cells.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === cursor.m;
                const items = byDay.get(key) ?? [];
                const shown = items.slice(0, 3);
                return (
                  <div
                    key={key}
                    className={`min-h-[6.5rem] rounded-md border p-1.5 ${
                      key === today ? 'border-indigo-400/60 bg-indigo-500/5' : 'border-slate-800 bg-slate-950/40'
                    } ${inMonth ? '' : 'opacity-40'}`}
                  >
                    <div className="mb-1 text-right text-xs text-slate-400">{d.getDate()}</div>
                    <ul className="space-y-0.5">
                      {shown.map((e) => (
                        <li key={e.id} className="truncate">
                          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${KIND[e.kind].bar}`} aria-hidden="true" />
                          <span className="text-[10px] text-slate-300">{e.title}</span>
                        </li>
                      ))}
                      {items.length > 3 && <li className="text-[10px] text-slate-500">{t('cal.more', { n: items.length - 3 })}</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>

          {planned.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 font-medium text-slate-200">{t('cal.waitingMating')}</h2>
              <ul className="space-y-2">
                {planned.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 text-slate-100">{litterLabel(l)}</span>
                    <Btn size="sm" variant="primary" onClick={() => setMateFor(l)}>{t('litters.recordMating')}</Btn>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {expecting.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 font-medium text-slate-200">{t('cal.expecting')}</h2>
              <ul className="space-y-2">
                {expecting.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 text-slate-100">{litterLabel(l)}</span>
                    <span className="text-xs text-slate-400">
                      {l.mated_on ? t('litters.mated', { date: shortDate(l.mated_on) }) : ''}
                      {l.due_on ? `${l.mated_on ? ' · ' : ''}${t('litters.due', { date: shortDate(l.due_on) })}` : ''}
                    </span>
                    <Btn size="sm" variant="ghost" onClick={() => setProgFor(l)}>{t('litters.progesterone')}</Btn>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <section className="space-y-3">
            <h2 className="font-medium text-slate-200">{t('cal.dams')}</h2>
            {heats.length === 0 ? (
              <EmptyState title={t('cal.noDams')} hint={t('cal.noDamsHint')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {heats.map((h) => (
                  <Card key={h.damId} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-100">{h.name}</div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                          <div>{t('cal.lastSeason', { date: h.lastHeat ? shortDate(h.lastHeat) : t('cal.lastNone') })}</div>
                          <div>{t('cal.next', { date: h.predictedNextHeat ? shortDate(h.predictedNextHeat) : '—' })}{h.intervalDays ? t('cal.cycle', { n: h.intervalDays }) : ''}</div>
                          {h.fertileWindow && (
                            <div>{t('cal.fertile', { from: shortDate(h.fertileWindow.from), to: shortDate(h.fertileWindow.to) })}</div>
                          )}
                        </div>
                      </div>
                      <Btn size="sm" onClick={() => setHeatDam(h)}>{t('cal.heatLog')}</Btn>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Drawer open={!!heatDam} onClose={() => setHeatDam(null)} title={heatDam ? t('cal.heatLogTitle', { name: heatDam.name }) : t('cal.heatLog')}>
        {heatDam && <HeatLog dam={heatDam} onChanged={() => q.reload()} />}
      </Drawer>
      <Drawer open={!!mateFor} onClose={() => setMateFor(null)} title={mateFor ? t('cal.recordMatingTitle', { name: litterLabel(mateFor) }) : t('litters.recordMating')}>
        {mateFor && (
          <RecordMating
            litterId={mateFor.id}
            onDone={() => {
              setMateFor(null);
              q.reload();
            }}
          />
        )}
      </Drawer>
      <Drawer open={!!progFor} onClose={() => setProgFor(null)} title={progFor ? t('cal.progTitle', { name: litterLabel(progFor) }) : t('litters.progesterone')}>
        {progFor && <ProgesteroneForm litterId={progFor.id} onDone={() => q.reload()} />}
      </Drawer>
    </div>
  );
}

function HeatLog({ dam, onChanged }: { dam: Heat; onChanged: () => void }) {
  const { t } = useT();
  const { shortDate } = useDates();
  const q = useQuery<{ heatCycles: HeatCycle[] }>(`/breeder/breeding/heat-cycles?animalId=${dam.damId}`);
  const [run, busy] = useMutation();
  const [form, setForm] = useState({ startedOn: '', endedOn: '', notes: '' });

  async function add() {
    const r = await run(() =>
      api('/breeder/breeding/heat-cycles', {
        method: 'POST',
        body: {
          animalId: dam.damId,
          startedOn: form.startedOn,
          endedOn: form.endedOn || undefined,
          notes: form.notes || undefined,
        },
      })
    );
    if (r) {
      setForm({ startedOn: '', endedOn: '', notes: '' });
      q.reload();
      onChanged();
    }
  }

  async function endCycle(c: HeatCycle) {
    const endedOn = prompt(t('cal.endedPrompt'), ymd(new Date()));
    if (!endedOn) return;
    const r = await run(() => api(`/breeder/breeding/heat-cycles/${c.id}`, { method: 'PATCH', body: { endedOn } }));
    if (r) {
      q.reload();
      onChanged();
    }
  }

  async function remove(c: HeatCycle) {
    if (!confirm(t('cal.deleteSeason'))) return;
    const r = await run(() => api(`/breeder/breeding/heat-cycles/${c.id}`, { method: 'DELETE' }));
    if (r) {
      q.reload();
      onChanged();
    }
  }

  const cycles = q.data?.heatCycles ?? [];

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-slate-400">
        {t('cal.heatHint')}
      </p>
      <div className="space-y-3">
        <Field label={t('cal.startedOn')}><Input type="date" value={form.startedOn} onChange={(e) => setForm({ ...form, startedOn: e.target.value })} /></Field>
        <Field label={t('cal.endedOn')}><Input type="date" value={form.endedOn} onChange={(e) => setForm({ ...form, endedOn: e.target.value })} /></Field>
        <Field label={t('common.notes')}><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Btn variant="primary" disabled={busy || !form.startedOn} onClick={add}>{t('cal.logSeason')}</Btn>
      </div>
      {q.loading && !q.data ? (
        <Spinner />
      ) : cycles.length === 0 ? (
        <p className="text-slate-400">{t('cal.noSeasons')}</p>
      ) : (
        <ul className="space-y-2">
          {cycles.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-800 p-3">
              <div className="font-medium text-slate-100">
                {shortDate(c.started_on)}{c.ended_on ? ` – ${shortDate(c.ended_on)}` : ` – ${t('cal.open')}`}
              </div>
              {c.notes && <p className="mt-1 text-xs text-slate-400">{c.notes}</p>}
              <div className="mt-2 flex gap-2">
                {!c.ended_on && <Btn size="sm" variant="ghost" disabled={busy} onClick={() => endCycle(c)}>{t('cal.markEnded')}</Btn>}
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(c)}>{t('common.delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RecordMating({ litterId, onDone }: { litterId: string; onDone: () => void }) {
  const { t, label } = useT();
  const [run, busy] = useMutation();
  const [form, setForm] = useState(() => ({ matedOn: ymd(new Date()), method: 'natural', progOn: '', ngml: '' }));

  async function save() {
    const progesterone = form.progOn && form.ngml ? [{ on: form.progOn, ngml: Number(form.ngml) }] : undefined;
    const r = await run(() =>
      api(`/breeder/breeding/litters/${litterId}/mated`, {
        method: 'POST',
        body: { matedOn: form.matedOn, method: form.method, progesterone },
      })
    );
    if (r) onDone();
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-400">{t('cal.mateHint')}</p>
      <Field label={t('cal.matedOn')}><Input type="date" value={form.matedOn} onChange={(e) => setForm({ ...form, matedOn: e.target.value })} /></Field>
      <Field label={t('cal.method')}>
        <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          {METHODS.map((m) => <option key={m} value={m}>{label('matingMethod', m)}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('cal.progDate')}><Input type="date" value={form.progOn} onChange={(e) => setForm({ ...form, progOn: e.target.value })} /></Field>
        <Field label={t('cal.ngml')}><Input type="number" step="0.1" value={form.ngml} onChange={(e) => setForm({ ...form, ngml: e.target.value })} /></Field>
      </div>
      <Btn variant="primary" disabled={busy || !form.matedOn} onClick={save}>{t('cal.saveMating')}</Btn>
    </div>
  );
}

export function ProgesteroneForm({ litterId, onDone }: { litterId: string; onDone?: () => void }) {
  const { t } = useT();
  const { shortDate } = useDates();
  const [run, busy] = useMutation();
  const [on, setOn] = useState(() => ymd(new Date()));
  const [ngml, setNgml] = useState('');
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [readings, setReadings] = useState<Array<{ on: string; ngml: number }>>([]);

  async function add() {
    const r = await run(() =>
      api<{ progesterone: Array<{ on: string; ngml: number }>; guidance: Guidance }>(
        `/breeder/breeding/litters/${litterId}/progesterone`,
        { method: 'POST', body: { on, ngml: Number(ngml) } },
      )
    );
    if (r) {
      setReadings(r.progesterone);
      setGuidance(r.guidance);
      setNgml('');
      onDone?.();
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-400">{t('cal.progHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('cal.drawnOn')}><Input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
        <Field label={t('cal.ngml')}><Input type="number" step="0.1" value={ngml} onChange={(e) => setNgml(e.target.value)} /></Field>
      </div>
      <Btn variant="primary" disabled={busy || !on || !ngml} onClick={add}>{t('cal.addReading')}</Btn>
      {guidance && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <Badge className="bg-amber-500/15 text-amber-300 ring-amber-500/30">{titleCase(guidance.phase)}</Badge>
          <p className="mt-2 text-slate-200">{guidance.note}</p>
          {guidance.breedOn && <p className="mt-1 text-xs text-slate-400">{t('cal.breedAround', { date: shortDate(guidance.breedOn) })}</p>}
        </div>
      )}
      {readings.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-400">
          {readings.map((r, i) => (
            <li key={`${r.on}-${i}`}>{shortDate(r.on)} · {r.ngml} {t('cal.ngml')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
