import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useData, type View } from './data/DataProvider';
import { Header } from './components/Header';
import { Landing } from './pages/Landing';
import { Welcome } from './pages/Welcome';
import { EmployerDashboard } from './pages/employer/EmployerDashboard';
import { OpportunityForm } from './pages/employer/OpportunityForm';
import { OpportunityDetail } from './pages/employer/OpportunityDetail';
import { CandidateDetail } from './pages/employer/CandidateDetail';
import { CandidateHome } from './pages/candidate/CandidateHome';
import { CandidateProfileForm } from './pages/candidate/CandidateProfileForm';
import { OpportunityView } from './pages/candidate/OpportunityView';

export const APP_NAME = 'Q-sourcing | Flip Africa';

/** Pages for the other role send you home; switching roles means signing out. */
function Only({ role, children }: { role: View; children: ReactNode }) {
  const { view } = useData();
  return view === role ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  const { view, error, ready } = useData();
  const loc = useLocation();

  if (loading) return <div className="boot"><div className="spinner" /></div>;

  if (!user) {
    return (
      <div className="app-bg">
        <Landing />
      </div>
    );
  }

  return (
    <div className="app-bg">
      <Header />
      <main className="container">
        {error && (
          <div className="alert-error">
            Couldn&rsquo;t load data: {error}. If this says &ldquo;permission denied&rdquo;, deploy the Firestore rules (see README).
          </div>
        )}
        {!ready ? (
          <div className="boot inline"><div className="spinner" /></div>
        ) : (
          <Routes location={loc}>
            <Route path="/" element={view ? <Navigate to={`/${view}`} replace /> : <Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={view ? <Navigate to={`/${view}`} replace /> : <Welcome />} />
            <Route path="/employer" element={<Only role="employer"><EmployerDashboard /></Only>} />
            <Route path="/employer/new" element={<Only role="employer"><OpportunityForm /></Only>} />
            <Route path="/employer/opportunities/:id" element={<Only role="employer"><OpportunityDetail /></Only>} />
            <Route path="/employer/opportunities/:id/edit" element={<Only role="employer"><OpportunityForm /></Only>} />
            <Route path="/employer/candidates/:cid" element={<Only role="employer"><CandidateDetail /></Only>} />
            <Route path="/candidate" element={<Only role="candidate"><CandidateHome /></Only>} />
            <Route path="/candidate/profile" element={<Only role="candidate"><CandidateProfileForm /></Only>} />
            <Route path="/candidate/opportunities/:id" element={<Only role="candidate"><OpportunityView /></Only>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="footer">
        {APP_NAME} · hackathon prototype · use fictional data only. Sample profiles and opportunities are not real people or real vacancies.
      </footer>
    </div>
  );
}
