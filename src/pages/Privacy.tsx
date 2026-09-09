import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { shortDate, timeAgo, titleCase } from '../lib/format';

const ACTIONS = ['document.download', 'privacy.export', 'privacy.delete', 'camera.view', 'door.open'];
const SUBJECT_TYPES = ['buyer', 'animal', 'litter'] as const;
const RETENTION_HINT: Record<string, string> = {
  access_log: 'Who opened papers, exports and erasures. Empty keeps the log forever.',
  document: 'Uploaded and generated files. Empty keeps them forever. A contract often needs years.',
};

interface LogEntry {
  id: number;
  user_id: string | null;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  ip: string | null;
  detail: Record<string, unknown> | null;
  at: string;
}
interface RetainClass {
  dataClass: string;
  keepDays: number | null;
  updatedAt: string | null;
}
interface Named {
  id: string;
  name: string | null;
}
interface User {
  id: string;
  email: string;
  name: string | null;
}

function qs(params: Record<string, string>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Privacy() {
  const { user } = useAuth();
  const [run, busy] = useMutation();
  const [action, setAction] = useState('');
  const [subjectType, setSubjectType] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const [eraseType, setEraseType] = useState<(typeof SUBJECT_TYPES)[number]>('buyer');
  const [eraseId, setEraseId] = useState('');
  const [typed, setTyped] = useState('');

  const log = useQuery<{ entries: LogEntry[] }>(
    `/breeder/privacy/access-log${qs({
      action,
      subjectType,
      subjectId,
      userId,
      since: since ? `${since}T00:00:00.000Z` : '',
      until: until ? `${until}T23:59:59.999Z` : '',
    })}`
  );
  const retention = useQuery<{ classes: RetainClass[] }>('/breeder/privacy/retention');
  const [daysEdit, setDaysEdit] = useState<Record<string, string>>({});
  const animals = useQuery<{ animals: Named[] }>('/breeder/animals');
  const litters = useQuery<{ litters: Named[] }>('/breeder/litters');
  const buyers = useQuery<{ buyers: Named[] }>('/breeder/litters/buyers/list');
  const users = useQuery<{ users: User[] }>(user?.role === 'owner' ? '/users' : null);

  const entries = log.data?.entries ?? [];
  const classes = retention.data?.classes ?? [];
  const userLabel = new Map((users.data?.users ?? []).map((u) => [u.id, u.name || u.email]));

  const pool: Named[] =
    eraseType === 'buyer' ? (buyers.data?.buyers ?? [])
    : eraseType === 'animal' ? (animals.data?.animals ?? [])
    : (litters.data?.litters ?? []);
  const chosen = pool.find((r) => r.id === eraseId);
  const chosenName = chosen?.name?.trim() || '';

  async function saveRetention(c: RetainClass) {
    const raw = daysEdit[c.dataClass] ?? (c.keepDays == null ? '' : String(c.keepDays));
    const keepDays = raw.trim() === '' ? 0 : Number(raw);
    if (raw.trim() !== '' && !Number.isFinite(keepDays)) return;
    const r = await run(() =>
      api(`/breeder/privacy/retention/${c.dataClass}`, { method: 'PUT', body: { keepDays } })
    );
    if (r) {
      setDaysEdit((e) => {
        const next = { ...e };
        delete next[c.dataClass];
        return next;
      });
      retention.reload();
    }
  }

  async function sweep() {
    const r = await run(() => api<{ accessLog: number; documents: number }>('/breeder/privacy/retention/run', { method: 'POST' }));
    if (r) {
      alert(`Removed ${r.accessLog} log rows and ${r.documents} documents.`);
      log.reload();
    }
  }

  async function exportSubject() {
    if (!eraseId) return;
    const r = await run(() => api(`/breeder/privacy/export?subjectType=${eraseType}&id=${eraseId}`));
    if (r) {
      downloadJson(`${eraseType}-${chosenName || eraseId}-export.json`, r);
      log.reload();
    }
  }

  async function erase() {
    if (!eraseId || typed !== chosenName) return;
    const r = await run(() =>
      api<{ ok: boolean; deleted: Record<string, number> }>('/breeder/privacy/delete', {
        method: 'POST',
        body: { subjectType: eraseType, id: eraseId, confirm: true },
      })
    );
    if (r) {
      setTyped('');
      setEraseId('');
      animals.reload();
      litters.reload();
      buyers.reload();
      log.reload();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Data & privacy" />
      <p className="text-sm text-slate-400">
        Access log of who opened papers, plus GDPR export and erasure for a buyer, animal or litter.
        Owner records live in the pet-owner app (not built yet).
      </p>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium text-slate-200">Retention</h2>
        {retention.loading && !retention.data ? (
          <Spinner />
        ) : retention.error ? (
          <p className="text-sm text-rose-300">{retention.error}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => {
              const value = daysEdit[c.dataClass] ?? (c.keepDays == null ? '' : String(c.keepDays));
              return (
                <div key={c.dataClass} className="space-y-2">
                  <Field label={titleCase(c.dataClass)} hint={RETENTION_HINT[c.dataClass]}>
                    <Input
                      type="number"
                      min={0}
                      placeholder="off (keep forever)"
                      value={value}
                      onChange={(e) => setDaysEdit({ ...daysEdit, [c.dataClass]: e.target.value })}
                    />
                  </Field>
                  <Btn size="sm" disabled={busy} onClick={() => saveRetention(c)}>Save</Btn>
                </div>
              );
            })}
          </div>
        )}
        <Btn size="sm" disabled={busy} onClick={sweep}>Run sweep now</Btn>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium text-slate-200">Export or erase</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject type">
            <Select
              value={eraseType}
              onChange={(e) => {
                setEraseType(e.target.value as (typeof SUBJECT_TYPES)[number]);
                setEraseId('');
                setTyped('');
              }}
            >
              {SUBJECT_TYPES.map((t) => (
                <option key={t} value={t}>{titleCase(t)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={eraseId} onChange={(e) => { setEraseId(e.target.value); setTyped(''); }}>
              <option value="">Select…</option>
              {pool.map((r) => (
                <option key={r.id} value={r.id}>{r.name || r.id}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" disabled={busy || !eraseId} onClick={exportSubject}>Export JSON</Btn>
        </div>
        {chosenName && (
          <div className="space-y-2 rounded-lg border border-rose-900/60 p-3">
            <p className="text-sm text-slate-400">
              Erase {chosenName}? Type the name exactly. A litter with reserved or sold puppies, or an animal that is a litter parent, is refused.
            </p>
            <Field label="Type the name to confirm">
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </Field>
            <Btn variant="danger" disabled={busy || typed !== chosenName} onClick={erase}>Erase</Btn>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium text-slate-200">Access log</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Action">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject type">
            <Select value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
              <option value="">All</option>
              {['buyer', 'animal', 'litter', 'puppy', 'document', 'device'].map((t) => (
                <option key={t} value={t}>{titleCase(t)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject id">
            <Input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="uuid or device id" />
          </Field>
          <Field label="User">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All</option>
              {(users.data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </Select>
          </Field>
          <Field label="Since">
            <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </Field>
          <Field label="Until">
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        </div>

        {log.loading && !log.data ? (
          <Spinner />
        ) : log.error ? (
          <p className="text-sm text-rose-300">{log.error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400">No matching entries.</p>
        ) : (
          <ul className="divide-y divide-slate-800 text-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
                <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{e.action}</Badge>
                <span className="min-w-0 flex-1 text-slate-200">
                  {[e.subject_type, e.subject_id].filter(Boolean).join(' · ') || '—'}
                  {e.user_id && (
                    <span className="ml-2 text-xs text-slate-500">{userLabel.get(e.user_id) || e.user_id}</span>
                  )}
                </span>
                {e.ip && <span className="text-xs text-slate-500">{e.ip}</span>}
                <span className="text-xs text-slate-500" title={e.at}>{timeAgo(e.at)} · {shortDate(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
