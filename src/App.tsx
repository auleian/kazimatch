import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useData } from './data/DataProvider';
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

export const APP_NAME = 'KaziMatch';

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
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/employer" element={<EmployerDashboard />} />
            <Route path="/employer/new" element={<OpportunityForm />} />
            <Route path="/employer/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/employer/opportunities/:id/edit" element={<OpportunityForm />} />
            <Route path="/employer/candidates/:cid" element={<CandidateDetail />} />
            <Route path="/candidate" element={<CandidateHome />} />
            <Route path="/candidate/profile" element={<CandidateProfileForm />} />
            <Route path="/candidate/opportunities/:id" element={<OpportunityView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="footer">
        {APP_NAME} · hackathon prototype · use fictional data only — sample profiles and opportunities are not real people or real vacancies.
      </footer>
    </div>
  );
}
