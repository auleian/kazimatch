import type { DataSnapshot, DataStore } from './store';
import { pairId, toPublicProfile, type CandidateProfile, type Opportunity, type PublicProfile } from '../lib/types';
import { SAMPLE_CANDIDATES, SAMPLE_OPPORTUNITIES } from './seed';

/**
 * Local demo store: everything lives in this browser's localStorage and is
 * synced across tabs. Used automatically when Firebase isn't configured.
 */
const KEY = 'kazimatch:data:v1';

type Data = Omit<DataSnapshot, 'ready'>;

function read(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { candidates: [], opportunities: [], shortlists: [], interests: [] };
}

function write(d: Data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore quota / private mode */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function createLocalStore(): DataStore {
  let data = read();
  const listeners = new Set<(s: DataSnapshot) => void>();
  const publicListeners = new Set<(p: PublicProfile[]) => void>();
  const publicProfiles = () => data.candidates.filter((c) => !c.sample).map(toPublicProfile);
  const emit = () => {
    listeners.forEach((l) => l({ ready: true, ...data }));
    publicListeners.forEach((l) => l(publicProfiles()));
  };
  const commit = (fn: (d: Data) => void) => {
    data = read();
    fn(data);
    write(data);
    emit();
  };
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      data = read();
      emit();
    }
  });

  return {
    mode: 'local',
    subscribe(cb) {
      listeners.add(cb);
      cb({ ready: true, ...data });
      return () => listeners.delete(cb);
    },
    subscribePublicProfiles(cb) {
      publicListeners.add(cb);
      cb(publicProfiles());
      return () => publicListeners.delete(cb);
    },
    async publishProfile() {
      /* local profiles are already visible to this browser */
    },
    async saveCandidate(id, input) {
      const now = Date.now();
      const newId = id ?? `cand-${uid()}`;
      commit((d) => {
        const existing = d.candidates.find((c) => c.id === newId);
        const doc: CandidateProfile = { ...input, id: newId, createdAt: existing?.createdAt ?? now, updatedAt: now };
        d.candidates = existing ? d.candidates.map((c) => (c.id === newId ? doc : c)) : [...d.candidates, doc];
      });
      return newId;
    },
    async saveOpportunity(id, input) {
      const now = Date.now();
      const newId = id ?? `opp-${uid()}`;
      commit((d) => {
        const existing = d.opportunities.find((o) => o.id === newId);
        const doc: Opportunity = { ...input, id: newId, createdAt: existing?.createdAt ?? now, updatedAt: now };
        d.opportunities = existing ? d.opportunities.map((o) => (o.id === newId ? doc : o)) : [...d.opportunities, doc];
      });
      return newId;
    },
    async updateOpportunity(id, patch) {
      commit((d) => {
        d.opportunities = d.opportunities.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o));
      });
    },
    async deleteOpportunity(id) {
      commit((d) => {
        d.opportunities = d.opportunities.filter((o) => o.id !== id);
        d.shortlists = d.shortlists.filter((s) => s.opportunityId !== id);
        d.interests = d.interests.filter((s) => s.opportunityId !== id);
      });
    },
    async addToShortlist(opportunityId, candidateId, employerId) {
      const id = pairId(opportunityId, candidateId);
      commit((d) => {
        if (!d.shortlists.some((s) => s.id === id))
          d.shortlists.push({ id, opportunityId, candidateId, employerId, createdAt: Date.now() });
      });
    },
    async removeFromShortlist(opportunityId, candidateId) {
      const id = pairId(opportunityId, candidateId);
      commit((d) => {
        d.shortlists = d.shortlists.filter((s) => s.id !== id);
      });
    },
    async removeEntries(opportunityId, shortlistIds, interestIds) {
      const sl = new Set(shortlistIds.map((c) => pairId(opportunityId, c)));
      const ints = new Set(interestIds.map((c) => pairId(opportunityId, c)));
      commit((d) => {
        d.shortlists = d.shortlists.filter((s) => !sl.has(s.id));
        d.interests = d.interests.filter((s) => !ints.has(s.id));
      });
    },
    async markInvited(opportunityId, candidateId) {
      const id = pairId(opportunityId, candidateId);
      commit((d) => {
        d.shortlists = d.shortlists.map((s) => (s.id === id ? { ...s, invitedAt: Date.now() } : s));
      });
    },
    async expressInterest(opportunityId, candidateId, candidateOwnerId, message) {
      const id = pairId(opportunityId, candidateId);
      commit((d) => {
        d.interests = d.interests.filter((s) => s.id !== id);
        d.interests.push({ id, opportunityId, candidateId, candidateOwnerId, message, createdAt: Date.now() });
      });
    },
    async withdrawInterest(opportunityId, candidateId) {
      const id = pairId(opportunityId, candidateId);
      commit((d) => {
        d.interests = d.interests.filter((s) => s.id !== id);
      });
    },
    async seedSamples(ownerUid) {
      let added = 0;
      const now = Date.now();
      commit((d) => {
        for (const c of SAMPLE_CANDIDATES) {
          if (d.candidates.some((x) => x.id === c.id)) continue;
          d.candidates.push({ ...c, ownerId: ownerUid, createdAt: now, updatedAt: now });
          added++;
        }
        for (const o of SAMPLE_OPPORTUNITIES) {
          if (d.opportunities.some((x) => x.id === o.id)) continue;
          d.opportunities.push({ ...o, employerId: ownerUid, createdAt: now, updatedAt: now });
          added++;
        }
      });
      return added;
    },
    resetLocal() {
      data = { candidates: [], opportunities: [], shortlists: [], interests: [] };
      write(data);
      emit();
    },
  };
}
