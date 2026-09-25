import { useState, useEffect } from "react";
import { Select } from "../../components/common/FormControls";
import { Icon } from "../../components/common/Icons";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { StatusBadge } from "../../components/common/Badges";
import { LifecycleTimeline } from "../../components/problems/LifecycleTimeline";
import { ProblemJourney } from "../../components/problems/ProblemJourney";
import { SolutionsView } from "../../components/problems/SolutionsView";
import { ImplementationView } from "../../components/problems/ImplementationView";
import { ImpactView } from "../../components/problems/ImpactView";
import { AIAnalysisView } from "../../components/problems/AIAnalysisView";
import { TeamView } from "../../components/teams/TeamView";
import { problemApi, matchingApi, challengeApi, projectApi, universityApi } from "../../services/api";
import { getFileUrl } from "../../services/apiClient";
import { useRouter } from "../../context/useRouter.js";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { useTranslation } from "../../context/useTranslation.js";

export function ProblemDetailPage({ id }) {
  const { navigate, query } = useRouter();
  const { role, user } = useAuth();
  const { language } = useTranslation();

  const isCitizen = role === "CITIZEN";
  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";
  const isSolver = ["FACULTY", "RESEARCHER", "STARTUP", "MSME"].includes(role);
  const isStudent = role === "STUDENT";

  const toast = useToast();
  const [problem, setProblem] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectCreated, setProjectCreated] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Default tab or query param tab
  const [activeTab, setActiveTab] = useState(query?.tab || "overview");

  const refreshProblem = async () => {
    if (!id) return;
    try {
      const [probRes, histRes] = await Promise.all([
        problemApi.getProblemById(id),
        problemApi.getProblemStatusHistory(id).catch(() => ({ history: [] })),
      ]);
      setProblem(probRes.problem);
      setStatusHistory(histRes.history || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load problem details");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorityVerifyProblem = async () => {
    if (!problem?.id) return;
    setVerifyingProblem(true);
    try {
      await problemApi.updateProblemStatus(problem.id, {
        status: "VERIFIED",
        note: "Problem verified by Municipal Authority. Confirmed jurisdiction and opened for student solution ideation.",
      });
      toast.success("Problem successfully verified by Municipal Authority! Opened for student solutions.");
      await refreshProblem();
    } catch (err) {
      toast.error(err.message || "Failed to verify problem");
    } finally {
      setVerifyingProblem(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!id) return;
      try {
        const [probRes, histRes] = await Promise.all([
          problemApi.getProblemById(id),
          problemApi.getProblemStatusHistory(id).catch(() => ({ history: [] })),
        ]);
        if (!ignore) {
          setProblem(probRes.problem);
          setStatusHistory(histRes.history || []);
          
          if (role === 'UNIVERSITY') {
             try {
               const evalRes = await universityApi.getChallengeEvaluation(id);
               if (evalRes.evaluation) setEvaluation(evalRes.evaluation);
             } catch (e) { console.error("Failed to fetch evaluation", e); }
          }
          
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load problem details");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [id, role]);

  const handleEvaluateChallenge = async () => {
    setEvaluating(true);
    try {
      if (!evaluation) {
        const res = await universityApi.createChallengeEvaluation(problem.id, { review_note: "Accepted for project" });
        await universityApi.updateChallengeEvaluation(problem.id, { evaluation_status: "IN_PROJECT", review_note: "Accepted for project" });
        setEvaluation({ ...res.evaluation, evaluation_status: "IN_PROJECT" });
      } else {
        const res = await universityApi.updateChallengeEvaluation(problem.id, { evaluation_status: "IN_PROJECT" });
        setEvaluation(res.evaluation);
      }
      alert("Evaluation successful. You can now create a project.");
    } catch (err) {
      alert("Failed to evaluate: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCreateProject = async () => {
    setCreating(true);
    try {
      await projectApi.createProject({
        title: `Institutional Project for ${problem?.title?.substring(0, 30)}...`,
        description: `Project initialized to solve Challenge #${problem?.id}`,
        problem_id: problem?.id,
        university_id: user?.id,
      });
      setProjectCreated(true);
      alert("Project Workspace created successfully!");
    } catch (err) {
      alert("Failed to create project: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <Icon name="spinner" size={36} color="var(--color-primary)" />
        <p style={{ margin: "1rem 0 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Loading problem details...
        </p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem 1.5rem", maxWidth: "600px", margin: "2rem auto" }}>
        <Icon name="alert-triangle" size={36} color="var(--color-danger)" />
        <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1.25rem" }}>Problem Not Found</h3>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {error || "The requested problem ID does not exist or you do not have permission to view it."}
        </p>
        <Button variant="primary" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </Card>
    );
  }

  // Parse required_expertise array
  let skills = [];
  if (Array.isArray(problem.required_expertise)) {
    skills = problem.required_expertise;
  } else if (typeof problem.required_expertise === "string") {
    try {
      skills = JSON.parse(problem.required_expertise);
    } catch {
      skills = problem.required_expertise.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Mock-aligned AI analysis object for AIAnalysisView re-use
  const aiAnalysisObj = {
    domain: problem.category,
    subdomain: problem.subcategory,
    summary: problem.ai_summary || problem.description,
    ai_description: problem.ai_description || problem.ai_summary || problem.description,
    severity: problem.severity || 5,
    urgency: problem.urgency || 5,
    confidence: problem.confidence ? Number(problem.confidence) : 0.82,
    required_expertise: skills,
    keywords: Array.isArray(problem.keywords) ? problem.keywords : [],
  };

  // --------------------------------------------------------------------------
  // Role-Specific Tab Definition (Cleaned: Root Cause, Matching, Dependencies, Community removed)
  // --------------------------------------------------------------------------
  let availableTabs = [];

  if (isCitizen) {
    // Citizen sees: Problem Details & Solutions decision
    availableTabs = [
      { key: "overview", label: "Problem Details", icon: "file-text" },
      { key: "solutions", label: "Solutions & Decision", icon: "check-circle" },
    ];
  } else if (isAuthorityOrAdmin) {
    // Authority / Admin sees: Overview, Solutions, Impact, Collaboration, History
    availableTabs = [
      { key: "overview", label: "Overview & Intelligence", icon: "cpu" },
      { key: "solutions", label: "Solutions & Evaluation", icon: "check-circle" },
      { key: "impact", label: "Impact & Verification", icon: "star" },
      { key: "collaboration", label: "Collaboration", icon: "users" },
      { key: "history", label: "Status History", icon: "clock" },
    ];
  } else if (isStudent) {
    // Student sees simplified workflow: Overview & Solutions tracking
    availableTabs = [
      { key: "overview", label: "Overview", icon: "cpu" },
      { key: "solutions", label: "Solutions & Tracking", icon: "check-circle" },
    ];
  } else if (role === "UNIVERSITY") {
    // University sees evaluation, matching, solutions, collaboration, and history
    availableTabs = [
      { key: "overview", label: "Overview & Evaluation", icon: "cpu" },
      { key: "matching", label: "Expertise Matching", icon: "users" },
      { key: "solutions", label: "Solutions & Evaluation", icon: "check-circle" },
      { key: "collaboration", label: "Collaboration", icon: "users" },
      { key: "history", label: "Status History", icon: "clock" },
    ];
  } else {
    // Solvers (Faculty, Researchers, Startups, MSMEs)
    availableTabs = [
      { key: "overview", label: "Overview & Intelligence", icon: "cpu" },
      { key: "solutions", label: "Solutions & Evaluation", icon: "check-circle" },
      { key: "collaboration", label: "Collaboration", icon: "users" },
    ];
  }

  // Fallback to overview if currently requested tab is not allowed for role
  const currentTab = availableTabs.some((t) => t.key === activeTab) ? activeTab : "overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span
            style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }}
            onClick={() => navigate(isCitizen ? "/my-reports" : "/dashboard")}
          >
            {isCitizen ? "My Reports" : "Dashboard"}
          </span>
          <span>/</span>
          <span>Problems</span>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>#{problem.id}</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="outline"
            size="sm"
            icon="arrow-left"
            onClick={() => navigate(isCitizen ? "/my-reports" : "/explore")}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Hero Problem Case Header Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, var(--color-primary-subtle) 0%, transparent 70%)",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <StatusBadge status={problem.status} />
              {problem.category && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--color-primary-subtle)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary-border)",
                  }}
                >
                  {problem.category} {problem.subcategory ? `• ${problem.subcategory}` : ""}
                </span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ID: <strong>#{problem.id}</strong> &bull; Reported on {new Date(problem.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            <h1 style={{ margin: "0 0 0.65rem", fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {problem.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Icon name="map-pin" size={16} /> <strong>{problem.district || "District"}</strong>
                {problem.city && `, ${problem.city}`}
                {problem.address && ` (${problem.address})`}
              </span>
              {problem.affected_people && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icon name="users" size={16} /> <strong>{Number(problem.affected_people).toLocaleString()}</strong> people affected
                </span>
              )}
            </div>
          </div>

          {/* Authority / Admin Actions */}
          {isAuthorityOrAdmin && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              {(problem.status === "REPORTED" || problem.status === "UNDER_REVIEW") ? (
                <Button
                  variant="primary"
                  icon="check-circle"
                  loading={verifyingProblem}
                  onClick={handleAuthorityVerifyProblem}
                  style={{ backgroundColor: "#15803d", borderColor: "#15803d", fontWeight: 700 }}
                >
                  ✓ Verify Problem
                </Button>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "#dcfce7",
                    color: "#15803d",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "1px solid #86efac",
                  }}
                >
                  ✓ Verified by Authority
                </span>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/problems/${id}/impact-passport`)}
              >
                View Impact Passport
              </Button>
            </div>
          )}
        </div>

        {/* Required Expertise Chips (Visible ONLY to Solvers and Authority) */}
        {!isCitizen && skills.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Required Expertise:
            </span>
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Authority Problem Verification Callout Banner */}
      {isAuthorityOrAdmin && (problem.status === "REPORTED" || problem.status === "UNDER_REVIEW") && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "var(--radius-xl)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 2px 10px rgba(22, 101, 52, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "280px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#166534" }}>
                Municipal Authority Problem Verification Required
              </h4>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#15803d", lineHeight: 1.4 }}>
                Citizen submitted civic report #{problem.id}. Verify this problem to confirm statutory jurisdiction and open it for student solution ideation.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            icon="check-circle"
            loading={verifyingProblem}
            onClick={handleAuthorityVerifyProblem}
            style={{
              backgroundColor: "#16a34a",
              borderColor: "#16a34a",
              fontWeight: 700,
              fontSize: "0.95rem",
              padding: "0.65rem 1.4rem",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
            }}
          >
            Verify Problem as Authority
          </Button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Unified Problem-to-Implementation Resolution Journey                 */}
      {/* -------------------------------------------------------------------- */}
      <ProblemJourney
        problem={problem}
        onStatusUpdated={refreshProblem}
        onSelectTab={(tabKey) => setActiveTab(tabKey)}
      />

      {/* Primary Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          overflowX: "auto",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        {availableTabs.map((t) => {
          const isActive = currentTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 0.95rem",
                fontSize: "0.85rem",
                fontWeight: isActive ? 700 : 500,
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all var(--transition-fast)",
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Overview / Problem Details */}
        {currentTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* AI Synthesized Problem Description & Intelligence Banner */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-xl)",
                border: "1.5px solid #e0e7ff",
                boxShadow: "0 4px 20px -2px rgba(99, 102, 241, 0.12)",
                padding: "1.5rem 1.75rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {problem.description}
              </p>

              {role === "UNIVERSITY" && (
                <div style={{ marginTop: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-primary-border)", overflow: "hidden" }}>
                  {/* Evaluation header */}
                  <div style={{
                    padding: "1rem 1.25rem",
                    backgroundColor: "var(--color-primary-subtle)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid var(--color-primary-border)",
                  }}>
                    <div>
                      <h4 style={{ margin: "0 0 0.2rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-primary)" }}>
                        Institutional Challenge Evaluation
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        Evaluate this challenge to build an institutional project workspace
                      </p>
                    </div>
                    {evaluation?.evaluation_status && (
                      <StatusBadge status={evaluation.evaluation_status} />
                    )}
                  </div>

                  {/* Evaluation body */}
                  <div style={{ padding: "1.25rem", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* State machine — all 7 valid evaluation statuses */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.6rem", letterSpacing: "0.05em" }}>
                        Update Evaluation Status
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {[
                          { value: "NEW",              label: "New",              color: "var(--text-muted)" },
                          { value: "UNDER_REVIEW",     label: "Under Review",     color: "var(--color-warning)" },
                          { value: "NEEDS_INFORMATION",label: "Needs Info",       color: "var(--color-warning)" },
                          { value: "ACCEPTED",         label: "Accepted",         color: "var(--color-success)" },
                          { value: "TEAM_FORMATION",   label: "Team Formation",   color: "var(--color-info)" },
                          { value: "REJECTED",         label: "Rejected",         color: "var(--color-danger)" },
                          { value: "IN_PROJECT",       label: "✓ In Project",    color: "var(--color-primary)" },
                        ].map(({ value, label, color }) => {
                          const current = evaluation?.evaluation_status || "NEW";
                          const isSelected = current === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={evaluating}
                              onClick={async () => {
                                setEvaluating(true);
                                try {
                                  if (!evaluation) {
                                    const res = await universityApi.createChallengeEvaluation(problem.id, { review_note: "Initial review" });
                                    await universityApi.updateChallengeEvaluation(problem.id, { evaluation_status: value });
                                    setEvaluation({ ...res.evaluation, evaluation_status: value });
                                  } else {
                                    const res = await universityApi.updateChallengeEvaluation(problem.id, { evaluation_status: value });
                                    setEvaluation(res.evaluation || { ...evaluation, evaluation_status: value });
                                  }
                                } catch (err) {
                                  alert("Failed to update evaluation: " + err.message);
                                } finally {
                                  setEvaluating(false);
                                }
                              }}
                              style={{
                                padding: "0.3rem 0.8rem",
                                borderRadius: "var(--radius-full)",
                                border: `1px solid ${isSelected ? color : "var(--border-color)"}`,
                                backgroundColor: isSelected ? color : "#ffffff",
                                color: isSelected ? "#ffffff" : "var(--text-secondary)",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                cursor: evaluating ? "wait" : "pointer",
                                transition: "all var(--transition-fast)",
                                opacity: evaluating ? 0.6 : 1,
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Create project CTA — only when IN_PROJECT */}
                    {evaluation?.evaluation_status === "IN_PROJECT" && (
                      <div style={{
                        padding: "1rem",
                        backgroundColor: "var(--color-success-subtle)",
                        border: "1px solid var(--color-success-border)",
                        borderRadius: "var(--radius-md)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem",
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-success)", marginBottom: "0.2rem" }}>
                            ✓ Challenge accepted — ready to build a project workspace
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            Creating a workspace will allow you to assign team members, mentors, industry partners, request funding, record tests, and publish outcomes.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.6rem" }}>
                          {!projectCreated ? (
                            <Button
                              variant="primary"
                              icon="briefcase"
                              onClick={handleCreateProject}
                              disabled={creating}
                            >
                              {creating ? "Creating..." : "Create Project Workspace"}
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              icon="arrow-right"
                              onClick={() => navigate("/projects")}
                            >
                              View My Projects
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status not IN_PROJECT — show guidance */}
                    {(!evaluation || !["IN_PROJECT"].includes(evaluation.evaluation_status)) && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Icon name="info" size={13} />
                        Set status to <strong style={{ color: "var(--color-primary)" }}>In Project</strong> to unlock project workspace creation.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evidence Section */}
              {problem.evidence_url && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <h5 style={{ margin: "0 0 0.65rem", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>{problem.evidence_type?.includes("video") || problem.evidence_url.endsWith(".mp4") ? "🎥" : "📷"}</span>
                    <span>Attached Field Evidence</span>
                    {problem.evidence_name && (
                      <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        ({problem.evidence_name})
                      </span>
                    )}
                  </h5>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(99, 102, 241, 0.1)",
                      color: "#6366f1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    ✨
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      AI-Synthesized Problem Description
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Autonomous civic diagnostic analysis & technical assessment
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.65rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "#e0e7ff",
                      color: "#4338ca",
                      border: "1px solid #c7d2fe",
                    }}
                  >
                    Confidence: {Math.round((Number(problem.ai_confidence || problem.confidence || 0.92)) * 100)}%
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.65rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fca5a5",
                    }}
                  >
                    Severity: {problem.severity || "HIGH"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "rgba(248, 250, 252, 0.85)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.1rem 1.25rem",
                  fontSize: "0.95rem",
                  lineHeight: 1.65,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {problem.ai_description || problem.ai_summary || "AI assessment in progress. Analyzing environmental telemetry, municipal jurisdiction, and engineering parameters."}
              </div>
            </div>

            {/* Split view: Citizen Ground Context and Technical NLP Analysis */}
            <div className={isCitizen || isStudent ? "cs-grid-1" : "cs-grid-2"} style={{ alignItems: "start", gap: "1.5rem" }}>
              <Card
                title={isCitizen || isStudent ? "Citizen Field Report & Evidence" : "Problem Description & Ground Context"}
                subtitle={isCitizen ? "Citizen submission details" : (isStudent ? "Understand the civic challenge" : "Citizen reported statement")}
              >
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Citizen's Submitted Statement:
                  </span>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {problem.description}
                </p>

                {/* Evidence Section */}
                {problem.evidence_url && (
                  <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                    <h5 style={{ margin: "0 0 0.65rem", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span>{problem.evidence_type?.includes("video") || problem.evidence_url.endsWith(".mp4") ? "🎥" : "📷"}</span>
                      <span>Attached Field Evidence</span>
                      {problem.evidence_name && (
                        <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          ({problem.evidence_name})
                        </span>
                      )}
                    </h5>
                    <div
                      style={{
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        backgroundColor: "#0f172a",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        maxHeight: "360px",
                      }}
                    >
                      {problem.evidence_type?.includes("video") ||
                      problem.evidence_url.endsWith(".mp4") ||
                      problem.evidence_url.endsWith(".webm") ||
                      problem.evidence_url.endsWith(".mov") ? (
                        <video
                          src={problem.evidence_url.startsWith("http") ? problem.evidence_url : `http://localhost:5000${problem.evidence_url.startsWith("/") ? "" : "/"}${problem.evidence_url}`}
                          controls
                          style={{ maxWidth: "100%", maxHeight: "360px" }}
                        />
                      ) : (
                        <img
                          src={problem.evidence_url.startsWith("http") ? problem.evidence_url : `http://localhost:5000${problem.evidence_url.startsWith("/") ? "" : "/"}${problem.evidence_url}`}
                          alt="Field Evidence"
                          style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain" }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Geographic Details */}
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.85rem" }}>
                  <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700 }}>Geographic Details</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem", color: "var(--text-muted)" }}>
                    <div>District: <strong style={{ color: "var(--text-primary)" }}>{problem.district || "N/A"}</strong></div>
                    <div>City / Block: <strong style={{ color: "var(--text-primary)" }}>{problem.city || "N/A"}</strong></div>
                    <div>Address: <strong style={{ color: "var(--text-primary)" }}>{problem.address || "N/A"}</strong></div>
                    {problem.affected_people && (
                      <div>Affected Population: <strong style={{ color: "var(--text-primary)" }}>{problem.affected_people}</strong></div>
                    )}
                  </div>
                </div>
              </Card>

              {/* AI Analysis View - AI Intelligence & Capability Breakdown */}
              <AIAnalysisView analysis={aiAnalysisObj} aiAnalysis={aiAnalysisObj} priorityScore={problem.priority_score} />
            </div>
          </div>
        )}

        {/* Solutions & Evaluation (Available to Citizen, Student, Solvers, Authority) */}
        {currentTab === "solutions" && (
          <SolutionsView
            problemId={problem.id}
            problem={problem}
            onProblemUpdated={refreshProblem}
          />
        )}

        {/* Impact & Verification (Authority / Admin) */}
        {isAuthorityOrAdmin && currentTab === "impact" && (
          <ImpactView problemId={problem.id} />
        )}

        {/* Collaboration Teams */}
        {!isCitizen && currentTab === "collaboration" && (
          <TeamView problem={problem} />
        )}

        {/* Tab 10: Status History / Audit Log (Authority / Admin Only) */}
        {isAuthorityOrAdmin && currentTab === "history" && (
          <Card title="Statutory Lifecycle Audit Trail" subtitle="Chronological record of status mutations">
            {statusHistory.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No status transitions recorded yet. Problem is at initial <strong>{problem.status}</strong> stage.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {statusHistory.map((hist, i) => (
                  <div
                    key={hist.id || i}
                    style={{
                      padding: "0.85rem 1rem",
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--color-primary)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {hist.old_status}
                        </span>
                        <span>&rarr;</span>
                        <StatusBadge status={hist.new_status} />
                      </div>
                      {hist.note && (
                        <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          &ldquo;{hist.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {hist.created_at ? new Date(hist.created_at).toLocaleString() : "Date recorded"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
