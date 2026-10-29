import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookmarkCheck, BookmarkPlus, CalendarCheck, ChevronDown, FolderOpen, Heart, Mail } from 'lucide-react';
import type { MatchResult } from '../lib/matching';
import { AVAILABILITY_LABELS } from '../lib/types';
import { safeUrl } from '../lib/validation';
import { useData } from '../data/DataProvider';
import { Avatar, Explanation, ScoreRing, TierBadge, timeAgo, useToast } from './ui';
import { InviteDialog } from './InviteDialog';

interface Props {
  results: MatchResult[];
  opportunityId?: string;
  employerId?: string;
  canShortlist?: boolean;
  /** Show the "interest" column (shortlist tab). */
  showInterest?: boolean;
  defaultOpen?: string | null;
}

export function CandidateTable({ results, opportunityId, employerId, canShortlist = false, showInterest = false, defaultOpen = null }: Props) {
  const { store, opportunities, shortlistEntry, interestFor } = useData();
  const opp = opportunityId ? opportunities.find((o) => o.id === opportunityId) : undefined;
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(defaultOpen);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviting, setInviting] = useState<MatchResult['candidate'] | null>(null);

  const toggle = async (r: MatchResult) => {
    if (!opportunityId || !employerId) return;
    const id = r.candidate.id;
    setBusy(id);
    try {
      if (shortlistEntry(opportunityId, id)) {
        await store.removeFromShortlist(opportunityId, id);
        toast(`Removed ${r.candidate.name} from shortlist`);
      } else {
        await store.addToShortlist(opportunityId, id, employerId);
        toast(`Added ${r.candidate.name} to shortlist`);
      }
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="table-wrap">
      <table className="ctable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Match score</th>
            <th className="hide-sm">Location</th>
            <th className="hide-sm">Availability</th>
            {showInterest ? <th>Interest</th> : <th className="hide-md">Why</th>}
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const c = r.candidate;
            const slEntry = opportunityId ? shortlistEntry(opportunityId, c.id) : undefined;
            const sl = !!slEntry;
            const interest = opportunityId ? interestFor(opportunityId, c.id) : undefined;
            const isOpen = open === c.id;
            const portfolio = safeUrl(c.portfolioUrl);
            return (
              <Fragment key={c.id}>
                <tr className={`row ${isOpen ? 'open' : ''}`} onClick={() => setOpen(isOpen ? null : c.id)}>
                  <td>
                    <div className="who">
                      <Avatar name={c.name} size={36} />
                      <div>
                        <b>{c.name}</b>
                        <span>{c.headline}{c.sample ? ' · sample' : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="score-cell">
                      <ScoreRing score={r.score} eligible={r.eligible} />
                      <TierBadge tier={r.tier} />
                    </div>
                  </td>
                  <td className="hide-sm">{c.location}{c.willingToRelocate ? <span className="muted small"> · will relocate</span> : null}</td>
                  <td className="hide-sm small">{c.availability.map((a) => AVAILABILITY_LABELS[a].split(' ')[0]).join(', ')}</td>
                  {showInterest ? (
                    <td>
                      {slEntry?.invitedAt ? (
                        <span className="status status-yes"><CalendarCheck size={12} /> Invited · {timeAgo(slEntry.invitedAt)}</span>
                      ) : interest ? (
                        <span className="status status-yes"><Heart size={12} /> Interested · {timeAgo(interest.createdAt)}</span>
                      ) : (
                        <span className="status">Awaiting response</span>
                      )}
                    </td>
                  ) : (
                    <td className="hide-md why">
                      {r.matchedSkills.length + r.missingSkills.length > 0
                        ? `${r.matchedSkills.length}/${r.matchedSkills.length + r.missingSkills.length} skills`
                        : `${c.experienceYears} yrs exp.`}
                      {interest && <span className="status status-yes mini"><Heart size={11} /> Interested</span>}
                    </td>
                  )}
                  <td className="right" onClick={(e) => e.stopPropagation()}>
                    <div className="actions">
                      {portfolio && (
                        <a className="icon-btn" href={portfolio} target="_blank" rel="noopener noreferrer" title="Open portfolio" aria-label={`Open ${c.name}'s portfolio in a new tab`}>
                          <FolderOpen size={16} />
                        </a>
                      )}
                      <Link className="icon-btn" to={`/employer/candidates/${c.id}${opportunityId ? `?opp=${opportunityId}` : ''}`} title="View profile" aria-label={`View ${c.name}'s profile`}>
                        <ArrowUpRight size={16} />
                      </Link>
                      {canShortlist && sl && interest && opp && (
                        <button
                          className="icon-btn"
                          onClick={() => setInviting(c)}
                          title={slEntry?.invitedAt ? 'Invite to interview again' : 'Invite to interview'}
                          aria-label={`Invite ${c.name} to an interview`}
                        >
                          <Mail size={16} />
                        </button>
                      )}
                      {canShortlist && (
                        <button
                          className={`icon-btn ${sl ? 'dark' : ''}`}
                          onClick={() => toggle(r)}
                          disabled={busy === c.id}
                          title={sl ? 'Remove from shortlist' : 'Add to shortlist'}
                          aria-label={sl ? `Remove ${c.name} from shortlist` : `Add ${c.name} to shortlist`}
                        >
                          {sl ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                        </button>
                      )}
                      <button className="icon-btn ghost" onClick={() => setOpen(isOpen ? null : c.id)} aria-label="Show why">
                        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                      </button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="row-detail">
                    <td colSpan={6}>
                      <div className="why-box">
                        <p className="why-summary">{r.summary}</p>
                        <Explanation criteria={r.criteria} />
                        {interest?.message && (
                          <blockquote className="interest-msg">
                            <Heart size={13} /> &ldquo;{interest.message}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {inviting && opp && <InviteDialog opp={opp} candidate={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}
