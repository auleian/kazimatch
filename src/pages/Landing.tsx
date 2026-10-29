import { useState, type FormEvent } from 'react';
import { Briefcase, Mail, UserRound } from 'lucide-react';
import { friendlyAuthError, useAuth, type ProviderId } from '../auth/AuthProvider';
import { Logo } from '../components/Header';
import { setPendingRole, type View } from '../data/DataProvider';
import { TalentMap } from '../components/TalentMap';
import { Avatar } from '../components/ui';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
  </svg>
);

const FLOATERS = [
  { name: 'Amara Nakato', text: 'React · TypeScript', cls: 'f1' },
  { name: 'Joseph Ssempala', text: 'Solar installation', cls: 'f2' },
  { name: 'Ruth Akello', text: 'Available weekends', cls: 'f3' },
  { name: 'Daniel Mugisha', text: 'Data analysis · 5 yrs', cls: 'f4' },
];

export function Landing() {
  const { signInWith, signInEmail, signUpEmail, signInGuest, mode } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<'off' | 'in' | 'up'>('off');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<View | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (!role) return setErr('Choose whether you are hiring or looking for work first.');
    setPendingRole(role);
    setErr(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setErr(friendlyAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  const provider = (p: ProviderId) => run(p, () => signInWith(p));

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return setErr('Enter a valid email address.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (emailMode === 'up' && name.trim().length < 2) return setErr('Enter your name.');
    run('email', () => (emailMode === 'up' ? signUpEmail(name.trim(), email.trim(), password) : signInEmail(email.trim(), password)));
  };

  return (
    <div className="landing">
      <nav className="landing-nav glass">
        <Logo />
        <div className="landing-links">
          <a href="#map">Find talent</a>
          <a href="#how">How matching works</a>
          <a href="#signin">Sign in</a>
        </div>
      </nav>

      <section className="hero">
        <h1>
          Match the right talent
          <br />
          to the right work in minutes.
        </h1>
        <p className="hero-sub">
          Employers post a job or gig and instantly see a ranked shortlist, with a plain-language reason for every
          match. Candidates find relevant work and express interest in one click.
        </p>

        <div className="hero-stage">
          <div className="arc arc-1" />
          <div className="arc arc-2" />
          {FLOATERS.map((f) => (
            <div key={f.name} className={`floater glass ${f.cls}`}>
              <Avatar name={f.name} size={30} />
              <span>{f.text}</span>
            </div>
          ))}

          <div className="signin glass-strong" id="signin">
            <h2>Sign in to continue</h2>
            <p className="muted small">Choose how you&rsquo;ll use KaziMatch, then sign in.</p>
            <div className="role-pick" role="radiogroup" aria-label="Sign in as">
              <button role="radio" aria-checked={role === 'employer'} className={role === 'employer' ? 'on' : ''} onClick={() => { setRole('employer'); setErr(null); }}>
                <Briefcase size={16} />
                <b>Employer</b>
                <span>I&rsquo;m hiring</span>
              </button>
              <button role="radio" aria-checked={role === 'candidate'} className={role === 'candidate' ? 'on' : ''} onClick={() => { setRole('candidate'); setErr(null); }}>
                <UserRound size={16} />
                <b>Candidate</b>
                <span>I&rsquo;m looking for work</span>
              </button>
            </div>
            {mode === 'local' && (
              <div className="note">
                <b>Local demo mode</b>: Firebase isn&rsquo;t configured, so sign-in is simulated and data stays in this
                browser. Add your Firebase config to <code>.env.local</code> to go live.
              </div>
            )}
            <div className="sso">
              <button className="btn-sso" onClick={() => provider('google')} disabled={!!busy}>
                <GoogleIcon /> {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
              </button>
              <button className="btn-sso" onClick={() => provider('microsoft')} disabled={!!busy}>
                <MicrosoftIcon /> {busy === 'microsoft' ? 'Connecting…' : 'Continue with Microsoft'}
              </button>
              <button className="btn-sso" onClick={() => provider('github')} disabled={!!busy}>
                <GitHubIcon /> {busy === 'github' ? 'Connecting…' : 'Continue with GitHub'}
              </button>
              {emailMode === 'off' ? (
                <button className="btn-sso" onClick={() => setEmailMode('in')} disabled={!!busy}>
                  <Mail size={17} /> Continue with email
                </button>
              ) : (
                <form className="email-form" onSubmit={submitEmail} noValidate>
                  {emailMode === 'up' && (
                    <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  )}
                  <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  <input placeholder="Password (6+ characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={emailMode === 'up' ? 'new-password' : 'current-password'} />
                  <button className="btn btn-dark" type="submit" disabled={!!busy}>
                    {busy === 'email' ? 'Please wait…' : emailMode === 'up' ? 'Create account' : 'Sign in'}
                  </button>
                  <button type="button" className="link" onClick={() => setEmailMode(emailMode === 'up' ? 'in' : 'up')}>
                    {emailMode === 'up' ? 'Have an account? Sign in' : 'New here? Create an account'}
                  </button>
                </form>
              )}
              <div className="or"><span>or</span></div>
              <button className="btn btn-dark wide" onClick={() => run('guest', () => signInGuest())} disabled={!!busy}>
                <UserRound size={16} /> {busy === 'guest' ? 'Starting…' : 'Try the demo as a guest'}
              </button>
            </div>
            {err && <div className="alert-error small" role="alert">{err}</div>}
          </div>
        </div>
      </section>

      <TalentMap />

      <section className="how" id="how">
        <h2>How matching works</h2>
        <p className="muted">Simple, visible rules, no black box. Scores support human review; they don&rsquo;t decide for you.</p>
        <div className="how-grid">
          {[
            ['50 pts', 'Required skills', 'Share of the required skills the candidate lists. Must have at least half to be shown.'],
            ['20 pts', 'Availability', 'Candidate is open to the type of work needed: full-time, part-time, gig or weekends.'],
            ['15 pts', 'Location', 'Same town, a remote role, or the candidate is willing to relocate (half points).'],
            ['10 pts', 'Experience', 'Meets the minimum years. One year short earns half points; never hides a candidate.'],
            ['5 pts', 'Nice-to-have', 'Bonus for optional skills, only when the employer lists some.'],
          ].map(([pts, t, d]) => (
            <div className="how-card glass" key={t}>
              <span className="how-pts">{pts}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
