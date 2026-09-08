import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { timeAgo, titleCase } from '../lib/format';

const TABS = [
  { key: 'consumables', label: 'Consumables' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'emergency', label: 'Emergency' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export function Ops() {
  const [tab, setTab] = useState<Tab>('consumables');
  return (
    <div className="space-y-5">
      <PageHeader title="Ops" />
      <div className="flex gap-1">
        {TABS.map((t) => (
          <Btn key={t.key} size="sm" variant={tab === t.key ? 'primary' : 'ghost'} onClick={() => setTab(t.key)}>
            {t.label}
          </Btn>
        ))}
      </div>
      {tab === 'consumables' && <Consumables />}
      {tab === 'maintenance' && <Maintenance />}
      {tab === 'emergency' && <Emergency />}
    </div>
  );
}

// ── Consumables ────────────────────────────────────────────────────────────
interface Consumable {
  id: string;
  name: string;
  category: string;
  unit: string;
  on_hand: number;
  low_threshold: number;
  estimatedDailyUse: number | null;
  status: { level: string; message: string; daysLeft: number | null };
}
const LEVEL_TONE: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  low: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  out: 'bg-rose-500/20 text-rose-200 ring-rose-500/40',
};

function Consumables() {
  const q = useQuery<{ consumables: Consumable[] }>('/breeder/ops/consumables');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'food', unit: 'kg', onHand: '0', lowThreshold: '0' });

  async function create() {
    const r = await run(() =>
      api('/breeder/ops/consumables', {
        method: 'POST',
        body: {
          name: form.name,
          category: form.category,
          unit: form.unit,
          onHand: Number(form.onHand),
          lowThreshold: Number(form.lowThreshold),
        },
      })
    );
    if (r) {
      setAdding(false);
      setForm({ name: '', category: 'food', unit: 'kg', onHand: '0', lowThreshold: '0' });
      q.reload();
    }
  }
  async function setOnHand(c: Consumable) {
    const v = prompt(`On-hand ${c.name} (${c.unit})`, String(c.on_hand));
    if (v == null) return;
    const r = await run(() => api(`/breeder/ops/consumables/${c.id}`, { method: 'PATCH', body: { onHand: Number(v) } }));
    if (r) q.reload();
  }
  async function sweep() {
    const r = await run(() => api<{ raised: number }>('/breeder/ops/consumables/sweep', { method: 'POST' }));
    if (r) {
      alert(`${r.raised} warning(s) raised into the care inbox.`);
      q.reload();
    }
  }

  const list = q.data?.consumables ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Btn variant="primary" size="sm" onClick={() => setAdding(true)}>Add item</Btn>
        <Btn size="sm" disabled={busy} onClick={sweep}>Run low-stock check</Btn>
      </div>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['food', 'bedding', 'meds', 'cleaning', 'filters', 'other'].map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
              </Select>
            </Field>
            <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="On hand"><Input type="number" value={form.onHand} onChange={(e) => setForm({ ...form, onHand: e.target.value })} /></Field>
            <Field label="Low threshold"><Input type="number" value={form.lowThreshold} onChange={(e) => setForm({ ...form, lowThreshold: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.name} onClick={create}>Save</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No consumables tracked" hint="Add food, bedding and cleaning supplies to get low-stock warnings." />
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <Badge className={LEVEL_TONE[c.status.level] ?? LEVEL_TONE.ok}>{c.status.level}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.on_hand} {c.unit} on hand · threshold {c.low_threshold}
                    {c.estimatedDailyUse ? ` · ~${c.estimatedDailyUse}/day` : ''} · {c.status.message}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setOnHand(c)}>Update count</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Maintenance ───────────────────────────────────────────────────────────
interface MDevice {
  deviceId: string;
  name: string | null;
  type: string | null;
  metrics: Array<{
    metric: string;
    value: number;
    service_limit: number | null;
    serviced_at: string | null;
    prediction: { level: string; message: string; usedFraction: number | null; remaining: number | null };
  }>;
}
const M_TONE: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  monitor: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  due: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  overdue: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

function Maintenance() {
  const q = useQuery<{ devices: MDevice[] }>('/breeder/ops/maintenance');
  const [run, busy] = useMutation();

  async function serviced(deviceId: string, metric: string) {
    const r = await run(() => api(`/breeder/ops/maintenance/${deviceId}/${metric}/serviced`, { method: 'POST' }));
    if (r) q.reload();
  }

  const devices = q.data?.devices ?? [];

  return q.loading && !q.data ? (
    <Spinner />
  ) : devices.length === 0 ? (
    <EmptyState title="No wear data yet" hint="Counters populate as devices report feed cycles, door cycles and pump time." />
  ) : (
    <div className="space-y-3">
      {devices.map((d) => (
        <Card key={d.deviceId} className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium text-slate-100">{d.name || d.deviceId}</span>
            {d.type && <span className="text-xs text-slate-500">{titleCase(d.type)}</span>}
          </div>
          <ul className="space-y-1.5">
            {d.metrics.map((m) => (
              <li key={m.metric} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className={M_TONE[m.prediction.level] ?? M_TONE.ok}>{m.prediction.level}</Badge>
                <span className="text-slate-300">{titleCase(m.metric)}</span>
                <span className="text-xs text-slate-500">
                  {m.value}{m.service_limit ? ` / ${m.service_limit}` : ''}
                  {m.prediction.usedFraction != null && ` (${Math.round(m.prediction.usedFraction * 100)}%)`}
                  {' — '}{m.prediction.message}
                </span>
                {m.serviced_at && <span className="text-xs text-slate-600">serviced {timeAgo(m.serviced_at)}</span>}
                {m.prediction.level !== 'ok' && (
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => serviced(d.deviceId, m.metric)}>
                    Mark serviced
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

// ── Emergency ─────────────────────────────────────────────────────────────
interface EmergencyStatus {
  kennel: { emergency_state: string | null; emergency_mode: string | null; emergency_since: string | null } | null;
  lastEvent: { mode: string; started_at: string; ended_at: string | null } | null;
}
interface ManifestRow {
  pen: string;
  animal: string | null;
  microchip: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

function Emergency() {
  const q = useQuery<EmergencyStatus>('/breeder/ops/emergency/status');
  const [run, busy] = useMutation();
  const [manifest, setManifest] = useState<ManifestRow[] | null>(null);

  const active = q.data?.kennel?.emergency_state === 'active';

  async function trigger(mode: string) {
    if (mode !== 'drill' && !confirm(`Activate ${mode.toUpperCase()} mode? This unlocks every pen door and alerts everyone.`)) return;
    const r = await run(() => api('/breeder/ops/emergency/trigger', { method: 'POST', body: { mode } }));
    if (r) q.reload();
  }
  async function end() {
    const r = await run(() => api('/breeder/ops/emergency/end', { method: 'POST' }));
    if (r) q.reload();
  }
  async function loadManifest() {
    const r = await run(() => api<{ manifest: ManifestRow[] }>('/breeder/ops/emergency/manifest'));
    if (r) setManifest(r.manifest);
  }

  return (
    <div className="space-y-4">
      <Card className={`p-4 ${active ? 'border-rose-500/50 bg-rose-500/5' : ''}`}>
        {q.loading && !q.data ? (
          <Spinner />
        ) : active ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500/20 text-rose-200 ring-rose-500/40">
                {q.data?.kennel?.emergency_mode?.toUpperCase()} ACTIVE
              </Badge>
              <span className="text-xs text-slate-400">since {timeAgo(q.data?.kennel?.emergency_since)}</span>
            </div>
            <Btn variant="danger" disabled={busy} onClick={end}>End emergency</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Activating an emergency unlocks all pen doors, notifies everyone, and raises a critical care item.
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="danger" disabled={busy} onClick={() => trigger('fire')}>Fire</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => trigger('flood')}>Flood</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => trigger('evac')}>Evacuate</Btn>
              <Btn disabled={busy} onClick={() => trigger('drill')}>Run drill</Btn>
            </div>
            {q.data?.lastEvent && (
              <p className="text-xs text-slate-600">
                Last: {titleCase(q.data.lastEvent.mode)} · {timeAgo(q.data.lastEvent.started_at)}
                {q.data.lastEvent.ended_at ? ' (ended)' : ''}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Evacuation manifest</h3>
          <Btn size="sm" variant="ghost" disabled={busy} onClick={loadManifest}>Refresh</Btn>
        </div>
        {manifest == null ? (
          <p className="text-sm text-slate-500">Load the pen → animals → contacts list for a print-out.</p>
        ) : manifest.length === 0 ? (
          <p className="text-sm text-slate-500">No pens configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1 pr-3">Pen</th>
                  <th className="py-1 pr-3">Animal</th>
                  <th className="py-1 pr-3">Microchip</th>
                  <th className="py-1 pr-3">Vet</th>
                  <th className="py-1 pr-3">Emergency contact</th>
                </tr>
              </thead>
              <tbody>
                {manifest.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="py-1 pr-3 text-slate-300">{r.pen}</td>
                    <td className="py-1 pr-3 text-slate-200">{r.animal ?? '—'}</td>
                    <td className="py-1 pr-3 font-mono text-xs text-slate-500">{r.microchip ?? '—'}</td>
                    <td className="py-1 pr-3 text-xs text-slate-500">{r.vet_name ?? '—'} {r.vet_phone ?? ''}</td>
                    <td className="py-1 pr-3 text-xs text-slate-500">{r.emergency_contact ?? '—'} {r.emergency_phone ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
