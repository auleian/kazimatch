import type { CandidateInput, OpportunityInput } from './types';

export type Errors<T> = Partial<Record<keyof T, string>>;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCandidate(c: Partial<CandidateInput>): Errors<CandidateInput> {
  const e: Errors<CandidateInput> = {};
  if (!c.name || c.name.trim().length < 2) e.name = 'Enter your full name (at least 2 characters).';
  if (!c.headline || c.headline.trim().length < 3) e.headline = 'Add a short headline, e.g. "Frontend developer".';
  if (!c.location || !c.location.trim()) e.location = 'Location is required so we can match nearby work.';
  if (!c.skills || c.skills.length === 0) e.skills = 'Add at least one skill.';
  else if (c.skills.length > 30) e.skills = 'Keep it to 30 skills or fewer.';
  if (c.experienceYears === undefined || c.experienceYears === null || Number.isNaN(c.experienceYears)) e.experienceYears = 'Enter years of experience (0 is fine).';
  else if (c.experienceYears < 0 || c.experienceYears > 60) e.experienceYears = 'Years of experience must be between 0 and 60.';
  if (!c.experienceSummary || c.experienceSummary.trim().length < 20) e.experienceSummary = 'Describe your experience in at least 20 characters.';
  if (!c.availability || c.availability.length === 0) e.availability = 'Choose at least one availability option.';
  if (c.email && !emailRe.test(c.email)) e.email = 'That email address doesn’t look right.';
  return e;
}

export function validateOpportunity(o: Partial<OpportunityInput>): Errors<OpportunityInput> {
  const e: Errors<OpportunityInput> = {};
  if (!o.title || o.title.trim().length < 3) e.title = 'Give the opportunity a title (at least 3 characters).';
  if (!o.employerName || !o.employerName.trim()) e.employerName = 'Employer / organisation name is required.';
  if (!o.description || o.description.trim().length < 30) e.description = 'Describe the work in at least 30 characters.';
  if (!o.requiredSkills || o.requiredSkills.length === 0) e.requiredSkills = 'Add at least one required skill.';
  else if (o.requiredSkills.length > 15) e.requiredSkills = 'Keep required skills to 15 or fewer.';
  if (!o.location || !o.location.trim()) e.location = o.workMode === 'remote' ? 'Add a base location or time zone (e.g. "Kampala").' : 'Location is required.';
  if (!o.availability) e.availability = 'Choose the expected availability.';
  if (!o.workMode) e.workMode = 'Choose a work mode.';
  if (o.minExperienceYears === undefined || Number.isNaN(o.minExperienceYears) || o.minExperienceYears < 0 || o.minExperienceYears > 40)
    e.minExperienceYears = 'Minimum experience must be between 0 and 40 years.';
  return e;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
