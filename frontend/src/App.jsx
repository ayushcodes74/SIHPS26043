import { RouterProvider } from "./context/RouterContext.jsx";
import { useRouter } from "./context/useRouter.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth.js";
import { ToastProvider } from "./context/ToastContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { Card } from "./components/common/Cards";
import { Button } from "./components/common/Button";
import { Icon } from "./components/common/Icons";
import { ReportProblemPage } from "./pages/problems/ReportProblemPage.jsx";
import { MyReportsPage } from "./pages/problems/MyReportsPage.jsx";
import { ProblemDetailPage } from "./pages/problems/ProblemDetailPage.jsx";
import { ExplorePage } from "./pages/explore/ExplorePage.jsx";
import { MatchingSkillsPage } from "./pages/matching/MatchingSkillsPage.jsx";
import NotificationsPage from "./pages/notifications/NotificationsPage.jsx";
import ReputationPage from "./pages/reputation/ReputationPage.jsx";
import RankingsPage from "./pages/rankings/RankingsPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";
import { DashboardPage } from "./pages/dashboard/DashboardPage.jsx";
import ImpactPassportPage from "./pages/impactPassport/ImpactPassportPage.jsx";
import TrustDashboardPage from "./pages/dashboard/TrustDashboardPage.jsx";
import AnalyticsDashboardPage from "./pages/dashboard/AnalyticsDashboardPage.jsx";
import { FacultyStudentsPage } from "./pages/university/FacultyStudentsPage.jsx";
import { ProjectWorkspacePage } from "./pages/projects/ProjectWorkspacePage.jsx";
import { ProjectsListPage } from "./pages/projects/ProjectsListPage.jsx";

/**
 * Main Application View Routing Switcher
 */
function AppContent() {
  const { path, segments, navigate } = useRouter();
  const { role, isAuthenticated, loading } = useAuth();

  const isProblemDetail = segments.length >= 2 && segments[0] === "problems";
  const problemId = isProblemDetail ? segments[1] : null;

  // /projects            → list page
  // /projects/:id        → workspace
  const isProjectsRoot      = path === "/projects";
  const isProjectWorkspace  = segments.length >= 2 && segments[0] === "projects" && !!segments[1];
  const projectId = isProjectWorkspace ? segments[1] : null;

  // Loading Session Screen
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <Icon name="spinner" size={32} color="var(--color-primary)" />
        <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Initializing CivicSync secure session...
        </span>
      </div>
    );
  }

  // Public Routes for Unauthenticated Users
  if (!isAuthenticated) {
    if (path === "/login") return <LoginPage />;
    if (path === "/register") return <RegisterPage />;
    return <LandingPage />;
  }

  // If Authenticated and trying to visit /login or /register or root /, send to dashboard
  if (path === "/login" || path === "/register" || path === "/") {
    navigate("/dashboard");
    return null;
  }

  // Authenticated Layout Wrapper
  return (
    <AppLayout>
      {/* Route: /dashboard */}
      {path === "/dashboard" && <DashboardPage />}

      {/* Route: /dashboard/trust */}
      {path === "/dashboard/trust" && <TrustDashboardPage />}

      {/* Route: /dashboard/analytics */}
      {path === "/dashboard/analytics" && <AnalyticsDashboardPage />}

      {/* Route: /explore */}
      {path === "/explore" && <ExplorePage />}

      {/* Route: /matches */}
      {path === "/matches" && <MatchingSkillsPage />}

      {/* Route: /my-reports */}
      {path === "/my-reports" && <MyReportsPage />}

      {/* Route: /report */}
      {path === "/report" && <ReportProblemPage />}

      {/* Route: /problems/:id */}
      {isProblemDetail && !segments[2] && <ProblemDetailPage id={problemId} />}

      {/* Route: /problems/:id/impact-passport */}
      {isProblemDetail && segments[2] === "impact-passport" && (
        role === "AUTHORITY" || role === "ADMIN" ? (
          <ImpactPassportPage />
        ) : (
          <ProblemDetailPage id={problemId} />
        )
      )}

      {/* Route: /projects  (list) */}
      {isProjectsRoot && <ProjectsListPage />}

      {/* Route: /projects/:id  (workspace) */}
      {isProjectWorkspace && projectId && <ProjectWorkspacePage id={projectId} />}

      {/* Route: /notifications */}
      {path === "/notifications" && <NotificationsPage />}

      {/* Route: /reputation */}
      {path === "/reputation" && <ReputationPage />}

      {/* Route: /rankings */}
      {path === "/rankings" && <RankingsPage />}

      {/* Route: /profile */}
      {path === "/profile" && <ProfilePage />}

      {/* Route: /faculty-students */}
      {path === "/faculty-students" && role === "UNIVERSITY" && <FacultyStudentsPage />}

      {/* Other routes placeholder */}
      {path !== "/dashboard" &&
        path !== "/dashboard/trust" &&
        path !== "/dashboard/analytics" &&
        path !== "/explore" &&
        path !== "/matches" &&
        path !== "/my-reports" &&
        path !== "/report" &&
        path !== "/notifications" &&
        path !== "/reputation" &&
        path !== "/rankings" &&
        path !== "/profile" &&
        path !== "/faculty-students" &&
        !isProjectsRoot &&
        !isProblemDetail &&
        !isProjectWorkspace && (
          <Card
            title={`Section: ${path.replace("/", "").toUpperCase()}`}
            subtitle="Integrated into CivicSync design system"
          >
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Viewing <strong>{path}</strong> as <strong>{role}</strong>.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <Button variant="outline" size="sm" onClick={() => navigate("/explore")}>
                  Explore Problems
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </RouterProvider>
  );
}