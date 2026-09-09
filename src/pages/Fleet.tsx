import { useMemo, useState, type MouseEvent } from 'react';
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { timeAgo, titleCase } from '../lib/format';
import { useStream } from '../lib/stream';
import { useMutation, useQuery } from '../lib/useApi';

const DEVICE_TYPES = ['feeder', 'water', 'door', 'sensor', 'gps', 'camera', 'scale', 'hub'];
const FW_TONE: Record<string, string> = {
  'up-to-date': 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  unknown: 'bg-slate-800 text-slate-400 ring-slate-700',
};

interface FleetDevice {
  deviceId: string;
  deviceType: string;
  name: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  fwVersion: string | null;
  target: string | null;
  fwStatus: 'unknown' | 'up-to-date' | 'pending';
}
interface Firmware {
  id: string;
  device_type: string;
  version: string;
  channel: string;
  url: string;
  sha256: string;
  notes: string | null;
  created_at: string;
}
interface Rollout {
  id: string;
  firmware_id: string;
  device_type: string;
  fw_device_type?: string;
  state: 'rolling' | 'paused' | 'done';
  percent: number;
  version: string;
  updated_at: string;
}
interface Zone {
  id: string;
  name: string;
  kind: 'boundary' | 'exclusion';
  center_lat: number;
  center_lng: number;
  radius_m: number;
  active: boolean;
  animal_id: string | null;
  animal_name: string | null;
}
interface Position {
  animal_id: string;
  name: string;
  last_lat: number | null;
  last_lng: number | null;
  last_fix_at: string | null;
  inside_zone_ids: string[] | string;
}
interface Named {
  id: string;
  name: string;
}

export function Fleet() {
  const [tab, setTab] = useState<'fleet' | 'map'>('fleet');
  return (
    <div className="space-y-5">
      <PageHeader title="Fleet" />
      <div className="flex gap-1">
        <Btn size="sm" variant={tab === 'fleet' ? 'primary' : 'ghost'} onClick={() => setTab('fleet')}>Firmware</Btn>
        <Btn size="sm" variant={tab === 'map' ? 'primary' : 'ghost'} onClick={() => setTab('map')}>Map</Btn>
      </div>
      {tab === 'fleet' ? <FirmwareTab /> : <MapTab />}
    </div>
  );
}

function FirmwareTab() {
  const devices = useQuery<{ devices: FleetDevice[] }>('/breeder/fleet/devices');
  const builds = useQuery<{ firmware: Firmware[] }>('/breeder/fleet/firmware');
  const rollouts = useQuery<{ rollouts: Rollout[] }>('/breeder/fleet/rollouts');
  const [run, busy] = useMutation();
  const [form, setForm] = useState({
    deviceType: 'feeder', version: '', url: '', sha256: '', channel: 'stable', notes: '',
  });
  const [fwId, setFwId] = useState('');
  const [pctEdit, setPctEdit] = useState<Record<string, number>>({});

  useStream((e) => {
    if (e.type === 'device') devices.reload();
  });

  async function register() {
    const r = await run(() =>
      api('/breeder/fleet/firmware', {
        method: 'POST',
        body: {
          deviceType: form.deviceType,
          version: form.version,
          url: form.url,
          sha256: form.sha256,
          channel: form.channel,
          notes: form.notes || undefined,
        },
      })
    );
    if (r) {
      setForm({ ...form, version: '', url: '', sha256: '', notes: '' });
      builds.reload();
    }
  }

  async function startRollout() {
    const r = await run(() => api('/breeder/fleet/rollouts', { method: 'POST', body: { firmwareId: fwId, percent: 5 } }));
    if (r) {
      rollouts.reload();
      devices.reload();
    }
  }

  async function patchRollout(id: string, body: Record<string, unknown>) {
    const r = await run(() => api(`/breeder/fleet/rollouts/${id}`, { method: 'PATCH', body }));
    if (r) {
      rollouts.reload();
      devices.reload();
    }
  }

  async function sendNow(deviceId: string) {
    const r = await run(() => api(`/breeder/fleet/devices/${deviceId}/ota`, { method: 'POST', body: {} }));
    if (r) devices.reload();
  }

  async function sweep() {
    const r = await run(() => api<{ pushed: number }>('/breeder/fleet/sweep', { method: 'POST' }));
    if (r) {
      alert(`Pushed ${r.pushed} OTA offer(s).`);
      devices.reload();
    }
  }

  const list = devices.data?.devices ?? [];
  const firmware = builds.data?.firmware ?? [];
  const live = (rollouts.data?.rollouts ?? []).filter((r) => r.state !== 'done');
  const recent = (rollouts.data?.rollouts ?? []).filter((r) => r.state === 'done').slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Btn size="sm" disabled={busy} onClick={sweep}>Run OTA sweep</Btn>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Register a build</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Device type">
            <Select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </Select>
          </Field>
          <Field label="Version"><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.4.2" /></Field>
          <Field label="Channel">
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="stable">stable</option>
              <option value="beta">beta</option>
            </Select>
          </Field>
          <Field label="Firmware URL" hint=".bin — any URL for now">
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="SHA-256" hint="64 hex chars">
            <Input value={form.sha256} onChange={(e) => setForm({ ...form, sha256: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <Btn className="mt-3" variant="primary" disabled={busy || !form.version || !form.url || !form.sha256} onClick={register}>
          Register
        </Btn>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Start a rollout</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Build">
            <Select value={fwId} onChange={(e) => setFwId(e.target.value)}>
              <option value="">—</option>
              {firmware.map((f) => (
                <option key={f.id} value={f.id}>{f.device_type} {f.version} ({f.channel})</option>
              ))}
            </Select>
          </Field>
          <Btn variant="primary" disabled={busy || !fwId} onClick={startRollout}>Start at 5%</Btn>
        </div>
        {firmware.length === 0 && !builds.loading && (
          <p className="mt-2 text-sm text-slate-500">Register a build first.</p>
        )}
      </Card>

      {live.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">Live rollouts</h2>
          <ul className="space-y-4">
            {live.map((r) => {
              const pct = pctEdit[r.id] ?? r.percent;
              return (
                <li key={r.id} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-slate-100">{titleCase(r.device_type)} {r.version}</span>
                    <Badge className={r.state === 'paused' ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' : 'bg-sky-500/10 text-sky-300 ring-sky-500/30'}>
                      {r.state}
                    </Badge>
                    <span className="text-xs text-slate-500">{r.percent}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input
                      type="range"
                      min={r.percent}
                      max={100}
                      value={pct}
                      className="w-48 accent-indigo-500"
                      aria-label={`${r.device_type} rollout percent`}
                      onChange={(e) => setPctEdit({ ...pctEdit, [r.id]: Number(e.target.value) })}
                    />
                    <span className="w-10 text-xs text-slate-400">{pct}%</span>
                    <Btn size="sm" disabled={busy || pct <= r.percent} onClick={() => patchRollout(r.id, { percent: pct })}>
                      Set percent
                    </Btn>
                    {r.state === 'rolling' ? (
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => patchRollout(r.id, { state: 'paused' })}>Pause</Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => patchRollout(r.id, { state: 'rolling' })}>Resume</Btn>
                    )}
                    <Btn size="sm" disabled={busy} onClick={() => patchRollout(r.id, { state: 'done' })}>Finish</Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">Devices</h2>
        {devices.loading && !devices.data ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState title="No devices yet" hint="Claim a device on Devices, then it shows here with a firmware target." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Online</th>
                  <th className="py-2 pr-3">Reported</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.deviceId} className="border-t border-slate-800">
                    <td className="py-2 pr-3 text-slate-200">{d.name || d.deviceId}</td>
                    <td className="py-2 pr-3 text-slate-400">{titleCase(d.deviceType)}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1.5 ${d.isOnline ? 'text-emerald-300' : 'text-slate-500'}`}>
                        <span className={`h-2 w-2 rounded-full ${d.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {d.isOnline ? 'online' : 'offline'}
                        {d.lastSeen && <span className="text-xs text-slate-600">{timeAgo(d.lastSeen)}</span>}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-300">{d.fwVersion ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-400">{d.target ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge className={FW_TONE[d.fwStatus] ?? FW_TONE.unknown}>{d.fwStatus}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Btn size="sm" variant="ghost" disabled={busy} onClick={() => sendNow(d.deviceId)}>Send now</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {firmware.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">Builds</h2>
          <ul className="space-y-1.5 text-sm">
            {firmware.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 border-t border-slate-800 py-2 first:border-0">
                <span className="text-slate-100">{titleCase(f.device_type)} {f.version}</span>
                <Badge className="bg-slate-800 text-slate-400 ring-slate-700">{f.channel}</Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">{f.sha256}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {recent.length > 0 && (
        <p className="text-xs text-slate-600">
          Finished: {recent.map((r) => `${r.device_type} ${r.version}`).join(' · ')}
        </p>
      )}
    </div>
  );
}

function zoneIds(raw: Position['inside_zone_ids']): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') return raw.replace(/[{}]/g, '').split(',').filter(Boolean);
  return [];
}

function outsideBoundary(p: Position, zones: Zone[]): boolean {
  if (p.last_lat == null || p.last_lng == null) return false;
  const bounds = zones.filter((z) => z.active && z.kind === 'boundary' && (!z.animal_id || z.animal_id === p.animal_id));
  if (!bounds.length) return false;
  const inside = new Set(zoneIds(p.inside_zone_ids));
  return !bounds.some((z) => inside.has(z.id));
}

function MapTab() {
  const zonesQ = useQuery<{ zones: Zone[] }>('/breeder/geo/zones');
  const posQ = useQuery<{ positions: Position[] }>('/breeder/geo/positions/latest');
  const animals = useQuery<{ animals: Named[] }>('/breeder/animals');
  const [run, busy] = useMutation();
  const [form, setForm] = useState({
    name: '', kind: 'boundary', centerLat: '53.65', centerLng: '-6.68', radiusM: '100', animalId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);

  const zones = zonesQ.data?.zones ?? [];
  const positions = posQ.data?.positions ?? [];

  async function save() {
    const body = {
      name: form.name,
      kind: form.kind,
      centerLat: Number(form.centerLat),
      centerLng: Number(form.centerLng),
      radiusM: Number(form.radiusM) || 100,
      animalId: form.animalId || undefined,
    };
    const r = await run(() =>
      editId
        ? api(`/breeder/geo/zones/${editId}`, { method: 'PATCH', body })
        : api('/breeder/geo/zones', { method: 'POST', body })
    );
    if (r) {
      setEditId(null);
      setForm({ name: '', kind: 'boundary', centerLat: form.centerLat, centerLng: form.centerLng, radiusM: '100', animalId: '' });
      zonesQ.reload();
    }
  }

  async function toggle(z: Zone) {
    const r = await run(() => api(`/breeder/geo/zones/${z.id}`, { method: 'PATCH', body: { active: !z.active } }));
    if (r) zonesQ.reload();
  }

  async function remove(z: Zone) {
    if (!confirm(`Delete zone “${z.name}”?`)) return;
    const r = await run(() => api(`/breeder/geo/zones/${z.id}`, { method: 'DELETE' }));
    if (r) {
      if (editId === z.id) setEditId(null);
      zonesQ.reload();
    }
  }

  function startEdit(z: Zone) {
    setEditId(z.id);
    setForm({
      name: z.name,
      kind: z.kind,
      centerLat: String(z.center_lat),
      centerLng: String(z.center_lng),
      radiusM: String(z.radius_m),
      animalId: z.animal_id ?? '',
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Circles only. A boundary exit or exclusion entry raises a care-inbox alert. Click the plot to set the centre.
      </p>
      <YardPlot
        zones={zones}
        positions={positions}
        onPick={(lat, lng) => setForm({ ...form, centerLat: lat.toFixed(6), centerLng: lng.toFixed(6) })}
      />

      <Card className="p-4">
        <h2 className="mb-3 font-medium text-slate-200">{editId ? 'Edit zone' : 'Add zone'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Kind">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="boundary">Boundary (stay inside)</option>
              <option value="exclusion">Exclusion (stay out)</option>
            </Select>
          </Field>
          <Field label="Applies to">
            <Select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}>
              <option value="">Every collared dog</option>
              {(animals.data?.animals ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Latitude"><Input value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} /></Field>
          <Field label="Longitude"><Input value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} /></Field>
          <Field label="Radius (m)" hint="minimum 10">
            <Input type="number" min={10} value={form.radiusM} onChange={(e) => setForm({ ...form, radiusM: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn variant="primary" disabled={busy || !form.name} onClick={save}>{editId ? 'Save zone' : 'Add zone'}</Btn>
          {editId && (
            <Btn variant="ghost" onClick={() => { setEditId(null); setForm({ ...form, name: '', animalId: '' }); }}>Cancel</Btn>
          )}
        </div>
      </Card>

      {zonesQ.loading && !zonesQ.data ? (
        <Spinner />
      ) : zones.length === 0 ? (
        <EmptyState title="No safe zones" hint="Add a boundary around the kennel, then collar fixes plot on the map." />
      ) : (
        <ul className="space-y-2">
          {zones.map((z) => (
            <li key={z.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <Badge className={z.kind === 'boundary' ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30' : 'bg-rose-500/15 text-rose-300 ring-rose-500/30'}>
                  {z.kind}
                </Badge>
                {!z.active && <Badge className="bg-slate-800 text-slate-500 ring-slate-700">off</Badge>}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{z.name}</div>
                  <div className="text-xs text-slate-500">
                    {z.radius_m} m · {z.center_lat.toFixed(5)}, {z.center_lng.toFixed(5)}
                    {z.animal_name ? ` · ${z.animal_name}` : ' · all dogs'}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => toggle(z)}>{z.active ? 'Disable' : 'Enable'}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => startEdit(z)}>Edit</Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(z)}>Delete</Btn>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {positions.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-medium text-slate-200">Collars</h2>
          <ul className="space-y-1.5 text-sm">
            {positions.map((p) => {
              const out = outsideBoundary(p, zones);
              return (
                <li key={p.animal_id} className="flex flex-wrap items-center gap-2">
                  <span className={out ? 'text-rose-300' : 'text-slate-100'}>{p.name}</span>
                  {out && <Badge className="bg-rose-500/15 text-rose-300 ring-rose-500/30">outside boundary</Badge>}
                  <span className="text-xs text-slate-500">
                    {p.last_lat == null ? 'no fix' : `${p.last_lat.toFixed(5)}, ${p.last_lng?.toFixed(5)}`}
                    {p.last_fix_at ? ` · ${timeAgo(p.last_fix_at)}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

const M_PER_DEG = 111_320;

function YardPlot({
  zones,
  positions,
  onPick,
}: {
  zones: Zone[];
  positions: Position[];
  onPick: (lat: number, lng: number) => void;
}) {
  const pts = useMemo(() => {
    const out: Array<{ lat: number; lng: number }> = [];
    for (const z of zones) {
      const dlat = z.radius_m / M_PER_DEG;
      const dlng = z.radius_m / (M_PER_DEG * Math.max(0.2, Math.cos((z.center_lat * Math.PI) / 180)));
      out.push({ lat: z.center_lat, lng: z.center_lng });
      out.push({ lat: z.center_lat + dlat, lng: z.center_lng + dlng });
      out.push({ lat: z.center_lat - dlat, lng: z.center_lng - dlng });
    }
    for (const p of positions) {
      if (p.last_lat != null && p.last_lng != null) out.push({ lat: p.last_lat, lng: p.last_lng });
    }
    return out;
  }, [zones, positions]);

  const box = useMemo(() => {
    if (!pts.length) return { minLat: 53.64, maxLat: 53.66, minLng: -6.70, maxLng: -6.66 };
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    if (minLat === maxLat) { minLat -= 0.002; maxLat += 0.002; }
    if (minLng === maxLng) { minLng -= 0.002; maxLng += 0.002; }
    const padLat = (maxLat - minLat) * 0.2;
    const padLng = (maxLng - minLng) * 0.2;
    return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  }, [pts]);

  const W = 640;
  const H = 320;
  const sx = (lng: number) => ((lng - box.minLng) / (box.maxLng - box.minLng)) * W;
  const sy = (lat: number) => ((box.maxLat - lat) / (box.maxLat - box.minLat)) * H;
  const midLat = (box.minLat + box.maxLat) / 2;
  const pxPerM = (H / ((box.maxLat - box.minLat) * M_PER_DEG) + W / ((box.maxLng - box.minLng) * M_PER_DEG * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)))) / 2;

  function click(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const lng = box.minLng + (x / W) * (box.maxLng - box.minLng);
    const lat = box.maxLat - (y / H) * (box.maxLat - box.minLat);
    onPick(lat, lng);
  }

  return (
    <Card className="overflow-hidden p-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-80 w-full cursor-crosshair bg-slate-950"
        role="img"
        aria-label="Kennel map"
        onClick={click}
      >
        {zones.map((z) => (
          <circle
            key={z.id}
            cx={sx(z.center_lng)}
            cy={sy(z.center_lat)}
            r={Math.max(8, z.radius_m * pxPerM)}
            fill={z.kind === 'boundary' ? 'rgb(99 102 241 / 0.15)' : 'rgb(244 63 94 / 0.15)'}
            stroke={z.kind === 'boundary' ? '#818cf8' : '#fb7185'}
            strokeWidth={z.active ? 2 : 1}
            strokeDasharray={z.active ? undefined : '4 4'}
          />
        ))}
        {positions.map((p) => {
          if (p.last_lat == null || p.last_lng == null) return null;
          const out = outsideBoundary(p, zones);
          return (
            <g key={p.animal_id}>
              <circle cx={sx(p.last_lng)} cy={sy(p.last_lat)} r={6} fill={out ? '#fb7185' : '#34d399'} />
              <text x={sx(p.last_lng) + 8} y={sy(p.last_lat) + 4} fill="#94a3b8" fontSize="11">{p.name}</text>
            </g>
          );
        })}
        {!zones.length && !positions.some((p) => p.last_lat != null) && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="#64748b" fontSize="13">
            Click to set a zone centre
          </text>
        )}
      </svg>
    </Card>
  );
}
