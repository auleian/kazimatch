import { describe, expect, it } from 'vitest';
import { matchCandidate, rankCandidates, staleEntries, staleForCandidate, suggestRelaxations, unheldSkills, type MatchCriteria } from './matching';
import { parseTalentQuery } from './search';
import { validateCandidate, validateOpportunity } from './validation';
import { SAMPLE_CANDIDATES } from '../data/seed';
import { pairId, type CandidateProfile, type InterestEntry, type ShortlistEntry } from './types';

const pool: CandidateProfile[] = SAMPLE_CANDIDATES.map((c) => ({ ...c, ownerId: 'u1', createdAt: 0, updatedAt: 0 }));
const amara = pool.find((c) => c.name.startsWith('Amara'))!;
const brian = pool.find((c) => c.name.startsWith('Brian'))!;

const gig: MatchCriteria = {
  type: 'gig',
  requiredSkills: ['React', 'TypeScript', 'Firebase'],
  niceToHaveSkills: ['Figma'],
  location: 'Kampala',
  workMode: 'hybrid',
  availability: 'gig',
  minExperienceYears: 2,
};

describe('matchCandidate', () => {
  it('gives a full match 100 and explains it', () => {
    const m = matchCandidate(gig, amara);
    expect(m.eligible).toBe(true);
    expect(m.score).toBe(100);
    expect(m.tier).toBe('strong');
    expect(m.matchedSkills).toEqual(['React', 'TypeScript', 'Firebase']);
    expect(m.summary).toContain('Amara has 3 of 3 required skills');
    expect(m.criteria.find((c) => c.key === 'availability')!.text).toContain('fits');
  });

  it('treats skill aliases as the same skill', () => {
    const m = matchCandidate({ ...gig, requiredSkills: ['reactjs', 'TS'] }, amara);
    expect(m.matchedSkills.length).toBe(2);
  });

  it('gives partial location credit to someone willing to relocate', () => {
    const m = matchCandidate(gig, brian);
    expect(m.eligible).toBe(true);
    expect(m.missingSkills).toEqual(['TypeScript']);
    expect(m.criteria.find((c) => c.key === 'location')!.fit).toBe('partial');
    expect(m.score).toBeLessThan(100);
  });

  it('excludes when availability does not fit', () => {
    const m = matchCandidate({ ...gig, availability: 'full-time' }, amara);
    expect(m.eligible).toBe(false);
    expect(m.blockers.join()).toContain('availability');
  });

  it('excludes when fewer than half the required skills match', () => {
    const m = matchCandidate({ ...gig, requiredSkills: ['React', 'Kubernetes', 'Go'] }, amara);
    expect(m.eligible).toBe(false);
  });
});

describe('empty state helpers', () => {
  const impossible: MatchCriteria = { ...gig, requiredSkills: ['React', 'Kubernetes'], workMode: 'on-site', availability: 'weekends' };
  it('returns no matches and finds a relaxation that helps', () => {
    expect(rankCandidates(impossible, pool).filter((r) => r.eligible)).toHaveLength(0);
    const s = suggestRelaxations(impossible, pool);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].newMatches).toBeGreaterThan(0);
    expect(unheldSkills(impossible, pool)).toEqual(['Kubernetes']);
  });
});

describe('parseTalentQuery', () => {
  it('pulls skills, town and availability from a sentence', () => {
    const p = parseTalentQuery('Find me a React developer in Kampala, part-time', pool.flatMap((c) => c.skills));
    expect(p.skills).toContain('React');
    expect(p.location).toBe('Kampala');
    expect(p.availability).toBe('part-time');
  });
});

describe('validation', () => {
  it('flags missing required fields', () => {
    const e = validateCandidate({ name: '', skills: [], availability: [] });
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['name', 'skills', 'availability', 'location', 'headline']));
    const o = validateOpportunity({ title: '', requiredSkills: [] });
    expect(Object.keys(o)).toEqual(expect.arrayContaining(['title', 'requiredSkills', 'description', 'location']));
  });
});

describe('combined relaxations', () => {
  it('suggests a pair of changes when no single change helps', () => {
    const opp: MatchCriteria = { ...gig, requiredSkills: ['React', 'TypeScript', 'Kubernetes', 'Go', 'Rust'], availability: 'weekends' };
    expect(rankCandidates(opp, pool).filter((r) => r.eligible)).toHaveLength(0);
    const s = suggestRelaxations(opp, pool);
    expect(s.length).toBeGreaterThan(0);
    const after = rankCandidates({ ...opp, ...s[0].patch }, pool).filter((r) => r.eligible);
    expect(after.length).toBe(s[0].newMatches);
  });
});

describe('staleEntries', () => {
  const sl = (opp: string, c: CandidateProfile): ShortlistEntry => ({ id: pairId(opp, c.id), opportunityId: opp, candidateId: c.id, employerId: 'e1', createdAt: 0 });
  const int = (opp: string, c: CandidateProfile): InterestEntry => ({ id: pairId(opp, c.id), opportunityId: opp, candidateId: c.id, candidateOwnerId: 'u1', createdAt: 0 });

  it('keeps everyone when requirements still fit', () => {
    expect(staleEntries('o1', gig, pool, [sl('o1', amara)], [int('o1', amara)])).toEqual({ shortlists: [], interests: [] });
  });

  it('flags shortlisted and interested candidates who no longer meet the must-haves', () => {
    const tightened: MatchCriteria = { ...gig, requiredSkills: ['Kubernetes', 'Go', 'Rust'] };
    const r = staleEntries('o1', tightened, pool, [sl('o1', amara), sl('o2', brian)], [int('o1', amara)]);
    expect(r).toEqual({ shortlists: [amara.id], interests: [amara.id] });
  });

  it('ignores other opportunities and deleted profiles', () => {
    const tightened: MatchCriteria = { ...gig, requiredSkills: ['Kubernetes'] };
    const ghost = { ...amara, id: 'gone' };
    expect(staleEntries('o1', tightened, pool, [sl('o2', amara), sl('o1', ghost)], [])).toEqual({ shortlists: [], interests: [] });
  });
});

describe('staleForCandidate', () => {
  const opp = (id: string, c: MatchCriteria) => ({ ...c, id, employerId: 'e1', employerName: 'Demo', title: id, description: '', pay: '', status: 'open' as const, createdAt: 0, updatedAt: 0, availability: c.availability! });
  const entry = (o: string, c: CandidateProfile) => ({ id: pairId(o, c.id), opportunityId: o, candidateId: c.id, employerId: 'e1', candidateOwnerId: 'u1', createdAt: 0 });

  it('flags only the opportunities a profile edit disqualifies them from', () => {
    const opps = [opp('react-gig', gig), opp('any-gig', { ...gig, requiredSkills: ['Communication'], location: '', workMode: 'remote' })];
    const edited = { ...amara, skills: ['Communication'] };
    const r = staleForCandidate(edited, opps, [entry('react-gig', amara), entry('any-gig', amara)], [entry('react-gig', amara)]);
    expect(r).toEqual([{ opportunityId: 'react-gig', shortlists: [amara.id], interests: [amara.id] }]);
  });
});
