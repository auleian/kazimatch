import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useData } from '../data/DataProvider';

export function Welcome() {
  const { user } = useAuth();
  const { setView } = useData();
  const nav = useNavigate();
  const pick = (v: 'employer' | 'candidate') => {
    setView(v);
    nav(v === 'employer' ? '/employer' : '/candidate');
  };
  return (
    <div className="welcome">
      <h1>Welcome, {user?.displayName.split(' ')[0]}.</h1>
      <p className="muted">How would you like to start? You can switch views any time from the top bar.</p>
      <div className="welcome-grid">
        <button className="welcome-card glass-strong" onClick={() => pick('employer')}>
          <span className="tile-icon lg"><Briefcase size={22} /></span>
          <h2>I&rsquo;m hiring</h2>
          <p>Post a job or gig, see matching candidates with reasons, and build a shortlist.</p>
          <span className="go">Employer view <ArrowRight size={16} /></span>
        </button>
        <button className="welcome-card glass-strong" onClick={() => pick('candidate')}>
          <span className="tile-icon lg"><UserRound size={22} /></span>
          <h2>I&rsquo;m looking for work</h2>
          <p>Create a profile with your skills and availability, then find and respond to relevant opportunities.</p>
          <span className="go">Candidate view <ArrowRight size={16} /></span>
        </button>
      </div>
    </div>
  );
}
