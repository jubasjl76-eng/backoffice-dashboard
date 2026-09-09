import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Btn, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui';

const CHANNELS = ['log', 'email', 'sms', 'webhook', 'siren', 'push'] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABEL: Record<Channel, string> = {
  log: 'Log (console)',
  email: 'Email',
  sms: 'SMS',
  webhook: 'Webhook',
  siren: 'Siren',
  push: 'Push',
};

interface QuietHours {
  start: string;
  end: string;
  overrideSeverity?: 'warning' | 'critical';
}

interface EscalationStep {
  afterSeconds: number;
  channel: Channel;
  target?: string | null;
  label?: string;
}

interface PrefsRow {
  channels?: string[];
  quiet_hours?: QuietHours | null;
  escalation?: EscalationStep[];
  webhook_url?: string | null;
  sms_number?: string | null;
  email?: string | null;
}

interface StepDraft {
  afterMin: number;
  channel: Channel;
  target: string;
}

interface Draft {
  channels: Channel[];
  quietOn: boolean;
  quietHours: QuietHours;
  steps: StepDraft[];
  webhookUrl: string;
  smsNumber: string;
  email: string;
}

const EMPTY: Draft = {
  channels: ['log'],
  quietOn: false,
  quietHours: { start: '22:00', end: '07:00', overrideSeverity: 'critical' },
  steps: [],
  webhookUrl: '',
  smsNumber: '',
  email: '',
};

function asChannel(v: string): Channel {
  return (CHANNELS as readonly string[]).includes(v) ? (v as Channel) : 'log';
}

function fromRow(row: PrefsRow | null): Draft {
  if (!row) return { ...EMPTY, quietHours: { ...EMPTY.quietHours } };
  const q = row.quiet_hours;
  return {
    channels: (row.channels?.length ? row.channels : ['log']).map(asChannel),
    quietOn: !!(q?.start && q?.end),
    quietHours: {
      start: q?.start || '22:00',
      end: q?.end || '07:00',
      overrideSeverity: q?.overrideSeverity === 'warning' ? 'warning' : 'critical',
    },
    steps: (row.escalation ?? []).map((s) => ({
      afterMin: Math.max(1, Math.round((s.afterSeconds || 0) / 60)),
      channel: asChannel(s.channel),
      target: s.target ?? '',
    })),
    webhookUrl: row.webhook_url ?? '',
    smsNumber: row.sms_number ?? '',
    email: row.email ?? '',
  };
}

function toBody(d: Draft) {
  return {
    channels: d.channels.length ? d.channels : ['log'],
    quietHours: d.quietOn
      ? {
          start: d.quietHours.start,
          end: d.quietHours.end,
          overrideSeverity: d.quietHours.overrideSeverity,
        }
      : null,
    escalation: d.steps.map((s) => ({
      afterSeconds: Math.max(1, s.afterMin) * 60,
      channel: s.channel,
      ...(s.target.trim() ? { target: s.target.trim() } : {}),
    })),
    webhookUrl: d.webhookUrl.trim() || null,
    smsNumber: d.smsNumber.trim() || null,
    email: d.email.trim() || null,
  };
}

export function Notifications() {
  const q = useQuery<{ prefs: PrefsRow | null }>('/breeder/ops/notification-prefs');
  const [run, busy] = useMutation();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const draft = edit ?? fromRow(q.data?.prefs ?? null);

  function patch(partial: Partial<Draft>) {
    setEdit((prev) => ({ ...(prev ?? fromRow(q.data?.prefs ?? null)), ...partial }));
    setSaved(false);
  }

  function toggleChannel(ch: Channel) {
    const on = draft.channels.includes(ch);
    patch({
      channels: on ? draft.channels.filter((c) => c !== ch) : [...draft.channels, ch],
    });
  }

  function patchStep(i: number, partial: Partial<StepDraft>) {
    patch({
      steps: draft.steps.map((s, j) => (j === i ? { ...s, ...partial } : s)),
    });
  }

  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.steps.length) return;
    const next = [...draft.steps];
    const [row] = next.splice(i, 1);
    next.splice(j, 0, row);
    patch({ steps: next });
  }

  async function save() {
    const r = await run(() =>
      api<{ prefs: PrefsRow }>('/breeder/ops/notification-prefs', {
        method: 'PUT',
        body: toBody(draft),
      }),
    );
    if (r) {
      setEdit(fromRow(r.prefs));
      setSaved(true);
      q.reload();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notification preferences">
        <Btn variant="primary" disabled={busy || q.loading} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </Btn>
      </PageHeader>
      {saved && <p className="text-sm text-emerald-300">Saved.</p>}
      {q.error && <p className="text-sm text-rose-300">{q.error}</p>}

      {q.loading && !q.data ? (
        <Spinner />
      ) : (
        <>
          <Card className="p-5">
            <h2 className="mb-1 font-medium text-slate-200">Channels</h2>
            <p className="mb-3 text-xs text-slate-500">
              Initial alert goes to every checked channel. Email and SMS only leave the
              building when the backend has provider keys.
            </p>
            <fieldset>
              <legend className="sr-only">Notification channels</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-950 text-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                      checked={draft.channels.includes(ch)}
                      onChange={() => toggleChannel(ch)}
                    />
                    {CHANNEL_LABEL[ch]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Email" hint="Used when Email is checked">
                <Input
                  type="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
              <Field label="SMS number" hint="E.164 if you can">
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={draft.smsNumber}
                  onChange={(e) => patch({ smsNumber: e.target.value })}
                />
              </Field>
              <Field label="Webhook URL">
                <Input
                  type="url"
                  placeholder="https://…"
                  value={draft.webhookUrl}
                  onChange={(e) => patch({ webhookUrl: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-medium text-slate-200">Quiet hours</h2>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-950 text-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                checked={draft.quietOn}
                onChange={(e) => patch({ quietOn: e.target.checked })}
              />
              Hold non-urgent alerts overnight
            </label>
            {draft.quietOn && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Start">
                  <Input
                    type="time"
                    value={draft.quietHours.start}
                    onChange={(e) =>
                      patch({ quietHours: { ...draft.quietHours, start: e.target.value } })
                    }
                  />
                </Field>
                <Field label="End">
                  <Input
                    type="time"
                    value={draft.quietHours.end}
                    onChange={(e) =>
                      patch({ quietHours: { ...draft.quietHours, end: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Still ring for" hint="Log and siren always get through">
                  <Select
                    value={draft.quietHours.overrideSeverity ?? 'critical'}
                    onChange={(e) =>
                      patch({
                        quietHours: {
                          ...draft.quietHours,
                          overrideSeverity: e.target.value as 'warning' | 'critical',
                        },
                      })
                    }
                  >
                    <option value="critical">Critical only</option>
                    <option value="warning">Warning and critical</option>
                  </Select>
                </Field>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium text-slate-200">Escalation chain</h2>
                <p className="mt-1 text-xs text-slate-500">
                  If an alert is still open, fire the next step after N minutes. Target
                  is optional — blank uses the contact fields above.
                </p>
              </div>
              <Btn
                size="sm"
                onClick={() =>
                  patch({
                    steps: [
                      ...draft.steps,
                      {
                        afterMin: draft.steps.length ? draft.steps[draft.steps.length - 1].afterMin + 10 : 10,
                        channel: 'sms',
                        target: '',
                      },
                    ],
                  })
                }
              >
                Add step
              </Btn>
            </div>
            {draft.steps.length === 0 ? (
              <p className="text-sm text-slate-500">No escalation steps. The first notify is enough.</p>
            ) : (
              <ol className="space-y-3">
                {draft.steps.map((s, i) => (
                  <li
                    key={i}
                    className="grid items-end gap-2 border-t border-slate-800 pt-3 sm:grid-cols-[auto_7rem_1fr_1fr_auto] first:border-0 first:pt-0"
                  >
                    <span className="pb-2 text-xs text-slate-500">{i + 1}</span>
                    <Field label="After (min)">
                      <Input
                        type="number"
                        min={1}
                        value={s.afterMin}
                        onChange={(e) => patchStep(i, { afterMin: Number(e.target.value) || 1 })}
                      />
                    </Field>
                    <Field label="Channel">
                      <Select
                        value={s.channel}
                        onChange={(e) => patchStep(i, { channel: e.target.value as Channel })}
                      >
                        {CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>
                            {CHANNEL_LABEL[ch]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Target">
                      <Input
                        placeholder="number, email, or URL"
                        value={s.target}
                        onChange={(e) => patchStep(i, { target: e.target.value })}
                      />
                    </Field>
                    <div className="flex gap-1 pb-0.5">
                      <Btn size="sm" variant="ghost" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Move up">
                        ↑
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={i === draft.steps.length - 1}
                        onClick={() => moveStep(i, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => patch({ steps: draft.steps.filter((_, j) => j !== i) })}
                      >
                        Remove
                      </Btn>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
