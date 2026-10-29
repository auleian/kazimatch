import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Clock, Heart, MapPin, Pencil, Search, SearchX, Users, Wallet, Wand2, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { rankCandidates, suggestRelaxations, toCriteria, unheldSkills, type MatchCriteria } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS } from '../../lib/types';
import { skillLabel } from '../../lib/skills';
import { CandidateTable } from '../../components/CandidateTable';
import { Avatar, Disclaimer, EmptyState, SkillChips, useToast } from '../../components/ui';
import '../../styles/employer.css';

type Filter = 'all' | 'shortlisted' | 'interested' | 'invited' | 'rejected' | 'unreviewed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interested', label: 'Interested' },
  { key: 'invited', label: 'Invited' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'unreviewed', label: 'Not reviewed' },
];

const EMPTY: Record<Filter, string> = {
  all: 'No candidates match these filters.',
  shortlisted: 'No one shortlisted yet. Use the bookmark button to add candidates here.',
  interested: 'No expressions of interest yet. When a candidate taps “I’m interested”, they appear here in real time.',
  invited: 'No interview invitations sent yet. Shortlisted candidates who are interested can be invited.',
  rejected: 'No rejected candidates.',
  unreviewed: 'Everyone has been reviewed.',
};

export function OpportunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { opportunities, candidates, shortlists, interests, rejections, store, pruneIneligible } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [locFilter, setLocFilter] = useState<string>('All');
  const [text, setText] = useState('');

  // Employers only see opportunities they posted themselves.
  const opp = opportunities.find((o) => o.id === id && o.employerId === user?.uid);
  const criteria = opp ? toCriteria(opp) : null;
  const ranked = useMemo(() => (criteria ? rankCandidates(criteria, candidates) : []), [criteria && JSON.stringify(criteria), candidates]); // eslint-disable-line
  if (!opp || !criteria) return <div className="page"><p>Opportunity not found.</p><Link to="/employer">Back</Link></div>;

  const matches = ranked.filter((r) => r.eligible);
  const shortIds = new Set(shortlists.filter((s) => s.opportunityId === opp.id).map((s) => s.candidateId));
  const intIds = new Set(interests.filter((s) => s.opportunityId === opp.id).map((s) => s.candidateId));
  const rejIds = new Set(rejections.filter((s) => s.opportunityId === opp.id).map((s) => s.candidateId));
  const invIds = new Set(shortlists.filter((s) => s.opportunityId === opp.id && s.invitedAt).map((s) => s.candidateId));
  // Everyone the employer can act on: eligible matches plus anyone already shortlisted, interested or rejected.
  const pool = ranked.filter((r) => r.eligible || shortIds.has(r.candidate.id) || intIds.has(r.candidate.id) || rejIds.has(r.candidate.id));
  const shortlisted = pool.filter((r) => shortIds.has(r.candidate.id) && !rejIds.has(r.candidate.id));
  const interested = pool.filter((r) => intIds.has(r.candidate.id) && !rejIds.has(r.candidate.id));

  const towns = ['All', ...Array.from(new Set(pool.map((r) => r.candidate.location)))];
  const needle = text.trim().toLowerCase();
  const narrowed = pool.filter((r) => {
    const c = r.candidate;
    if (locFilter !== 'All' && c.location !== locFilter) return false;
    if (!needle) return true;
    return c.name.toLowerCase().includes(needle) || c.headline.toLowerCase().includes(needle) || c.skills.some((k) => k.toLowerCase().includes(needle));
  });
  const inFilter = (f: Filter, id: string) => {
    const rej = rejIds.has(id);
    switch (f) {
      case 'all': return true;
      case 'shortlisted': return !rej && shortIds.has(id);
      case 'interested': return !rej && intIds.has(id);
      case 'invited': return !rej && invIds.has(id);
      case 'rejected': return rej;
      case 'unreviewed': return !rej && !shortIds.has(id);
    }
  };
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, narrowed.filter((r) => inFilter(f.key, r.candidate.id)).length])) as Record<Filter, number>;
  // Under "All", rejected candidates sink to the bottom so they don't mix in with the recommendations.
  const visible = narrowed
    .filter((r) => inFilter(filter, r.candidate.id))
    .sort((a, b) => (filter === 'all' ? Number(rejIds.has(a.candidate.id)) - Number(rejIds.has(b.candidate.id)) : 0));
  const statusView = filter !== 'all' && filter !== 'unreviewed';

  const applyPatch = async (patch: Partial<MatchCriteria>) => {
    try {
      await store.updateOpportunity(opp.id, patch as never);
      const removed = await pruneIneligible(opp.id, { ...criteria, ...patch });
      const n = removed.shortlists + removed.interests;
      toast(n ? `Requirements updated · removed ${n} entr${n === 1 ? 'y' : 'ies'} that no longer match` : 'Requirements updated');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  return (
    <div className="page">
      <Link to="/employer" className="back"><ArrowLeft size={15} /> All opportunities</Link>

      <section className="card glass-strong opp-head">
        <div className="opp-head-main">
          <div className="opp-top">
            <span className={`badge type-${opp.type}`}>{opp.type === 'gig' ? 'Gig' : 'Job'}</span>
            {opp.sample && <span className="badge">Sample · fictional</span>}
            {opp.status === 'closed' && <span className="badge">Closed</span>}
          </div>
          <h1>{opp.title}</h1>
          <p className="muted">{opp.employerName}</p>
          <div className="facts">
            <span><MapPin size={14} /> {opp.location} · {WORK_MODE_LABELS[opp.workMode]}</span>
            <span><Clock size={14} /> {AVAILABILITY_LABELS[opp.availability]}</span>
            <span><Briefcase size={14} /> {opp.minExperienceYears ? `${opp.minExperienceYears}+ yrs` : 'No minimum experience'}</span>
            {opp.pay && <span><Wallet size={14} /> {opp.pay}</span>}
          </div>
          <p className="desc">{opp.description}</p>
          <div className="req-row">
            <span className="muted small">Required</span>
            <SkillChips skills={opp.requiredSkills} />
          </div>
          {opp.niceToHaveSkills.length > 0 && (
            <div className="req-row">
              <span className="muted small">Nice to have</span>
              <SkillChips skills={opp.niceToHaveSkills} />
            </div>
          )}
        </div>
        <div className="opp-head-side">
          <div className="kpi"><Users size={16} /><b>{matches.length}</b><span>matches</span></div>
          <div className="kpi"><b>{shortlisted.length}</b><span>shortlisted</span></div>
          <div className="kpi"><Heart size={16} /><b>{interested.length}</b><span>interested</span></div>
          <Link className="btn btn-light" to={`/employer/opportunities/${opp.id}/edit`}><Pencil size={15} /> Edit requirements</Link>
        </div>
      </section>

      <Disclaimer compact />

      {pool.length === 0 ? (
        <NoMatches criteria={criteria} oppId={opp.id} onApply={applyPatch} ranked={ranked} />
      ) : (
        <section className="card glass-strong">
          <div className="emp-filter">
            <div className="emp-filter-pills" role="tablist" aria-label="Filter candidates">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`${filter === f.key ? 'on' : ''} ${f.key === 'rejected' ? 'rej' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className="emp-count">{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <label className="mini-search">
              <Search size={14} />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by name or skill" aria-label="Filter candidates by name or skill" />
              {text && (
                <button type="button" className="icon-btn ghost emp-clear" onClick={() => setText('')} aria-label="Clear filter">
                  <X size={12} />
                </button>
              )}
            </label>
          </div>
          {towns.length > 2 && (
            <div className="pills">
              {towns.map((t) => (
                <button key={t} className={locFilter === t ? 'on' : ''} onClick={() => setLocFilter(t)}>{t}</button>
              ))}
            </div>
          )}
          {visible.length ? (
            <>
              <CandidateTable
                key={filter}
                results={visible}
                opportunityId={opp.id}
                employerId={opp.employerId}
                canShortlist
                showInterest={statusView}
                defaultOpen={filter === 'all' ? visible[0]?.candidate.id ?? null : null}
              />
              <p className="muted small table-note">
                Click a row to see why. Ranked by score; matches need at least half the required skills, the right availability and a workable location.
              </p>
            </>
          ) : (
            <p className="muted small emp-empty">{needle || locFilter !== 'All' ? 'No candidates match these filters.' : EMPTY[filter]}</p>
          )}
        </section>
      )}
    </div>
  );

  function NoMatches({ criteria, oppId, onApply, ranked }: { criteria: MatchCriteria; oppId: string; onApply(p: Partial<MatchCriteria>): void; ranked: ReturnType<typeof rankCandidates> }) {
    const suggestions = suggestRelaxations(criteria, candidates);
    const unheld = unheldSkills(criteria, candidates);
    const near = ranked.filter((r) => r.matchedSkills.length > 0).slice(0, 3);
    return (
      <section className="card glass-strong">
        <EmptyState icon={<SearchX size={24} />} title="No suitable candidates for these requirements">
          <p>
            None of the {candidates.length} candidate profiles meet all the must-haves (half the required skills, matching availability and a workable location).
          </p>
          {unheld.length > 0 && (
            <p>
              No one in the talent pool lists <b>{unheld.map(skillLabel).join(', ')}</b>.
            </p>
          )}
        </EmptyState>

        {suggestions.length > 0 && (
          <div className="suggest">
            <h3><Wand2 size={16} /> Try relaxing the requirements</h3>
            <div className="suggest-grid">
              {suggestions.map((s) => (
                <div className="suggest-card" key={s.label}>
                  <div>
                    <b>{s.label}</b>
                    <span className="muted small">{s.detail}</span>
                  </div>
                  <div className="suggest-foot">
                    <span className="badge tier-good">+{s.newMatches} match{s.newMatches === 1 ? '' : 'es'}</span>
                    <button className="btn btn-dark sm" onClick={() => onApply(s.patch)}>Apply</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {near.length > 0 && (
          <div className="near">
            <h3>Closest profiles (not listed as matches)</h3>
            {near.map((r) => (
              <Link key={r.candidate.id} to={`/employer/candidates/${r.candidate.id}?opp=${oppId}`} className="near-row">
                <Avatar name={r.candidate.name} size={32} />
                <div>
                  <b>{r.candidate.name}</b> <span className="muted small">· {r.candidate.headline}</span>
                  <p className="small">{r.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="center"><Link className="btn btn-light" to={`/employer/opportunities/${oppId}/edit`}><Pencil size={15} /> Edit requirements</Link></div>
      </section>
    );
  }
}
