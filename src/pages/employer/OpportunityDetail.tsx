import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Clock, Heart, MapPin, Pencil, SearchX, Sparkles, Users, Wallet, Wand2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { rankCandidates, suggestRelaxations, toCriteria, unheldSkills, type MatchCriteria } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS } from '../../lib/types';
import { skillLabel } from '../../lib/skills';
import { CandidateTable } from '../../components/CandidateTable';
import { Avatar, Disclaimer, EmptyState, SkillChips, useToast } from '../../components/ui';

type Tab = 'matches' | 'shortlist' | 'interested';

export function OpportunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { opportunities, candidates, shortlists, interests, store, pruneIneligible } = useData();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('matches');
  const [locFilter, setLocFilter] = useState<string>('All');

  // Employers only see opportunities they posted themselves.
  const opp = opportunities.find((o) => o.id === id && o.employerId === user?.uid);
  const criteria = opp ? toCriteria(opp) : null;
  const ranked = useMemo(() => (criteria ? rankCandidates(criteria, candidates) : []), [criteria && JSON.stringify(criteria), candidates]); // eslint-disable-line
  if (!opp || !criteria) return <div className="page"><p>Opportunity not found.</p><Link to="/employer">Back</Link></div>;

  const matches = ranked.filter((r) => r.eligible);
  const shortIds = new Set(shortlists.filter((s) => s.opportunityId === opp.id).map((s) => s.candidateId));
  const intIds = new Set(interests.filter((s) => s.opportunityId === opp.id).map((s) => s.candidateId));
  const shortlisted = ranked.filter((r) => shortIds.has(r.candidate.id));
  const interested = ranked.filter((r) => intIds.has(r.candidate.id));
  const towns = ['All', ...Array.from(new Set(matches.map((r) => r.candidate.location)))];
  const visible = locFilter === 'All' ? matches : matches.filter((r) => r.candidate.location === locFilter);

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

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'matches'} className={tab === 'matches' ? 'on' : ''} onClick={() => setTab('matches')}>
          Matches <span className="count">{matches.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'shortlist'} className={tab === 'shortlist' ? 'on' : ''} onClick={() => setTab('shortlist')}>
          Shortlist <span className="count">{shortlisted.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'interested'} className={tab === 'interested' ? 'on' : ''} onClick={() => setTab('interested')}>
          Interested <span className="count">{interested.length}</span>
        </button>
      </div>

      <Disclaimer compact />

      {tab === 'matches' && (
        matches.length > 0 ? (
          <section className="card glass-strong">
            {towns.length > 2 && (
              <div className="pills">
                {towns.map((t) => (
                  <button key={t} className={locFilter === t ? 'on' : ''} onClick={() => setLocFilter(t)}>{t}</button>
                ))}
              </div>
            )}
            <CandidateTable results={visible} opportunityId={opp.id} employerId={opp.employerId} canShortlist defaultOpen={visible[0]?.candidate.id ?? null} />
            <p className="muted small table-note">Click a row to see why. Ranked by score; candidates must have at least half the required skills, the right availability and a workable location to be listed.</p>
          </section>
        ) : (
          <NoMatches criteria={criteria} oppId={opp.id} onApply={applyPatch} ranked={ranked} />
        )
      )}

      {tab === 'shortlist' && (
        shortlisted.length ? (
          <section className="card glass-strong">
            <CandidateTable results={shortlisted} opportunityId={opp.id} employerId={opp.employerId} canShortlist showInterest />
          </section>
        ) : (
          <EmptyState icon={<Sparkles size={22} />} title="No one shortlisted yet">
            Use the bookmark button on the Matches tab to add candidates here. You&rsquo;ll see whether each one has expressed interest.
          </EmptyState>
        )
      )}

      {tab === 'interested' && (
        interested.length ? (
          <section className="card glass-strong">
            <CandidateTable results={interested} opportunityId={opp.id} employerId={opp.employerId} canShortlist showInterest />
          </section>
        ) : (
          <EmptyState icon={<Heart size={22} />} title="No expressions of interest yet">
            When a candidate taps &ldquo;I&rsquo;m interested&rdquo; on this {opp.type}, they appear here in real time.
          </EmptyState>
        )
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
