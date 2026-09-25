import { useState, useEffect } from "react";
import { universityApi, projectApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";

// Workflow step display for the institutional lifecycle
const WORKFLOW_STEPS = [
  { icon: "search",       label: "Explore",        sub: "Find relevant challenges",     path: "/explore" },
  { icon: "check-circle", label: "Evaluate",        sub: "Accept / start review",        path: "/matches" },
  { icon: "briefcase",    label: "Build Project",   sub: "Create institutional workspace", path: "/projects" },
  { icon: "users",        label: "Form Team",       sub: "Add faculty & students",        path: null },
  { icon: "award",        label: "Assign Mentor",   sub: "Faculty mentor guidance",        path: null },
  { icon: "rocket",       label: "Industry",        sub: "Collaborate with Startups",     path: null },
  { icon: "dollar-sign",  label: "Funding",         sub: "Request project funds",          path: null },
  { icon: "activity",     label: "Test",            sub: "Record test results",            path: null },
  { icon: "star",         label: "Outcomes",        sub: "Patents / publications",         path: null },
  { icon: "trending-up",  label: "Impact",          sub: "Measure societal impact",        path: null },
];

export function UniversitySection() {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const isHi = language === "hi";

  const [loading, setLoading] = useState(true);
  const [counts, setCounts]     = useState({ facultyCount: 0, studentCount: 0 });
  const [challenges, setChallenges]  = useState([]);     // from universityApi.getMatchedChallenges
  const [projects, setProjects]      = useState([]);     // from projectApi.getProjects

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [countsRes, challRes, projRes] = await Promise.allSettled([
          universityApi.getDashboardCounts(),
          universityApi.getMatchedChallenges(),
          projectApi.getProjects(),
        ]);

        if (!ignore) {
          if (countsRes.status === "fulfilled" && countsRes.value) {
            setCounts(countsRes.value);
          }
          if (challRes.status === "fulfilled" && challRes.value?.challenges) {
            setChallenges(challRes.value.challenges);
          }
          if (projRes.status === "fulfilled" && projRes.value?.projects) {
            setProjects(projRes.value.projects);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { ignore = true; };
  }, []);

  // Derived metrics — computed from real data, never hardcoded
  const matchedCount        = challenges.length;
  const underEvalCount      = challenges.filter(c =>
    c.evaluation_status && !["", null, undefined, "IN_PROJECT"].includes(c.evaluation_status)
  ).length;
  const activeProjectCount  = projects.filter(p =>
    !["COMPLETED"].includes(p.project_status)
  ).length;
  const completedCount      = projects.filter(p => p.project_status === "COMPLETED").length;

  const recentProjects = [...projects].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  ).slice(0, 5);

  const recentChallenges = challenges
    .filter(c => !c.evaluation_status || c.evaluation_status === "NEW")
    .slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div style={{
        padding: "2.5rem 3rem",
        backgroundColor: "#ffffff",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* subtle gradient accent */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: "320px", height: "100%",
          background: "linear-gradient(135deg, transparent 40%, var(--color-primary-subtle) 100%)",
          opacity: 0.5, pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "640px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-primary)", marginBottom: "0.5rem" }}>
            Institutional Research Portal
          </div>
          <h1 style={{ margin: "0 0 0.85rem", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Evaluate Challenges.<br />
            <span style={{ color: "var(--color-primary)" }}>Build Impact Projects.</span>
          </h1>
          <p style={{ margin: "0 0 1.5rem", fontSize: "0.98rem", color: "var(--text-secondary)", lineHeight: 1.55, maxWidth: "520px" }}>
            Discover matched societal challenges, evaluate them with your team, build
            multidisciplinary institutional projects, collaborate with industry, and
            track measurable outcomes.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button variant="primary" size="lg" icon="search" onClick={() => navigate("/explore")}>
              Explore Challenges
            </Button>
            <Button variant="outline" size="lg" icon="check-circle" onClick={() => navigate("/matches")} style={{ backgroundColor: "#ffffff" }}>
              View Matched Problems
            </Button>
          </div>
        </div>

        {/* Faculty / Student quick counts */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "1.25rem" }}>
          {[
            { label: "Faculty", value: loading ? "—" : counts.facultyCount },
            { label: "Students", value: loading ? "—" : counts.studentCount },
          ].map(({ label, value }) => (
            <div key={label} style={{
              minWidth: "100px", padding: "1.25rem 1.5rem", borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginTop: "0.25rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Metrics Row ────────────────────────────────────────── */}
      <div className="cs-grid-4">
        <StatCard
          title="Matched Challenges"
          value={loading ? "..." : String(matchedCount)}
          subtitle="Based on institutional expertise"
          icon="target"
          iconColor="var(--color-primary)"
          onClick={() => navigate("/matches")}
        />
        <StatCard
          title="Under Evaluation"
          value={loading ? "..." : String(underEvalCount)}
          subtitle="Currently being reviewed"
          icon="layers"
          iconColor="var(--color-warning)"
          onClick={() => navigate("/matches")}
        />
        <StatCard
          title="Active Projects"
          value={loading ? "..." : String(activeProjectCount)}
          subtitle="Institutional workspaces"
          icon="briefcase"
          iconColor="var(--color-success)"
          onClick={activeProjectCount > 0 ? () => navigate("/projects") : undefined}
        />
        <StatCard
          title="Completed Projects"
          value={loading ? "..." : String(completedCount)}
          subtitle="Delivered outcomes"
          icon="check-circle"
          iconColor="var(--color-info)"
        />
      </div>

      {/* ── Main Content: Projects + Workflow ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 3fr)", gap: "1.5rem", alignItems: "start" }}>

        {/* Left: Active Projects feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card
            title="Active Institutional Projects"
            subtitle="Manage collaborative workspaces and their lifecycle"
            actions={
              <Button variant="ghost" size="sm" icon="external-link" onClick={() => navigate("/explore")}>
                Start New
              </Button>
            }
          >
            {loading ? (
              <LoadingSkeleton lines={3} />
            ) : recentProjects.length === 0 ? (
              <EmptyState
                icon="briefcase"
                title="No institutional projects yet"
                description="Evaluate a matched challenge and mark it IN_PROJECT to create your first project workspace."
                actionLabel="Explore Challenges"
                onAction={() => navigate("/explore")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {recentProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "1.1rem 1.25rem",
                      border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)",
                      cursor: "pointer", backgroundColor: "#ffffff",
                      transition: "all var(--transition-fast)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--color-primary-border)";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 0.3rem", fontSize: "1rem", fontWeight: 700 }}>{proj.title}</h4>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <span>Challenge #{proj.problem_id}</span>
                        {proj.mentor_name && <span>• Mentor: {proj.mentor_name}</span>}
                        <span>• {new Date(proj.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <StatusBadge status={proj.project_status} />
                      <Icon name="chevron-right" size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Matched Challenges not yet evaluated */}
          {!loading && recentChallenges.length > 0 && (
            <Card
              title="Newly Matched Challenges"
              subtitle="These challenges match your institutional expertise — evaluate to start a project"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate("/matches")}>View All</Button>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => navigate(`/problems/${ch.id}`)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "1rem 1.25rem",
                      border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)",
                      cursor: "pointer", backgroundColor: "var(--bg-muted)",
                      transition: "all var(--transition-fast)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.borderColor = "var(--color-primary-border)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: "0.2rem" }}>{ch.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
                        {ch.category && <span>{ch.category}</span>}
                        {ch.district && <span>• {ch.district}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{
                        fontSize: "0.73rem", fontWeight: 700,
                        padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)",
                        backgroundColor: ch.evaluation_status ? "var(--color-warning-subtle)" : "var(--color-info-subtle)",
                        color: ch.evaluation_status ? "var(--color-warning)" : "var(--color-info)",
                        border: `1px solid ${ch.evaluation_status ? "var(--color-warning-border)" : "var(--color-info-border)"}`,
                      }}>
                        {ch.evaluation_status || "NEW"}
                      </span>
                      <Icon name="chevron-right" size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Workflow + Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Institutional Workflow Steps */}
          <Card title="Institutional Workflow" subtitle="End-to-end project lifecycle">
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {WORKFLOW_STEPS.map((step, idx) => (
                <div
                  key={step.label}
                  onClick={step.path ? () => navigate(step.path) : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.65rem 0.5rem",
                    borderBottom: idx < WORKFLOW_STEPS.length - 1 ? "1px solid var(--border-color)" : "none",
                    cursor: step.path ? "pointer" : "default",
                    borderRadius: step.path ? "var(--radius-sm)" : undefined,
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={e => {
                    if (step.path) e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{
                    width: "28px", height: "28px", flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: step.path ? "var(--color-primary-subtle)" : "var(--bg-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={step.icon} size={14} color={step.path ? "var(--color-primary)" : "var(--text-muted)"} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: "0.82rem", fontWeight: 700,
                      color: step.path ? "var(--text-primary)" : "var(--text-secondary)",
                    }}>
                      {String(idx + 1).padStart(2, "0")}. {step.label}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{step.sub}</div>
                  </div>
                  {step.path && <Icon name="chevron-right" size={13} color="var(--text-muted)" />}
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { icon: "search", label: "Explore All Challenges", path: "/explore" },
                { icon: "check-circle", label: "Matched Problems", path: "/matches" },
                { icon: "graduation-cap", label: "Faculty & Students", path: "/faculty-students" },
                { icon: "bell", label: "Notifications", path: "/notifications" },
              ].map(({ icon, label, path }) => (
                <Button
                  key={label}
                  variant="outline"
                  icon={icon}
                  onClick={() => navigate(path)}
                  style={{
                    justifyContent: "flex-start",
                    border: "1px solid transparent",
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
