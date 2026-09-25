import { useState, useEffect } from "react";
import { studentApi, universityApi } from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { useRouter } from "../../context/useRouter";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

const SKILL_SUGGESTIONS = [
  "Python",
  "IoT",
  "Machine Learning",
  "Data Analytics",
  "Civil Engineering",
  "Road Construction",
  "Structural Engineering",
  "Water Quality",
  "Water Treatment",
  "Groundwater",
  "Environmental Engineering",
  "GIS",
  "Electrical Engineering",
  "Solar Pumping",
  "Solid Waste Management",
];

export function MatchingSkillsPage() {
  const { user, role } = useAuth();
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matchedProblems, setMatchedProblems] = useState([]);
  const [sortBy, setSortBy] = useState("best_match");
  const [error, setError] = useState("");

  // Skill editing state
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editingSkillsList, setEditingSkillsList] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  // Detail Modal state
  const [detailModalProblem, setDetailModalProblem] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setError("");
      try {
        if (role === "UNIVERSITY") {
          const matchRes = await universityApi.getMatchedChallenges();
          if (ignore) return;
          setMatchedProblems(matchRes.challenges || []);
          setLoading(false);
          return;
        }

        const profRes = await studentApi.getProfile();
        if (ignore) return;
        const currentProfile = profRes.profile;
        setProfile(currentProfile);
        const studentSkills = currentProfile?.skills || [];
        setSkills(studentSkills);
        setEditingSkillsList(studentSkills);

        if (studentSkills.length > 0) {
          const matchRes = await studentApi.getMatchedProblems({ sort: sortBy });
          if (ignore) return;
          setMatchedProblems(matchRes.matches || []);
        } else {
          setMatchedProblems([]);
        }
        setLoading(false);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load matching skills data");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [sortBy, role]);

  // Handle saving updated skills
  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      const res = await studentApi.updateSkills(editingSkillsList);
      setSkills(res.skills || editingSkillsList);
      setIsEditingSkills(false);
      setSavingSkills(false);
      // Immediately re-fetch matches with updated skills
      setMatchingLoading(true);
      const matchRes = await studentApi.getMatchedProblems({ sort: sortBy });
      setMatchedProblems(matchRes.matches || []);
      setMatchingLoading(false);
    } catch (err) {
      console.error("Save skills error:", err);
      alert("Failed to save skills: " + (err.message || "Unknown error"));
      setSavingSkills(false);
    }
  };

  const addSkillToEditing = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!editingSkillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setEditingSkillsList([...editingSkillsList, trimmed]);
    }
    setCustomSkillInput("");
  };

  const removeSkillFromEditing = (skillToRemove) => {
    setEditingSkillsList(editingSkillsList.filter((s) => s !== skillToRemove));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingBottom: "3rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {role === "UNIVERSITY" ? "Matched Institutional Challenges" : "Problems Matching Your Skills"}
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "600px" }}>
            {role === "UNIVERSITY"
              ? "Challenges matched to your institutional expertise profile. Open any challenge to evaluate it and create an institutional project workspace."
              : "Our explainable matching engine connects your technical competencies directly with active regional challenges where you can make a measurable difference."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" icon="search" onClick={() => navigate("/explore")} style={{ backgroundColor: "#ffffff" }}>
            Explore All
          </Button>
          {role === "UNIVERSITY" ? (
            <Button variant="outline" icon="briefcase" onClick={() => navigate("/projects")} style={{ backgroundColor: "#ffffff" }}>
              My Projects
            </Button>
          ) : (
            <Button variant="outline" icon="award" onClick={() => navigate("/reputation")} style={{ backgroundColor: "#ffffff" }}>
              Your Impact
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: role === "UNIVERSITY" ? "minmax(0, 3fr) minmax(0, 7fr)" : "minmax(0, 3fr) minmax(0, 7fr)", gap: "2rem", alignItems: "start" }}>
        
        {/* Left Column: for University — Institutional info; for Students — Skills Profile */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "100px" }}>
          {role === "UNIVERSITY" ? (
            /* University: show evaluation guide */
            <>
              <Card title="Institutional Expertise" subtitle="Matched via institution profile">
                {loading ? (
                  <LoadingSkeleton lines={2} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      These challenges are matched to your institution&apos;s registered expertise domains. Your matching is profile-driven, not skill-tag based.
                    </p>
                    <Button variant="outline" size="sm" icon="graduation-cap" onClick={() => navigate("/faculty-students")}>
                      Manage Faculty &amp; Students
                    </Button>
                    <Button variant="outline" size="sm" icon="briefcase" onClick={() => navigate("/projects")}>
                      View All Projects
                    </Button>
                  </div>
                )}
              </Card>

              <Card style={{ backgroundColor: "var(--color-info-subtle)", border: "1px solid var(--color-info-border)", boxShadow: "none" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div style={{ color: "var(--color-info)" }}><Icon name="info" size={20} /></div>
                  <div>
                    <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.92rem", fontWeight: 700, color: "var(--color-info)" }}>Evaluation Workflow</h4>
                    <ol style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      <li>Open a challenge below</li>
                      <li>Set status to <strong>In Project</strong></li>
                      <li>Create Project Workspace</li>
                      <li>Assign team, mentor, industry</li>
                    </ol>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            /* Student: show skills editor */
            <>
          <Card
            title="Your Competencies"
            subtitle={role === "UNIVERSITY" ? "Institutional Expertise (From Profile)" : (profile ? `${profile.name || user?.name} • ${profile.course || "Contributor"}` : "Profile Skills")}
            actions={
              !isEditingSkills && role !== "UNIVERSITY" && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit-2"
                  onClick={() => {
                    setEditingSkillsList(skills);
                    setIsEditingSkills(true);
                  }}
                >
                  Edit
                </Button>
              )
            }
          >
            {loading ? (
              <LoadingSkeleton lines={2} />
            ) : isEditingSkills ? (
              /* Interactive Skills Editor */
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Add your technical skills to discover relevant problems:
                </div>

                {/* Currently selected skills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", minHeight: "44px", padding: "0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)" }}>
                  {editingSkillsList.length === 0 ? (
                    <span style={{ fontSize: "0.825rem", color: "var(--text-muted)", fontStyle: "italic", alignSelf: "center" }}>
                      No skills selected yet.
                    </span>
                  ) : (
                    editingSkillsList.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          padding: "0.3rem 0.75rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                          border: "1px solid var(--color-primary-border)",
                        }}
                      >
                        ✓ {skill}
                        <button
                          type="button"
                          onClick={() => removeSkillFromEditing(skill)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            fontWeight: 800,
                            fontSize: "1rem",
                            lineHeight: 1,
                            padding: 0,
                            marginLeft: "0.2rem"
                          }}
                          title={`Remove ${skill}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Custom skill input */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Type a skill..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkillToEditing(customSkillInput);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.85rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      outline: "none",
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => addSkillToEditing(customSkillInput)}
                    disabled={!customSkillInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {/* Quick Suggestions Chips */}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                    Suggested:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {SKILL_SUGGESTIONS.filter((s) => !editingSkillsList.includes(s)).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addSkillToEditing(suggestion)}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "var(--radius-full)",
                          border: "1px dashed var(--border-color)",
                          backgroundColor: "#ffffff",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-primary)";
                          e.currentTarget.style.color = "var(--color-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-color)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <Button
                    variant="primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={handleSaveSkills}
                    disabled={savingSkills}
                  >
                    {savingSkills ? "Saving..." : "Save & Find Matches"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingSkillsList(skills);
                      setIsEditingSkills(false);
                    }}
                    disabled={savingSkills}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : skills.length === 0 ? (
              <div style={{ padding: "1rem 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-full)", backgroundColor: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                   <Icon name="code" size={24} />
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  No skills registered yet.
                </p>
                {role !== "UNIVERSITY" && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="plus-circle"
                    onClick={() => {
                      setEditingSkillsList([]);
                      setIsEditingSkills(true);
                    }}
                  >
                    Add Skills
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      padding: "0.4rem 0.85rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary-subtle)",
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-primary-border)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            )}
          </Card>
          
          {/* Info Card */}
          <Card style={{ backgroundColor: "var(--color-info-subtle)", border: "1px solid var(--color-info-border)", boxShadow: "none" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
               <div style={{ color: "var(--color-info)" }}>
                  <Icon name="info" size={20} />
               </div>
               <div>
                  <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-info)" }}>How Matching Works</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                     Our engine analyzes your technical stack and cross-references it with the requirements of regional problems. 
                     Strong matches mean you have the necessary skills to immediately contribute.
                  </p>
               </div>
            </div>
          </Card>
        </>
      )}
    </div>

        {/* Right Column: Problem Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Matched Problems Section Header & Sort */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                Matched Opportunities
              </h2>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary)",
                  color: "#ffffff",
                }}
              >
                {matchedProblems.length} Found
              </span>
            </div>

            {/* Sort controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="best_match">Best Skill Match</option>
                <option value="newest">Newest</option>
                <option value="recently_updated">Recently Updated</option>
              </select>
            </div>
          </div>

          {/* Matched Problems Cards Feed */}
          {loading || matchingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Card><LoadingSkeleton lines={4} /></Card>
              <Card><LoadingSkeleton lines={4} /></Card>
            </div>
          ) : error ? (
            <p style={{ color: "var(--color-danger)" }}>{error}</p>
          ) : matchedProblems.length === 0 ? (
            <EmptyState
              icon="target"
              title="No problems currently match your skills"
              description="Add more skills to your profile to discover more opportunities, or explore the general catalog."
              actionLabel={role !== "UNIVERSITY" ? "Update Skills" : undefined}
              onAction={role !== "UNIVERSITY" ? () => {
                setEditingSkillsList(skills);
                setIsEditingSkills(true);
              } : undefined}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {matchedProblems.map((prob) => {
                const isStrong = prob.match_tier === "Strong Match";
                const tierColor = isStrong ? "var(--color-success)" : "var(--color-primary)";

                return (
                  <div
                    key={prob.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--radius-xl)",
                      border: "1px solid var(--border-color)",
                      padding: "1.75rem",
                      boxShadow: "var(--shadow-sm)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                      transition: "all var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary-border)";
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                  >
                    {/* Header Row: Category, Status, Match Tier */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                          <StatusBadge status={prob.status || "OPEN"} />
                          {prob.category && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.6rem",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: "var(--bg-muted)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {prob.category} {prob.subcategory ? `• ${prob.subcategory}` : ""}
                            </span>
                          )}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            #{prob.id} &bull; 📍 {prob.district || "District"} {prob.city ? `(${prob.city})` : ""}
                          </span>
                        </div>

                        <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                          {prob.title}
                        </h3>
                      </div>

                      {/* Match Score Indicator Badge */}
                      {role === "UNIVERSITY" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {prob.evaluation_status ? (
                            <StatusBadge status={prob.evaluation_status} />
                          ) : (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                padding: "0.35rem 0.85rem",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: "var(--color-primary-subtle)",
                                color: "var(--color-primary)",
                                border: "1px solid var(--color-primary-border)",
                              }}
                            >
                              Institutional Match
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.45rem 1rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: isStrong ? "var(--color-success-subtle)" : "var(--color-primary-subtle)",
                            border: `1px solid ${isStrong ? "var(--color-success-border)" : "var(--color-primary-border)"}`,
                            color: tierColor,
                          }}
                        >
                          <Icon name="check-circle" size={16} />
                          <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>
                            {prob.match_tier} ({prob.match_score}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Short Description */}
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {prob.ai_summary || prob.description}
                    </p>

                    {/* Explainable Matching Breakdown Box */}
                    {role !== "UNIVERSITY" ? (
                      <div
                        style={{
                          backgroundColor: "#fafafa",
                          borderRadius: "var(--radius-lg)",
                          padding: "1.25rem",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                          {/* Matched Skills */}
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-success)", textTransform: "uppercase", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>
                              ✓ Matched Expertise ({prob.matched_skills?.length || 0})
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              {prob.matched_skills?.map((skill) => (
                                <span
                                  key={skill}
                                  style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    padding: "0.2rem 0.6rem",
                                    borderRadius: "var(--radius-full)",
                                    backgroundColor: "var(--color-success-subtle)",
                                    color: "var(--color-success)",
                                    border: "1px solid var(--color-success-border)",
                                  }}
                                >
                                  ✓ {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Missing / Additional Required Skills */}
                          {prob.missing_skills && prob.missing_skills.length > 0 && (
                            <div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>
                                Other Required Skills ({prob.missing_skills.length})
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                {prob.missing_skills.map((skill) => (
                                  <span
                                    key={skill}
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "var(--radius-full)",
                                      backgroundColor: "#ffffff",
                                      color: "var(--text-secondary)",
                                      border: "1px solid var(--border-color)",
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Explainable Match Reason */}
                        {prob.match_reason && (
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "0.6rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                            <div style={{ color: "var(--color-primary)", marginTop: "2px" }}><Icon name="sparkles" size={16} /></div>
                            <span style={{ lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--text-primary)" }}>Why this matches:</strong> {prob.match_reason}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          backgroundColor: "#fafafa",
                          borderRadius: "var(--radius-md)",
                          padding: "1rem 1.25rem",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "0.75rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Priority Score: </span>
                            <strong>{prob.priority_score ?? "Normal"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Domain: </span>
                            <strong>{prob.category || "Civic Challenge"}</strong>
                          </div>
                          {prob.evaluation_status && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Evaluation Status: </span>
                              <strong style={{ color: "var(--color-primary)" }}>{prob.evaluation_status}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer Action Buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", paddingTop: "0.5rem" }}>
                      {role !== "UNIVERSITY" ? (
                        <Button
                          variant="ghost"
                          icon="info"
                          onClick={() => setDetailModalProblem(prob)}
                        >
                          View Analysis Details
                        </Button>
                      ) : <div />}

                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        {role === "UNIVERSITY" ? (
                          <Button
                            variant="primary"
                            icon="briefcase"
                            onClick={() => navigate(`/problems/${prob.id}`)}
                          >
                            Evaluate &amp; Create Project
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              icon="arrow-right"
                              onClick={() => navigate(`/problems/${prob.id}`)}
                            >
                              Problem Details
                            </Button>
                            <Button
                              variant="primary"
                              icon="cpu"
                              onClick={() => navigate(`/problems/${prob.id}?tab=solutions`)}
                            >
                              Contribute Solution
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Explainable Matching Details Modal */}
      {detailModalProblem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setDetailModalProblem(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-xl)",
              maxWidth: "600px",
              width: "100%",
              padding: "2rem",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Explainable Match Analysis
                </div>
                <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {detailModalProblem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalProblem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.5rem", fontWeight: 700 }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.95rem" }}>
              {/* Problem Requirements */}
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Problem Required Expertise:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                  {detailModalProblem.required_expertise?.map((req) => (
                    <span key={req} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)", fontSize: "0.85rem", fontWeight: 500 }}>
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Student Skills */}
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Your Current Competencies:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                  {skills.map((sk) => (
                    <span key={sk} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)", fontSize: "0.85rem", fontWeight: 600 }}>
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Explainable Equation */}
              <div style={{ padding: "1.25rem", borderRadius: "var(--radius-lg)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-primary)", fontSize: "1rem" }}>
                  Matching Breakdown:
                </div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {detailModalProblem.matched_skills?.length > 0 ? (
                    <span>
                      Your skills overlap with the requirements for this problem in{" "}
                      <strong style={{ color: "var(--color-success)" }}>{detailModalProblem.matched_skills.join(", ")}</strong>. 
                      You have matched <strong>{detailModalProblem.matched_count}</strong> out of <strong>{detailModalProblem.total_required}</strong> required expertise areas.
                    </span>
                  ) : (
                    <span>No direct skill match found based on current profile.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
              <Button variant="ghost" onClick={() => setDetailModalProblem(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon="arrow-right"
                onClick={() => {
                  setDetailModalProblem(null);
                  navigate(`/problems/${detailModalProblem.id}`);
                }}
              >
                Go to Problem
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
