import { useAuth } from "../../context/useAuth";
import { useRouter } from "../../context/useRouter";
import { StatusBadge } from "../../components/common/Badges";
import { Button } from "../../components/common/Button";
import { useTranslation } from "../../context/useTranslation";

// Role-specific sections
import { CitizenSection } from "../../components/dashboard/CitizenSection";
import { StudentSection } from "../../components/dashboard/StudentSection";
import { AuthoritySection } from "../../components/dashboard/AuthoritySection";
import { ResearcherSection } from "../../components/dashboard/ResearcherSection";
import { UniversitySection } from "../../components/dashboard/UniversitySection";
import { InnovationSection } from "../../components/dashboard/InnovationSection";
import { AdminSection } from "../../components/dashboard/AdminSection";

export function DashboardPage() {
  const { user, role } = useAuth();
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const isHi = language === "hi";

  const getRoleDescription = () => {
    switch (role) {
      case "CITIZEN":
        return isHi ? "नागरिक सहभागिता और जमीनी सत्यापन केंद्र" : "Civic Engagement & Ground-Truth Verification Hub";
      case "STUDENT":
        return isHi ? "सामाजिक चुनौतियों की खोज करें और समाधान प्रस्तावित करें।" : "Discover societal challenges and contribute solutions.";
      case "RESEARCHER":
        return isHi ? "अनुप्रयुक्त वैज्ञानिक अनुसंधान और मूल कारण जांच केंद्र" : "Applied Scientific Research & Root Cause Investigation Hub";
      case "UNIVERSITY":
        return isHi ? "संस्थागत भागीदारी और विभागीय सहयोग केंद्र" : "Institutional Participation & Departmental Mobilization Hub";
      case "STARTUP":
        return isHi ? "नवाचार परिनियोजन और पायलट स्केलिंग केंद्र" : "Innovation Deployment & Pilot Scaling Hub";
      case "MSME":
        return isHi ? "तकनीकी इंजीनियरिंग और स्थानीय कार्यान्वयन केंद्र" : "Technical Engineering & Local Implementation Hub";
      case "AUTHORITY":
        return isHi ? "नगरपालिका कमांड सेंटर और वैधानिक निर्देश निगरानी" : "Municipal Command Center & Statutory Directive Oversight";
      case "ADMIN":
        return isHi ? "प्रणाली शासन और बहु-भूमिका मंच निरीक्षण" : "System Governance & Multi-Role Platform Oversight";
      default:
        return isHi ? "नागरिक आसूचना मंच" : "Civic Intelligence Platform";
    }
  };

  const renderRoleDashboard = () => {
    switch (role) {
      case "CITIZEN":
        return <CitizenSection />;
      case "STUDENT":
        return <StudentSection user={user} />;
      case "AUTHORITY":
        return <AuthoritySection />;
      case "RESEARCHER":
        return <ResearcherSection />;
      case "UNIVERSITY":
        return <UniversitySection />;
      case "STARTUP":
      case "MSME":
        return <InnovationSection role={role} />;
      case "ADMIN":
        return <AdminSection />;
      default:
        return <CitizenSection />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Shared Dashboard Welcome Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: role === "CITIZEN" ? 0 : "0.35rem" }}>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 500, fontFamily: "var(--font-serif)", letterSpacing: "-0.025em" }}>
              {t("dashboard.welcome")}, {user?.name || "Civic Leader"}
            </h1>
            <StatusBadge status={role} />
          </div>
          {role !== "CITIZEN" && (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {getRoleDescription()}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {role === "CITIZEN" && (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => navigate("/report")}
            >
              {t("dashboard.reportProblemBtn")}
            </Button>
          )}

          <Button
            variant="outline"
            icon="search"
            onClick={() => navigate("/explore")}
          >
            {t("dashboard.exploreBtn")}
          </Button>
        </div>
      </div>

      {/* Shared Shell: Render Role-Specific Operational Content */}
      {renderRoleDashboard()}
    </div>
  );
}
