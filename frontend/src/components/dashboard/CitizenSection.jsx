import { useState, useEffect } from "react";
import { problemApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { ProblemCard } from "../problems/ProblemCard";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";

export function CitizenSection() {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [myProblems, setMyProblems] = useState([]);
  const [priorityProblems, setPriorityProblems] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  // Quick Problem Report State with Enlarged Input Boxes
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(null);

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickDesc.trim()) {
      toast.error(language === "hi" ? "कृपया शीर्षक और विवरण दोनों दर्ज करें" : "Please provide both problem title and description");
      return;
    }
    setSubmittingQuick(true);
    try {
      const res = await problemApi.createProblem({
        title: quickTitle.trim(),
        description: quickDesc.trim(),
        district: "Ranchi",
        city: "Ranchi",
        affected_people: 350,
      });
      const created = res.problem || res;
      setMyProblems((prev) => [created, ...prev]);
      setQuickTitle("");
      setQuickDesc("");
      setQuickSuccess(created);
      toast.success(language === "hi" ? "समस्या सफलतापूर्वक दर्ज की गई!" : "Problem successfully reported with AI analysis!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit problem");
    } finally {
      setSubmittingQuick(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [myRes, allRes, repRes] = await Promise.allSettled([
          problemApi.getMyProblems(),
          problemApi.getProblems({ limit: 30 }),
          reputationApi.getMyReputation(),
        ]);

        if (!ignore) {
          if (myRes.status === "fulfilled") {
            const list = myRes.value?.problems || [];
            // Strictly ensure only current user's submitted reports are shown
            const userOnly = user?.id ? list.filter((p) => Number(p.reporter_id) === Number(user.id)) : list;
            setMyProblems(userOnly);
          }
          if (allRes.status === "fulfilled") {
            const all = allRes.value?.problems || [];
            // Filter out technical test records
            const isTestRecord = (item) => {
              const text = `${item.title || ""} ${item.description || ""}`;
              return /^(M\d+|Test\s+M\d+|Passport\s+Problem|Cit\d+|Auth\d+)/i.test(item.title || "") ||
                /\b(M\d+|test-runner|synthetic-test-suite)\b/i.test(text);
            };
            const cleanProblems = all.filter((p) => !isTestRecord(p));
            // Filter high priority problems
            const high = cleanProblems
              .filter((p) => (p.priority_score ?? ((p.severity || 0) * 5 + (p.urgency || 0) * 5)) >= 60)
              .slice(0, 4);
            setPriorityProblems(high);
          }
          if (repRes.status === "fulfilled") {
            setReputation(repRes.value);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load citizen records");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  // Compute live metrics from actual retrieved data
  const totalCount = myProblems.length;
  const underReviewCount = myProblems.filter((p) => p.status === "UNDER_REVIEW").length;
  const inProgressCount = myProblems.filter((p) =>
    ["ASSIGNED", "ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH", "SOLUTION_EVALUATION", "APPROVED", "EXECUTION_SUBMITTED", "PILOT", "IMPLEMENTING"].includes(p.status)
  ).length;
  const resolvedCount = myProblems.filter((p) => ["RESOLVED", "CLOSED"].includes(p.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Stat Grid from Real Data */}
      <div className="cs-grid-4">
        <StatCard
          title={t("dashboard.stats.reported")}
          value={loading ? "..." : String(totalCount)}
          subtitle={t("dashboard.stats.reportedSub")}
          icon="layers"
        />
        <StatCard
          title={t("dashboard.stats.underReview")}
          value={loading ? "..." : String(underReviewCount)}
          subtitle={t("dashboard.stats.underReviewSub")}
          icon="clock"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title={t("dashboard.stats.inProgress")}
          value={loading ? "..." : String(inProgressCount)}
          subtitle={t("dashboard.stats.inProgressSub")}
          icon="activity"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={t("dashboard.stats.resolved")}
          value={loading ? "..." : String(resolvedCount)}
          subtitle={t("dashboard.stats.resolvedSub")}
          icon="shield-check"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Citizen Reputation & Civic Standing Bar */}
      {reputation && (
        <Card
          actions={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button variant="outline" size="sm" onClick={() => navigate("/reputation")}>
                {t("dashboard.reputation.viewBtn")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")}>
                {t("dashboard.reputation.notificationsBtn")}
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="award" size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  {t("dashboard.reputation.title")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {reputation.score || 0} {t("dashboard.reputation.points")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary)",
                      color: "#ffffff",
                    }}
                  >
                    {reputation.tier || "BRONZE"} TIER
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {reputation.badges?.map((b) => (
                <span
                  key={b.badge_key || b.name}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  🏅 {b.name || b.badge_key}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Report Section with Large Title & Description inputs */}
      <Card
        title={language === "hi" ? "नागरिक समस्या दर्ज करें (AI विश्लेषण सहित)" : "Report a Civic Issue with Autonomous AI Analysis"}
        subtitle={language === "hi" ? "समस्या का शीर्षक और विवरण नीचे लिखें — AI तुरंत वर्गीकरण और विशेषज्ञ मैपिंग करेगा" : "Enter the problem title and full description below — AI will automatically classify domain, urgency, and route to researchers"}
        actions={
          <Button variant="outline" size="sm" icon="external-link" onClick={() => navigate("/report")}>
            {language === "hi" ? "विस्तृत विज़ार्ड →" : "Full Report Wizard →"}
          </Button>
        }
      >
        <form onSubmit={handleQuickSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {quickSuccess && (
            <div
              style={{
                padding: "0.85rem 1.15rem",
                borderRadius: "10px",
                backgroundColor: "var(--color-success-subtle)",
                border: "1px solid var(--color-success-border)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Icon name="shield-check" size={20} />
                <span style={{ fontWeight: 600 }}>
                  {language === "hi"
                    ? `समस्या #${quickSuccess.id} दर्ज की गई: ${quickSuccess.category || "नागरिक"}`
                    : `Issue #${quickSuccess.id} Registered & Classified as ${quickSuccess.category || "General"}`} (Priority: {quickSuccess.priority_score || "Normal"})
                </span>
              </div>
              <Button size="xs" variant="outline" onClick={() => navigate(`/problems/${quickSuccess.id}`)}>
                {language === "hi" ? "केस देखें →" : "View Case Dossier →"}
              </Button>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
              {language === "hi" ? "समस्या का शीर्षक" : "Problem Title"} <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="text"
              placeholder={language === "hi" ? "उदा. कोकर इंडस्ट्रियल क्षेत्र में ट्रांसफार्मर स्पार्किंग और तेल रिसाव..." : "e.g., Underground drinking water pipe fracture near Albert Ekka Chowk, Ranchi..."}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              required
              style={{
                width: "100%",
                fontSize: "1.15rem",
                padding: "1rem 1.25rem",
                minHeight: "54px",
                borderRadius: "12px",
                fontWeight: 500,
                border: "1.5px solid var(--border-color)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
              {language === "hi" ? "समस्या का विस्तृत विवरण" : "Problem Description & Ground Details"} <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <textarea
              rows={6}
              placeholder={language === "hi" ? "समस्या के प्रभाव, स्थान के सटीक बिंदु, प्रभावित नागरिकों की संख्या और तात्कालिक खतरे का विस्तृत वर्णन करें..." : "Describe the exact situation, root observations, safety hazards, affected residents, and duration of the issue..."}
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              required
              style={{
                width: "100%",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                padding: "1.1rem 1.25rem",
                minHeight: "160px",
                borderRadius: "12px",
                border: "1.5px solid var(--border-color)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="map-pin" size={16} color="var(--color-primary)" />
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {language === "hi" ? "स्थान: राँची (झारखंड)" : "Location: Ranchi (Jharkhand)"}
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submittingQuick}
              icon="sparkles"
              style={{ padding: "0.8rem 1.85rem", fontSize: "1rem", fontWeight: 600 }}
            >
              {language === "hi" ? "दर्ज करें और AI विश्लेषण चलाएं" : "Submit & Run AI Analysis"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Section: Problems I Reported */}
      <Card
        title={t("dashboard.recentReports.title")}
        subtitle={t("dashboard.recentReports.subtitle")}
        actions={
          <Button variant="primary" size="sm" icon="plus-circle" onClick={() => navigate("/report")}>
            {t("dashboard.reportProblemBtn")}
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton lines={3} />
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : myProblems.length === 0 ? (
          <EmptyState
            icon="layers"
            title={t("dashboard.recentReports.emptyTitle")}
            description={t("dashboard.recentReports.emptyDesc")}
            actionLabel={t("dashboard.recentReports.reportNow")}
            onAction={() => navigate("/report")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {myProblems.map((problem) => (
              <div
                key={problem.id}
                onClick={() => navigate(`/problems/${problem.id}`)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <StatusBadge status={problem.status} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      #{problem.id} &bull; {new Date(problem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                    {problem.title}
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    📍 {problem.district || "District"} {problem.city ? `(${problem.city})` : ""}
                  </div>
                </div>

                <Button variant="outline" size="sm" icon="arrow-right">
                  {language === "hi" ? "केस देखें" : "View Case"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section: Priority Problems Across Platform */}
      {priorityProblems.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                {t("dashboard.prioritySection.title")}
              </h3>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {t("dashboard.prioritySection.subtitle")}
              </p>
            </div>

            <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
              {t("dashboard.exploreBtn")}
            </Button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {priorityProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
