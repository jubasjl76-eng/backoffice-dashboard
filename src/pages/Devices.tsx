import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { useStream } from '../lib/stream';
import { Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { statusDot, timeAgo, titleCase } from '../lib/format';

interface Device {
  device_id: string;
  name: string | null;
  device_type: string;
  status: string | null;
  pen_id: string | null;
  last_seen_at: string | null;
}
interface Pairing {
  code: string;
  device_type: string;
  suggested_name: string | null;
  expires_at: string;
}
interface ClaimResult {
  device?: { name?: string | null; device_id?: string };
  mqtt?: { host?: string; username?: string; password?: string; topics?: { command?: string; status?: string } };
}
const DEVICE_TYPES = ['feeder', 'water', 'door', 'sensor', 'gps', 'camera', 'scale', 'hub'];

export function Devices() {
  const devices = useQuery<{ devices: Device[] }>('/breeder/ops/devices');
  const pairings = useQuery<{ pairings: Pairing[] }>('/breeder/ops/devices/pairing');
  const [run, busy] = useMutation();
  const [newType, setNewType] = useState('feeder');
  const [newName, setNewName] = useState('');
  const [claim, setClaim] = useState<{ open: boolean; result?: ClaimResult }>({ open: false });
  const [claimCode, setClaimCode] = useState('');
  const [claimDeviceId, setClaimDeviceId] = useState('');

  useStream((e) => {
    if (e.type === 'device') devices.reload();
  });

  async function createPairing() {
    const r = await run(() =>
      api<{ code: string }>('/breeder/ops/devices/pairing', {
        method: 'POST',
        body: { deviceType: newType, name: newName || undefined },
      })
    );
    if (r) {
      setNewName('');
      pairings.reload();
    }
  }

  async function doClaim() {
    const r = await run(() =>
      api<ClaimResult>('/breeder/ops/devices/claim', {
        method: 'POST',
        body: { code: claimCode.trim().toUpperCase(), deviceId: claimDeviceId.trim() },
      })
    );
    if (r) {
      setClaim({ open: true, result: r });
      setClaimCode('');
      setClaimDeviceId('');
      devices.reload();
      pairings.reload();
    }
  }

  async function cancelPairing(code: string) {
    const r = await run(() => api(`/breeder/ops/devices/pairing/${code}`, { method: 'DELETE' }));
    if (r) pairings.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Devices" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">Pair a new device</h2>
          <div className="space-y-3">
            <Field label="Device type">
              <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                {DEVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Name (optional)">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Whelping room feeder" />
            </Field>
            <Btn variant="primary" disabled={busy} onClick={createPairing}>Generate pairing code</Btn>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Open codes</h3>
            {pairings.loading && !pairings.data ? (
              <Spinner />
            ) : pairings.data && pairings.data.pairings.length ? (
              <ul className="space-y-1.5">
                {pairings.data.pairings.map((p) => (
                  <li key={p.code} className="flex items-center gap-2 text-sm">
                    <code className="rounded bg-slate-800 px-2 py-0.5 font-mono text-indigo-300">{p.code}</code>
                    <span className="text-slate-400">{titleCase(p.device_type)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{p.suggested_name}</span>
                    <span className="text-xs text-slate-600">exp {timeAgo(p.expires_at)}</span>
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => cancelPairing(p.code)}>✕</Btn>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No open pairing codes.</p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">Claim a device</h2>
          <p className="mb-3 text-sm text-slate-500">
            Enter the pairing code and the hardware's device ID (printed on the unit) to bind it and mint its MQTT credentials.
          </p>
          <div className="space-y-3">
            <Field label="Pairing code">
              <Input value={claimCode} onChange={(e) => setClaimCode(e.target.value)} placeholder="FEED-7K2Q" />
            </Field>
            <Field label="Device ID">
              <Input value={claimDeviceId} onChange={(e) => setClaimDeviceId(e.target.value)} placeholder="feeder-a1b2c3" />
            </Field>
            <Btn variant="primary" disabled={busy || !claimCode || !claimDeviceId} onClick={doClaim}>Claim device</Btn>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Registered devices</h2>
        {devices.loading && !devices.data ? (
          <Spinner />
        ) : devices.data && devices.data.devices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Device ID</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {devices.data.devices.map((d) => (
                  <tr key={d.device_id} className="border-t border-slate-800">
                    <td className="py-2 pr-3 text-slate-200">{d.name || <span className="text-slate-500">—</span>}</td>
                    <td className="py-2 pr-3 text-slate-400">{titleCase(d.device_type)}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">{d.device_id}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDot[d.status ?? 'offline'] ?? statusDot.offline}`} />
                        {d.status ?? 'offline'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{d.last_seen_at ? timeAgo(d.last_seen_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No devices yet" hint="Generate a pairing code and claim your first device." />
        )}
      </Card>

      <Drawer open={claim.open} onClose={() => setClaim({ open: false })} title="Device claimed">
        {claim.result && (
          <div className="space-y-4 text-sm">
            <p className="text-emerald-400">✓ {claim.result.device?.name || claim.result.device?.device_id} is bound to this kennel.</p>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                MQTT credentials — shown once
              </div>
              <dl className="mt-2 space-y-1 font-mono text-xs text-slate-200">
                <div><span className="text-slate-500">host </span>{claim.result.mqtt?.host}</div>
                <div><span className="text-slate-500">user </span>{claim.result.mqtt?.username}</div>
                <div><span className="text-slate-500">pass </span>{claim.result.mqtt?.password}</div>
                <div className="break-all"><span className="text-slate-500">cmd  </span>{claim.result.mqtt?.topics?.command}</div>
                <div className="break-all"><span className="text-slate-500">stat </span>{claim.result.mqtt?.topics?.status}</div>
              </dl>
            </div>
            <p className="text-xs text-slate-500">Copy these into the device's config now — the password can't be retrieved later.</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
