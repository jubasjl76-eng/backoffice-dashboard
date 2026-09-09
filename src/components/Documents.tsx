import { useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useDates, useT } from '../i18n';
import { api, apiDownload, apiOpen, apiUpload } from '../lib/api';
import { useMutation, useQuery } from '../lib/useApi';
import { Badge, Btn, Field, Input, Select, Spinner } from './ui';

const DOC_KINDS = ['registration', 'contract', 'receipt', 'guarantee', 'certificate', 'handoff', 'photo', 'other'] as const;

interface DocRow {
  id: string;
  kind: string;
  title: string | null;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  generated: boolean;
  created_at: string;
  subject_id?: string | null;
  subject_type?: string | null;
}

type SubjectType = 'animal' | 'puppy' | 'buyer' | 'litter';

const AUTO_TOKENS = new Set([
  'today', 'kennel_name',
  'puppy_name', 'puppy_sex', 'puppy_color', 'microchip', 'go_home_on', 'breed',
  'birth_date', 'dam_name', 'sire_name', 'buyer_name', 'buyer_email',
]);

interface Template {
  slug: string;
  kind: string;
  title: string;
  body: string;
  customised: boolean;
  tokens: string[];
}

export function GenerateDoc({
  subjectType,
  subjectId,
  onGenerated,
}: {
  subjectType: 'puppy' | 'buyer';
  subjectId: string;
  onGenerated?: () => void;
}) {
  const { t } = useT();
  const q = useQuery<{ templates: Template[] }>('/breeder/documents/templates');
  const [run, busy] = useMutation();
  const [slug, setSlug] = useState('contract');
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ id: string; title: string; body: string } | null>(null);

  const templates = q.data?.templates ?? [];
  const tpl = templates.find((row) => row.slug === slug) ?? templates[0];
  const extras = (tpl?.tokens ?? []).filter((tok) => !AUTO_TOKENS.has(tok));
  const autos = (tpl?.tokens ?? []).filter((tok) => AUTO_TOKENS.has(tok));

  function pick(next: string) {
    setSlug(next);
    setValues({});
    setPreview(null);
  }

  async function generate() {
    if (!tpl) return;
    const tokens: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) tokens[k] = v.trim();
    }
    const r = await run(() =>
      api<{ document: { id: string; title: string }; body: string }>('/breeder/documents/generate', {
        method: 'POST',
        body: { template: tpl.slug, subjectType, subjectId, tokens },
      })
    );
    if (r) {
      setPreview({ id: r.document.id, title: r.document.title, body: r.body });
      onGenerated?.();
    }
  }

  if (q.loading && !q.data) return <Spinner />;
  if (!tpl) return <p className="text-xs text-slate-400">{t('docs.noTemplates')}</p>;

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-slate-200">{t('docs.generate')}</div>
        <Link to="/templates" className="text-xs text-indigo-400 hover:text-indigo-300">{t('docs.editTemplates')}</Link>
      </div>
      <Field label={t('docs.template')}>
        <Select value={tpl.slug} onChange={(e) => pick(e.target.value)}>
          {templates.map((row) => (
            <option key={row.slug} value={row.slug}>{row.title}</option>
          ))}
        </Select>
      </Field>
      {autos.length > 0 && (
        <p className="text-xs text-slate-400">
          {t('docs.autoFilled', { list: autos.join(', ') })}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {[...extras, ...autos].map((tok) => (
          <Field key={tok} label={tok.replace(/_/g, ' ')}>
            <Input
              value={values[tok] ?? ''}
              placeholder={AUTO_TOKENS.has(tok) ? t('docs.auto') : ''}
              onChange={(e) => setValues({ ...values, [tok]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Btn variant="primary" disabled={busy} onClick={generate}>{t('common.generate')}</Btn>
      {preview && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-100">{preview.title}</span>
            <Btn size="sm" variant="ghost" onClick={() => run(() => apiOpen(`/breeder/documents/${preview.id}/download`))}>{t('common.open')}</Btn>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => run(() => apiDownload(`/breeder/documents/${preview.id}/download`, `${preview.title}.md`))}
            >
              {t('common.download')}
            </Btn>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">{preview.body}</pre>
        </div>
      )}
    </div>
  );
}

function bytes(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({
  subjectType,
  subjectId,
  defaultKind = 'other',
  generate = false,
  onGenerated,
}: {
  subjectType: SubjectType;
  subjectId: string;
  defaultKind?: string;
  generate?: boolean;
  onGenerated?: () => void;
}) {
  const { t, label } = useT();
  const { shortDate } = useDates();
  const q = useQuery<{ documents: DocRow[] }>(
    `/breeder/documents?subjectType=${subjectType}&subjectId=${subjectId}`
  );
  const [run, busy] = useMutation();
  const [kind, setKind] = useState(defaultKind);
  const [title, setTitle] = useState('');
  const [over, setOver] = useState(false);

  async function send(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    form.append('subjectType', subjectType);
    form.append('subjectId', subjectId);
    if (title.trim()) form.append('title', title.trim());
    const r = await run(() => apiUpload('/breeder/documents', form));
    if (r) {
      setTitle('');
      q.reload();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void send(file);
  }

  async function remove(d: DocRow) {
    if (!confirm(t('docs.deleteConfirm', { name: d.title || d.filename || '' }))) return;
    const r = await run(() => api(`/breeder/documents/${d.id}`, { method: 'DELETE' }));
    if (r) q.reload();
  }

  const docs = q.data?.documents ?? [];

  return (
    <div className="space-y-3 text-sm">
      {generate && (subjectType === 'puppy' || subjectType === 'buyer') && (
        <GenerateDoc
          subjectType={subjectType}
          subjectId={subjectId}
          onGenerated={() => {
            q.reload();
            onGenerated?.();
          }}
        />
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border border-dashed p-3 ${over ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700'}`}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={t('docs.kind')}>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>{label('docKind', k)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('docs.titleOptional')}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('docs.titlePh')} />
          </Field>
        </div>
        <label className="mt-2 block cursor-pointer text-xs text-slate-400">
          {t('docs.drop')}
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void send(file);
            }}
          />
        </label>
      </div>

      {q.loading && !q.data ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-400">{t('docs.none')}</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 p-2">
              <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{label('docKind', d.kind)}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-100">{d.title || d.filename}</div>
                <div className="text-xs text-slate-400">
                  {d.generated ? t('common.generated') : bytes(d.size_bytes)}
                  {d.created_at ? ` · ${shortDate(d.created_at)}` : ''}
                </div>
              </div>
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => run(() => apiOpen(`/breeder/documents/${d.id}/download`))}>{t('common.open')}</Btn>
              <Btn
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => apiDownload(`/breeder/documents/${d.id}/download`, d.filename || d.title || 'document'))}
              >
                {t('common.download')}
              </Btn>
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(d)}>{t('common.delete')}</Btn>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
