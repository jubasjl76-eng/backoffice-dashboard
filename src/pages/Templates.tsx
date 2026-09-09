import { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation } from '../lib/useApi';
import { Badge, Btn, Card, Field, Input, PageHeader, Spinner } from '../components/ui';

interface Template {
  slug: string;
  kind: string;
  title: string;
  body: string;
  customised: boolean;
  tokens: string[];
}

const areaCls =
  'w-full min-h-[22rem] rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';

export function Templates() {
  const q = useQuery<{ templates: Template[] }>('/breeder/documents/templates');
  const [run, busy] = useMutation();
  const [slug, setSlug] = useState('contract');
  const [edit, setEdit] = useState<Partial<{ title: string; body: string }>>({});

  const templates = q.data?.templates ?? [];
  const tpl = templates.find((t) => t.slug === slug) ?? templates[0];
  const form = { title: tpl?.title ?? '', body: tpl?.body ?? '', ...edit };

  function pick(next: string) {
    setSlug(next);
    setEdit({});
  }

  async function save() {
    if (!tpl) return;
    const r = await run(() =>
      api(`/breeder/documents/templates/${tpl.slug}`, {
        method: 'PUT',
        body: { title: form.title, body: form.body },
      })
    );
    if (r) {
      setEdit({});
      q.reload();
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Document templates" />
      <p className="text-sm text-slate-400">
        These fill a puppy sale pack: contract, deposit receipt, health guarantee, and microchip keeper transfer.
        Placeholders look like <code className="text-slate-300">{'{{puppy_name}}'}</code>. A token with no value is rejected rather than left blank.
      </p>

      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <p className="text-sm text-rose-300">{q.error}</p>
      ) : !tpl ? (
        <p className="text-sm text-slate-400">No templates.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
          <nav className="space-y-1" aria-label="Templates">
            {templates.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => pick(t.slug)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  t.slug === tpl.slug ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>{t.title}</span>
                {t.customised && <Badge className="bg-indigo-500/15 text-indigo-300 ring-indigo-500/30">edited</Badge>}
              </button>
            ))}
          </nav>
          <Card className="space-y-3 p-4">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <Field label="Body" hint={`Tokens: ${(tpl.tokens ?? []).join(', ') || 'none'}`}>
              <textarea
                className={areaCls}
                value={form.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                spellCheck={false}
              />
            </Field>
            <Btn variant="primary" disabled={busy} onClick={save}>Save template</Btn>
          </Card>
        </div>
      )}
    </div>
  );
}
