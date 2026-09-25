import { useState } from "react";
import { Card } from "../common/Cards";
import { Button } from "../common/Button";
import { Tabs } from "../common/Tabs";
import { MatchScoreIndicator } from "../common/ProgressBar";
import { DemoBadge } from "../common/Badges";
import { EmptyState } from "../common/Feedback";
import { Icon } from "../common/Icons";
import { useToast } from "../../context/useToast.js";
import { teamApi } from "../../services/api.js";

export function ExpertiseMatchingView({
  institutions = [],
  faculty = [],
  students = [],
  researchers = [],
  startups = [],
  msmes = [],
  loading = false,
  requiredExpertise = [],
  problem = null,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("institutions");
  const [connectedIds, setConnectedIds] = useState(new Set());
  const [invitingId, setInvitingId] = useState(null);
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Fetch the first active/forming team for this problem on mount
  const [teamFetched, setTeamFetched] = useState(false);
  if (!teamFetched && problem?.id) {
    setTeamFetched(true);
    teamApi.getTeamsForProblem(problem.id)
      .then((res) => {
        const teams = res?.teams || [];
        const found = teams.find((t) => t.status === "FORMING" || t.status === "ACTIVE");
        if (found) setActiveTeamId(found.id);
      })
      .catch(() => { });
  }

  const handleConnect = async (userId, name, userRole) => {
    if (!problem?.id) {
      toast.error("Problem context not available");
      return;
    }
    setInvitingId(userId);
    try {
      let teamId = activeTeamId;
      // If no team, create one first
      if (!teamId) {
        const created = await teamApi.createTeam({
          problemId: problem.id,
          name: `${problem.title} — Collaboration Team`,
        });
        teamId = created?.team?.id;
        setActiveTeamId(teamId);
        toast.success("Collaboration team created!");
      }
      // Determine role from user's system role
      const roleMap = {
        FACULTY: "FACULTY", STUDENT: "STUDENT", RESEARCHER: "RESEARCHER",
        STARTUP: "STARTUP", MSME: "MSME", UNIVERSITY: "FACULTY",
        CITIZEN: "CITIZEN",
      };
      const memberRole = roleMap[userRole?.toUpperCase()] || "CITIZEN";
      await teamApi.inviteMember(teamId, { userId, role: memberRole });
      setConnectedIds((prev) => new Set(prev).add(userId));
      toast.success(`Invitation sent to ${name}!`);
    } catch (err) {
      toast.error(err?.message || `Failed to invite ${name}`);
    } finally {
      setInvitingId(null);
    }
  };

  const tabs = [
    { id: "institutions", label: "Institutions", icon: "building", count: institutions.length },
    { id: "faculty", label: "Faculty", icon: "graduation-cap", count: faculty.length },
    { id: "students", label: "Students", icon: "users", count: students.length },
    { id: "researchers", label: "Researchers", icon: "microscope", count: researchers.length },
    { id: "startups", label: "Startups", icon: "rocket", count: startups.length },
    { id: "msmes", label: "MSMEs", icon: "briefcase", count: msmes.length },
  ];

  const renderActiveList = () => {
    let list;
    let typeLabel = "experts";

    switch (activeTab) {
      case "institutions":
        list = institutions;
        typeLabel = "institutions";
        break;
      case "faculty":
        list = faculty;
        typeLabel = "faculty members";
        break;
      case "students":
        list = students;
        typeLabel = "students";
        break;
      case "researchers":
        list = researchers;
        typeLabel = "researchers";
        break;
      case "startups":
        list = startups;
        typeLabel = "startups";
        break;
      case "msmes":
        list = msmes;
        typeLabel = "MSMEs";
        break;
      default:
        list = institutions;
    }

    if (loading) {
      return (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", fontWeight: 500 }}>
            Matching expertise capabilities across network...
          </div>
        </div>
      );
    }

    if (!list || list.length === 0) {
      return (
        <EmptyState
          icon="search"
          title={`No matching ${typeLabel} found in current database`}
          description="Try broadening the problem description, adjusting required keywords, or contributing expertise."
        />
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {list.map((item, index) => {
          // Robust exact backend schema resolution
          const id =
            item.faculty_id ||
            item.student_id ||
            item.researcher_id ||
            item.organization_id ||
            item.institution_id ||
            item.id ||
            index;

          const rawName =
            item.faculty_name ||
            item.institution ||
            item.name ||
            item.organization_name ||
            "Capability Partner";

          const isDemo =
            rawName.includes("[DEMO]") ||
            (item.designation && item.designation.includes("[DEMO]"));

          const displayName = rawName.replace(/\[DEMO\]\s*/g, "");

          // Score parsing from backend (score or match_score)
          const rawScore = item.score !== undefined ? item.score : item.match_score;
          const score = Math.round(Number(rawScore || 0));

          // Department & Institution context
          const institutionName = item.institution_name || (item.name && item.institution ? item.institution : null);
          const deptName = item.department_name || item.department;
          const roleSubtitle = item.designation || item.course || item.organization_type || null;

          // Parse matched skills array from various backend schemas
          let matchedSkills = [];
          if (Array.isArray(item.matched_expertise)) {
            matchedSkills = item.matched_expertise;
          } else if (Array.isArray(item.matched_skills)) {
            matchedSkills = item.matched_skills;
          } else if (Array.isArray(item.matched_areas)) {
            matchedSkills = item.matched_areas;
          } else if (Array.isArray(item.matched_interests)) {
            matchedSkills = item.matched_interests;
          } else if (typeof item.matched_skills === "string") {
            matchedSkills = item.matched_skills.split(", ").filter(Boolean);
          }

          // Calculate missing skills based on problem's required expertise
          const matchedSet = new Set(matchedSkills.map((s) => s.toLowerCase().trim()));
          const missingSkills = (requiredExpertise || []).filter(
            (req) => !matchedSet.has(req.toLowerCase().trim())
          );

          const isConnected = connectedIds.has(id);

          return (
            <div
              key={id}
              className="cs-card cs-card-hover"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                borderLeft:
                  score >= 80
                    ? "4px solid var(--color-secondary)"
                    : score >= 50
                      ? "4px solid var(--color-primary)"
                      : "4px solid var(--border-color)",
              }}
            >
              {/* Card Header: Name, Score & Badges */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                      {displayName}
                    </h4>
                    {isDemo && <DemoBadge />}
                    {index === 0 && score > 0 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#d97706",
                          backgroundColor: "#fef3c7",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        Top Match
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {roleSubtitle && <span>{roleSubtitle}</span>}
                    {deptName && <span> &bull; {deptName}</span>}
                    {institutionName && <span> &bull; {institutionName}</span>}
                    {item.district && <span> &bull; District: {item.district}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <MatchScoreIndicator score={score} size="lg" />
                  <Button
                    variant={isConnected ? "outline" : "primary"}
                    size="sm"
                    icon={isConnected ? "check" : "user-plus"}
                    disabled={isConnected}
                    loading={invitingId === id}
                    onClick={() => handleConnect(
                      item.user_id || id,
                      displayName,
                      item.role || item.organization_type
                    )}
                  >
                    {isConnected
                      ? "Invited"
                      : activeTeamId
                        ? "Invite to Team"
                        : "Create Team & Invite"}
                  </Button>
                </div>
              </div>

              {/* Explainable Matching Breakdown */}
              <div
                style={{
                  backgroundColor: "var(--bg-muted)",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {item.reason && (
                  <div style={{ fontSize: "0.825rem", color: "var(--text-primary)", fontWeight: 500, marginBottom: "0.5rem" }}>
                    <strong>Match Rationale: </strong>{item.reason}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {/* Matched Expertise */}
                  {matchedSkills.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-secondary)" }}>
                        Matched Capabilities ({matchedSkills.length}):
                      </span>
                      {matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.55rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--color-secondary-subtle)",
                            color: "var(--color-secondary)",
                            border: "1px solid var(--color-secondary-border)",
                          }}
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      No direct expertise matches from this profile.
                    </div>
                  )}

                  {/* Missing Expertise */}
                  {missingSkills.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>
                        Uncovered Required Capabilities ({missingSkills.length}):
                      </span>
                      {missingSkills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            backgroundColor: "#ffffff",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            border: "1px dashed var(--border-color)",
                          }}
                        >
                          • {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card
      title="Who Can Help Solve This?"
      subtitle="We matched this problem against institutional and expert capabilities based on the required expertise."
      actions={
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          Target: {requiredExpertise.length} Required Capabilities
        </div>
      }
    >
      {/* Category Tabs */}
      <div style={{ marginBottom: "1.25rem" }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pill" />
      </div>

      {/* Transparent Disclaimer */}
      <div
        style={{
          padding: "0.6rem 0.85rem",
          backgroundColor: "#fefce8",
          border: "1px solid #fef08a",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.78rem",
          color: "#854d0e",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Icon name="award" size={15} color="#854d0e" />
        <span>
          Match score reflects overlap between required and available expertise in the capability database.
        </span>
      </div>

      {/* Render Active Matching Cards */}
      {renderActiveList()}
    </Card>
  );
}
