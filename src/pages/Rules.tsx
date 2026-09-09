import { Badge, Btn, Card, EmptyState, PageHeader, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { api } from '../lib/api';
import { titleCase } from '../lib/format';
import { useMutation, useQuery } from '../lib/useApi';

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
  const { t } = useT();
  const { timeAgo } = useDates();
  const q = useQuery<{ rules: Rule[] }>('/breeder/rules');
  const [run, busy] = useMutation();

  async function toggle(r: Rule) {
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'PATCH', body: { enabled: !r.enabled } }));
    if (ok) q.reload();
  }
  async function remove(r: Rule) {
    if (!confirm(t('rules.deleteConfirm', { name: r.name }))) return;
    const ok = await run(() => api(`/breeder/rules/${r.id}`, { method: 'DELETE' }));
    if (ok) q.reload();
  }
  async function installPresets() {
    const r = await run(() => api<{ installed: number }>('/breeder/rules/install-presets', { method: 'POST' }));
    if (r) {
      alert(t('rules.installed', { n: r.installed }));
      q.reload();
    }
  }

  const rules = q.data?.rules ?? [];

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
                  onClick={() => toggle(r)}
                  disabled={busy}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${r.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  aria-pressed={r.enabled}
                  aria-label={r.enabled ? t('rules.disable') : t('rules.enable')}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>{t('rules.on', { type: titleCase(r.trigger?.type ?? 'event') })}{r.trigger?.metric ? ` · ${r.trigger.metric}` : ''}</span>
                    <span>→ {(r.actions ?? []).map((a) => titleCase(a.type)).join(', ') || t('rules.noAction')}</span>
                    <span>{t('rules.cooldown', { n: Math.round((r.cooldown_seconds ?? 0) / 60) })}</span>
                    {r.last_fired_at && <span>{t('rules.lastFired', { when: timeAgo(r.last_fired_at) })}</span>}
                  </div>
                </div>
                {!r.enabled && <Badge className="bg-slate-700/40 text-slate-400 ring-slate-600/40">{t('common.off')}</Badge>}
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(r)}>{t('common.delete')}</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
