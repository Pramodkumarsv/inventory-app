import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReportsPage } from './pages/ReportsPage';
import { InwardPage } from './pages/InwardPage';
import { OutwardPage } from './pages/OutwardPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ReportsPage />} />
          <Route path="inward" element={<InwardPage />} />
          <Route path="outward" element={<OutwardPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
