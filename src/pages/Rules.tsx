import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, EmptyState, PageHeader, Spinner } from '../components/ui';
import { timeAgo, titleCase } from '../lib/format';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type?: string; metric?: string } | null;
  actions: Array<{ type: string }> | null;
  cooldown_seconds: number | null;
  last_fired_at: string | null;
}

export function Rules() {
  const q = useQuery<{ rules: Rule[] }>('/breeder/rules');
  const [run, busy] = useMutation();

  async function toggle(r: Rule) {
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'PATCH', body: { enabled: !r.enabled } }));
    if (ok) q.reload();
  }
  async function remove(r: Rule) {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'DELETE' }));
    if (ok) q.reload();
  }
  async function installPresets() {
    const r = await run(() => api<{ installed: number }>('/breeder/rules/install-presets', { method: 'POST' }));
    if (r) {
      alert(`Installed ${r.installed} preset rule(s).`);
      q.reload();
    }
  }

  const rules = q.data?.rules ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Rules">
        <Btn disabled={busy} onClick={installPresets}>Install presets</Btn>
      </PageHeader>

      {q.loading && !q.data ? (
        <Spinner />
      ) : rules.length === 0 ? (
        <EmptyState title="No rules yet" hint="Install the presets to get sensible defaults for feeders, water, doors and sensors." />
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <button
                  onClick={() => toggle(r)}
                  disabled={busy}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${r.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  aria-pressed={r.enabled}
                  aria-label={r.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>on {titleCase(r.trigger?.type ?? 'event')}{r.trigger?.metric ? ` · ${r.trigger.metric}` : ''}</span>
                    <span>→ {(r.actions ?? []).map((a) => titleCase(a.type)).join(', ') || 'no action'}</span>
                    <span>cooldown {Math.round((r.cooldown_seconds ?? 0) / 60)}m</span>
                    {r.last_fired_at && <span>last fired {timeAgo(r.last_fired_at)}</span>}
                  </div>
                </div>
                {!r.enabled && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">off</Badge>}
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(r)}>Delete</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
