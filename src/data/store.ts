import type {
  CandidateInput,
  CandidateProfile,
  InterestEntry,
  Opportunity,
  OpportunityInput,
  PublicProfile,
  ShortlistEntry,
} from '../lib/types';

export interface DataSnapshot {
  ready: boolean;
  candidates: CandidateProfile[];
  opportunities: Opportunity[];
  shortlists: ShortlistEntry[];
  interests: InterestEntry[];
}

export const EMPTY_SNAPSHOT: DataSnapshot = { ready: false, candidates: [], opportunities: [], shortlists: [], interests: [] };

export interface DataStore {
  mode: 'firebase' | 'local';
  subscribe(cb: (s: DataSnapshot) => void, onError?: (e: Error) => void): () => void;
  /** Real (non-sample) profiles without contact details. Works while signed out. */
  subscribePublicProfiles(cb: (profiles: PublicProfile[]) => void): () => void;
  /** Mirrors a user's own profile into the public directory. */
  publishProfile(profile: CandidateProfile): Promise<void>;
  /** id = null creates a new doc. For a user's own profile pass their uid. */
  saveCandidate(id: string | null, data: CandidateInput): Promise<string>;
  saveOpportunity(id: string | null, data: OpportunityInput): Promise<string>;
  updateOpportunity(id: string, patch: Partial<OpportunityInput>): Promise<void>;
  deleteOpportunity(id: string): Promise<void>;
  addToShortlist(opportunityId: string, candidateId: string, employerId: string): Promise<void>;
  removeFromShortlist(opportunityId: string, candidateId: string): Promise<void>;
  /** Removes the given candidates' shortlist and interest entries for one opportunity. */
  removeEntries(opportunityId: string, shortlistCandidateIds: string[], interestCandidateIds: string[]): Promise<void>;
  /** Records that an interview invitation was sent to a shortlisted candidate. */
  markInvited(opportunityId: string, candidateId: string): Promise<void>;
  expressInterest(opportunityId: string, candidateId: string, candidateOwnerId: string, message: string): Promise<void>;
  withdrawInterest(opportunityId: string, candidateId: string): Promise<void>;
  /** Loads fictional sample candidates & opportunities. Returns how many docs were added. */
  seedSamples(uid: string): Promise<number>;
  resetLocal?(): void;
}
