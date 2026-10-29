import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { DataSnapshot, DataStore } from './store';
import { pairId, toPublicProfile, type CandidateProfile, type InterestEntry, type Opportunity, type PublicProfile, type ShortlistEntry } from '../lib/types';
import { SAMPLE_CANDIDATES, SAMPLE_OPPORTUNITIES } from './seed';

/**
 * Firestore collections:
 *   candidates/{uid | sample-id}
 *   opportunities/{autoId | sample-id}
 *   shortlists/{opportunityId__candidateId}
 *   interests/{opportunityId__candidateId}
 *   publicProfiles/{uid}  (contact-free copy of a real user's profile, readable by anyone)
 * Every client listens to the four collections in real time, so an employer
 * sees a candidate's expression of interest appear instantly.
 */
export function createFirestoreStore(db: Firestore): DataStore {
  const clean = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  const publish = (p: CandidateProfile) => setDoc(doc(db, 'publicProfiles', p.id), clean(toPublicProfile(p)));

  return {
    mode: 'firebase',
    subscribePublicProfiles(cb) {
      return onSnapshot(
        collection(db, 'publicProfiles'),
        (s) => cb(s.docs.map((d) => ({ ...(d.data() as PublicProfile), id: d.id }))),
        () => cb([]),
      );
    },
    async publishProfile(profile) {
      await publish(profile);
    },
    subscribe(cb, onError) {
      const state: DataSnapshot = { ready: false, candidates: [], opportunities: [], shortlists: [], interests: [] };
      const loaded = new Set<string>();
      const fire = (name: string) => {
        loaded.add(name);
        state.ready = loaded.size === 4;
        cb({ ...state });
      };
      const err = (e: Error) => onError?.(e);
      const unsubs = [
        onSnapshot(collection(db, 'candidates'), (s) => {
          state.candidates = s.docs.map((d) => ({ ...(d.data() as CandidateProfile), id: d.id }));
          fire('candidates');
        }, err),
        onSnapshot(collection(db, 'opportunities'), (s) => {
          state.opportunities = s.docs.map((d) => ({ ...(d.data() as Opportunity), id: d.id }));
          fire('opportunities');
        }, err),
        onSnapshot(collection(db, 'shortlists'), (s) => {
          state.shortlists = s.docs.map((d) => ({ ...(d.data() as ShortlistEntry), id: d.id }));
          fire('shortlists');
        }, err),
        onSnapshot(collection(db, 'interests'), (s) => {
          state.interests = s.docs.map((d) => ({ ...(d.data() as InterestEntry), id: d.id }));
          fire('interests');
        }, err),
      ];
      return () => unsubs.forEach((u) => u());
    },
    async saveCandidate(id, input) {
      const ref = id ? doc(db, 'candidates', id) : doc(collection(db, 'candidates'));
      const snap = await getDoc(ref);
      const now = Date.now();
      const createdAt = snap.exists() ? snap.data().createdAt : now;
      await setDoc(ref, clean({ ...input, createdAt, updatedAt: now }));
      // Only a user's own profile (doc id = uid) may be published; the rules refuse anything else.
      if (!input.sample && ref.id === input.ownerId) {
        await publish({ ...input, id: ref.id, createdAt, updatedAt: now }).catch(() => undefined);
      }
      return ref.id;
    },
    async saveOpportunity(id, input) {
      const ref = id ? doc(db, 'opportunities', id) : doc(collection(db, 'opportunities'));
      const now = Date.now();
      let createdAt = now;
      if (id) {
        const snap = await getDoc(ref);
        if (snap.exists()) createdAt = snap.data().createdAt ?? now;
      }
      await setDoc(ref, clean({ ...input, createdAt, updatedAt: now }));
      return ref.id;
    },
    async updateOpportunity(id, patch) {
      await updateDoc(doc(db, 'opportunities', id), clean({ ...patch, updatedAt: Date.now() }));
    },
    async deleteOpportunity(id) {
      await deleteDoc(doc(db, 'opportunities', id));
    },
    async addToShortlist(opportunityId, candidateId, employerId) {
      await setDoc(doc(db, 'shortlists', pairId(opportunityId, candidateId)), {
        opportunityId, candidateId, employerId, createdAt: Date.now(),
      });
    },
    async removeFromShortlist(opportunityId, candidateId) {
      await deleteDoc(doc(db, 'shortlists', pairId(opportunityId, candidateId)));
    },
    async removeEntries(opportunityId, shortlistIds, interestIds) {
      // Separate deletes rather than one batch: each delete runs rule get()s, and a batch shares one small get() budget.
      await Promise.all([
        ...shortlistIds.map((c) => deleteDoc(doc(db, 'shortlists', pairId(opportunityId, c)))),
        ...interestIds.map((c) => deleteDoc(doc(db, 'interests', pairId(opportunityId, c)))),
      ]);
    },
    async markInvited(opportunityId, candidateId) {
      await updateDoc(doc(db, 'shortlists', pairId(opportunityId, candidateId)), { invitedAt: Date.now() });
    },
    async expressInterest(opportunityId, candidateId, candidateOwnerId, message) {
      await setDoc(doc(db, 'interests', pairId(opportunityId, candidateId)), {
        opportunityId, candidateId, candidateOwnerId, message: message || '', createdAt: Date.now(),
      });
    },
    async withdrawInterest(opportunityId, candidateId) {
      await deleteDoc(doc(db, 'interests', pairId(opportunityId, candidateId)));
    },
    async seedSamples(ownerUid) {
      const now = Date.now();
      const batch = writeBatch(db);
      let added = 0;
      for (const c of SAMPLE_CANDIDATES) {
        const ref = doc(db, 'candidates', c.id);
        if ((await getDoc(ref)).exists()) continue;
        const { id: _id, ...rest } = c;
        batch.set(ref, clean({ ...rest, ownerId: ownerUid, createdAt: now, updatedAt: now }));
        added++;
      }
      for (const o of SAMPLE_OPPORTUNITIES) {
        const ref = doc(db, 'opportunities', o.id);
        if ((await getDoc(ref)).exists()) continue;
        const { id: _id, ...rest } = o;
        batch.set(ref, clean({ ...rest, employerId: ownerUid, createdAt: now, updatedAt: now }));
        added++;
      }
      if (added) await batch.commit();
      return added;
    },
  };
}
