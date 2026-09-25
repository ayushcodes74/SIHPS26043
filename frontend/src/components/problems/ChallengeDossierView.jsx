import { useState } from "react";
import { Card } from "../common/Cards";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";

export function ChallengeDossierView({ dossier, legacyAnalysis }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!dossier) {
    return (
      <Card title="Actionable Challenge Dossier" subtitle="AI Problem Decomposition Engine">
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Standard analysis complete. Rich Challenge Dossier rendering...
        </p>
      </Card>
    );
  }

  const {
    report,
    problem,
    assessment,
    causes = [],
    verification_plan = {},
    dependencies = [],
    required_capabilities = [],
    work_packages = [],
    solution_approaches = [],
    implementation_plan = {},
    impact_plan = {},
    quality = {}
  } = dossier;

  const tabs = [
    { id: "overview", label: "Overview & Facts", icon: "file-text" },
    { id: "causes", label: "Possible Causes", icon: "alert-circle" },
    { id: "fieldwork", label: "Field Verification", icon: "map-pin" },
    { id: "dependencies", label: "Dependencies", icon: "layers" },
    { id: "capabilities", label: "Capabilities", icon: "cpu" },
    { id: "workpackages", label: "Work Packages", icon: "grid" },
    { id: "solutions", label: "Solution Paths", icon: "check-square" },
    { id: "impact", label: "Impact Plan", icon: "activity" },
    { id: "quality", label: "Review & Quality", icon: "shield-check" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner with Explicit Label Legend */}
      <Card style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))", border: "1px solid var(--border-color)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Icon name="cpu" size={22} color="var(--color-primary-subtle)" />
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#f8fafc" }}>
                Actionable Challenge Dossier
              </h2>
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Structured AI decomposition powered by SIH 2026 Antigravity General Engine
            </p>
          </div>

          {/* Visual Legend for Fact vs Inference vs Verification */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.75rem", fontWeight: 600 }}>
            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)" }}>
              FACT (Explicitly Reported)
            </span>
            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}>
              AI INFERENCE (Hypothesis)
            </span>
            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
              VERIFICATION REQUIRED
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginTop: "1.25rem", paddingBottom: "0.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md, 6px)",
                fontSize: "0.825rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab.id ? "var(--color-primary, #0a0a0a)" : "rgba(255, 255, 255, 0.05)",
                color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Tab 1: Overview & Facts */}
      {activeTab === "overview" && (
        <Card title="Problem Summary & Reported Facts" subtitle="Citizen Input vs Extracted Information">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Domain & Subdomain
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {problem.domain} &bull; <span style={{ color: "var(--color-primary)" }}>{problem.subdomain}</span>
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Type: {problem.problem_type}
              </div>
            </div>

            <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Priority & Severity Assessment
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: assessment.severity >= 7 ? "var(--color-danger)" : "var(--color-warning)" }}>
                  Severity: {assessment.severity}/10
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "4px", background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                  Urgency: {assessment.urgency} ({assessment.urgency_score}/10)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(34, 197, 94, 0.15)", color: "#16a34a" }}>
                  FACT
                </span>
                <strong style={{ fontSize: "0.9rem" }}>Reported Facts & Statements:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {report.evidence.map((fact, idx) => (
                  <li key={idx} style={{ marginBottom: "0.25rem" }}>{fact}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                  AI INFERENCE
                </span>
                <strong style={{ fontSize: "0.9rem" }}>Extracted Symptoms & Community Impacts:</strong>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {problem.reported_symptoms.map((symptom, idx) => (
                  <span key={idx} style={{ padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.8rem", background: "var(--bg-subtle)", border: "1px solid var(--border-color)" }}>
                    ⚠️ {symptom}
                  </span>
                ))}
                {problem.reported_impacts.map((impact, idx) => (
                  <span key={idx} style={{ padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.8rem", background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    🚨 {impact}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Possible Causes */}
      {activeTab === "causes" && (
        <Card title="Possible Cause Hypotheses" subtitle="Must be verified on-site before concluding cause">
          <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.825rem", color: "#b45309", marginBottom: "1rem" }}>
            ⚠️ <strong>CRITICAL SAFETY RULE:</strong> The items below are AI-derived HYPOTHESES, not confirmed facts. They require physical field work verification.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {causes.map((cause, idx) => (
              <div key={idx} style={{ padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                      AI HYPOTHESIS #{idx + 1}
                    </span>
                    <strong style={{ fontSize: "0.95rem" }}>{cause.cause}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{cause.reason}</div>
                </div>

                <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, background: "rgba(245, 158, 11, 0.2)", color: "#b45309" }}>
                  Verification Needed
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Field Verification */}
      {activeTab === "fieldwork" && (
        <Card title="Field Verification & Inspection Plan" subtitle="Real-world tasks required before proceeding">
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.25rem" }}>
            <div>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Field Inspection Tasks:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {verification_plan.tasks?.map((task, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.875rem", padding: "0.6rem 0.75rem", background: "var(--bg-subtle)", borderRadius: "6px" }}>
                    <Icon name="check-square" size={16} color="var(--color-primary)" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.85rem", background: "var(--bg-subtle)", borderRadius: "6px" }}>
                <strong style={{ fontSize: "0.85rem" }}>Required Evidence Assets:</strong>
                <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {verification_plan.required_evidence?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: "0.85rem", background: "var(--bg-subtle)", borderRadius: "6px" }}>
                <strong style={{ fontSize: "0.85rem" }}>Physical Measurements:</strong>
                <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {verification_plan.measurements?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Dependencies */}
      {activeTab === "dependencies" && (
        <Card title="Operational Dependencies" subtitle="Data, infrastructure, authority, and partner linkages">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {dependencies.map((dep, idx) => (
              <div key={idx} style={{ padding: "0.85rem 1rem", borderRadius: "6px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                      {dep.type}
                    </span>
                    <strong style={{ fontSize: "0.9rem" }}>{dep.name}</strong>
                  </div>
                  <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {dep.why_required}
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>
                  Source: <strong>{dep.source || "Municipal Record"}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Required Capabilities */}
      {activeTab === "capabilities" && (
        <Card title="Required Technical Capabilities" subtitle="Domain capabilities required for institutional matching">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
            {required_capabilities.map((cap, idx) => (
              <div key={idx} style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <strong style={{ fontSize: "0.95rem", color: "var(--color-primary)" }}>{cap.capability}</strong>
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700, background: cap.priority === "essential" ? "rgba(239, 68, 68, 0.15)" : "var(--color-primary-subtle)", color: cap.priority === "essential" ? "#dc2626" : "var(--color-primary)" }}>
                    {cap.priority.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cap.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 6: Work Packages */}
      {activeTab === "workpackages" && (
        <Card title="Work Package Breakdown" subtitle="Structured execution phases (WP-01 to WP-05)">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {work_packages.map((wp, idx) => (
              <div key={idx} style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.75rem", background: "var(--color-primary)", color: "#fff" }}>
                      {wp.id}
                    </span>
                    <strong style={{ fontSize: "1rem" }}>{wp.name}</strong>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                    Status: {wp.verification_status}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  {wp.objective}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border-color)" }}>
                  <div>
                    <strong>Tasks:</strong>
                    <ul style={{ margin: "0.2rem 0 0", paddingLeft: "1rem", color: "var(--text-muted)" }}>
                      {wp.tasks?.map((t, tIdx) => (
                        <li key={tIdx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Deliverables:</strong>
                    <ul style={{ margin: "0.2rem 0 0", paddingLeft: "1rem", color: "var(--text-muted)" }}>
                      {wp.deliverables?.map((d, dIdx) => (
                        <li key={dIdx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 7: Solution Approaches */}
      {activeTab === "solutions" && (
        <Card title="Plausible Solution Paths" subtitle="Multi-option approaches with effort categories & risks">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {solution_approaches.map((sol, idx) => (
              <div key={idx} style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <strong style={{ fontSize: "1rem", color: "var(--color-primary)" }}>{sol.name}</strong>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, background: "var(--color-primary-subtle)", color: "var(--color-primary)", textTransform: "uppercase" }}>
                    Effort: {sol.effort}
                  </span>
                </div>

                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  {sol.description}
                </div>

                <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "0.5rem" }}>
                  Why it fits: {sol.why_it_may_fit}
                </div>

                <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                  <strong>Risks:</strong> {sol.risks?.join(", ") || "None noted"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 8: Impact Plan */}
      {activeTab === "impact" && (
        <Card title="Measurable Impact & KPI Plan" subtitle="Converting resolution into baseline, targets & evidence">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Key Performance Indicators (KPIs):</h4>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {impact_plan.kpis?.map((kpi, idx) => (
                  <li key={idx} style={{ marginBottom: "0.35rem" }}>{kpi}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Evidence Sources & Verification:</h4>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {impact_plan.evidence_sources?.map((src, idx) => (
                  <li key={idx} style={{ marginBottom: "0.35rem" }}>{src}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 9: Review & Quality */}
      {activeTab === "quality" && (
        <Card title="Quality Score & Review Decision" subtitle="Confidence ratings and human review indicators">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CLASSIFICATION CONFIDENCE</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                {(quality.classification_confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CAUSE HYPOTHESIS CONFIDENCE</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                {(quality.cause_confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-subtle)", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>HUMAN REVIEW REQUIREMENT</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: quality.requires_human_review ? "var(--color-warning)" : "var(--color-success)" }}>
                {quality.requires_human_review ? "REVIEW RECOMMENDED" : "AUTOMATED"}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
