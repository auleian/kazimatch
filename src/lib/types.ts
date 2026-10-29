export type Availability = 'full-time' | 'part-time' | 'gig' | 'weekends';
export type WorkMode = 'on-site' | 'hybrid' | 'remote';
export type OpportunityType = 'job' | 'gig';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  gig: 'Short-term gig / project',
  weekends: 'Weekends only',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  'on-site': 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export interface CandidateProfile {
  id: string;
  ownerId: string;
  /** Sample (fictional) personas can be used by anyone for demos. */
  sample?: boolean;
  name: string;
  headline: string;
  email?: string;
  phone?: string;
  /** Optional link to past work (Behance, GitHub, a website, a Drive folder…). */
  portfolioUrl?: string;
  location: string;
  willingToRelocate: boolean;
  skills: string[];
  experienceYears: number;
  experienceSummary: string;
  availability: Availability[];
  createdAt: number;
  updatedAt: number;
}

/** What anyone (signed out included) may see about a candidate: no email or phone. */
export type PublicProfile = Pick<
  CandidateProfile,
  'id' | 'ownerId' | 'name' | 'headline' | 'portfolioUrl' | 'location' | 'willingToRelocate' | 'skills' | 'experienceYears' | 'experienceSummary' | 'availability' | 'updatedAt'
>;

export function toPublicProfile(c: CandidateProfile): PublicProfile {
  const { id, ownerId, name, headline, portfolioUrl, location, willingToRelocate, skills, experienceYears, experienceSummary, availability, updatedAt } = c;
  return { id, ownerId, name, headline, portfolioUrl, location, willingToRelocate, skills, experienceYears, experienceSummary, availability, updatedAt };
}

export interface Opportunity {
  id: string;
  employerId: string;
  employerName: string;
  sample?: boolean;
  type: OpportunityType;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  location: string;
  workMode: WorkMode;
  availability: Availability;
  minExperienceYears: number;
  pay?: string;
  status: 'open' | 'closed';
  createdAt: number;
  updatedAt: number;
}

export interface ShortlistEntry {
  id: string; // `${opportunityId}__${candidateId}`
  opportunityId: string;
  candidateId: string;
  employerId: string;
  note?: string;
  /** Set when the employer sends an interview invitation by email. */
  invitedAt?: number;
  createdAt: number;
}

export interface InterestEntry {
  id: string; // `${opportunityId}__${candidateId}`
  opportunityId: string;
  candidateId: string;
  candidateOwnerId: string;
  message?: string;
  createdAt: number;
}

export type CandidateInput = Omit<CandidateProfile, 'id' | 'createdAt' | 'updatedAt'>;
export type OpportunityInput = Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>;

export const pairId = (opportunityId: string, candidateId: string) => `${opportunityId}__${candidateId}`;
