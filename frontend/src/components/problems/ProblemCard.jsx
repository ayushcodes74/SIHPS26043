import { StatusBadge } from "../common/Badges";
import { Button } from "../common/Button";
import { useRouter } from "../../context/useRouter.js";
import { useAuth } from "../../context/useAuth.js";

export function ProblemCard({ problem, onSelect }) {
  const { navigate } = useRouter();
  const { role } = useAuth();

  if (!problem) return null;

  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";
  const isSolver = ["STUDENT", "FACULTY", "RESEARCHER", "STARTUP", "MSME"].includes(role);

  const priority = problem.priority_score ?? (
    (problem.severity || 0) * 5 + (problem.urgency || 0) * 5
  );

  const skills = Array.isArray(problem.required_expertise)
    ? problem.required_expertise
    : typeof problem.required_expertise === "string"
    ? problem.required_expertise.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(problem);
    } else {
      navigate(`/problems/${problem.id}`);
    }
  };

  const priorityColor =
    priority >= 80
      ? "var(--color-danger)"
      : priority >= 60
      ? "var(--color-warning)"
      : "var(--color-primary)";

  const hasEvidence = !!problem.evidence_url;
  const isVideo = problem.evidence_type?.includes("video") || problem.evidence_url?.endsWith(".mp4");

  return (
    <div
      onClick={handleCardClick}
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        boxShadow: "var(--shadow-xs)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ink-700)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.boxShadow = "var(--shadow-xs)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Card Header: Status & Category */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <StatusBadge status={problem.status || "REPORTED"} />
            {/* Priority Score removed */}
          </div>

          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            #{problem.id} &bull; {new Date(problem.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Category & Subcategory Tag */}
        <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {problem.category && (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
              }}
            >
              {problem.category} {problem.subcategory ? `&bull; ${problem.subcategory}` : ""}
            </span>
          )}

          {hasEvidence && (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                backgroundColor: "var(--bg-muted)",
                padding: "0.15rem 0.45rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              {isVideo ? "🎥 Video Evidence" : "📷 Photo Evidence"}
            </span>
          )}
        </div>

        {/* Problem Title */}
        <h4
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.1rem",
            fontWeight: 600,
            fontFamily: "var(--font-serif)",
            color: "var(--text-primary)",
            lineHeight: 1.35,
          }}
        >
          {problem.title}
        </h4>

        {/* Summary or Description */}
        <p
          style={{
            margin: "0 0 0.85rem",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {problem.ai_description || problem.ai_summary || problem.description}
        </p>

        {/* Demographics & Geographic Line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            📍 <strong>{problem.district || "District"}</strong>
            {problem.city && `, ${problem.city}`}
          </span>

          {problem.affected_people && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              👥 <strong>{Number(problem.affected_people).toLocaleString()}</strong> affected
            </span>
          )}
        </div>

        {/* Priority Graphical Indicator removed */}

        {/* Required Expertise Chips (Visible to AUTHORITY, ADMIN and SOLVERS only) */}
        {(isAuthorityOrAdmin || isSolver) && skills.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: "0.35rem",
              }}
            >
              Required Expertise:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  ✓ {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    alignSelf: "center",
                  }}
                >
                  +{skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: View Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--border-color)",
          marginTop: "0.5rem",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
          {isAuthorityOrAdmin
            ? problem.report_count
              ? `${problem.report_count} reports merged`
              : "Civic Case Record"
            : problem.address || "Community Report"}
        </span>

        <Button
          variant="outline"
          size="sm"
          icon="arrow-right"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          View Problem
        </Button>
      </div>
    </div>
  );
}
