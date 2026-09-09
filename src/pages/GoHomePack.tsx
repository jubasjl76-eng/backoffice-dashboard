import { useParams } from 'react-router-dom';
import { useQuery } from '../lib/useApi';
import { Btn, EmptyState, PageHeader, Spinner } from '../components/ui';
import { shortDate } from '../lib/format';

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
  documents: unknown[];
}

export function GoHomePack() {
  const { pupId } = useParams<{ pupId: string }>();
  const q = useQuery<Pack>(pupId ? `/breeder/buyers/puppies/${pupId}/go-home-pack` : null);

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <EmptyState title="Couldn't load the go-home pack" hint={q.error ?? undefined} />;

  const { puppy: p, buyer, weightSeries, vaccinations } = q.data;
  const latest = weightSeries.at(-1);

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader title={`Go-home pack · ${p.name}`}>
        <Btn onClick={() => window.print()}>Print</Btn>
      </PageHeader>

      <section className="space-y-1 text-sm">
        <h2 className="font-medium text-white">{p.name}</h2>
        <p className="text-slate-400">
          {[p.litter_breed, p.sex, p.color].filter(Boolean).join(' · ')}
        </p>
        <p className="text-slate-400">
          {p.dam_name ?? '?'} × {p.sire_name ?? '?'}
          {p.litter_name ? ` · ${p.litter_name}` : ''}
        </p>
        {p.microchip && <p className="text-slate-400">Microchip {p.microchip}</p>}
        {p.go_home_on && <p className="text-slate-400">Go-home {shortDate(p.go_home_on)}</p>}
        {p.birth_weight_g != null && <p className="text-slate-400">Birth weight {p.birth_weight_g} g</p>}
        {latest && <p className="text-slate-400">Latest weight {Math.round(latest.grams)} g ({shortDate(latest.taken_at)})</p>}
      </section>

      {buyer && (
        <section className="text-sm">
          <h3 className="mb-1 font-medium text-slate-200">Family</h3>
          <p className="text-slate-400">
            {[buyer.name, buyer.email, buyer.phone].filter(Boolean).join(' · ')}
          </p>
        </section>
      )}

      {vaccinations.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">Vaccinations given</h3>
          <ul className="space-y-1 text-slate-400">
            {vaccinations.map((v, i) => (
              <li key={i}>
                {v.name} ({v.kind}) · {shortDate(v.given_on)}
                {v.vet_name ? ` · ${v.vet_name}` : ''}
                {v.batch_no ? ` · batch ${v.batch_no}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {weightSeries.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">Weight series</h3>
          <ul className="space-y-0.5 text-slate-400">
            {weightSeries.map((w, i) => (
              <li key={i}>{shortDate(w.taken_at)} · {Math.round(w.grams)} g</li>
            ))}
          </ul>
        </section>
      )}

      {p.photos && p.photos.length > 0 && (
        <section className="text-sm">
          <h3 className="mb-2 font-medium text-slate-200">Photos</h3>
          <ul className="space-y-1 break-all text-slate-400">
            {p.photos.map((url) => (
              <li key={url}>{url}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-600">Generated {shortDate(q.data.generatedAt)}. Papers attach in Phase 7.</p>
    </div>
  );
}
