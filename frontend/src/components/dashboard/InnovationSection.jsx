import { useState, useEffect } from "react";
import { problemApi, reputationApi, projectApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";

export function InnovationSection({ role }) {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [techProblems, setTechProblems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  const isStartup = role === "STARTUP";

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [probRes, repRes, projRes] = await Promise.allSettled([
          problemApi.getProblems({ limit: 25 }),
          reputationApi.getMyReputation(),
          projectApi.getProjects().catch(() => ({ projects: [] }))
        ]);

        if (!ignore) {
          if (repRes.status === "fulfilled") setReputation(repRes.value);
          if (probRes.status === "fulfilled") {
            const all = probRes.value?.problems || [];
            // Problems that seek practical technology solutions
            const relevant = all.filter((p) =>
              ["TECHNICAL", "INFRASTRUCTURE", "ENVIRONMENTAL", "OPERATIONAL"].includes((p.category || "").toUpperCase())
            );
            setTechProblems(relevant.length > 0 ? relevant : all);
          }
          if (projRes.status === "fulfilled" && projRes.value?.projects) {
            setProjects(projRes.value.projects);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load innovation matches");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Metrics Row */}
      <div className="cs-grid-4">
        <StatCard
          title="Innovation Matches"
          value={loading ? "..." : String(techProblems.length)}
          subtitle="Validated civic challenges"
          icon="rocket"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Organization Track Record"
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={`Tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title="Deployment Model"
          value="Pilot & Validation"
          subtitle="Stage-gate pilot tracking"
          icon="activity"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title="Verified Badges"
          value={String(reputation?.badges?.length || 0)}
          subtitle="Empirical civic validation"
          icon="shield-check"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Innovation Banner */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-primary-subtle)",
          border: "1px solid var(--color-primary-border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="rocket" size={22} />
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.2rem", fontSize: "1rem", color: "var(--color-primary)" }}>
            Find Validated Societal Problems Where Your Technology Can Contribute
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isStartup ? "Startups" : "MSMEs"} can discover real-world municipal bottlenecks, propose engineering solutions, and execute trackable pilot deployments.
          </p>
        </div>
      </div>

      {/* Technology-Relevant Problems */}
      <Card
        title="Validated Community Challenges Seeking Technology"
        subtitle="Problems with verified root causes where scalable technical innovations can be submitted"
        actions={
          <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
            Explore Catalog
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton lines={4} />
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : techProblems.length === 0 ? (
          <EmptyState
            icon="rocket"
            title="No technology-relevant problems found"
            description="All active cases are currently under evaluation or in non-technical domains."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {techProblems.slice(0, 6).map((prob) => {
              const prio = prob.priority_score ?? ((prob.severity || 0) * 5 + (prob.urgency || 0) * 5);
              const skills = Array.isArray(prob.required_expertise) ? prob.required_expertise : [];

              return (
                <div
                  key={prob.id}
                  onClick={() => navigate(`/problems/${prob.id}`)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {prob.category}
                      </span>
                      {/* PriorityBadge removed */}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || "District"}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", fontWeight: 700 }}>
                      {prob.title}
                    </h4>

                    {skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {skills.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "#ffffff",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button variant="primary" size="sm" icon="plus-circle">
                    Propose Solution
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* PROJECT COLLABORATIONS */}
      <Card title="Project Collaborations" subtitle="Institutional projects seeking industry partnership">
        {projects.length === 0 ? (
          <EmptyState icon="briefcase" title="No active collaborations" description="Wait for universities to invite you to projects or browse matching challenges." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {projects.slice(0, 5).map(proj => (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)",
                  cursor: "pointer"
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700 }}>{proj.title}</h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Status: {proj.project_status}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <Button variant="outline" size="sm">Offer Mentorship</Button>
                  <Icon name="chevron-right" size={16} color="var(--text-light)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
