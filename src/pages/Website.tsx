import { useState } from 'react';
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui';
import { useT } from '../i18n';
import { api } from '../lib/api';
import { useMutation, useQuery } from '../lib/useApi';

type Kind = 'animal' | 'litter' | 'puppy';
type Run = ReturnType<typeof useMutation>[0];

interface Pair {
  label?: string;
  name?: string;
  url?: string;
  result?: string;
}
interface KennelPublic {
  slug: string;
  name: string;
  public_tagline: string | null;
  public_about: string | null;
  public_email: string | null;
  public_phone: string | null;
  public_location: string | null;
  public_socials: Pair[] | null;
}
interface InvRow {
  id: string;
  name: string | null;
  published: boolean;
  photos: string[] | null;
  sex?: string;
  role?: string;
  breed?: string;
  titles?: string | null;
  bio?: string | null;
  health_tests?: Pair[] | null;
  status?: string;
  public_description?: string | null;
  color?: string | null;
}

const textCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none';

function Toggle({ on, busy, onChange, label }: { on: boolean; busy: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      disabled={busy}
      aria-pressed={on}
      aria-label={label}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Repeatable two-field rows — used for socials (label/url) and health tests (name/result). */
function PairList({
  items,
  onChange,
  aKey,
  bKey,
  aLabel,
  bLabel,
}: {
  items: Pair[];
  onChange: (next: Pair[]) => void;
  aKey: 'label' | 'name';
  bKey: 'url' | 'result';
  aLabel: string;
  bLabel: string;
}) {
  const { t } = useT();
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder={aLabel}
            value={it[aKey] ?? ''}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], [aKey]: e.target.value };
              onChange(next);
            }}
          />
          <Input
            placeholder={bLabel}
            value={it[bKey] ?? ''}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], [bKey]: e.target.value };
              onChange(next);
            }}
          />
          <Btn size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t('common.remove')}>
            ✕
          </Btn>
        </div>
      ))}
      <Btn size="sm" variant="ghost" onClick={() => onChange([...items, {}])}>
        {t('website.addRow')}
      </Btn>
    </div>
  );
}

function Identity({ kennel, run, busy, onSaved }: { kennel: KennelPublic; run: Run; busy: boolean; onSaved: () => void }) {
  const { t } = useT();
  const saved = {
    tagline: kennel.public_tagline ?? '',
    about: kennel.public_about ?? '',
    email: kennel.public_email ?? '',
    phone: kennel.public_phone ?? '',
    location: kennel.public_location ?? '',
    socials: kennel.public_socials ?? [],
  };
  const [edit, setEdit] = useState<Partial<typeof saved>>({});
  const v = { ...saved, ...edit };

  async function save() {
    const r = await run(() =>
      api('/breeder/website/kennel', {
        method: 'PUT',
        body: {
          tagline: v.tagline,
          about: v.about,
          email: v.email,
          phone: v.phone,
          location: v.location,
          socials: (v.socials as Pair[]).filter((s) => s.label && s.url),
        },
      }),
    );
    if (r) {
      setEdit({});
      onSaved();
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('website.tagline')}>
          <Input value={v.tagline} onChange={(e) => setEdit({ ...edit, tagline: e.target.value })} />
        </Field>
        <Field label={t('website.location')}>
          <Input value={v.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
        </Field>
        <Field label={t('website.publicEmail')}>
          <Input type="email" value={v.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
        </Field>
        <Field label={t('website.publicPhone')}>
          <Input value={v.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
        </Field>
      </div>
      <Field label={t('website.about')}>
        <textarea
          className={textCls}
          rows={3}
          value={v.about}
          onChange={(e) => setEdit({ ...edit, about: e.target.value })}
        />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-300">{t('website.socials')}</span>
        <PairList
          items={v.socials as Pair[]}
          onChange={(next) => setEdit({ ...edit, socials: next })}
          aKey="label"
          bKey="url"
          aLabel={t('website.socialLabel')}
          bLabel="https://…"
        />
      </div>
      <Btn variant="primary" disabled={busy} onClick={save}>
        {t('website.saveIdentity')}
      </Btn>
    </div>
  );
}

function RowEditor({ kind, row, run, busy, onSaved }: { kind: Kind; row: InvRow; run: Run; busy: boolean; onSaved: () => void }) {
  const { t } = useT();
  const [photos, setPhotos] = useState((row.photos ?? []).join('\n'));
  const [titles, setTitles] = useState(row.titles ?? '');
  const [bio, setBio] = useState(row.bio ?? '');
  const [health, setHealth] = useState<Pair[]>(row.health_tests ?? []);
  const [desc, setDesc] = useState(row.public_description ?? '');
  const [color, setColor] = useState(row.color ?? '');

  async function save() {
    const body: Record<string, unknown> = {
      photos: photos.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
    };
    if (kind === 'animal') {
      body.titles = titles || null;
      body.bio = bio || null;
      body.healthTests = health.filter((h) => h.name && h.result);
    }
    if (kind === 'litter') body.publicDescription = desc || null;
    if (kind === 'puppy') body.color = color || null;
    const r = await run(() => api(`/breeder/website/${kind}/${row.id}`, { method: 'PATCH', body }));
    if (r) onSaved();
  }

  return (
    <div className="space-y-4 text-sm">
      <Field label={t('website.photoUrls')}>
        <textarea
          className={textCls}
          rows={4}
          value={photos}
          onChange={(e) => setPhotos(e.target.value)}
          placeholder="https://…/photo-1.jpg"
        />
      </Field>

      {kind === 'animal' && (
        <>
          <Field label={t('website.titles')}>
            <Input value={titles} onChange={(e) => setTitles(e.target.value)} />
          </Field>
          <Field label={t('website.bio')}>
            <textarea className={textCls} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-300">{t('website.healthTests')}</span>
            <PairList items={health} onChange={setHealth} aKey="name" bKey="result" aLabel={t('website.testName')} bLabel="3:3" />
          </div>
        </>
      )}

      {kind === 'litter' && (
        <Field label={t('website.publicDesc')}>
          <textarea className={textCls} rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
      )}

      {kind === 'puppy' && (
        <Field label={t('website.colour')}>
          <Input value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
      )}

      <Btn variant="primary" disabled={busy} onClick={save}>
        {t('common.save')}
      </Btn>
    </div>
  );
}

export function Website() {
  const { t, label } = useT();
  const cfg = useQuery<{ kennel: KennelPublic; counts: { dogs: number; litters: number; puppies: number } }>(
    '/breeder/website',
  );
  const inv = useQuery<{ animals: InvRow[]; litters: InvRow[]; puppies: InvRow[] }>('/breeder/website/inventory');
  const [run, busy] = useMutation();
  const [editing, setEditing] = useState<{ kind: Kind; row: InvRow } | null>(null);

  async function toggle(kind: Kind, row: InvRow) {
    const r = await run(() =>
      api(`/breeder/website/${kind}/${row.id}`, { method: 'PATCH', body: { published: !row.published } }),
    );
    if (r) {
      inv.reload();
      cfg.reload();
    }
  }

  const sections: { kind: Kind; labelKey: 'website.dogs' | 'website.litters' | 'website.puppies'; rows: InvRow[] | undefined }[] = [
    { kind: 'animal', labelKey: 'website.dogs', rows: inv.data?.animals },
    { kind: 'litter', labelKey: 'website.litters', rows: inv.data?.litters },
    { kind: 'puppy', labelKey: 'website.puppies', rows: inv.data?.puppies },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('website.title')}>
        {cfg.data && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{cfg.data.counts.dogs} {t('website.dogs').toLowerCase()}</Badge>
            <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{cfg.data.counts.litters} {t('website.litters').toLowerCase()}</Badge>
            <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{cfg.data.counts.puppies} {t('website.puppies').toLowerCase()}</Badge>
            <span>{t('website.published')}</span>
          </div>
        )}
      </PageHeader>

      <p className="text-sm text-slate-500">
        {t('website.intro')}
      </p>

      <Card className="p-5">
        <h2 className="mb-3 font-medium text-slate-200">{t('website.identity')}</h2>
        {cfg.loading && !cfg.data ? (
          <Spinner />
        ) : cfg.data?.kennel ? (
          <Identity kennel={cfg.data.kennel} run={run} busy={busy} onSaved={() => cfg.reload()} />
        ) : (
          <EmptyState title={t('website.noKennel')} hint={t('website.noKennelHint')} />
        )}
      </Card>

      {sections.map((s) => (
        <Card key={s.kind} className="p-5">
          <h2 className="mb-3 font-medium text-slate-200">{t(s.labelKey)}</h2>
          {inv.loading && !inv.data ? (
            <Spinner />
          ) : !s.rows?.length ? (
            <EmptyState title={t('website.noItems', { kind: t(s.labelKey).toLowerCase() })} />
          ) : (
            <ul className="divide-y divide-slate-800">
              {s.rows.map((row) => {
                const n = row.photos?.length ?? 0;
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Toggle
                      on={row.published}
                      busy={busy}
                      onChange={() => toggle(s.kind, row)}
                      label={row.published ? t('website.unpublish') : t('website.publish')}
                    />
                    <button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ kind: s.kind, row })}>
                      <div className="truncate text-sm text-slate-100">{row.name || t('common.unnamed')}</div>
                      <div className="text-xs text-slate-500">
                        {s.kind === 'animal' && `${label('role', row.role || '')} · ${row.breed || t('animals.unknownBreed')}`}
                        {s.kind === 'litter' && label('litterStatus', row.status || '')}
                        {s.kind === 'puppy' && `${label('sex', row.sex || '')}${row.color ? ` · ${row.color}` : ''}`}
                        {` · ${n === 1 ? t('website.photos', { n }) : t('website.photosMany', { n })}`}
                      </div>
                    </button>
                    {row.published && (
                      <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">{t('common.live')}</Badge>
                    )}
                    <Btn size="sm" variant="ghost" onClick={() => setEditing({ kind: s.kind, row })}>
                      {t('common.edit')}
                    </Btn>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing ? t('website.editKind', { kind: label('websiteKind', editing.kind) }) : ''}>
        {editing && (
          <RowEditor
            kind={editing.kind}
            row={editing.row}
            run={run}
            busy={busy}
            onSaved={() => {
              inv.reload();
              cfg.reload();
              setEditing(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
