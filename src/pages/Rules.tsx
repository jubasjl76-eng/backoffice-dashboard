import { useState } from 'react';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { titleCase } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type?: string; metric?: string; belowPct?: number; statusEquals?: string } | null;
  conditions: Array<{ field: string; op: string; value: unknown }> | null;
  actions: Array<{ type: string }> | null;
  cooldown_seconds: number | null;
  last_fired_at: string | null;
}
interface Firing {
  id: string;
  fired_at: string;
  context: unknown;
  alert_id: string | null;
}
interface TestResult {
  result: { fired: boolean; reason: string; actions: Array<{ type: string }> };
  sample: Record<string, unknown>;
}

const EVENT_TYPES = ['telemetry', 'device_status', 'low_battery', 'missed_meal', 'device_offline', 'wrong_pen', 'maintenance_due'];

export function Rules() {
  const { t } = useT();
  const { timeAgo } = useDates();
  const q = useQuery<{ rules: Rule[] }>('/breeder/rules');
  const [run, busy] = useMutation();
  const [openId, setOpenId] = useState<string | null>(null);

  async function toggle(r: Rule) {
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'PATCH', body: { enabled: !r.enabled } }));
    if (ok) q.reload();
  }
  async function remove(r: Rule) {
    if (!confirm(t('rules.deleteConfirm', { name: r.name }))) return;
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'DELETE' }));
    if (ok) {
      if (openId === r.id) setOpenId(null);
      q.reload();
    }
  }
  async function installPresets() {
    const r = await run(() => api<{ installed: number }>('/breeder/rules/install-presets', { method: 'POST' }));
    if (r) {
      alert(t('rules.installed', { n: r.installed }));
      q.reload();
    }
  }

  const rules = q.data?.rules ?? [];
  const open = rules.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title={t('rules.title')}>
        <Btn disabled={busy} onClick={installPresets}>{t('rules.install')}</Btn>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : rules.length === 0 ? (
        <EmptyState title={t('rules.empty')} hint={t('rules.emptyHint')} />
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  disabled={busy}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${r.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  aria-pressed={r.enabled}
                  aria-label={r.enabled ? t('rules.disableNamed', { name: r.name }) : t('rules.enableNamed', { name: r.name })}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(r.id)}>
                  <div className="font-medium text-slate-100">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>{t('rules.on', { type: titleCase(r.trigger?.type ?? 'event') })}{r.trigger?.metric ? ` · ${r.trigger.metric}` : ''}</span>
                    <span>→ {(r.actions ?? []).map((a) => titleCase(a.type)).join(', ') || t('rules.noAction')}</span>
                    <span>{t('rules.cooldown', { n: Math.round((r.cooldown_seconds ?? 0) / 60) })}</span>
                    {r.last_fired_at && <span>{t('rules.lastFired', { when: timeAgo(r.last_fired_at) })}</span>}
                  </div>
                </button>
                {!r.enabled && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{t('common.off')}</Badge>}
                <Btn size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>{t('rules.test')}</Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(r)}>{t('common.delete')}</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? t('rules.title')}>
        {open && <RuleDetail key={open.id} rule={open} />}
      </Drawer>
    </div>
  );
}

function RuleDetail({ rule }: { rule: Rule }) {
  const { t } = useT();
  const { timeAgo } = useDates();
  const firings = useQuery<{ firings: Firing[] }>(`/breeder/rules/${rule.id}/firings`);
  const [run, busy] = useMutation();
  const [form, setForm] = useState({
    type: rule.trigger?.type ?? 'telemetry',
    metric: rule.trigger?.metric ?? '',
    value: '',
    status: typeof rule.trigger?.statusEquals === 'string' ? rule.trigger.statusEquals : '',
    deviceId: '',
    deviceType: '',
  });
  const [result, setResult] = useState<TestResult | null>(null);

  async function dryRun() {
    const r = await run(() =>
      api<TestResult>(`/breeder/rules/${rule.id}/test`, {
        method: 'POST',
        body: {
          type: form.type,
          metric: form.metric || undefined,
          value: form.value === '' ? undefined : Number(form.value),
          status: form.status || undefined,
          deviceId: form.deviceId || undefined,
          deviceType: form.deviceType || undefined,
        },
      })
    );
    if (r) setResult(r);
  }

  const conds = rule.conditions ?? [];
  const triggerDetail = `${titleCase(rule.trigger?.type ?? 'event')}${rule.trigger?.metric ? ` · ${rule.trigger.metric}` : ''}`;
  const thenActions = (rule.actions ?? []).map((a) => titleCase(a.type)).join(', ') || t('rules.noAction');

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-1 text-xs text-slate-400">
        <p>{t('rules.trigger', { detail: triggerDetail })}</p>
        {conds.length > 0 && (
          <p>{t('rules.ifCond', { conds: conds.map((c) => `${c.field} ${c.op} ${String(c.value)}`).join(' and ') })}</p>
        )}
        <p>{t('rules.then', { actions: thenActions })}</p>
      </div>

      <div>
        <h3 className="mb-3 font-medium text-slate-200">{t('rules.dryRun')}</h3>
        <p className="mb-3 text-xs text-slate-400">{t('rules.dryRunHint')}</p>
        <div className="space-y-3">
          <Field label={t('rules.eventType')}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {EVENT_TYPES.map((typ) => <option key={typ} value={typ}>{titleCase(typ)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('rules.metric')}><Input value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="temperature" /></Field>
            <Field label={t('rules.value')}><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="29" /></Field>
            <Field label={t('common.status')}><Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="offline" /></Field>
            <Field label={t('devices.deviceType')}><Input value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })} placeholder="sensor" /></Field>
          </div>
          <Field label={t('devices.deviceId')}><Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} /></Field>
          <Btn variant="primary" disabled={busy} onClick={dryRun}>{t('rules.runTest')}</Btn>
        </div>

        {result && (
          <div className={`mt-3 rounded-lg border p-3 ${result.result.fired ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="font-medium text-slate-100">
              {t(`rules.reason.${result.result.reason}`) === `rules.reason.${result.result.reason}`
                ? titleCase(result.result.reason)
                : t(`rules.reason.${result.result.reason}`)}
            </div>
            {result.result.fired && result.result.actions.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                {t('rules.wouldRun', { list: result.result.actions.map((a) => titleCase(a.type)).join(', ') })}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-medium text-slate-200">{t('rules.history')}</h3>
        {firings.loading && !firings.data ? (
          <Spinner />
        ) : firings.data && firings.data.firings.length ? (
          <ul className="space-y-2">
            {firings.data.firings.map((f) => (
              <li key={f.id} className="rounded-lg border border-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200">{timeAgo(f.fired_at)}</span>
                  {f.alert_id && <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{t('rules.alert')}</Badge>}
                </div>
                {f.context != null && (
                  <pre className="mt-2 overflow-auto text-xs text-slate-400">{JSON.stringify(f.context, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">{t('rules.notFired')}</p>
        )}
      </div>
    </div>
  );
}
