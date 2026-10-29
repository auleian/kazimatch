import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useData } from '../../data/DataProvider';
import { staleForCandidate } from '../../lib/matching';
import { AVAILABILITY_LABELS, type Availability, type CandidateInput, type CandidateProfile } from '../../lib/types';
import { KNOWN_LOCATIONS, SUGGESTED_SKILLS, uniqueSkills } from '../../lib/skills';
import { hasErrors, validateCandidate, type Errors } from '../../lib/validation';
import { Field, SkillInput, useToast } from '../../components/ui';

export function CandidateProfileForm() {
  const { user } = useAuth();
  const { actingCandidate, myProfile, candidates, opportunities, shortlists, interests, store, setActingCandidateId, pruneCandidate } = useData();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();

  // ?mine=1 → always edit/create the signed-in user's own profile.
  const target = params.get('mine') ? myProfile : actingCandidate;
  const isOwn = !target || target.id === user?.uid;

  const [form, setForm] = useState<CandidateInput>(() =>
    target
      ? (({ id: _i, createdAt: _c, updatedAt: _u, ...rest }) => rest)(target)
      : {
          ownerId: user!.uid,
          name: user?.isGuest ? '' : user?.displayName ?? '',
          headline: '',
          email: user?.email ?? '',
          phone: '',
          location: '',
          willingToRelocate: false,
          skills: [],
          experienceYears: 0,
          experienceSummary: '',
          availability: [],
        },
  );
  const [errors, setErrors] = useState<Errors<CandidateInput>>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (touched) setErrors(validateCandidate(form));
  }, [form, touched]);

  const set = <K extends keyof CandidateInput>(k: K, v: CandidateInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const vocab = useMemo(() => uniqueSkills([...SUGGESTED_SKILLS, ...candidates.flatMap((c) => c.skills)]), [candidates]);
  // Opportunities where these edits would drop this person below the must-haves.
  const staleTitles = useMemo(() => {
    if (!target) return [];
    const draft: CandidateProfile = { ...form, skills: uniqueSkills(form.skills), id: target.id, createdAt: target.createdAt, updatedAt: target.updatedAt };
    const ids = new Set(staleForCandidate(draft, opportunities, shortlists, interests).map((r) => r.opportunityId));
    return opportunities.filter((o) => ids.has(o.id)).map((o) => o.title);
  }, [target, form, opportunities, shortlists, interests]);
  const toggleAvail = (a: Availability) =>
    set('availability', form.availability.includes(a) ? form.availability.filter((x) => x !== a) : [...form.availability, a]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const data: CandidateInput = {
      ...form,
      name: form.name.trim(),
      headline: form.headline.trim(),
      email: form.email?.trim() || '',
      phone: form.phone?.trim() || '',
      location: form.location.trim(),
      experienceSummary: form.experienceSummary.trim(),
      skills: uniqueSkills(form.skills),
      experienceYears: Number(form.experienceYears),
    };
    const errs = validateCandidate(data);
    setErrors(errs);
    if (hasErrors(errs)) {
      toast('Please fix the highlighted fields', 'err');
      setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (staleTitles.length && !confirm(`With these changes you no longer meet the must-haves for: ${staleTitles.join(', ')}. You'll be removed from those shortlists and your interest will be withdrawn. Save anyway?`)) return;
    setSaving(true);
    try {
      const id = await store.saveCandidate(target?.id ?? user!.uid, data);
      setActingCandidateId(id);
      const removed = target ? await pruneCandidate({ ...target, ...data, id }) : { shortlists: 0, interests: 0 };
      const n = removed.shortlists + removed.interests;
      toast(!target ? 'Profile created' : n ? `Profile updated · removed ${n} shortlist/interest entr${n === 1 ? 'y' : 'ies'} that no longer match` : 'Profile updated');
      nav('/candidate');
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrow">
      <Link to="/candidate" className="back"><ArrowLeft size={15} /> Back</Link>
      <h1>{target ? (isOwn ? 'Edit your profile' : `Edit sample profile: ${target.name}`) : 'Create your profile'}</h1>
      <p className="muted">Use fictional details for the demo. Please don&rsquo;t paste a real CV.</p>

      <form className="card glass-strong form" onSubmit={submit} noValidate>
        <div className="grid-2">
          <Field label="Full name" required error={errors.name}>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Amara Nakato" autoComplete="name" />
          </Field>
          <Field label="Headline" required error={errors.headline}>
            <input value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Frontend developer" />
          </Field>
        </div>

        <Field label="Skills" required error={errors.skills} hint="Press Enter or comma after each skill.">
          <SkillInput value={form.skills} onChange={(v) => set('skills', v)} suggestions={vocab} placeholder="e.g. React, Photography, Bookkeeping" invalid={!!errors.skills} />
        </Field>

        <div className="grid-2">
          <Field label="Years of experience" required error={errors.experienceYears}>
            <input type="number" min={0} max={60} value={Number.isNaN(form.experienceYears) ? '' : form.experienceYears} onChange={(e) => set('experienceYears', e.target.value === '' ? NaN : Number(e.target.value))} />
          </Field>
          <Field label="Location" required error={errors.location}>
            <input list="cand-locations" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kampala" />
            <datalist id="cand-locations">
              {KNOWN_LOCATIONS.map((l) => <option key={l} value={l} />)}
            </datalist>
          </Field>
        </div>

        <label className="check">
          <input type="checkbox" checked={form.willingToRelocate} onChange={(e) => set('willingToRelocate', e.target.checked)} />
          <span>I&rsquo;m willing to relocate or travel for on-site work</span>
        </label>

        <Field label="Experience summary" required error={errors.experienceSummary} hint={`${form.experienceSummary.trim().length}/20 characters minimum`}>
          <textarea rows={4} value={form.experienceSummary} onChange={(e) => set('experienceSummary', e.target.value)} placeholder="What have you worked on? What are you proud of?" />
        </Field>

        <Field label="Availability" required error={errors.availability} hint="Choose every type of work you're open to.">
          <div className="checks">
            {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
              <button type="button" key={a} className={`pick ${form.availability.includes(a) ? 'on' : ''}`} aria-pressed={form.availability.includes(a)} onClick={() => toggleAvail(a)}>
                {AVAILABILITY_LABELS[a]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid-2">
          <Field label="Contact email (optional)" error={errors.email}>
            <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Phone (optional)">
            <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+256 …" />
          </Field>
        </div>

        {staleTitles.length > 0 && (
          <div className="note warn-row">
            <TriangleAlert size={15} />
            <span>With these changes you&rsquo;ll no longer meet the must-haves for <b>{staleTitles.join(', ')}</b>. Saving removes you from those shortlists and withdraws your interest.</span>
          </div>
        )}

        <div className="form-foot">
          <span className="muted small">Fields marked * are required.</span>
          <button className="btn btn-dark" type="submit" disabled={saving}>
            {saving ? 'Saving…' : target ? 'Save profile' : 'Create profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
