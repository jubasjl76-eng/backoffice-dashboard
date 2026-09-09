import { useState, type DragEvent } from 'react';
import { api, apiDownload, apiOpen, apiUpload } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Field, Input, Select, Spinner } from './ui';
import { shortDate, titleCase } from '../lib/format';

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
}: {
  subjectType: SubjectType;
  subjectId: string;
  defaultKind?: string;
}) {
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
    if (!confirm(`Delete “${d.title || d.filename}”?`)) return;
    const r = await run(() => api(`/breeder/documents/${d.id}`, { method: 'DELETE' }));
    if (r) q.reload();
  }

  const docs = q.data?.documents ?? [];

  return (
    <div className="space-y-3 text-sm">
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
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>{titleCase(k)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title (optional)">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="defaults to filename" />
          </Field>
        </div>
        <label className="mt-2 block cursor-pointer text-xs text-slate-400">
          Drop a file here or click to choose (max 15 MB)
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
        <p className="text-xs text-slate-400">No papers yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 p-2">
              <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{titleCase(d.kind)}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-100">{d.title || d.filename}</div>
                <div className="text-xs text-slate-400">
                  {d.generated ? 'generated' : bytes(d.size_bytes)}
                  {d.created_at ? ` · ${shortDate(d.created_at)}` : ''}
                </div>
              </div>
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => run(() => apiOpen(`/breeder/documents/${d.id}/download`))}>Open</Btn>
              <Btn
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => apiDownload(`/breeder/documents/${d.id}/download`, d.filename || d.title || 'document'))}
              >
                Download
              </Btn>
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => remove(d)}>Delete</Btn>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
