import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, PageHeader, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { useQuery } from '../lib/useApi';
import { useStream } from '../lib/stream';

interface InboxItem {
  id: string;
  title: string;
  severity: string;
  kind: string;
  status: string;
  created_at: string;
  animal_name?: string | null;
}
interface InboxResp {
  items: InboxItem[];
  counts: { open: number; critical: number; snoozed: number };
}

function Stat({ label, value, tone = 'slate', to }: { label: string; value: number | string; tone?: string; to?: string }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-100',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
  };
  const body = (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Dashboard() {
  const { t, label } = useT();
  const { timeAgo } = useDates();
  const inbox = useQuery<InboxResp>('/breeder/inbox?status=active');
  const devices = useQuery<{ devices: Array<{ device_id: string; status: string | null }> }>('/breeder/ops/devices');
  const litters = useQuery<{ litters: Array<{ id: string; name: string | null; status: string; puppy_count: number; available_count: number }> }>(
    '/breeder/litters'
  );
  const due = useQuery<{ due: Array<{ medicationId: string; scheduledFor: string }> }>('/breeder/medications/due?hours=24');
  const consumables = useQuery<{ consumables: Array<{ id: string; name: string; status: { level: string; message: string } }> }>(
    '/breeder/ops/consumables'
  );
  const breeding = useQuery<{
    heats: Array<{ predictedNextHeat: string | null }>;
    litters: Array<{ due_on: string | null; whelped_at: string | null }>;
  }>('/breeder/breeding/calendar');

  useStream((e) => {
    if (e.type === 'exception' || e.type === 'device') {
      inbox.reload();
      if (e.type === 'device') devices.reload();
    }
  });
  useEffect(() => {
    const tmr = setInterval(() => {
      due.reload();
      consumables.reload();
    }, 60_000);
    return () => clearInterval(tmr);
  }, [due, consumables]);

  const online = devices.data?.devices.filter((d) => d.status === 'online').length ?? 0;
  const totalDev = devices.data?.devices.length ?? 0;
  const lowConsumables = consumables.data?.consumables.filter((c) => c.status.level !== 'ok') ?? [];
  const activeLitters = litters.data?.litters.filter((l) => ['whelped', 'nursing', 'weaning'].includes(l.status)) ?? [];
  const availablePups = litters.data?.litters.reduce((n, l) => n + (l.available_count ?? 0), 0) ?? 0;
  const onCalendar =
    (breeding.data?.heats.filter((h) => h.predictedNextHeat).length ?? 0) +
    (breeding.data?.litters.filter((l) => l.due_on && !l.whelped_at).length ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('dash.title')} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Stat label={t('dash.openCare')} value={inbox.data?.counts.open ?? '—'} tone={inbox.data?.counts.open ? 'amber' : 'slate'} to="/inbox" />
        <Stat label={t('dash.critical')} value={inbox.data?.counts.critical ?? '—'} tone={inbox.data?.counts.critical ? 'rose' : 'slate'} to="/inbox" />
        <Stat label={t('dash.devicesOnline')} value={totalDev ? `${online}/${totalDev}` : '—'} tone={totalDev && online < totalDev ? 'amber' : 'emerald'} to="/devices" />
        <Stat label={t('dash.dosesDue')} value={due.data?.due.length ?? '—'} tone={due.data?.due.length ? 'sky' : 'slate'} to="/meds" />
        <Stat label={t('dash.activeLitters')} value={activeLitters.length} tone="slate" to="/litters" />
        <Stat label={t('dash.pupsAvailable')} value={availablePups} tone="slate" to="/buyers" />
        <Stat label={t('dash.onCalendar')} value={breeding.data ? onCalendar : '—'} tone={onCalendar ? 'amber' : 'slate'} to="/calendar" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-200">{t('dash.careInbox')}</h2>
            <Link to="/inbox" className="text-xs text-indigo-400 hover:text-indigo-300">{t('dash.openLink')}</Link>
          </div>
          {inbox.loading && !inbox.data ? (
            <Spinner />
          ) : inbox.data && inbox.data.items.length ? (
            <ul className="space-y-2">
              {inbox.data.items.slice(0, 6).map((it) => (
                <li key={it.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      it.severity === 'critical' ? 'bg-rose-400' : it.severity === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{it.title}</span>
                  {it.animal_name && <span className="text-xs text-slate-500">{it.animal_name}</span>}
                  <span className="text-xs text-slate-600">{timeAgo(it.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">{t('dash.nothing')}</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-200">{t('dash.supplies')}</h2>
            <Link to="/ops" className="text-xs text-indigo-400 hover:text-indigo-300">{t('dash.opsLink')}</Link>
          </div>
          {lowConsumables.length ? (
            <ul className="space-y-2">
              {lowConsumables.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <Badge className="bg-amber-500/15 text-amber-300 ring-amber-500/30">{label('level', c.status.level)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-slate-200">{c.name}</span>
                  <span className="truncate text-xs text-slate-500">{c.status.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">{t('dash.suppliesOk')}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
