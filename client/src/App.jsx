import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DomainSelect from './pages/DomainSelect';
import Dashboard from './pages/Dashboard';
import ExamRoom from './pages/ExamRoom';
import AdminPanel from './pages/AdminPanel';

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  if (user.role === 'student' && !user.domainId && location.pathname !== '/select-domain') {
    return <Navigate to="/select-domain" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/select-domain" element={<Guard role="student"><DomainSelect /></Guard>} />
      <Route path="/" element={<Guard role="student"><Dashboard /></Guard>} />
      <Route path="/exam/:id" element={<Guard role="student"><ExamRoom /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><AdminPanel /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
