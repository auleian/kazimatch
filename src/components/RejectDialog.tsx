import { useEffect, useRef, useState } from 'react';
import { UserX, X } from 'lucide-react';
import type { CandidateProfile, Opportunity } from '../lib/types';
import { useAuth } from '../auth/AuthProvider';
import { useData } from '../data/DataProvider';
import { Field, useToast } from './ui';
import '../styles/employer.css';

const MAX = 500;

/** Confirms rejecting a candidate for one opportunity, with an optional reason the candidate can see. */
export function RejectDialog({ opp, candidate, onClose }: { opp: Opportunity; candidate: CandidateProfile; onClose(): void }) {
  const { store } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLTextAreaElement>(null);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const confirm = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await store.rejectCandidate(opp.id, candidate.id, candidate.ownerId, user.uid, reason.trim().slice(0, MAX));
      toast(`${candidate.name} rejected for ${opp.title}`);
      onClose();
    } catch (e) {
      toast((e as Error).message, 'err');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-strong reject-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title">
        <div className="modal-head">
          <h2 id="reject-title">Reject {candidate.name}?</h2>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="muted small">
          {candidate.name} will no longer be considered for <b>{opp.title}</b> and will be removed from your shortlist. You can undo this later.
        </p>
        <Field label="Reason (optional, shared with the candidate)" hint={`${reason.length}/${MAX}`}>
          <textarea
            ref={first}
            rows={4}
            maxLength={MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            placeholder="For example: we went with someone with more design experience."
          />
        </Field>
        <div className="modal-foot">
          <button className="btn btn-light" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn reject-btn" onClick={confirm} disabled={busy || !user}>
            <UserX size={15} /> {busy ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
