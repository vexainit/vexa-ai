import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROLE_DEFAULT_ROUTE, RoleProvider, useRole } from './context/RoleContext';
import type { UserRole } from './types/vexa';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { BusinessHome } from './pages/business/BusinessHome';
import { NewAuditPage } from './pages/business/NewAuditPage';
import { AuditReportPage } from './pages/business/AuditReportPage';
import { MatchedSolutionsPage } from './pages/business/MatchedSolutionsPage';
import { ChallengeFeedPage } from './pages/student/ChallengeFeedPage';
import { ChallengeWorkspacePage } from './pages/student/ChallengeWorkspacePage';
import { SubmissionsPage } from './pages/student/SubmissionsPage';
import { PortfolioPage } from './pages/student/PortfolioPage';
import { MentorReviewsPage } from './pages/mentor/MentorReviewsPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminBusinessesPage } from './pages/admin/AdminBusinessesPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminMentorsPage } from './pages/admin/AdminMentorsPage';
import { AdminDatabasePage } from './pages/admin/AdminDatabasePage';
import { AdminGovernancePage } from './pages/admin/AdminGovernancePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({
  allowed,
  children,
}: {
  allowed?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-vb-canvas flex items-center justify-center text-xs font-mono text-vb-muted">
        Verifying session...
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={ROLE_DEFAULT_ROUTE[user.role]} replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/portfolio/:student_id" element={<PortfolioPage />} />

            {/* Shared Authenticated Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Business Portal */}
            <Route
              path="/business"
              element={
                <ProtectedRoute allowed={['BUSINESS', 'ADMIN']}>
                  <BusinessHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/new-audit"
              element={
                <ProtectedRoute allowed={['BUSINESS', 'ADMIN']}>
                  <NewAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/audits/:id"
              element={
                <ProtectedRoute allowed={['BUSINESS', 'ADMIN']}>
                  <AuditReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/audits/:id/solutions"
              element={
                <ProtectedRoute allowed={['BUSINESS', 'ADMIN']}>
                  <MatchedSolutionsPage />
                </ProtectedRoute>
              }
            />

            {/* Student Portal */}
            <Route
              path="/student/challenges"
              element={
                <ProtectedRoute allowed={['STUDENT', 'MENTOR', 'ADMIN']}>
                  <ChallengeFeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/challenges/:id"
              element={
                <ProtectedRoute allowed={['STUDENT', 'MENTOR', 'ADMIN']}>
                  <ChallengeWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/submissions"
              element={
                <ProtectedRoute allowed={['STUDENT', 'ADMIN']}>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/submissions/:id"
              element={
                <ProtectedRoute allowed={['STUDENT', 'ADMIN']}>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />

            {/* Mentor Portal */}
            <Route
              path="/mentor/reviews"
              element={
                <ProtectedRoute allowed={['MENTOR', 'ADMIN']}>
                  <MentorReviewsPage />
                </ProtectedRoute>
              }
            />

            {/* Platform Admin Control Plane (All 3 Ecosystems + Live DB) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/businesses"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminBusinessesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mentors"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminMentorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/database"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminDatabasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/governance"
              element={
                <ProtectedRoute allowed={['ADMIN']}>
                  <AdminGovernancePage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </QueryClientProvider>
  );
}

export default App;
