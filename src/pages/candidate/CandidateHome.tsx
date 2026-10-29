import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, Database, Heart, MapPin, Pencil, Search, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { rankOpportunities } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS } from '../../lib/types';
import { Avatar, Disclaimer, EmptyState, ScoreRing, SkillChips, TierBadge, useToast } from '../../components/ui';

export function CandidateHome() {
  const { user } = useAuth();
  const { actingCandidate: me, myProfile, personas, opportunities, setActingCandidateId, isShortlisted, interestFor, store, candidates } = useData();
  const toast = useToast();
  const [type, setType] = useState<'all' | 'job' | 'gig'>('all');
  const [text, setText] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  const ranked = useMemo(() => (me ? rankOpportunities(me, opportunities) : []), [me, opportunities]);
  const filtered = ranked.filter(
    ({ opportunity: o }) =>
      (type === 'all' || o.type === type) &&
      (!text || `${o.title} ${o.employerName} ${o.description} ${o.requiredSkills.join(' ')} ${o.location}`.toLowerCase().includes(text.toLowerCase())),
  );
  const recommended = filtered.filter((r) => r.match.eligible);
  const others = filtered.filter((r) => !r.match.eligible);
  const myInterests = me ? opportunities.filter((o) => interestFor(o.id, me.id)) : [];

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
          <h2>Recommended for you <span className="count">{recommended.length}</span></h2>
          <div className="filters">
            <div className="pills">
              {(['all', 'gig', 'job'] as const).map((t) => (
                <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t === 'all' ? 'All' : t === 'gig' ? 'Gigs' : 'Jobs'}</button>
              ))}
            </div>
            <label className="mini-search"><Search size={15} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search opportunities" /></label>
          </div>
        </div>
        <Disclaimer compact />
        {recommended.length === 0 ? (
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
                  {isShortlisted(o.id, me.id) && <span className="ok"><BookmarkCheck size={14} /> Shortlisted</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
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

      {myInterests.length > 0 && (
        <section>
          <div className="section-head"><h2>Your expressions of interest</h2></div>
          <div className="list">
            {myInterests.map((o) => (
              <Link key={o.id} to={`/candidate/opportunities/${o.id}`} className="list-row glass">
                <div><b>{o.title}</b> <span className="muted small">· {o.employerName}</span></div>
                {isShortlisted(o.id, me.id) ? <span className="status status-yes"><BookmarkCheck size={12} /> Shortlisted</span> : <span className="status">Sent, awaiting employer</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
