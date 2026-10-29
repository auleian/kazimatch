import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, CalendarCheck, CircleSlash, Database, Heart, MapPin, Pencil, Search, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { matchCandidate, toCriteria } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS } from '../../lib/types';
import { Avatar, Disclaimer, EmptyState, ScoreRing, SkillChips, TierBadge, timeAgo, useToast } from '../../components/ui';
import '../../styles/candidate.css';

type View = 'recommended' | 'interested' | 'shortlisted' | 'rejected' | 'all';
const VIEWS: { key: View; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'interested', label: 'Interested' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export function CandidateHome() {
  const { user } = useAuth();
  const { actingCandidate: me, myProfile, personas, opportunities, setActingCandidateId, shortlistEntry, interestFor, rejectionFor, store, candidates } = useData();
  const toast = useToast();
  const [view, setView] = useState<View>('recommended');
  const [type, setType] = useState<'all' | 'job' | 'gig'>('all');
  const [text, setText] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  // Every open opportunity, plus closed ones the candidate has a history with.
  const rows = useMemo(() => {
    if (!me) return [];
    return opportunities
      .map((o) => ({
        opportunity: o,
        match: matchCandidate(toCriteria(o), me),
        interest: interestFor(o.id, me.id),
        shortlist: shortlistEntry(o.id, me.id),
        rejection: rejectionFor(o.id, me.id),
      }))
      .filter((r) => r.opportunity.status === 'open' || r.interest || r.shortlist || r.rejection)
      .sort((a, b) => Number(b.match.eligible) - Number(a.match.eligible) || b.match.score - a.match.score);
  }, [me, opportunities, interestFor, shortlistEntry, rejectionFor]);

  const q = text.trim().toLowerCase();
  const filtered = rows.filter(
    ({ opportunity: o }) =>
      (type === 'all' || o.type === type) &&
      (!q || `${o.title} ${o.employerName} ${o.description} ${o.requiredSkills.join(' ')} ${o.location}`.toLowerCase().includes(q)),
  );
  const open = filtered.filter((r) => r.opportunity.status === 'open' && !r.rejection);
  const groups: Record<View, typeof filtered> = {
    recommended: open.filter((r) => r.match.eligible),
    interested: filtered.filter((r) => r.interest),
    shortlisted: filtered.filter((r) => r.shortlist),
    rejected: filtered.filter((r) => r.rejection).sort((a, b) => b.rejection!.createdAt - a.rejection!.createdAt),
    all: filtered,
  };
  const recommended = groups.recommended;
  const others = open.filter((r) => !r.match.eligible);
  const shown = groups[view];

  if (!me) {
    const samples = personas.filter((p) => p.sample);
    return (
      <div className="page narrow">
        <EmptyState
          icon={<UserPlus size={24} />}
          title="Create your profile to see matching work"
          action={<Link to="/candidate/profile?mine=1" className="btn btn-dark"><UserPlus size={16} /> Create my profile</Link>}
        >
          Add your skills, experience, location and availability. We&rsquo;ll rank open jobs and gigs for you and explain each match.
        </EmptyState>
        {samples.length > 0 ? (
          <section className="card glass">
            <h3>Or try it as a fictional sample candidate</h3>
            <div className="persona-grid">
              {samples.map((p) => (
                <button key={p.id} className="persona-card" onClick={() => setActingCandidateId(p.id)}>
                  <Avatar name={p.name} size={34} />
                  <div><b>{p.name}</b><span>{p.headline} · {p.location}</span></div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          candidates.length === 0 && (
            <section className="card glass sample-card">
              <span className="tile-icon"><Database size={18} /></span>
              <div>
                <h3>No opportunities yet</h3>
                <p className="muted small">Load fictional sample data to explore: 12 made-up profiles and 4 sample opportunities.</p>
              </div>
              <button className="btn btn-dark" onClick={async () => { const n = await store.seedSamples(user!.uid); toast(`Loaded ${n} sample records`); }}>Load samples</button>
            </section>
          )
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card glass-strong me-card">
        <Avatar name={me.name} size={56} />
        <div className="me-info">
          <h1>{me.name}</h1>
          <p className="muted">{me.headline} · <MapPin size={13} /> {me.location} · {me.availability.map((a) => AVAILABILITY_LABELS[a]).join(', ')}</p>
          <SkillChips skills={me.skills} />
          {me.sample && <p className="small muted">You&rsquo;re viewing as a fictional sample candidate (demo persona).</p>}
        </div>
        <div className="me-actions">
          <Link to="/candidate/profile" className="btn btn-light"><Pencil size={15} /> Edit profile</Link>
          {!myProfile && <Link to="/candidate/profile?mine=1" className="btn btn-light"><UserPlus size={15} /> Create my own</Link>}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Your opportunities</h2>
          <div className="filters">
            <div className="pills">
              {(['all', 'gig', 'job'] as const).map((t) => (
                <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t === 'all' ? 'All types' : t === 'gig' ? 'Gigs' : 'Jobs'}</button>
              ))}
            </div>
            <label className="mini-search"><Search size={15} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Title, employer or skill" /></label>
          </div>
        </div>
        <div className="cand-filter" role="tablist" aria-label="Filter opportunities">
          {VIEWS.map((v) => (
            <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => setView(v.key)}>
              {v.label} <span className="cand-filter-count">{groups[v.key].length}</span>
            </button>
          ))}
        </div>
        {view === 'recommended' && <Disclaimer compact />}
        {view === 'rejected' ? (
          shown.length === 0 ? (
            <EmptyState icon={<CircleSlash size={22} />} title="Nothing here">
              {q || type !== 'all' ? 'No matches for these filters.' : 'You haven’t been passed over for any opportunity. Keep going!'}
            </EmptyState>
          ) : (
            <div className="list">
              {shown.map(({ opportunity: o, rejection: r }) => (
                <Link key={o.id} to={`/candidate/opportunities/${o.id}`} className="list-row glass cand-rej-row">
                  <div className="cand-row-main">
                    <b>{o.title}</b> <span className="muted small">· {o.employerName}</span>
                    <p className={`small cand-reason${r!.reason ? '' : ' muted'}`}>{r!.reason ? `“${r!.reason}”` : 'No reason given'}</p>
                  </div>
                  <div className="cand-row-side">
                    <span className="status cand-status-no"><CircleSlash size={12} /> Not selected</span>
                    <span className="muted small">{timeAgo(r!.createdAt)}</span>
                  </div>
                </Link>
              ))}
              <p className="muted small cand-hint">Employers choose for many reasons. Keep your profile up to date and new matches will appear under Recommended.</p>
            </div>
          )
        ) : view !== 'recommended' ? (
          shown.length === 0 ? (
            <EmptyState icon={<Sparkles size={22} />} title="Nothing here yet">
              {q || type !== 'all'
                ? 'No matches for these filters.'
                : view === 'interested'
                  ? 'Open an opportunity and tap “I’m interested” to let the employer know.'
                  : view === 'shortlisted'
                    ? 'When an employer shortlists you, it will show up here.'
                    : 'No opportunities yet. Check back soon.'}
            </EmptyState>
          ) : (
            <div className="list">
              {shown.map((row) => (
                <Link key={row.opportunity.id} to={`/candidate/opportunities/${row.opportunity.id}`} className="list-row glass">
                  <div className="cand-row-main">
                    <b>{row.opportunity.title}</b>{' '}
                    <span className="muted small">· {row.opportunity.employerName} · {row.opportunity.type === 'gig' ? 'Gig' : 'Job'} · {row.opportunity.location}</span>
                    {row.rejection
                      ? <p className="small muted">{row.rejection.reason ? `Employer’s note: “${row.rejection.reason}”` : 'No reason given'}</p>
                      : !row.match.eligible && row.opportunity.status === 'open' && <p className="small muted">{row.match.summaryForCandidate}</p>}
                  </div>
                  <div className="cand-row-side">
                    <RowStatus {...row} />
                    <ScoreRing score={row.match.score} eligible={row.match.eligible} />
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : recommended.length === 0 ? (
          <EmptyState icon={<Sparkles size={22} />} title="No strong matches right now">
            {others.length
              ? 'There are open opportunities, but none meet the must-haves for your profile yet. Adding skills or availability options can help. See "Other open opportunities" below for the reasons.'
              : 'No open opportunities yet. Check back soon.'}
          </EmptyState>
        ) : (
          <div className="opp-grid">
            {recommended.map(({ opportunity: o, match: m }) => (
              <Link key={o.id} to={`/candidate/opportunities/${o.id}`} className="opp-card glass-strong">
                <div className="opp-top">
                  <span className={`badge type-${o.type}`}>{o.type === 'gig' ? 'Gig' : 'Job'}</span>
                  {o.sample && <span className="badge">Sample</span>}
                  <span className="grow" />
                  <ScoreRing score={m.score} />
                </div>
                <h3>{o.title}</h3>
                <p className="muted small">{o.employerName} · <MapPin size={12} /> {o.location} · {WORK_MODE_LABELS[o.workMode]} · {AVAILABILITY_LABELS[o.availability]}</p>
                <TierBadge tier={m.tier} />
                <p className="small">{m.criteria.find((c) => c.key === 'skills')?.textForCandidate}</p>
                <SkillChips skills={o.requiredSkills} matched={m.matchedSkills} missing={m.missingSkills} />
                <div className="opp-stats">
                  {interestFor(o.id, me.id) ? <span className="ok"><Heart size={14} /> Interest sent</span> : <span>Tap to view & respond</span>}
                  {shortlistEntry(o.id, me.id) && <span className="ok"><BookmarkCheck size={14} /> Shortlisted</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {view === 'recommended' && others.length > 0 && (
        <section>
          <button className="link" onClick={() => setShowOthers((s) => !s)}>
            {showOthers ? 'Hide' : 'Show'} other open opportunities ({others.length})
          </button>
          {showOthers && (
            <div className="list">
              {others.map(({ opportunity: o, match: m }) => (
                <Link key={o.id} to={`/candidate/opportunities/${o.id}`} className="list-row glass">
                  <div>
                    <b>{o.title}</b> <span className="muted small">· {o.employerName} · {o.location}</span>
                    <p className="small muted">{m.summaryForCandidate}</p>
                  </div>
                  <ScoreRing score={m.score} eligible={false} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

type RowInfo = {
  opportunity: { status: string };
  match: { eligible: boolean };
  interest?: unknown;
  shortlist?: { invitedAt?: number };
  rejection?: unknown;
};

/** The candidate-facing status for one opportunity. A rejection always wins. */
function RowStatus({ opportunity, match, interest, shortlist, rejection }: RowInfo) {
  if (rejection) return <span className="status cand-status-no"><CircleSlash size={12} /> Not selected</span>;
  if (shortlist?.invitedAt) return <span className="status status-yes"><CalendarCheck size={12} /> Invited to interview</span>;
  if (shortlist) return <span className="status status-yes"><BookmarkCheck size={12} /> Shortlisted</span>;
  if (interest) return <span className="status cand-status-sent"><Heart size={12} /> Sent, awaiting employer</span>;
  if (opportunity.status !== 'open') return <span className="status">Closed</span>;
  return match.eligible ? <span className="status cand-status-sent"><Sparkles size={12} /> Good match</span> : <span className="status">Not eligible yet</span>;
}
