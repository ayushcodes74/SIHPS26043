import { useState, useEffect } from "react";
import { problemApi } from "../../services/api.js";
import { Card, StatCard } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";
import { useRouter } from "../../context/useRouter.js";
import { useTranslation } from "../../context/useTranslation.js";
import { useAuth } from "../../context/useAuth.js";

export function MyReportsPage() {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function fetchMyReports() {
      setLoading(true);
      setError("");
      try {
        const res = await problemApi.getMyProblems();
        if (!ignore) {
          // Filter to strictly ensure reporter_id matches current user if provided
          let myItems = res?.problems || [];
          if (user?.id) {
            myItems = myItems.filter((p) => Number(p.reporter_id) === Number(user.id));
          }
          setReports(myItems);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load user reports:", err);
          setError(err.message || "Failed to load your submitted reports");
          setLoading(false);
        }
      }
    }

    fetchMyReports();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  // Real summary counts from authenticated user's reports
  const totalCount = reports.length;
  const underReviewCount = reports.filter((p) => p.status === "UNDER_REVIEW").length;
  const inProgressCount = reports.filter((p) =>
    [
      "ASSIGNED",
      "ROOT_CAUSE_ANALYSIS",
      "SOLUTION_SEARCH",
      "SOLUTION_EVALUATION",
      "APPROVED",
      "EXECUTION_SUBMITTED",
      "PILOT",
      "IMPLEMENTING",
      "IN_PROGRESS",
    ].includes(p.status)
  ).length;
  const resolvedCount = reports.filter((p) => ["RESOLVED", "CLOSED"].includes(p.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.75rem", fontWeight: 800 }}>
            {t("nav.myReports")}
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {language === "hi"
              ? "आपके द्वारा दर्ज की गई नागरिक और सामुदायिक समस्याएं तथा उनकी लाइव प्रगति।"
              : "Track the status, verification progress, and resolution updates of your submitted civic problems."}
          </p>
        </div>

        <Button
          variant="primary"
          icon="plus-circle"
          onClick={() => navigate("/report")}
        >
          {t("dashboard.reportProblemBtn")}
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="cs-grid-4">
        <StatCard
          title={t("dashboard.stats.reported")}
          value={loading ? "..." : String(totalCount)}
          subtitle={language === "hi" ? "आपकी कुल प्रस्तुतियां" : "Your total reports"}
          icon="layers"
        />
        <StatCard
          title={t("dashboard.stats.underReview")}
          value={loading ? "..." : String(underReviewCount)}
          subtitle={language === "hi" ? "सत्यापन की प्रतीक्षा" : "Awaiting review"}
          icon="clock"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title={t("dashboard.stats.inProgress")}
          value={loading ? "..." : String(inProgressCount)}
          subtitle={language === "hi" ? "समाधान कार्य जारी" : "Under active work"}
          icon="activity"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={t("dashboard.stats.resolved")}
          value={loading ? "..." : String(resolvedCount)}
          subtitle={language === "hi" ? "सत्यापित समाधान" : "Successfully resolved"}
          icon="shield-check"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Reports List */}
      <div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <LoadingSkeleton height="110px" count={3} />
          </div>
        ) : error ? (
          <Card style={{ padding: "2rem", textAlign: "center" }}>
            <Icon name="alert-triangle" size={32} color="var(--color-danger)" />
            <div style={{ color: "var(--color-danger)", marginTop: "0.75rem", fontWeight: 600 }}>
              {error}
            </div>
          </Card>
        ) : reports.length === 0 ? (
          <Card style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <EmptyState
              icon="file-text"
              title={language === "hi" ? "अभी तक कोई समस्या दर्ज नहीं की गई" : "No problems reported yet"}
              description={
                language === "hi"
                  ? "आपने अभी तक कोई समस्या दर्ज नहीं की है। अपने क्षेत्र में किसी समस्या की रिपोर्ट करने के लिए नीचे दिए गए बटन पर क्लिक करें।"
                  : "You have not submitted any civic reports yet. Report a ground-truth issue in your neighborhood to connect it with municipal authorities and solvers."
              }
              action={
                <Button variant="primary" icon="plus-circle" onClick={() => navigate("/report")}>
                  {t("dashboard.reportProblemBtn")}
                </Button>
              }
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reports.map((problem) => {
              const formattedId = `PRB-${String(problem.id).padStart(4, "0")}`;
              const reportedDate = problem.created_at
                ? new Date(problem.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent";

              const locationString = [
                problem.district,
                problem.city,
                problem.address,
              ]
                .filter(Boolean)
                .join(", ");

              const hasEvidence = !!problem.evidence_url;
              const isVideo = problem.evidence_type?.includes("video") || problem.evidence_url?.endsWith(".mp4");

              return (
                <Card
                  key={problem.id}
                  style={{
                    padding: "1.25rem 1.5rem",
                    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                  }}
                  className="cs-card-hover"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    {/* Left content */}
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          flexWrap: "wrap",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          #{problem.id}
                        </span>
                        <StatusBadge status={problem.status || "OPEN"} />
                        {problem.category && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--color-primary-subtle)",
                              color: "var(--color-primary)",
                              border: "1px solid var(--color-primary-border)",
                            }}
                          >
                            {problem.category}
                          </span>
                        )}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {language === "hi" ? "दर्ज की गई: " : "Reported: "}
                          {reportedDate}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 0.5rem",
                          fontSize: "1.15rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          lineHeight: 1.35,
                        }}
                      >
                        {problem.title}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                          fontSize: "0.825rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {locationString && (
                          <span>
                            📍 <strong>{locationString}</strong>
                          </span>
                        )}
                        {hasEvidence && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              color: "var(--color-primary)",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            {isVideo ? "🎥 Video Evidence" : "📷 Photo Evidence"}
                          </span>
                        )}
                        {problem.updated_at && problem.updated_at !== problem.created_at && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {language === "hi" ? "अद्यतन: " : "Updated: "}
                            {new Date(problem.updated_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right action button */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon="arrow-right"
                        onClick={() => navigate(`/problems/${problem.id}`)}
                      >
                        {language === "hi" ? "रिपोर्ट देखें" : "View Report"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
