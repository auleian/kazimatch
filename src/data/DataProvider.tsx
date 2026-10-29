import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_SNAPSHOT, type DataSnapshot, type DataStore } from './store';
import { createLocalStore } from './localStore';
import { createFirestoreStore } from './firestoreStore';
import { db, firebaseEnabled } from './firebase';
import { useAuth } from '../auth/AuthProvider';
import { staleEntries, staleForCandidate, type MatchCriteria } from '../lib/matching';
import { pairId, type CandidateProfile, type PublicProfile, type ShortlistEntry } from '../lib/types';

export type View = 'employer' | 'candidate';

interface DataCtx extends DataSnapshot {
  store: DataStore;
  error: string | null;
  /** Candidate profile the user is currently acting as in the candidate view. */
  actingCandidate: CandidateProfile | null;
  actingCandidateId: string | null;
  setActingCandidateId(id: string | null): void;
  /** Profiles this user may act as: their own + shared fictional samples. */
  personas: CandidateProfile[];
  myProfile: CandidateProfile | null;
  isShortlisted(oppId: string, candId: string): boolean;
  shortlistEntry(oppId: string, candId: string): ShortlistEntry | undefined;
  /**
   * Removes shortlist & interest entries for candidates who don't meet `criteria`.
   * Call after an opportunity's requirements change. Returns how many were removed.
   */
  pruneIneligible(oppId: string, criteria: MatchCriteria): Promise<{ shortlists: number; interests: number }>;
  /** Same, from the candidate's side: call after a profile changes. */
  pruneCandidate(candidate: CandidateProfile): Promise<{ shortlists: number; interests: number }>;
  interestFor(oppId: string, candId: string): DataSnapshot['interests'][number] | undefined;
  /** The role chosen at sign-in. Fixed for the session; signing out clears it. */
  view: View | null;
  setView(v: View): void;
  clearView(): void;
}

const Ctx = createContext<DataCtx | null>(null);

const store: DataStore = firebaseEnabled && db ? createFirestoreStore(db) : createLocalStore();

/** Live list of real candidates' public profiles. Doesn't need a signed-in user. */
export function usePublicProfiles(): PublicProfile[] {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  useEffect(() => store.subscribePublicProfiles(setProfiles), []);
  return profiles;
}

const PENDING_ROLE_KEY = 'kazimatch:pending-role';
/** Remember the role picked on the sign-in card so it applies once the user is signed in. */
export function setPendingRole(v: View) {
  lsSet(PENDING_ROLE_KEY, v);
}

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [snap, setSnap] = useState<DataSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [view, setViewState] = useState<View | null>(null);

  useEffect(() => {
    if (!user) {
      setSnap(EMPTY_SNAPSHOT);
      return;
    }
    setError(null);
    setActingId(lsGet(`kazimatch:acting:${user.uid}`));
    const pending = lsGet(PENDING_ROLE_KEY) as View | null;
    if (pending) {
      lsSet(`kazimatch:view:${user.uid}`, pending);
      lsSet(PENDING_ROLE_KEY, null);
    }
    setViewState((lsGet(`kazimatch:view:${user.uid}`) as View | null) ?? null);
    return store.subscribe(setSnap, (e) => setError(e.message));
  }, [user]);

  // Keep the public directory in step with the signed-in user's own profile (also backfills
  // profiles saved before the directory existed).
  const own = user ? snap.candidates.find((c) => c.id === user.uid) : undefined;
  useEffect(() => {
    if (own && !own.sample) store.publishProfile(own).catch(() => undefined);
  }, [own?.id, own?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActingCandidateId = useCallback(
    (id: string | null) => {
      setActingId(id);
      if (user) lsSet(`kazimatch:acting:${user.uid}`, id);
    },
    [user],
  );
  const setView = useCallback(
    (v: View) => {
      setViewState(v);
      if (user) lsSet(`kazimatch:view:${user.uid}`, v);
    },
    [user],
  );
  const clearView = useCallback(() => {
    setViewState(null);
    if (user) lsSet(`kazimatch:view:${user.uid}`, null);
  }, [user]);

  const value = useMemo<DataCtx>(() => {
    const myProfile = user ? snap.candidates.find((c) => c.id === user.uid) ?? null : null;
    const personas = [
      ...(myProfile ? [myProfile] : []),
      ...snap.candidates.filter((c) => c.sample || (user && c.ownerId === user.uid && c.id !== user.uid)),
    ];
    const actingId2 = actingId && personas.some((p) => p.id === actingId) ? actingId : myProfile?.id ?? null;
    const actingCandidate = personas.find((p) => p.id === actingId2) ?? null;
    const sl = new Map(snap.shortlists.map((s) => [s.id, s]));
    const ints = new Map(snap.interests.map((i) => [i.id, i]));
    return {
      ...snap,
      store,
      error,
      actingCandidate,
      actingCandidateId: actingId2,
      setActingCandidateId,
      personas,
      myProfile,
      isShortlisted: (o, c) => sl.has(pairId(o, c)),
      shortlistEntry: (o, c) => sl.get(pairId(o, c)),
      pruneIneligible: async (oppId, criteria) => {
        const stale = staleEntries(oppId, criteria, snap.candidates, snap.shortlists, snap.interests);
        if (stale.shortlists.length || stale.interests.length) await store.removeEntries(oppId, stale.shortlists, stale.interests);
        return { shortlists: stale.shortlists.length, interests: stale.interests.length };
      },
      pruneCandidate: async (candidate) => {
        const stale = staleForCandidate(candidate, snap.opportunities, snap.shortlists, snap.interests);
        await Promise.all(stale.map((r) => store.removeEntries(r.opportunityId, r.shortlists, r.interests)));
        return {
          shortlists: stale.reduce((n, r) => n + r.shortlists.length, 0),
          interests: stale.reduce((n, r) => n + r.interests.length, 0),
        };
      },
      interestFor: (o, c) => ints.get(pairId(o, c)),
      view,
      setView,
      clearView,
    };
  }, [snap, error, actingId, user, setActingCandidateId, view, setView, clearView]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData outside DataProvider');
  return c;
}
