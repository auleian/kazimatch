import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookmarkCheck, BookmarkPlus, CalendarCheck, Clock, Heart, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { matchCandidate, toCriteria, type CriterionKey } from '../../lib/matching';
import { AVAILABILITY_LABELS } from '../../lib/types';
import { InviteDialog } from '../../components/InviteDialog';
import { Avatar, Disclaimer, Explanation, IconTile, ScoreBar, ScoreRing, SkillChips, TierBadge, timeAgo, useToast } from '../../components/ui';

const SUB: { key: CriterionKey; label: string; color: string }[] = [
  { key: 'skills', label: 'Skills score', color: 'var(--green)' },
  { key: 'availability', label: 'Availability', color: 'var(--blue)' },
  { key: 'location', label: 'Location', color: 'var(--violet)' },
  { key: 'experience', label: 'Experience score', color: 'var(--amber)' },
];

export function CandidateDetail() {
  const { cid } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { candidates, opportunities, store, shortlistEntry, interestFor } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);

  const cand = candidates.find((c) => c.id === cid);
  const myOpps = opportunities.filter((o) => o.employerId === user?.uid);
  const oppId = params.get('opp') ?? myOpps[0]?.id ?? null;
  const opp = myOpps.find((o) => o.id === oppId);

  if (!cand) return <div className="page"><p>Profile not found.</p><Link to="/employer">Back</Link></div>;
  const m = opp ? matchCandidate(toCriteria(opp), cand) : null;
  const canManage = !!opp;
  const slEntry = opp ? shortlistEntry(opp.id, cand.id) : undefined;
  const sl = !!slEntry;
  const interest = opp ? interestFor(opp.id, cand.id) : undefined;

  const toggle = async () => {
    if (!opp) return;
    setBusy(true);
    try {
      if (sl) await store.removeFromShortlist(opp.id, cand.id);
      else await store.addToShortlist(opp.id, cand.id, opp.employerId);
      toast(sl ? 'Removed from shortlist' : `${cand.name} added to shortlist`);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <button className="back" onClick={() => (opp ? nav(`/employer/opportunities/${opp.id}`) : nav(-1))}>
        <ArrowLeft size={15} /> {opp ? `Back to ${opp.title}` : 'Back'}
      </button>

      <article className="profile-card">
        <header className="pc-head">
          <Avatar name={cand.name} size={72} />
          <div className="pc-id">
            <h1>{cand.name}</h1>
            <p>{cand.headline}</p>
            <p>{cand.location}{cand.willingToRelocate ? ' · willing to relocate' : ''}</p>
            {cand.sample && <span className="badge">Fictional sample profile</span>}
          </div>
          {canManage && (
            <div className="pc-actions">
              {sl && interest && (
                <button className="btn btn-dark" onClick={() => setInviting(true)}>
                  {slEntry?.invitedAt ? <><CalendarCheck size={16} /> Invited · send again</> : <><Mail size={16} /> Invite to interview</>}
                </button>
              )}
              <button
                className={`btn ${sl ? 'btn-light' : 'btn-dark'}`}
                onClick={toggle}
                disabled={busy || (!sl && !!m && !m.eligible)}
                title={!sl && m && !m.eligible ? 'This profile does not meet the must-haves for this opportunity' : undefined}
              >
                {sl ? <><BookmarkCheck size={16} /> Shortlisted</> : <><BookmarkPlus size={16} /> Add to shortlist</>}
              </button>
            </div>
          )}
        </header>

        {myOpps.length > 0 && (
          <label className="compare">
            <span className="muted small">Compare against</span>
            <select value={opp?.id ?? ''} onChange={(e) => nav(`/employer/candidates/${cand.id}?opp=${e.target.value}`, { replace: true })}>
              {myOpps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
        )}

        {m && (
          <>
            <div className="pc-score">
              <div className="pc-score-top">
                <span>Overall score</span>
                <TierBadge tier={m.tier} />
                <b style={{ marginLeft: 'auto' }} className={m.eligible ? 'txt-green' : 'muted'}>{m.score}%</b>
              </div>
              <ScoreBar score={m.score} eligible={m.eligible} />
              <p className="why-summary">{m.summary}</p>
            </div>
            <div className="sub-scores">
              {SUB.map((s) => {
                const c = m.criteria.find((x) => x.key === s.key);
                if (!c) return null;
                return (
                  <div className="sub" key={s.key}>
                    <span>{s.label}</span>
                    <ScoreRing score={Math.round((c.points / c.weight) * 100)} size={22} color={s.color} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="tiles">
          <IconTile icon={<MapPin size={18} />} label="Location" value={cand.location} />
          <IconTile icon={<UserRound size={18} />} label="Experience" value={`${cand.experienceYears} year${cand.experienceYears === 1 ? '' : 's'}`} />
          <IconTile icon={<Clock size={18} />} label="Availability" value={cand.availability.map((a) => AVAILABILITY_LABELS[a]).join(', ')} />
          <IconTile icon={<Mail size={18} />} label="Email" value={cand.email || '—'} />
          {cand.phone && <IconTile icon={<Phone size={18} />} label="Phone" value={cand.phone} />}
          {opp && (
            <IconTile
              icon={<Heart size={18} />}
              label="Interest in this opportunity"
              value={interest ? <span className="txt-green">Interested · {timeAgo(interest.createdAt)}</span> : 'Not yet expressed'}
            />
          )}
        </div>

        {interest?.message && (
          <blockquote className="interest-msg"><Heart size={13} /> &ldquo;{interest.message}&rdquo;</blockquote>
        )}

        <section className="pc-section">
          <h3>Skills</h3>
          <SkillChips skills={cand.skills} matched={m?.matchedSkills.concat(m.matchedNice) ?? []} />
          {m && m.missingSkills.length > 0 && (
            <p className="small muted">Missing for this role: {m.missingSkills.join(', ')}</p>
          )}
        </section>

        <section className="pc-section">
          <h3>Experience</h3>
          <p>{cand.experienceSummary}</p>
        </section>

        {m && (
          <section className="pc-section">
            <h3>Why this score</h3>
            <Explanation criteria={m.criteria} />
          </section>
        )}
        <Disclaimer compact />
      </article>
      {inviting && opp && <InviteDialog opp={opp} candidate={cand} onClose={() => setInviting(false)} />}
    </div>
  );
}
