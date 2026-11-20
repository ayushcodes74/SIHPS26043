import { useState, useEffect } from "react";
import { projectApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useRouter } from "../../context/useRouter.js";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

// Project lifecycle stages for visual pipeline
const STAGES = ["CHALLENGE_ACCEPTED", "PROPOSAL", "PROTOTYPE", "TESTING", "PILOT", "DEPLOYMENT", "COMPLETED"];

function StageProgress({ status }) {
  const idx = STAGES.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / STAGES.length) * 100);
  return (
    <div style={{ width: "120px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: "6px", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          backgroundColor: pct === 100 ? "var(--color-success)" : "var(--color-primary)",
          borderRadius: "var(--radius-full)",
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

export function ProjectsListPage() {
  const { role } = useAuth();
  const { navigate } = useRouter();

  const [loading, setLoading]   = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all"); // "all" | "active" | "completed"

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await projectApi.getProjects();
        if (!ignore) {
          setProjects(res.projects || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load projects");
          setLoading(false);
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const filtered = projects.filter(p => {
    if (filter === "active")    return p.project_status !== "COMPLETED";
    if (filter === "completed") return p.project_status === "COMPLETED";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", paddingBottom: "3rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.4rem", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Institutional Projects
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "560px" }}>
            Your institutional project workspaces — manage teams, mentors, industry partners, funding, testing, and outcomes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" icon="search" onClick={() => navigate("/explore")} style={{ backgroundColor: "#ffffff" }}>
            Explore Challenges
          </Button>
          <Button variant="outline" icon="check-circle" onClick={() => navigate("/matches")} style={{ backgroundColor: "#ffffff" }}>
            Evaluate Challenges
          </Button>
        </div>
      </div>

      {/* Filters + Count */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {["all", "active", "completed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "var(--radius-full)",
              border: "1px solid",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              backgroundColor: filter === f ? "var(--color-primary)" : "#ffffff",
              borderColor: filter === f ? "var(--color-primary)" : "var(--border-color)",
              color: filter === f ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {f === "all" ? "All" : f === "active" ? "Active" : "Completed"}
          </button>
        ))}
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
          {loading ? "Loading..." : `${sorted.length} project${sorted.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Project Cards */}
      {loading ? (
        <Card><LoadingSkeleton lines={4} /></Card>
      ) : error ? (
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title={filter === "completed" ? "No completed projects yet" : "No institutional projects yet"}
          description={
            role === "UNIVERSITY"
              ? "Open a matched challenge from the Evaluate Challenges page, set its status to IN_PROJECT, then create a project workspace."
              : "You will appear here once a university adds you to a project team."
          }
          actionLabel={role === "UNIVERSITY" ? "Evaluate Challenges" : undefined}
          onAction={role === "UNIVERSITY" ? () => navigate("/matches") : undefined}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sorted.map((proj) => (
            <div
              key={proj.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border-color)",
                padding: "1.5rem 2rem",
                boxShadow: "var(--shadow-xs)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
              onClick={() => navigate(`/projects/${proj.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--color-primary-border)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "var(--shadow-xs)";
              }}
            >
              {/* Left: title + meta */}
              <div style={{ flex: 1, minWidth: "260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <StatusBadge status={proj.project_status} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Project #{proj.id} · Challenge #{proj.problem_id}
                  </span>
                </div>
                <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 700 }}>
                  {proj.title}
                </h3>
                {proj.description && (
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                    {proj.description.length > 140 ? proj.description.slice(0, 140) + "…" : proj.description}
                  </p>
                )}
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {proj.university_name && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--color-primary)", fontWeight: 600 }}>
                      <Icon name="briefcase" size={12} /> {proj.university_name}
                    </span>
                  )}
                  {proj.mentor_name && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Icon name="award" size={12} /> Mentor: {proj.mentor_name}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icon name="calendar" size={12} /> Created {new Date(proj.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Right: progress + action */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                <StageProgress status={proj.project_status} />
                <Button
                  variant="outline"
                  size="sm"
                  icon="arrow-right"
                  onClick={(e) => { e.stopPropagation(); navigate(`/projects/${proj.id}`); }}
                >
                  Open Workspace
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info card: how to create a project */}
      {!loading && sorted.length === 0 && role === "UNIVERSITY" && (
        <Card style={{ backgroundColor: "var(--color-info-subtle)", border: "1px solid var(--color-info-border)", boxShadow: "none" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div style={{ color: "var(--color-info)", marginTop: "2px" }}>
              <Icon name="info" size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-info)" }}>
                How to create a project
              </h4>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                1. Go to <strong>Matched Challenges</strong> → open a challenge<br />
                2. In the <strong>Overview &amp; Evaluation</strong> tab, click <strong>Accept for Project</strong><br />
                3. Once the evaluation status becomes <strong>IN_PROJECT</strong>, click <strong>Create Project Workspace</strong><br />
                4. Your workspace will appear here with full team / mentor / funding / testing / outcomes management
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
