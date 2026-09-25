import { useState, useEffect } from "react";
import { analyticsApi, authorityDashboardApi } from "../../services/api";
import { Card, StatCard } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Icon } from "../../components/common/Icons";
import { LoadingSkeleton, EmptyState } from "../../components/common/Feedback";
import { useRouter } from "../../context/useRouter";

export default function AnalyticsDashboardPage() {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "pipeline" | "community" | "trust"

  const [overview, setOverview] = useState({
    total_problems: 0,
    active_problems: 0,
    high_priority: 0,
    resolved_problems: 0,
  });

  const [pipeline, setPipeline] = useState({
    reported: 0,
    solved: 0,
    piloted: 0,
    impact_verified: 0,
  });

  const [community, setCommunity] = useState({
    total_support: 0,
    total_comments: 0,
    top_categories: [],
  });

  const [trust, setTrust] = useState({
    total_flagged: 0,
    pending_review: 0,
    reviewed: 0,
    severity_breakdown: [],
  });

  const [districtData, setDistrictData] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [overRes, pipeRes, commRes, trustRes, distRes] = await Promise.allSettled([
        analyticsApi.getOverview(),
        analyticsApi.getPipeline(),
        analyticsApi.getCommunity(),
        analyticsApi.getTrust(),
        authorityDashboardApi.getDistricts(),
      ]);

      if (overRes.status === "fulfilled") setOverview(overRes.value);
      if (pipeRes.status === "fulfilled") setPipeline(pipeRes.value);
      if (commRes.status === "fulfilled") setCommunity(commRes.value);
      if (trustRes.status === "fulfilled") setTrust(trustRes.value);
      if (distRes.status === "fulfilled") {
        const d = distRes.value?.districts || distRes.value || [];
        setDistrictData(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load analytics dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const totalReported = Number(pipeline.reported) || Number(overview.total_problems) || 1;
  const solvedPercent = Math.min(100, Math.round(((Number(pipeline.solved) || 0) / totalReported) * 100));
  const pilotedPercent = Math.min(100, Math.round(((Number(pipeline.piloted) || 0) / totalReported) * 100));
  const impactPercent = Math.min(100, Math.round(((Number(pipeline.impact_verified) || 0) / totalReported) * 100));

  return (
    <div style={{ padding: "1.5rem 0", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border-color, #e2e8f0)",
          paddingBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                display: "inline-flex",
                padding: "0.4rem",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                color: "#fff",
              }}
            >
              <Icon name="activity" size={20} />
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
              CivicSync Intelligence & Decision Support
            </h1>
          </div>
          <p style={{ color: "var(--text-muted, #64748b)", margin: 0, fontSize: "0.95rem" }}>
            Real-time analytics, lifecycle pipelines, spatial concentrations, and trust telemetry
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <Icon name="refresh" size={14} style={{ marginRight: "0.4rem" }} />
            Refresh Data
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
            <Icon name="dashboard" size={14} style={{ marginRight: "0.4rem" }} />
            Operations View
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.75rem",
          background: "var(--bg-card, #f8fafc)",
          padding: "0.35rem",
          borderRadius: "10px",
          width: "fit-content",
          border: "1px solid var(--border-color, #e2e8f0)",
        }}
      >
        {[
          { key: "overview", label: "Overview & Impact", icon: "dashboard" },
          { key: "pipeline", label: "Resolution Funnel", icon: "layers" },
          { key: "community", label: "Community & Category Insights", icon: "users" },
          { key: "trust", label: "Trust & Anti-Gaming", icon: "shield-check" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: activeTab === tab.key ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === tab.key ? "var(--color-primary, #2563eb)" : "transparent",
              color: activeTab === tab.key ? "#ffffff" : "var(--text-secondary, #475569)",
              boxShadow: activeTab === tab.key ? "0 2px 4px rgba(37,99,235,0.2)" : "none",
            }}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={4} height={120} />
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Metric Highlights */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.25rem",
                  marginBottom: "2rem",
                }}
              >
                <StatCard
                  title="Total Problems Reported"
                  value={overview.total_problems || 0}
                  icon="alert-circle"
                  color="#2563eb"
                  description="Cumulative civic issues recorded"
                />
                <StatCard
                  title="Active Ongoing Cases"
                  value={overview.active_problems || 0}
                  icon="activity"
                  color="#d97706"
                  description="Under review, matched, or deploying"
                />
                <StatCard
                  title="High Priority / Critical"
                  value={overview.high_priority || 0}
                  icon="alert-triangle"
                  color="#dc2626"
                  description="Score > 50 or Severity HIGH/CRITICAL"
                />
                <StatCard
                  title="Fully Resolved Cases"
                  value={overview.resolved_problems || 0}
                  icon="check-circle"
                  color="#16a34a"
                  description="Verified post-deployment solutions"
                />
              </div>

              {/* Grid: Geographic Concentration & Pipeline Preview */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                {/* District Distribution */}
                <Card title="Geographic Concentration (Top Districts)" subtitle="Regional problem volume density">
                  {districtData.length === 0 ? (
                    <EmptyState message="No district data recorded yet" />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "0.5rem" }}>
                      {districtData.slice(0, 6).map((dist) => {
                        const count = Number(dist.total_problems || dist.count || 0);
                        const maxCount = Math.max(...districtData.map((d) => Number(d.total_problems || d.count || 1)), 1);
                        const pct = Math.round((count / maxCount) * 100);

                        return (
                          <div key={dist.district || dist.name}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.875rem",
                                marginBottom: "0.35rem",
                              }}
                            >
                              <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                                {dist.district || dist.name || "Unknown District"}
                              </span>
                              <span style={{ color: "var(--text-muted)" }}>
                                {count} problem{count !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div
                              style={{
                                height: "8px",
                                backgroundColor: "var(--bg-secondary, #e2e8f0)",
                                borderRadius: "4px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: "linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                                  borderRadius: "4px",
                                  transition: "width 0.5s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Resolution Funnel Summary */}
                <Card title="Lifecycle Progression Funnel" subtitle="Conversion from reported to verified impact">
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingTop: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.3rem" }}>
                        <span style={{ fontWeight: "600" }}>1. Reported Problems</span>
                        <span style={{ fontWeight: "600" }}>{pipeline.reported} (100%)</span>
                      </div>
                      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{ width: "100%", height: "100%", backgroundColor: "var(--color-primary)" }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.3rem" }}>
                        <span style={{ fontWeight: "600" }}>2. Technical Solutions Submitted</span>
                        <span style={{ fontWeight: "600" }}>{pipeline.solved} ({solvedPercent}%)</span>
                      </div>
                      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{ width: `${solvedPercent}%`, height: "100%", backgroundColor: "#6366f1" }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.3rem" }}>
                        <span style={{ fontWeight: "600" }}>3. Active Pilots & Deployments</span>
                        <span style={{ fontWeight: "600" }}>{pipeline.piloted} ({pilotedPercent}%)</span>
                      </div>
                      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{ width: `${pilotedPercent}%`, height: "100%", backgroundColor: "#8b5cf6" }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.3rem" }}>
                        <span style={{ fontWeight: "600" }}>4. Field Impact Verified</span>
                        <span style={{ fontWeight: "600" }}>{pipeline.impact_verified} ({impactPercent}%)</span>
                      </div>
                      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{ width: `${impactPercent}%`, height: "100%", backgroundColor: "#10b981" }} />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE FUNNEL */}
          {activeTab === "pipeline" && (
            <div>
              <Card title="Civic Problem Lifecycle & Solution Pipeline" subtitle="Detailed stage-by-stage audit of innovation flow">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1.25rem",
                    margin: "1.5rem 0",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      backgroundColor: "#eff6ff",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", fontWeight: "800", color: "#1d4ed8" }}>{pipeline.reported}</div>
                    <div style={{ fontWeight: "600", color: "#1e3a8a", marginTop: "0.25rem" }}>Reported</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Citizen & sensor intake</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      backgroundColor: "#f5f3ff",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", fontWeight: "800", color: "#6d28d9" }}>{pipeline.solved}</div>
                    <div style={{ fontWeight: "600", color: "#4c1d95", marginTop: "0.25rem" }}>Solution Matched</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>University & Startup proposals</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      backgroundColor: "#faf5ff",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", fontWeight: "800", color: "#7e22ce" }}>{pipeline.piloted}</div>
                    <div style={{ fontWeight: "600", color: "#581c87", marginTop: "0.25rem" }}>In Field Pilot</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Milestone tracking active</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      backgroundColor: "#f0fdf4",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", fontWeight: "800", color: "#15803d" }}>{pipeline.impact_verified}</div>
                    <div style={{ fontWeight: "600", color: "#14532d", marginTop: "0.25rem" }}>Impact Verified</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Audited by Municipal Authority</div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-secondary, #f8fafc)",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    borderLeft: "4px solid var(--color-primary)",
                  }}
                >
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: "600" }}>Pipeline Policy Notice</h4>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary, #475569)", lineHeight: "1.5" }}>
                    CivicSync enforces non-repudiable state transitions. Solutions undergo double-blind peer review before transitioning
                    to implementation pilots. Once completed, impact passports require verifiable before-and-after sensor measurements
                    prior to awarding full societal recognition.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: COMMUNITY & CATEGORY INSIGHTS */}
          {activeTab === "community" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <StatCard
                  title="Total Citizen Endorsements"
                  value={community.total_support || 0}
                  icon="thumbs-up"
                  color="#2563eb"
                  description="Upvotes and community validation signals"
                />
                <StatCard
                  title="Public Discussion Comments"
                  value={community.total_comments || 0}
                  icon="message-square"
                  color="#8b5cf6"
                  description="Constructive peer and citizen inputs"
                />
              </div>

              <Card title="Problem Domain Breakdown" subtitle="Distribution of civic problems across technical categories">
                {(!community.top_categories || community.top_categories.length === 0) ? (
                  <EmptyState message="No category aggregation available" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem 0" }}>
                    {community.top_categories.map((cat) => {
                      const count = Number(cat.count || 0);
                      const maxCat = Math.max(...community.top_categories.map((c) => Number(c.count || 1)), 1);
                      const pct = Math.round((count / maxCat) * 100);

                      return (
                        <div key={cat.category}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.9rem",
                              marginBottom: "0.4rem",
                            }}
                          >
                            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{cat.category}</span>
                            <span style={{ fontWeight: "700", color: "var(--color-primary, #2563eb)" }}>
                              {count} issue{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div style={{ height: "10px", backgroundColor: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)",
                                borderRadius: "5px",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 4: TRUST & SAFETY */}
          {activeTab === "trust" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.25rem",
                  marginBottom: "2rem",
                }}
              >
                <StatCard
                  title="Total Flagged Events"
                  value={trust.total_flagged || 0}
                  icon="shield-alert"
                  color="#dc2626"
                  description="Suspicious rate limits, bot upvotes, duplicates"
                />
                <StatCard
                  title="Pending Authority Review"
                  value={trust.pending_review || 0}
                  icon="clock"
                  color="#ea580c"
                  description="Awaiting manual inspection or dismissal"
                />
                <StatCard
                  title="Audited & Resolved"
                  value={trust.reviewed || 0}
                  icon="shield-check"
                  color="#16a34a"
                  description="Confirmed false positives or neutralized actions"
                />
              </div>

              <Card
                title="System Integrity & Abuse Telemetry"
                subtitle="Rule-based threat breakdown preventing sybil manipulation"
                actions={
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/trust")}>
                    Open Trust Queue
                  </Button>
                }
              >
                {(!trust.severity_breakdown || trust.severity_breakdown.length === 0) ? (
                  <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)" }}>
                    <Icon name="check-circle" size={40} color="#10b981" style={{ marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontWeight: "600" }}>Clean System State</p>
                    <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                      Zero severe anti-gaming events recorded in current observation period.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "0.5rem" }}>
                    {trust.severity_breakdown.map((sev) => {
                      const colors = {
                        LOW: "#eab308",
                        MEDIUM: "#f97316",
                        HIGH: "#ef4444",
                        CRITICAL: "#b91c1c",
                      };
                      return (
                        <div
                          key={sev.severity}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem 1rem",
                            borderRadius: "8px",
                            backgroundColor: "var(--bg-secondary, #f8fafc)",
                            borderLeft: `4px solid ${colors[sev.severity] || "#64748b"}`,
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{sev.severity} Risk</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.75rem" }}>
                              Autonomous rule trigger
                            </span>
                          </div>
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "12px",
                              backgroundColor: `${colors[sev.severity] || "#64748b"}20`,
                              color: colors[sev.severity] || "#64748b",
                              fontWeight: "700",
                              fontSize: "0.85rem",
                            }}
                          >
                            {sev.count} event{Number(sev.count) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
