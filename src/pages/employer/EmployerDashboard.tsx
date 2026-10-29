import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Database, Heart, MapPin, Plus, Search, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { rankCandidates, toCriteria } from '../../lib/matching';
import { parseTalentQuery } from '../../lib/search';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS, type Opportunity } from '../../lib/types';
import { SUGGESTED_SKILLS } from '../../lib/skills';
import { CandidateTable } from '../../components/CandidateTable';
import { Disclaimer, EmptyState, SkillChips, useToast } from '../../components/ui';
import '../../styles/employer.css';

type OppFilter = 'all' | 'open' | 'closed' | 'interest';
const OPP_FILTERS: { key: OppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'interest', label: 'Has interest' },
];

const EXAMPLES = ['Find me a React developer in Kampala, part-time', 'Photographer for weekends in Kampala', 'Bookkeeper with Excel in Entebbe'];

export function EmployerDashboard() {
  const { user } = useAuth();
  const { opportunities, candidates, shortlists, interests, store } = useData();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [oppFilter, setOppFilter] = useState<OppFilter>('all');

  const mine = opportunities.filter((o) => o.employerId === user?.uid).sort((a, b) => b.createdAt - a.createdAt);
  const hasSamples = candidates.some((c) => c.sample);

  const vocab = useMemo(() => [...SUGGESTED_SKILLS, ...candidates.flatMap((c) => c.skills)], [candidates]);
  const parsed = useMemo(
    () => (submitted ? parseTalentQuery(submitted, vocab, candidates.map((c) => c.location)) : null),
    [submitted, vocab, candidates],
  );
  const searchResults = useMemo(
    () => (parsed ? rankCandidates(parsed.criteria, candidates).filter((r) => r.eligible).slice(0, 8) : []),
    [parsed, candidates],
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(q.trim());
  };

  const seed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const n = await store.seedSamples(user.uid);
      toast(n ? `Loaded ${n} fictional sample records` : 'Sample data is already loaded');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSeeding(false);
    }
  };

  const stats = (o: Opportunity) => {
    const ranked = rankCandidates(toCriteria(o), candidates);
    return {
      matches: ranked.filter((r) => r.eligible).length,
      shortlisted: shortlists.filter((s) => s.opportunityId === o.id).length,
      interested: interests.filter((s) => s.opportunityId === o.id).length,
    };
  };

  const hasInterest = (o: Opportunity) => interests.some((s) => s.opportunityId === o.id);
  const oppMatches = (f: OppFilter, o: Opportunity) =>
    f === 'all' || (f === 'open' && o.status !== 'closed') || (f === 'closed' && o.status === 'closed') || (f === 'interest' && hasInterest(o));
  const shownOpps = mine.filter((o) => oppMatches(oppFilter, o));

  return (
    <div className="page">
      <section className="search-hero">
        <h1>Find talent</h1>
        <p className="muted">Describe who you need in plain words. We pick out skills, town and availability using simple rules.</p>
        <form className="nl-search glass-strong" onSubmit={onSearch}>
          <span className="nl-plus"><Search size={18} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find me a React developer in Kampala, part-time"
            aria-label="Describe the talent you need"
          />
          <button className="btn btn-dark" type="submit">
             Search
          </button>
        </form>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip chip-ghost" onClick={() => { setQ(ex); setSubmitted(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      </section>

      {parsed && (
        <section className="card glass-strong">
          <div className="card-head">
            <div>
              <h2>Results for &ldquo;{submitted}&rdquo;</h2>
              <p className="muted small">
                Understood: {parsed.understood.length ? parsed.understood.join(' · ') : 'nothing specific, showing everyone'}
              </p>
            </div>
            <button
              className="btn btn-light"
              onClick={() =>
                nav('/employer/new', {
                  state: {
                    prefill: {
                      title: submitted.replace(/^find me (a|an)\s+/i, '').replace(/^\w/, (c) => c.toUpperCase()),
                      requiredSkills: parsed.skills,
                      location: parsed.location ?? '',
                      workMode: parsed.remote ? 'remote' : 'on-site',
                      availability: parsed.availability ?? 'full-time',
                      type: parsed.criteria.type,
                      minExperienceYears: parsed.minYears,
                    },
                  },
                })
              }
            >
              Post this as an opportunity <ArrowRight size={15} />
            </button>
          </div>
          {searchResults.length ? (
            <CandidateTable results={searchResults} />
          ) : (
            <EmptyState icon={<Users size={22} />} title="No one matches that search yet">
              Try fewer skills, a different town, or remove the availability word.
            </EmptyState>
          )}
          <Disclaimer compact />
        </section>
      )}

      {!hasSamples && (
        <section className="card glass sample-card">
          <span className="tile-icon"><Database size={18} /></span>
          <div>
            <h3>Load fictional sample data</h3>
            <p className="muted small">Adds 12 made-up candidate profiles and 4 sample opportunities so you can try matching straight away. None are real people or real vacancies.</p>
          </div>
          <button className="btn btn-dark" onClick={seed} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load samples'}
          </button>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Your opportunities</h2>
          <Link to="/employer/new" className="btn btn-dark">
            <Plus size={16} /> Post a job or gig
          </Link>
        </div>
        {mine.length === 0 ? (
          <EmptyState icon={<Plus size={22} />} title="You haven't posted anything yet" action={<Link className="btn btn-dark" to="/employer/new"><Plus size={16} /> Post your first opportunity</Link>}>
            Post a job or gig with the skills, location and availability you need, and matching candidates appear immediately.
          </EmptyState>
        ) : (
          <>
            {mine.length > 1 && (
              <div className="emp-filter-pills emp-opp-filter" role="tablist" aria-label="Filter your opportunities">
                {OPP_FILTERS.map((f) => (
                  <button key={f.key} role="tab" aria-selected={oppFilter === f.key} className={oppFilter === f.key ? 'on' : ''} onClick={() => setOppFilter(f.key)}>
                    {f.label} <span className="emp-count">{mine.filter((o) => oppMatches(f.key, o)).length}</span>
                  </button>
                ))}
              </div>
            )}
            {shownOpps.length ? (
              <div className="opp-grid">
                {shownOpps.map((o) => <OppCard key={o.id} o={o} s={stats(o)} />)}
              </div>
            ) : (
              <p className="muted small emp-empty">No opportunities in this view.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function OppCard({ o, s }: { o: Opportunity; s: { matches: number; shortlisted: number; interested: number } }) {
  return (
    <Link to={`/employer/opportunities/${o.id}`} className="opp-card glass-strong">
      <div className="opp-top">
        <span className={`badge type-${o.type}`}>{o.type === 'gig' ? 'Gig' : 'Job'}</span>
        {o.sample && <span className="badge">Sample</span>}
        {o.status === 'closed' && <span className="badge">Closed</span>}
      </div>
      <h3>{o.title}</h3>
      <p className="muted small">
        {o.employerName} · <MapPin size={12} /> {o.location} · {WORK_MODE_LABELS[o.workMode]} · {AVAILABILITY_LABELS[o.availability]}
      </p>
      <SkillChips skills={o.requiredSkills} />
      <div className="opp-stats">
        <span className={s.matches ? 'ok' : 'warn'}><Users size={14} /> {s.matches} match{s.matches === 1 ? '' : 'es'}</span>
        <span> {s.shortlisted} shortlisted</span>
        <span><Heart size={14} /> {s.interested} interested</span>
      </div>
    </Link>
  );
}
