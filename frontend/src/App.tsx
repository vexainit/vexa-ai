import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Onboarding (Pages 1 & 2) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Business / Consumer Dashboard (Pages 3, 4, 5, 6 Overlay, 7) */}
            <Route path="/business" element={<BusinessHome />} />
            <Route path="/business/new-audit" element={<NewAuditPage />} />
            <Route path="/business/audits/:id" element={<AuditReportPage />} />
            <Route path="/business/audits/:id/solutions" element={<MatchedSolutionsPage />} />

            {/* Student / Builder Dashboard (Pages 8, 9, 10, 11) */}
            <Route path="/student/challenges" element={<ChallengeFeedPage />} />
            <Route path="/student/challenges/:id" element={<ChallengeWorkspacePage />} />
            <Route path="/student/submissions" element={<SubmissionsPage />} />
            <Route path="/student/submissions/:id" element={<SubmissionsPage />} />
            <Route path="/portfolio/:student_id" element={<PortfolioPage />} />

            {/* Mentor Review Dashboard (Page 12) */}
            <Route path="/mentor/reviews" element={<MentorReviewsPage />} />

            {/* Platform Admin Control Plane (Pages 13 & 14) */}
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/governance" element={<AdminGovernancePage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </QueryClientProvider>
  );
}

export default App;
