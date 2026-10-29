/**
 * KaziMatch matching rules — deliberately simple and explainable.
 *
 * Every candidate is checked against an opportunity on five criteria. Each
 * criterion earns points out of a fixed weight; the score is the share of
 * available points earned (0–100). Three criteria are "must-haves" that decide
 * whether a candidate is listed as a match at all.
 *
 *   Criterion          Weight  Must-have rule
 *   Required skills      50    has at least half of the required skills
 *   Availability         20    is open to the opportunity's availability type
 *   Location             15    same town, remote role, or willing to relocate
 *   Experience           10    (never blocks; 1 year short = half points)
 *   Nice-to-have skills   5    (never blocks; only counted when the employer lists some)
 *
 * Scores support human review. They are not a judgement of a person's ability.
 */
import {
  AVAILABILITY_LABELS,
  type Availability,
  type CandidateProfile,
  type InterestEntry,
  type Opportunity,
  type ShortlistEntry,
  type WorkMode,
} from './types';
import { locationKey, skillKey, skillLabel } from './skills';

export const WEIGHTS = {
  skills: 50,
  availability: 20,
  location: 15,
  experience: 10,
  niceToHave: 5,
} as const;

export const MIN_SKILL_COVERAGE = 0.5;

export type Fit = 'yes' | 'partial' | 'no';
export type CriterionKey = keyof typeof WEIGHTS;
export type Tier = 'strong' | 'good' | 'possible' | 'none';

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  weight: number;
  points: number;
  fit: Fit;
  /** Plain-language explanation for the employer. */
  text: string;
  /** Same explanation addressed to the candidate. */
  textForCandidate: string;
}

export interface MatchResult {
  candidate: CandidateProfile;
  score: number;
  tier: Tier;
  eligible: boolean;
  blockers: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchedNice: string[];
  criteria: CriterionResult[];
  summary: string;
  summaryForCandidate: string;
}

/** The parts of an opportunity used for matching. Null availability/location = not constrained. */
export interface MatchCriteria {
  type: Opportunity['type'];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  location: string;
  workMode: WorkMode;
  availability: Availability | null;
  minExperienceYears: number;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const list = (items: string[]) => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};
const yrs = (n: number) => `${n} year${n === 1 ? '' : 's'}`;
const availList = (a: Availability[]) => list(a.map((x) => AVAILABILITY_LABELS[x].toLowerCase()));

export const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong match',
  good: 'Good match',
  possible: 'Possible match',
  none: 'Not a match',
};

export function matchCandidate(opp: MatchCriteria, cand: CandidateProfile): MatchResult {
  const criteria: CriterionResult[] = [];
  const blockers: string[] = [];
  const candSkillKeys = new Map(cand.skills.map((s) => [skillKey(s), s]));
  const fn = firstName(cand.name);

  // 1. Required skills ------------------------------------------------------
  const required = dedupe(opp.requiredSkills);
  const matchedSkills = required.filter((s) => candSkillKeys.has(skillKey(s))).map(skillLabel);
  const missingSkills = required.filter((s) => !candSkillKeys.has(skillKey(s))).map(skillLabel);
  if (required.length > 0) {
    const coverage = matchedSkills.length / required.length;
    const fit: Fit = coverage === 1 ? 'yes' : coverage >= MIN_SKILL_COVERAGE ? 'partial' : 'no';
    const has = matchedSkills.length
      ? `Has ${matchedSkills.length} of ${required.length} required skills: ${list(matchedSkills)}.`
      : `Has none of the ${required.length} required skills.`;
    const youHave = matchedSkills.length
      ? `You have ${matchedSkills.length} of ${required.length} required skills: ${list(matchedSkills)}.`
      : `You have none of the ${required.length} required skills.`;
    const miss = missingSkills.length ? ` Missing: ${list(missingSkills)}.` : '';
    criteria.push({
      key: 'skills',
      label: 'Required skills',
      weight: WEIGHTS.skills,
      points: WEIGHTS.skills * coverage,
      fit,
      text: has + miss,
      textForCandidate: youHave + miss,
    });
    if (coverage < MIN_SKILL_COVERAGE) {
      blockers.push(`only ${matchedSkills.length} of ${required.length} required skills`);
    }
  }

  // 2. Availability --------------------------------------------------------
  if (opp.availability) {
    const need = AVAILABILITY_LABELS[opp.availability].toLowerCase();
    const ok = cand.availability.includes(opp.availability);
    criteria.push({
      key: 'availability',
      label: 'Availability',
      weight: WEIGHTS.availability,
      points: ok ? WEIGHTS.availability : 0,
      fit: ok ? 'yes' : 'no',
      text: ok
        ? `Available for ${need} work — fits what this ${opp.type} needs.`
        : `Availability doesn't fit: open to ${availList(cand.availability) || 'nothing listed'}, but this ${opp.type} needs ${need}.`,
      textForCandidate: ok
        ? `Your availability fits: this ${opp.type} needs ${need}.`
        : `This ${opp.type} needs ${need}; your profile says ${availList(cand.availability) || 'no availability'}.`,
    });
    if (!ok) blockers.push(`availability doesn't fit (needs ${need})`);
  }

  // 3. Location ------------------------------------------------------------
  if (opp.workMode === 'remote' || opp.location.trim()) {
    const same = locationKey(cand.location) === locationKey(opp.location);
    let fit: Fit;
    let text: string;
    let textForCandidate: string;
    if (opp.workMode === 'remote') {
      fit = 'yes';
      text = `Role is remote, so being based in ${cand.location} works.`;
      textForCandidate = `This ${opp.type} is remote — location is not a constraint.`;
    } else if (same) {
      fit = 'yes';
      text = `Based in ${cand.location} — same place as the ${opp.workMode} role.`;
      textForCandidate = `It's in ${opp.location}, where you're based.`;
    } else if (cand.willingToRelocate) {
      fit = 'partial';
      text = `Based in ${cand.location}, not ${opp.location}, but willing to relocate.`;
      textForCandidate = `It's in ${opp.location}; you're in ${cand.location} but said you'd relocate.`;
    } else {
      fit = 'no';
      text = `Based in ${cand.location}; this ${opp.workMode} role is in ${opp.location} and they haven't said they'd relocate.`;
      textForCandidate = `It's ${opp.workMode} in ${opp.location}; you're in ${cand.location} and not open to relocating.`;
      blockers.push(`location doesn't fit (${cand.location} vs ${opp.location})`);
    }
    criteria.push({
      key: 'location',
      label: 'Location',
      weight: WEIGHTS.location,
      points: fit === 'yes' ? WEIGHTS.location : fit === 'partial' ? WEIGHTS.location / 2 : 0,
      fit,
      text,
      textForCandidate,
    });
  }

  // 4. Experience ----------------------------------------------------------
  {
    const min = Math.max(0, opp.minExperienceYears || 0);
    const y = cand.experienceYears;
    let fit: Fit;
    let text: string;
    let textForCandidate: string;
    if (min === 0) {
      fit = 'yes';
      text = `${yrs(y)} of experience; no minimum required.`;
      textForCandidate = `No minimum experience required.`;
    } else if (y >= min) {
      fit = 'yes';
      text = `${yrs(y)} of experience — meets the ${min}-year minimum.`;
      textForCandidate = `Your ${yrs(y)} of experience meets the ${min}-year minimum.`;
    } else if (y >= min - 1) {
      fit = 'partial';
      text = `${yrs(y)} of experience — just under the ${min}-year minimum.`;
      textForCandidate = `You're just under the ${min}-year minimum (${yrs(y)}).`;
    } else {
      fit = 'no';
      text = `${yrs(y)} of experience — below the ${min}-year minimum.`;
      textForCandidate = `The ${opp.type} asks for ${yrs(min)}; you have ${yrs(y)}.`;
    }
    criteria.push({
      key: 'experience',
      label: 'Experience',
      weight: WEIGHTS.experience,
      points: fit === 'yes' ? WEIGHTS.experience : fit === 'partial' ? WEIGHTS.experience / 2 : 0,
      fit,
      text,
      textForCandidate,
    });
  }

  // 5. Nice-to-have skills -------------------------------------------------
  const nice = dedupe(opp.niceToHaveSkills).filter((s) => !required.some((r) => skillKey(r) === skillKey(s)));
  const matchedNice = nice.filter((s) => candSkillKeys.has(skillKey(s))).map(skillLabel);
  if (nice.length > 0) {
    const cov = matchedNice.length / nice.length;
    criteria.push({
      key: 'niceToHave',
      label: 'Nice-to-have skills',
      weight: WEIGHTS.niceToHave,
      points: WEIGHTS.niceToHave * cov,
      fit: cov === 1 ? 'yes' : cov > 0 ? 'partial' : 'no',
      text: matchedNice.length
        ? `Also has nice-to-have: ${list(matchedNice)}.`
        : `None of the nice-to-have skills listed.`,
      textForCandidate: matchedNice.length
        ? `Bonus: you also have ${list(matchedNice)}.`
        : `No nice-to-have skills matched.`,
    });
  }

  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0);
  const earned = criteria.reduce((a, c) => a + c.points, 0);
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;
  const eligible = blockers.length === 0;
  const tier: Tier = !eligible ? 'none' : score >= 80 ? 'strong' : score >= 60 ? 'good' : 'possible';

  // Summary sentences -------------------------------------------------------
  const parts: string[] = [];
  if (required.length) parts.push(`has ${matchedSkills.length} of ${required.length} required skills`);
  const av = criteria.find((c) => c.key === 'availability');
  if (av?.fit === 'yes') parts.push(`is available for ${AVAILABILITY_LABELS[opp.availability!].toLowerCase()} work`);
  const loc = criteria.find((c) => c.key === 'location');
  if (loc?.fit === 'yes') parts.push(opp.workMode === 'remote' ? 'can work remotely' : `is based in ${cand.location}`);
  if (loc?.fit === 'partial') parts.push('would relocate');
  const summary = eligible
    ? `${TIER_LABEL[tier]}: ${fn} ${list(parts)}.`
    : `Not listed as a match — ${list(blockers)}.`;
  const summaryForCandidate = eligible
    ? `${TIER_LABEL[tier]} for you${matchedSkills.length ? ` — you have ${list(matchedSkills)}` : ''}.`
    : `Not a strong fit yet — ${list(blockers)}.`;

  return {
    candidate: cand,
    score,
    tier,
    eligible,
    blockers,
    matchedSkills,
    missingSkills,
    matchedNice,
    criteria,
    summary,
    summaryForCandidate,
  };
}

function dedupe(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.filter((s) => {
    const k = skillKey(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function toCriteria(o: Opportunity): MatchCriteria {
  return {
    type: o.type,
    requiredSkills: o.requiredSkills,
    niceToHaveSkills: o.niceToHaveSkills,
    location: o.location,
    workMode: o.workMode,
    availability: o.availability,
    minExperienceYears: o.minExperienceYears,
  };
}

/** Rank all candidates for an opportunity: eligible first, then by score. */
export function rankCandidates(opp: MatchCriteria, candidates: CandidateProfile[]): MatchResult[] {
  return candidates
    .map((c) => matchCandidate(opp, c))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
}

export interface Suggestion {
  label: string;
  detail: string;
  newMatches: number;
  patch: Partial<MatchCriteria>;
}

/** One way of relaxing the requirements. Combined greedily when a single change isn't enough. */
interface Relaxation {
  label: string;
  detail: string;
  demote?: string[]; // required skills to move to nice-to-have
  workMode?: WorkMode;
  availability?: Availability;
}

function applyRelaxations(opp: MatchCriteria, rs: Relaxation[]): Partial<MatchCriteria> {
  const patch: Partial<MatchCriteria> = {};
  const demote = new Set(rs.flatMap((r) => r.demote ?? []).map(skillKey));
  if (demote.size) {
    patch.requiredSkills = opp.requiredSkills.filter((s) => !demote.has(skillKey(s)));
    patch.niceToHaveSkills = [...opp.niceToHaveSkills, ...opp.requiredSkills.filter((s) => demote.has(skillKey(s)))];
  }
  for (const r of rs) {
    if (r.workMode) patch.workMode = r.workMode;
    if (r.availability) patch.availability = r.availability;
  }
  return patch;
}

/**
 * Powers the "no suitable candidates" empty state: try relaxing one
 * requirement at a time (then pairs, if no single change helps) and report
 * how many candidates would then match.
 */
export function suggestRelaxations(opp: MatchCriteria, candidates: CandidateProfile[]): Suggestion[] {
  const count = (patch: Partial<MatchCriteria>) => candidates.filter((c) => matchCandidate({ ...opp, ...patch }, c).eligible).length;
  const options: Relaxation[] = [];
  const unheld = unheldSkills(opp, candidates);

  if (opp.requiredSkills.length > 1) {
    if (unheld.length > 1 && unheld.length < opp.requiredSkills.length) {
      options.push({ label: `Make ${list(unheld)} nice-to-have`, detail: 'No candidate lists these skills', demote: unheld });
    }
    for (const s of opp.requiredSkills) {
      options.push({ label: `Make "${skillLabel(s)}" nice-to-have`, detail: 'Moves it out of the required list', demote: [s] });
    }
  }
  if (opp.workMode !== 'remote') options.push({ label: 'Allow remote work', detail: 'Location stops being a constraint', workMode: 'remote' });
  if (opp.availability) {
    for (const a of Object.keys(AVAILABILITY_LABELS) as Availability[]) {
      if (a === opp.availability) continue;
      options.push({ label: `Accept ${AVAILABILITY_LABELS[a].toLowerCase()}`, detail: `Instead of ${AVAILABILITY_LABELS[opp.availability].toLowerCase()}`, availability: a });
    }
  }

  const out: Suggestion[] = [];
  for (const o of options) {
    const patch = applyRelaxations(opp, [o]);
    const n = count(patch);
    if (n > 0) out.push({ label: o.label, detail: o.detail, newMatches: n, patch });
  }
  if (out.length === 0) {
    // No single change helps — try pairs of changes that touch different requirements.
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const a = options[i];
        const b = options[j];
        if ((a.availability && b.availability) || (a.workMode && b.workMode)) continue;
        const patch = applyRelaxations(opp, [a, b]);
        const n = count(patch);
        if (n > 0) out.push({ label: `${a.label} + ${b.label.replace(/^\w/, (c) => c.toLowerCase())}`, detail: 'Two changes together', newMatches: n, patch });
      }
    }
  }
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.newMatches - a.newMatches || a.label.length - b.label.length)
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
    .slice(0, 4);
}

/** Required skills that no candidate in the pool lists at all. */
export function unheldSkills(opp: MatchCriteria, candidates: CandidateProfile[]): string[] {
  const held = new Set(candidates.flatMap((c) => c.skills.map(skillKey)));
  return opp.requiredSkills.filter((s) => !held.has(skillKey(s))).map(skillLabel);
}

/** For the candidate view: rank open opportunities for one candidate. */
export function rankOpportunities(cand: CandidateProfile, opps: Opportunity[]) {
  return opps
    .filter((o) => o.status === 'open')
    .map((o) => ({ opportunity: o, match: matchCandidate(toCriteria(o), cand) }))
    .sort((a, b) => Number(b.match.eligible) - Number(a.match.eligible) || b.match.score - a.match.score);
}

/**
 * Candidate ids on an opportunity's shortlist / interest list who no longer meet
 * its must-haves (e.g. after the employer tightens the requirements).
 * Entries whose profile no longer exists are left alone.
 */
export function staleEntries(
  oppId: string,
  opp: MatchCriteria,
  candidates: CandidateProfile[],
  shortlists: ShortlistEntry[],
  interests: InterestEntry[],
): { shortlists: string[]; interests: string[] } {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const stale = (e: { opportunityId: string; candidateId: string }) => {
    const c = e.opportunityId === oppId ? byId.get(e.candidateId) : undefined;
    return !!c && !matchCandidate(opp, c).eligible;
  };
  return {
    shortlists: shortlists.filter(stale).map((e) => e.candidateId),
    interests: interests.filter(stale).map((e) => e.candidateId),
  };
}

/**
 * The same check from the candidate's side: for each opportunity where this
 * candidate is shortlisted or interested, whether they still meet its must-haves
 * (e.g. after they edit their profile). Only opportunities with stale entries are returned.
 */
export function staleForCandidate(
  cand: CandidateProfile,
  opportunities: Opportunity[],
  shortlists: ShortlistEntry[],
  interests: InterestEntry[],
): { opportunityId: string; shortlists: string[]; interests: string[] }[] {
  return opportunities
    .map((o) => ({ opportunityId: o.id, ...staleEntries(o.id, toCriteria(o), [cand], shortlists, interests) }))
    .filter((r) => r.shortlists.length || r.interests.length);
}
