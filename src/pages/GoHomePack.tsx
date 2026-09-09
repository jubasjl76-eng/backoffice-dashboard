import { useParams } from 'react-router-dom';
import { DocumentsPanel } from '../components/Documents';
import { Badge, Btn, EmptyState, PageHeader, Spinner } from '../components/ui';
import { useDates, useT } from '../i18n';
import { apiDownload, apiOpen } from '../lib/api';
import { useMutation, useQuery } from '../lib/useApi';

interface PackDoc {
  id: string;
  kind: string;
  title: string | null;
  filename: string | null;
  generated: boolean;
  created_at: string;
}
interface Pack {
  generatedAt: string;
  puppy: {
    name: string;
    sex: string | null;
    color: string | null;
    microchip: string | null;
    birth_weight_g: number | null;
    go_home_on: string | null;
    photos: string[] | null;
    litter_name: string | null;
    litter_breed: string | null;
    dam_name: string | null;
    sire_name: string | null;
  };
  buyer: { name: string | null; email: string | null; phone: string | null } | null;
  weightSeries: Array<{ grams: number; taken_at: string }>;
  vaccinations: Array<{
    name: string;
    kind: string;
    given_on: string;
    batch_no: string | null;
    vet_name: string | null;
    certificate_url: string | null;
  }>;
  documents: PackDoc[];
}

export function GoHomePack() {
  const { t, label } = useT();
  const { shortDate } = useDates();
  const { pupId } = useParams<{ pupId: string }>();
  const q = useQuery<Pack>(pupId ? `/breeder/buyers/puppies/${pupId}/go-home-pack` : null);
  const [run, busy] = useMutation();

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <EmptyState title={t('gohome.loadError')} hint={q.error ?? undefined} />;

  const { puppy: p, buyer, weightSeries, vaccinations, documents } = q.data;
  const latest = weightSeries.at(-1);

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader title={t('gohome.title', { name: p.name })}>
        <Btn onClick={() => window.print()}>{t('common.print')}</Btn>
      </PageHeader>

      <section className="space-y-1 text-sm">
        <h2 className="font-medium text-white">{p.name}</h2>
        <p className="text-slate-400">
          {[p.litter_breed, p.sex ? label('sex', p.sex) : null, p.color].filter(Boolean).join(' · ')}
        </p>
        <p className="text-slate-400">
          {p.dam_name ?? '?'} × {p.sire_name ?? '?'}
          {p.litter_name ? ` · ${p.litter_name}` : ''}
        </p>
        {p.microchip && <p className="text-slate-400">{t('gohome.microchip', { id: p.microchip })}</p>}
        {p.go_home_on && <p className="text-slate-400">{t('gohome.goHome', { date: shortDate(p.go_home_on) })}</p>}
        {p.birth_weight_g != null && <p className="text-slate-400">{t('gohome.birthWeight', { n: p.birth_weight_g })}</p>}
        {latest && <p className="text-slate-400">{t('gohome.latestWeight', { n: Math.round(latest.grams), date: shortDate(latest.taken_at) })}</p>}
      </section>

      {buyer && (
        <section className="text-sm">
          <h3 className="mb-1 font-medium text-slate-200">{t('gohome.family')}</h3>
          <p className="text-slate-400">
            {[buyer.name, buyer.email, buyer.phone].filter(Boolean).join(' · ')}
          </p>
        </section>
      )}

      {vaccinations.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">{t('gohome.vaxGiven')}</h3>
          <ul className="space-y-1 text-slate-400">
            {vaccinations.map((v, i) => (
              <li key={i}>
                {t('gohome.vaxLine', { name: v.name, kind: label('vaxKind', v.kind), date: shortDate(v.given_on) })}
                {v.vet_name ? ` · ${v.vet_name}` : ''}
                {v.batch_no ? t('gohome.batch', { n: v.batch_no }) : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {weightSeries.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">{t('gohome.weights')}</h3>
          <ul className="space-y-0.5 text-slate-400">
            {weightSeries.map((w, i) => (
              <li key={i}>{shortDate(w.taken_at)} · {Math.round(w.grams)} g</li>
            ))}
          </ul>
        </section>
      )}

      {p.photos && p.photos.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">{t('gohome.photos')}</h3>
          <ul className="space-y-1 break-all text-slate-400">
            {p.photos.map((url) => (
              <li key={url}>{url}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="text-sm">
        <h3 className="mb-2 font-medium text-slate-200">{t('gohome.papers')}</h3>
        {documents.length === 0 ? (
          <p className="text-slate-400">{t('gohome.noPapers')}</p>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{label('docKind', d.kind)}</Badge>
                <span className="min-w-0 flex-1 text-slate-200">{d.title || d.filename}</span>
                {d.generated && <span className="text-xs text-slate-500">{t('common.generated')}</span>}
                <span className="text-xs text-slate-500">{shortDate(d.created_at)}</span>
                <span className="print:hidden flex gap-1">
                  <Btn size="sm" variant="ghost" disabled={busy} onClick={() => run(() => apiOpen(`/breeder/documents/${d.id}/download`))}>{t('common.open')}</Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => apiDownload(`/breeder/documents/${d.id}/download`, d.filename || d.title || 'document'))}
                  >
                    {t('common.download')}
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pupId && (
        <section className="text-sm print:hidden">
          <DocumentsPanel
            subjectType="puppy"
            subjectId={pupId}
            defaultKind="handoff"
            generate
            onGenerated={() => q.reload()}
          />
        </section>
      )}

      <p className="text-xs text-slate-600">{t('gohome.generated', { date: shortDate(q.data.generatedAt) })}</p>
    </div>
  );
}
