import { useState } from 'react';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { titleCase } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';

const TABS = ['consumables', 'maintenance', 'emergency', 'flags'] as const;
type Tab = (typeof TABS)[number];

export function Ops() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('consumables');
  return (
    <div className="space-y-5">
      <PageHeader title={t('ops.title')} />
      <div className="flex gap-1">
        {TABS.map((key) => (
          <Btn key={key} size="sm" variant={tab === key ? 'primary' : 'ghost'} onClick={() => setTab(key)}>
            {t(`ops.${key}`)}
          </Btn>
        ))}
      </div>
      {tab === 'consumables' && <Consumables />}
      {tab === 'maintenance' && <Maintenance />}
      {tab === 'emergency' && <Emergency />}
      {tab === 'flags' && <FeatureFlags />}
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
  const { t, label } = useT();
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
    const v = prompt(t('ops.onHandPrompt', { name: c.name, unit: c.unit }), String(c.on_hand));
    if (v == null) return;
    const r = await run(() => api(`/breeder/ops/consumables/${c.id}`, { method: 'PATCH', body: { onHand: Number(v) } }));
    if (r) q.reload();
  }
  async function sweep() {
    const r = await run(() => api<{ raised: number }>('/breeder/ops/consumables/sweep', { method: 'POST' }));
    if (r) {
      alert(t('ops.raised', { n: r.raised }));
      q.reload();
    }
  }

  const list = q.data?.consumables ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Btn variant="primary" size="sm" onClick={() => setAdding(true)}>{t('ops.addItem')}</Btn>
        <Btn size="sm" disabled={busy} onClick={sweep}>{t('ops.sweep')}</Btn>
      </div>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('common.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t('ops.category')}>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['food', 'bedding', 'meds', 'cleaning', 'filters', 'other'].map((c) => <option key={c} value={c}>{label('consumableCat', c)}</option>)}
              </Select>
            </Field>
            <Field label={t('ops.unit')}><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label={t('ops.onHand')}><Input type="number" value={form.onHand} onChange={(e) => setForm({ ...form, onHand: e.target.value })} /></Field>
            <Field label={t('ops.lowThreshold')}><Input type="number" value={form.lowThreshold} onChange={(e) => setForm({ ...form, lowThreshold: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.name} onClick={create}>{t('common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title={t('ops.emptyCons')} hint={t('ops.emptyConsHint')} />
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <Badge className={LEVEL_TONE[c.status.level] ?? LEVEL_TONE.ok}>{label('level', c.status.level)}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {t('ops.onHandLine', { n: c.on_hand, unit: c.unit, th: c.low_threshold })}
                    {c.estimatedDailyUse ? t('ops.perDay', { n: c.estimatedDailyUse }) : ''} · {c.status.message}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setOnHand(c)}>{t('ops.updateCount')}</Btn>
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
  const { t, label } = useT();
  const { timeAgo } = useDates();
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
    <EmptyState title={t('ops.noWear')} hint={t('ops.noWearHint')} />
  ) : (
    <div className="space-y-3">
      {devices.map((d) => (
        <Card key={d.deviceId} className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium text-slate-100">{d.name || d.deviceId}</span>
            {d.type && <span className="text-xs text-slate-500">{label('deviceType', d.type)}</span>}
          </div>
          <ul className="space-y-1.5">
            {d.metrics.map((m) => (
              <li key={m.metric} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className={M_TONE[m.prediction.level] ?? M_TONE.ok}>{label('level', m.prediction.level)}</Badge>
                <span className="text-slate-300">{titleCase(m.metric)}</span>
                <span className="text-xs text-slate-500">
                  {m.value}{m.service_limit ? ` / ${m.service_limit}` : ''}
                  {m.prediction.usedFraction != null && ` (${Math.round(m.prediction.usedFraction * 100)}%)`}
                  {' — '}{m.prediction.message}
                </span>
                {m.serviced_at && <span className="text-xs text-slate-600">{t('ops.serviced', { when: timeAgo(m.serviced_at) })}</span>}
                {m.prediction.level !== 'ok' && (
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => serviced(d.deviceId, m.metric)}>
                    {t('ops.markServiced')}
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
  const { t } = useT();
  const { timeAgo } = useDates();
  const q = useQuery<EmergencyStatus>('/breeder/ops/emergency/status');
  const [run, busy] = useMutation();
  const [manifest, setManifest] = useState<ManifestRow[] | null>(null);

  const active = q.data?.kennel?.emergency_state === 'active';

  function modeLabel(mode: string | null | undefined): string {
    if (!mode) return '';
    const key = `ops.${mode}`;
    const translated = t(key);
    return translated === key ? titleCase(mode) : translated;
  }

  async function trigger(mode: string) {
    if (mode !== 'drill' && !confirm(t('ops.confirm', { mode: mode.toUpperCase() }))) return;
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
                {t('ops.active', { mode: q.data?.kennel?.emergency_mode?.toUpperCase() ?? '' })}
              </Badge>
              <span className="text-xs text-slate-400">{t('ops.since', { when: timeAgo(q.data?.kennel?.emergency_since) })}</span>
            </div>
            <Btn variant="danger" disabled={busy} onClick={end}>{t('ops.end')}</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              {t('ops.emergencyHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="danger" disabled={busy} onClick={() => trigger('fire')}>{t('ops.fire')}</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => trigger('flood')}>{t('ops.flood')}</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => trigger('evac')}>{t('ops.evac')}</Btn>
              <Btn disabled={busy} onClick={() => trigger('drill')}>{t('ops.drill')}</Btn>
            </div>
            {q.data?.lastEvent && (
              <p className="text-xs text-slate-600">
                {t('ops.last', { mode: modeLabel(q.data.lastEvent.mode), when: timeAgo(q.data.lastEvent.started_at) })}
                {q.data.lastEvent.ended_at ? t('ops.ended') : ''}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">{t('ops.manifest')}</h3>
          <Btn size="sm" variant="ghost" disabled={busy} onClick={loadManifest}>{t('common.refresh')}</Btn>
        </div>
        {manifest == null ? (
          <p className="text-sm text-slate-500">{t('ops.loadManifest')}</p>
        ) : manifest.length === 0 ? (
          <p className="text-sm text-slate-500">{t('ops.noPens')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1 pr-3">{t('ops.pen')}</th>
                  <th className="py-1 pr-3">{t('ops.animal')}</th>
                  <th className="py-1 pr-3">{t('ops.microchip')}</th>
                  <th className="py-1 pr-3">{t('ops.vet')}</th>
                  <th className="py-1 pr-3">{t('ops.emergencyContact')}</th>
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

// ── Feature flags (Phase 20, A12) ───────────────────────────────────────────
interface Flag {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

function FeatureFlags() {
  const { t } = useT();
  const { timeAgo } = useDates();
  const q = useQuery<{ flags: Flag[] }>('/breeder/flags');
  const [run, busy] = useMutation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ key: '', description: '' });

  async function create() {
    const r = await run(() =>
      api(`/breeder/flags/${form.key}`, { method: 'PUT', body: { enabled: false, description: form.description || null } })
    );
    if (r) {
      setAdding(false);
      setForm({ key: '', description: '' });
      q.reload();
    }
  }
  async function toggle(f: Flag) {
    const r = await run(() => api(`/breeder/flags/${f.key}`, { method: 'PUT', body: { enabled: !f.enabled } }));
    if (r) q.reload();
  }
  async function remove(f: Flag) {
    if (!confirm(t('ops.flagDeleteConfirm', { key: f.key }))) return;
    const r = await run(() => api(`/breeder/flags/${f.key}`, { method: 'DELETE' }));
    if (r) q.reload();
  }

  const flags = q.data?.flags ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Btn variant="primary" size="sm" onClick={() => setAdding(true)}>{t('ops.flagAdd')}</Btn>
      </div>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('ops.flagKey')}>
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="new-console" />
            </Field>
            <Field label={t('ops.flagDescription')}>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('ops.flagKeyHint')}</p>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" disabled={busy || !form.key} onClick={create}>{t('common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Btn>
          </div>
        </Card>
      )}

      {q.loading && !q.data ? (
        <Spinner />
      ) : flags.length === 0 ? (
        <EmptyState title={t('ops.flagsEmpty')} hint={t('ops.flagsEmptyHint')} />
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li key={f.key}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <Badge className={f.enabled ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' : 'bg-slate-700/40 text-slate-400 ring-slate-600/40'}>
                  {f.enabled ? t('ops.flagOn') : t('ops.flagOff')}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{f.key}</div>
                  {f.description && <div className="text-xs text-slate-500">{f.description}</div>}
                  <div className="text-xs text-slate-600">{t('ops.flagUpdated', { when: timeAgo(f.updated_at) })}</div>
                </div>
                <Btn size="sm" variant={f.enabled ? 'danger' : 'primary'} disabled={busy} onClick={() => toggle(f)}>
                  {f.enabled ? t('ops.flagDisable') : t('ops.flagEnable')}
                </Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(f)}>{t('common.delete')}</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
