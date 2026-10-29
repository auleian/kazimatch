import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookmarkCheck, Briefcase, CalendarCheck, Clock, Heart, MapPin, Wallet } from 'lucide-react';
import { useData } from '../../data/DataProvider';
import { matchCandidate, toCriteria } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS } from '../../lib/types';
import { Disclaimer, Explanation, ScoreBar, SkillChips, TierBadge, timeAgo, useToast } from '../../components/ui';

export function OpportunityView() {
  const { id } = useParams();
  const { opportunities, actingCandidate: me, store, interestFor, shortlistEntry } = useData();
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const o = opportunities.find((x) => x.id === id);
  if (!o) return <div className="page"><p>Opportunity not found.</p><Link to="/candidate">Back</Link></div>;
  const m = me ? matchCandidate(toCriteria(o), me) : null;
  const interest = me ? interestFor(o.id, me.id) : undefined;
  const shortlist = me ? shortlistEntry(o.id, me.id) : undefined;

  const express = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await store.expressInterest(o.id, me.id, me.ownerId, msg.trim());
      toast('Interest sent. The employer can see it now');
      setMsg('');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await store.withdrawInterest(o.id, me.id);
      toast('Interest withdrawn');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <Link to="/candidate" className="back"><ArrowLeft size={15} /> Back to opportunities</Link>
      <article className="card glass-strong">
        <div className="opp-top">
          <span className={`badge type-${o.type}`}>{o.type === 'gig' ? 'Gig' : 'Job'}</span>
          {o.sample && <span className="badge">Sample · not a real vacancy</span>}
          {o.status === 'closed' && <span className="badge">Closed</span>}
        </div>
        <h1>{o.title}</h1>
        <p className="muted">{o.employerName}</p>
        <div className="facts">
          <span><MapPin size={14} /> {o.location} · {WORK_MODE_LABELS[o.workMode]}</span>
          <span><Clock size={14} /> {AVAILABILITY_LABELS[o.availability]}</span>
          <span><Briefcase size={14} /> {o.minExperienceYears ? `${o.minExperienceYears}+ yrs` : 'No minimum experience'}</span>
          {o.pay && <span><Wallet size={14} /> {o.pay}</span>}
        </div>
        <p className="desc">{o.description}</p>
        <div className="req-row"><span className="muted small">Required</span><SkillChips skills={o.requiredSkills} matched={m?.matchedSkills} missing={m?.missingSkills} /></div>
        {o.niceToHaveSkills.length > 0 && (
          <div className="req-row"><span className="muted small">Nice to have</span><SkillChips skills={o.niceToHaveSkills} matched={m?.matchedNice} /></div>
        )}
      </article>

      {m && me && (
        <section className="card glass-strong">
          <div className="pc-score-top">
            <h2>Your fit</h2>
            <TierBadge tier={m.tier} />
            <b style={{ marginLeft: 'auto' }}>{m.score}%</b>
          </div>
          <ScoreBar score={m.score} eligible={m.eligible} />
          <Explanation criteria={m.criteria} forCandidate />
          <Disclaimer compact />
        </section>
      )}

      {me ? (
        <section className="card glass-strong interest-box">
          {shortlist?.invitedAt ? (
            <div className="note ok"><CalendarCheck size={15} /> The employer invited you to an interview {timeAgo(shortlist.invitedAt)}. Check your email for the details.</div>
          ) : shortlist && (
            <div className="note ok"><BookmarkCheck size={15} /> The employer has added you to their shortlist.</div>
          )}
          {interest ? (
            <>
              <div className="interest-done">
                <span className="tile-icon green"><Heart size={18} /></span>
                <div>
                  <b>You expressed interest {timeAgo(interest.createdAt)}</b>
                  <p className="muted small">{interest.message ? `Your note: “${interest.message}”` : 'The employer can now see this on their shortlist.'}</p>
                </div>
              </div>
              <button className="btn btn-light" onClick={withdraw} disabled={busy}>Withdraw interest</button>
            </>
          ) : o.status === 'closed' ? (
            <p className="muted">This opportunity is closed.</p>
          ) : m && !m.eligible ? (
            <>
              <h3>You don&rsquo;t meet the must-haves for this {o.type} yet</h3>
              <p className="muted small">{m.summaryForCandidate} Update your profile if this has changed, and you&rsquo;ll be able to express interest.</p>
              <Link className="btn btn-light" to="/candidate/profile">Update profile</Link>
            </>
          ) : (
            <>
              <h3>Interested in this {o.type}?</h3>
              <p className="muted small">Acting as <b>{me.name}</b>. The employer will see your profile and this note.</p>
              <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Optional note, e.g. “I can start Monday and have built two similar dashboards.”" maxLength={400} />
              <button className="btn btn-dark" onClick={express} disabled={busy}>
                <Heart size={16} /> {busy ? 'Sending…' : 'I’m interested'}
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="card glass">
          <p>Create a profile to express interest. <Link to="/candidate/profile?mine=1">Create profile</Link></p>
        </section>
      )}
    </div>
  );
}
