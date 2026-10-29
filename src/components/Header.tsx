import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, ChevronDown, LogOut, RotateCcw, UserRound } from 'lucide-react';
import { PROVIDER_LABEL, useAuth } from '../auth/AuthProvider';
import { useData } from '../data/DataProvider';
import { Avatar } from './ui';
import { NotificationBell } from './NotificationBell';

export function Logo() {
  return (
    <Link to="/" className="logo">
      <img src="./favicon.svg" alt="" width={28} height={28} />
      <span>Q-sourcing <span className="logo-sub">| Flip Africa</span></span>
    </Link>
  );
}

export function Header() {
  const { user, signOut, mode } = useAuth();
  const { view: current, clearView, personas, actingCandidateId, setActingCandidateId, store } = useData();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner glass">
        <Logo />
        {current && (
          <span className="role-chip" title="Sign out to switch role">
            {current === 'employer' ? <Briefcase size={13} /> : <UserRound size={13} />}
            {current === 'employer' ? 'Employer' : 'Candidate'}
          </span>
        )}
        <div className="topbar-right">
          {current === 'candidate' && personas.length > 0 && (
            <label className="persona">
              <span>Acting as</span>
              <select
                value={actingCandidateId ?? ''}
                onChange={(e) => setActingCandidateId(e.target.value || null)}
                aria-label="Candidate profile to act as"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === user?.uid ? `${p.name} (me)` : `${p.name} (sample)`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className={`mode ${mode}`} title={mode === 'firebase' ? 'Connected to Firebase' : 'Firebase not configured, so data stays in this browser'}>
            {mode === 'firebase' ? 'Live · Firebase' : 'Local demo'}
          </span>
          <NotificationBell />
          <div className="menu" ref={menuRef}>
            <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <Avatar name={user?.displayName ?? '?'} size={30} />
              <ChevronDown size={14} />
            </button>
            {open && (
              <div className="menu-pop glass">
                <div className="menu-user">
                  <b>{user?.displayName}</b>
                  <span>{user?.email ?? 'Guest session'}</span>
                  <span className="muted">Signed in with {PROVIDER_LABEL[user?.provider ?? ''] ?? user?.provider}</span>
                  {current && <span className="muted">Signed in as {current === 'employer' ? 'an employer' : 'a candidate'}. Sign out to switch.</span>}
                </div>
                {store.resetLocal && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all local demo data in this browser?')) store.resetLocal?.();
                      setOpen(false);
                    }}
                  >
                    <RotateCcw size={15} /> Reset local demo data
                  </button>
                )}
                <button
                  onClick={() => {
                    clearView();
                    signOut().then(() => nav('/'));
                  }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
