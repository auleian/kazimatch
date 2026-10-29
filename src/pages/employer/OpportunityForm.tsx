import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, TriangleAlert, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { rankCandidates, staleEntries } from '../../lib/matching';
import { AVAILABILITY_LABELS, WORK_MODE_LABELS, type Availability, type OpportunityInput, type WorkMode } from '../../lib/types';
import { KNOWN_LOCATIONS, SUGGESTED_SKILLS, uniqueSkills } from '../../lib/skills';
import { hasErrors, validateOpportunity, type Errors } from '../../lib/validation';
import { Field, SkillInput, useToast } from '../../components/ui';

const LAST_EMPLOYER = 'kazimatch:lastEmployerName';

export function OpportunityForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const { opportunities, candidates, shortlists, interests, store, pruneIneligible } = useData();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const existing = id ? opportunities.find((o) => o.id === id && o.employerId === user?.uid) : undefined;
  const prefill = (loc.state as { prefill?: Partial<OpportunityInput> } | null)?.prefill;

  const blank: OpportunityInput = {
    employerId: user?.uid ?? '',
    employerName: (() => {
      try {
        return localStorage.getItem(LAST_EMPLOYER) ?? '';
      } catch {
        return '';
      }
    })(),
    type: 'gig',
    title: '',
    description: '',
    requiredSkills: [],
    niceToHaveSkills: [],
    location: '',
    workMode: 'on-site',
    availability: 'gig',
    minExperienceYears: 0,
    pay: '',
    status: 'open',
  };

  const [form, setForm] = useState<OpportunityInput>(() => {
    if (existing) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = existing;
      return rest;
    }
    return { ...blank, ...prefill };
  });
  const [errors, setErrors] = useState<Errors<OpportunityInput>>({});
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) setErrors(validateOpportunity(form));
  }, [form, touched]);

  const set = <K extends keyof OpportunityInput>(k: K, v: OpportunityInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const vocab = useMemo(() => uniqueSkills([...SUGGESTED_SKILLS, ...candidates.flatMap((c) => c.skills)]), [candidates]);
  const liveMatches = useMemo(
    () => (form.requiredSkills.length ? rankCandidates({ ...form, availability: form.availability }, candidates).filter((r) => r.eligible).length : null),
    [form, candidates],
  );
  // Shortlisted / interested candidates these edits would drop below the must-haves.
  const stale = useMemo(
    () => (existing ? staleEntries(existing.id, form, candidates, shortlists, interests) : { shortlists: [], interests: [] }),
    [existing, form, candidates, shortlists, interests],
  );
  const staleText = [
    stale.shortlists.length && `${stale.shortlists.length} shortlisted`,
    stale.interests.length && `${stale.interests.length} interested`,
  ].filter(Boolean).join(' and ');

  if (id && !existing) return <div className="page"><p>Opportunity not found.</p><Link to="/employer">Back</Link></div>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const data: OpportunityInput = {
      ...form,
      employerId: existing?.employerId ?? user!.uid,
      title: form.title.trim(),
      employerName: form.employerName.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      pay: form.pay?.trim() || '',
      requiredSkills: uniqueSkills(form.requiredSkills),
      niceToHaveSkills: uniqueSkills(form.niceToHaveSkills),
      minExperienceYears: Number(form.minExperienceYears) || 0,
    };
    const errs = validateOpportunity(data);
    setErrors(errs);
    if (hasErrors(errs)) {
      toast('Please fix the highlighted fields', 'err');
      setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (staleText && !confirm(`${staleText} candidate${stale.shortlists.length + stale.interests.length === 1 ? '' : 's'} no longer meet these requirements and will be removed from this ${data.type}. Save anyway?`)) return;
    setSaving(true);
    try {
      const newId = await store.saveOpportunity(existing?.id ?? null, data);
      const removed = existing ? await pruneIneligible(newId, data) : { shortlists: 0, interests: 0 };
      try {
        localStorage.setItem(LAST_EMPLOYER, data.employerName);
      } catch {
        /* ignore */
      }
      const removedCount = removed.shortlists + removed.interests;
      toast(
        !existing ? 'Opportunity posted'
          : removedCount ? `Requirements updated · removed ${removedCount} entr${removedCount === 1 ? 'y' : 'ies'} that no longer match`
            : 'Requirements updated',
      );
      nav(`/employer/opportunities/${newId}`);
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrow">
      <Link to={existing ? `/employer/opportunities/${existing.id}` : '/employer'} className="back">
        <ArrowLeft size={15} /> Back
      </Link>
      <h1>{existing ? 'Edit requirements' : 'Post a job or gig'}</h1>
      <p className="muted">Use fictional details for the hackathon demo. Don&rsquo;t publish this as a real vacancy.</p>

      <form className="card glass-strong form" onSubmit={submit} noValidate>
        <div className="seg big" role="radiogroup" aria-label="Opportunity type">
          {(['gig', 'job'] as const).map((t) => (
            <button
              type="button"
              key={t}
              role="radio"
              aria-checked={form.type === t}
              className={form.type === t ? 'on' : ''}
              onClick={() => setForm((f) => ({ ...f, type: t, availability: t === 'gig' && f.availability === 'full-time' ? 'gig' : f.availability }))}
            >
              {t === 'gig' ? 'Gig / short-term' : 'Job'}
            </button>
          ))}
        </div>

        <div className="grid-2">
          <Field label="Title" required error={errors.title}>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. React developer for a 3-week build" />
          </Field>
          <Field label="Employer / organisation" required error={errors.employerName}>
            <input value={form.employerName} onChange={(e) => set('employerName', e.target.value)} placeholder="e.g. Kivu Bytes Studio (fictional)" />
          </Field>
        </div>

        <Field label="Description" required error={errors.description} hint={`${form.description.trim().length}/30 characters minimum`}>
          <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What will the person do? What does success look like?" />
        </Field>

        <Field label="Required skills" required error={errors.requiredSkills} hint="Press Enter or comma after each skill. Candidates need at least half of these to be listed.">
          <SkillInput value={form.requiredSkills} onChange={(v) => set('requiredSkills', v)} suggestions={vocab} placeholder="e.g. React, TypeScript" invalid={!!errors.requiredSkills} />
        </Field>

        <Field label="Nice-to-have skills" hint="Optional. Adds a small bonus, never hides anyone.">
          <SkillInput value={form.niceToHaveSkills} onChange={(v) => set('niceToHaveSkills', v)} suggestions={vocab} placeholder="e.g. Figma" />
        </Field>

        <div className="grid-3">
          <Field label="Location" required error={errors.location}>
            <input list="locations" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kampala" />
            <datalist id="locations">
              {KNOWN_LOCATIONS.map((l) => <option key={l} value={l} />)}
            </datalist>
          </Field>
          <Field label="Work mode" required error={errors.workMode}>
            <select value={form.workMode} onChange={(e) => set('workMode', e.target.value as WorkMode)}>
              {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((m) => <option key={m} value={m}>{WORK_MODE_LABELS[m]}</option>)}
            </select>
          </Field>
          <Field label="Expected availability" required error={errors.availability}>
            <select value={form.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
              {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid-3">
          <Field label="Minimum experience (years)" required error={errors.minExperienceYears}>
            <input type="number" min={0} max={40} value={Number.isNaN(form.minExperienceYears) ? '' : form.minExperienceYears} onChange={(e) => set('minExperienceYears', e.target.value === '' ? NaN : Number(e.target.value))} />
          </Field>
          <Field label="Pay (optional)">
            <input value={form.pay ?? ''} onChange={(e) => set('pay', e.target.value)} placeholder="e.g. UGX 500,000 / week" />
          </Field>
          {existing && (
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as 'open' | 'closed')}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          )}
        </div>

        {staleText && (
          <div className="note warn-row">
            <TriangleAlert size={15} />
            <span>With these changes, {staleText} candidate{stale.shortlists.length + stale.interests.length === 1 ? '' : 's'} no longer meet{stale.shortlists.length + stale.interests.length === 1 ? 's' : ''} the must-haves and will be removed when you save.</span>
          </div>
        )}

        <div className="form-foot">
          <div className={`live ${liveMatches === 0 ? 'warn' : ''}`}>
            <Users size={15} />
            {liveMatches === null
              ? 'Add required skills to preview matches'
              : liveMatches === 0
                ? 'No candidates currently meet these requirements'
                : `${liveMatches} candidate${liveMatches === 1 ? '' : 's'} currently match`}
          </div>
          <button className="btn btn-dark" type="submit" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save requirements' : 'Post opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
}
