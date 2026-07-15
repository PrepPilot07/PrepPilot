import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import RoadmapShell from './layouts/RoadmapShell';
import RoadmapPage from './pages/RoadmapPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* ── Roadmap shell — light-themed section ── */}
        <Route element={<RoadmapShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* /roadmap/day/:dayNumber — daily answering flow (not yet built) */}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
