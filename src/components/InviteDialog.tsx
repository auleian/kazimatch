import { useEffect, useRef, useState } from 'react';
import { Copy, Mail, X } from 'lucide-react';
import type { CandidateProfile, Opportunity } from '../lib/types';
import { useData } from '../data/DataProvider';
import { Field, useToast } from './ui';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function draft(opp: Opportunity, cand: CandidateProfile, when: string, where: string) {
  const time = when
    ? new Date(when).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
    : '[suggest a date and time]';
  return [
    `Hi ${firstName(cand.name)},`,
    '',
    `Thank you for your interest in the ${opp.title} ${opp.type} at ${opp.employerName}. We liked your profile and would like to invite you to an interview.`,
    '',
    `When: ${time}`,
    `Where: ${where.trim() || '[office address or video call link]'}`,
    '',
    'Please reply to this email to confirm, or suggest another time that suits you.',
    '',
    'Best regards,',
    opp.employerName,
  ].join('\n');
}

/**
 * Composes an interview invitation for a shortlisted, interested candidate and
 * hands it to the employer's own email app (mailto:), so no mail server is needed.
 */
export function InviteDialog({ opp, candidate, onClose }: { opp: Opportunity; candidate: CandidateProfile; onClose(): void }) {
  const { store } = useData();
  const toast = useToast();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState(opp.workMode === 'remote' ? '' : opp.location);
  const [subject, setSubject] = useState(`Interview invitation: ${opp.title}`);
  const [body, setBody] = useState(() => draft(opp, candidate, '', where));
  // Keep the message in sync with the date/place fields until the employer edits it by hand.
  const [edited, setEdited] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!edited) setBody(draft(opp, candidate, when, where));
  }, [when, where, edited, opp, candidate]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const email = candidate.email?.trim();
  const href = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : undefined;

  const markSent = async () => {
    try {
      await store.markInvited(opp.id, candidate.id);
      toast(`Invitation opened in your email app for ${candidate.name}`);
      onClose();
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast('Invitation copied');
    } catch {
      toast('Could not copy — select the text and copy it manually', 'err');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-strong" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="modal-head">
          <h2 id="invite-title">Invite {candidate.name} to an interview</h2>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {email ? (
          <p className="muted small">To: <b>{email}</b>{candidate.sample ? ' (fictional sample address)' : ''}</p>
        ) : (
          <div className="note">This profile has no email address, so the invitation can&rsquo;t be emailed. Copy it and send it another way.</div>
        )}

        <div className="grid-2">
          <Field label="Proposed date & time">
            <input ref={first} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Where">
            <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Address or video call link" />
          </Field>
        </div>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea rows={10} value={body} onChange={(e) => { setBody(e.target.value); setEdited(true); }} />
        </Field>

        <div className="modal-foot">
          <button className="btn btn-light" onClick={copy}><Copy size={15} /> Copy</button>
          {href && (
            <a className="btn btn-dark" href={href} onClick={markSent}><Mail size={15} /> Open in email app</a>
          )}
        </div>
      </div>
    </div>
  );
}
