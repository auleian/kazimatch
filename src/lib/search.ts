/**
 * Rule-based "Find me a …" talent search. No AI: we look for known skill
 * names, towns and availability words in the sentence and build a temporary
 * set of match criteria from them.
 */
import type { Availability, WorkMode } from './types';
import type { MatchCriteria } from './matching';
import { KNOWN_LOCATIONS, skillKey, skillLabel } from './skills';

export interface ParsedQuery {
  criteria: MatchCriteria;
  skills: string[];
  location: string | null;
  availability: Availability | null;
  remote: boolean;
  minYears: number;
  understood: string[];
}

const AVAIL_PATTERNS: [RegExp, Availability][] = [
  [/\bpart[\s-]?time\b/, 'part-time'],
  [/\bfull[\s-]?time\b/, 'full-time'],
  [/\bweekends?\b/, 'weekends'],
  [/\b(gig|short[\s-]?term|one[\s-]?off|project basis|freelance)\b/, 'gig'],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseTalentQuery(query: string, vocabulary: string[], extraLocations: string[] = []): ParsedQuery {
  const q = ` ${query.toLowerCase()} `;
  const understood: string[] = [];

  // Skills: longest phrases first so "social media marketing" beats "marketing".
  const vocabKeys = Array.from(new Set([...vocabulary.map(skillKey), 'javascript', 'typescript', 'react', 'node']));
  const aliasProbe = ['js', 'ts', 'reactjs', 'react.js', 'node.js', 'nodejs', 'ui/ux', 'ux', 'smm', 'excel'];
  const probes = [...vocabKeys, ...aliasProbe].sort((a, b) => b.length - a.length);
  const found = new Set<string>();
  let rest = q;
  for (const p of probes) {
    const re = new RegExp(`(^|[^a-z0-9])${escape(p)}([^a-z0-9]|$)`);
    if (re.test(rest)) {
      const k = skillKey(p);
      if (vocabKeys.includes(k)) found.add(k);
      rest = rest.replace(re, ' ');
    }
  }
  const skills = Array.from(found).map(skillLabel);
  if (skills.length) understood.push(`skills: ${skills.join(', ')}`);

  // Location
  const locs = Array.from(new Set([...KNOWN_LOCATIONS, ...extraLocations]));
  const location = locs.find((l) => new RegExp(`\\b${escape(l.toLowerCase())}\\b`).test(q)) ?? null;
  const remote = /\bremote(ly)?\b|\bwork from home\b|\bwfh\b/.test(q);
  if (location) understood.push(`in ${location}`);
  if (remote) understood.push('remote OK');

  // Availability
  const availability = AVAIL_PATTERNS.find(([re]) => re.test(q))?.[1] ?? null;
  if (availability) understood.push(availability.replace('-', ' '));

  // Experience: "3+ years", "3 years"
  const m = q.match(/(\d{1,2})\s*\+?\s*(years?|yrs?)/);
  const minYears = m ? Number(m[1]) : 0;
  if (minYears) understood.push(`${minYears}+ years`);

  const workMode: WorkMode = remote ? 'remote' : 'on-site';
  return {
    criteria: {
      type: availability === 'gig' || availability === 'weekends' ? 'gig' : 'job',
      requiredSkills: skills,
      niceToHaveSkills: [],
      location: location ?? '',
      workMode,
      availability,
      minExperienceYears: minYears,
    },
    skills,
    location,
    availability,
    remote,
    minYears,
    understood,
  };
}
