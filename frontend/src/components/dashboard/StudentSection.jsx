import { useState, useEffect } from "react";
import { studentApi, reputationApi, projectApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { MatchScoreIndicator } from "../common/ProgressBar";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";

export function StudentSection({ user }) {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const isHi = language === "hi";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matchedProblems, setMatchedProblems] = useState([]);
  const [allCommunityProblems, setAllCommunityProblems] = useState([]);
  const [mySolutions, setMySolutions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadStudentData() {
      setError("");
      try {
        const [profRes, repRes, matchRes, projRes] = await Promise.allSettled([
          studentApi.getProfile(),
          reputationApi.getMyReputation(),
          studentApi.getMatchedProblems({ sort: "best_match" }),
          projectApi.getProjects().catch(() => ({ projects: [] }))
        ]);

        if (ignore) return;

        if (profRes.status === "fulfilled") {
          const currentProf = profRes.value?.profile;
          setProfile(currentProf);
          setSkills(currentProf?.skills || []);
        }

        if (repRes.status === "fulfilled") {
          setReputation(repRes.value);
        }

        if (matchRes.status === "fulfilled") {
          const rawMatches = matchRes.value?.matches || [];
          setMatchedProblems(rawMatches);
        }

        if (projRes.status === "fulfilled" && projRes.value?.projects) {
          setProjects(projRes.value.projects);
        }

        // Student solutions are per-problem; we just show the count as 0
        // (solutions are accessible from individual problem pages, not a global list endpoint)
        setMySolutions([]);
        setLoading(false);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load student dashboard opportunities");
          setLoading(false);
        }
      }
    }

    loadStudentData();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  // Derive suggested contribution area from matched skills
  const getContributionArea = (matchedSkills) => {
    if (matchedSkills.some((s) => s.toLowerCase().includes("gis"))) {
      return "Spatial mapping & geospatial contaminant spread modeling";
    }
    if (matchedSkills.some((s) => s.toLowerCase().includes("water quality"))) {
      return "Water quality testing data analysis & sample verification";
    }
    if (matchedSkills.some((s) => s.toLowerCase().includes("groundwater"))) {
      return "Hydrogeological aquifer data aggregation & localized field survey";
    }
    return "Technical research, data synthesis, and pilot validation";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Student Metrics from Real Data */}
      <div className="cs-grid-4">
        <StatCard
          title={isHi ? "कौशल मेल" : "Skill Matches"}
          value={loading ? "..." : String(matchedProblems.length)}
          subtitle={isHi ? "आपकी विशेषज्ञता से मेल खाती समस्याएं" : "Problems matching your expertise"}
          icon="target"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={isHi ? "सक्रिय समाधान" : "Your Active Solutions"}
          value={loading ? "..." : String(mySolutions.length)}
          subtitle={isHi ? "प्रस्ताव और सहयोग" : "Proposals & collaborations"}
          icon="cpu"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title={isHi ? "प्रतिष्ठा स्कोर" : "Reputation Score"}
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={isHi ? `वर्तमान स्तर: ${reputation?.tier || "BRONZE"}` : `Current tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title={isHi ? "पंजीकृत कौशल" : "Registered Skills"}
          value={loading ? "..." : String(skills.length)}
          subtitle={isHi ? "सत्यापित छात्र क्षमताएं" : "Validated student competencies"}
          icon="graduation-cap"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Student Skill Profile Card */}
      <Card
        title={isHi ? "आपकी छात्र क्षमता प्रोफ़ाइल" : "Your Student Competency Profile"}
        subtitle={profile ? (isHi ? `${profile.course || "छात्र"} • ${profile.institution_name || "शैक्षणिक संस्थान"}` : `${profile.course || "Student"} • ${profile.institution_name || "Academic Institution"}`) : (isHi ? "आपकी प्रोफ़ाइल में दर्ज कौशल" : "Skills registered in your academic profile")}
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="primary" size="sm" icon="target" onClick={() => navigate("/matches")}>
              {isHi ? "कौशल मिलान पृष्ठ →" : "Matching Skills Page →"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/reputation")}>
              {isHi ? "प्रतिष्ठा" : "Reputation"}
            </Button>
          </div>
        }
      >
        {skills.length === 0 ? (
          <div style={{ padding: "0.5rem 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {isHi ? "अभी तक कोई कौशल पंजीकृत नहीं है। " : "No skills registered yet. "}
            <button
              type="button"
              onClick={() => navigate("/matches")}
              style={{ color: "var(--color-primary)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              {isHi ? "यहाँ कौशल जोड़ें" : "Add skills here"}
            </button>{" "}
            {isHi ? "ताकि प्रासंगिक नागरिक समस्याओं की खोज शुरू हो सके।" : "to start discovering relevant civic problems."}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
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

      {/* Core Student Matching Value Proposition */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", fontWeight: 700 }}>
              {isHi ? "आपके कौशल से मेल खाती समस्याएं" : "Problems Matching Your Skills"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {isHi ? "अपनी दक्षताओं से मेल खाती वास्तविक सामाजिक समस्याओं में विशेष ज्ञान का योगदान दें" : "Contribute specialized knowledge to real societal problems matching your competencies"}
            </p>
          </div>
          <Button variant="outline" size="sm" icon="arrow-right" onClick={() => navigate("/matches")}>
            {isHi ? `सभी मैच देखें (${matchedProblems.length})` : `View All Matches (${matchedProblems.length})`}
          </Button>
        </div>

        {loading ? (
          <div className="cs-grid-2">
            <Card><LoadingSkeleton lines={4} /></Card>
            <Card><LoadingSkeleton lines={4} /></Card>
          </div>
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : matchedProblems.length === 0 ? (
          <EmptyState
            icon="target"
            title={isHi ? "वर्तमान में कोई सीधा कौशल मिलान नहीं मिला" : "No direct skill matches found right now"}
            description={isHi ? "अनुकूलित नागरिक चुनौतियों की खोज के लिए कौशल मिलान पृष्ठ पर कौशल जोड़ें या अपडेट करें।" : "Add or update skills on the Matching Skills page to discover tailored civic challenges."}
            actionLabel={isHi ? "कौशल प्रबंधित करें" : "Manage Matching Skills"}
            onAction={() => navigate("/matches")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {matchedProblems.slice(0, 4).map((prob) => (
              <div
                key={prob.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {prob.category}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || (isHi ? "जिला" : "District")} {prob.city ? `(${prob.city})` : ""}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                      {prob.title}
                    </h4>
                  </div>

                  <MatchScoreIndicator score={prob.match_score} />
                </div>

                {/* The 4-Step Student Journey Pipeline Box */}
                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem 1rem",
                    margin: "1rem 0",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {/* Step 1: Required Expertise */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {isHi ? "1. आवश्यक विशेषज्ञता" : "1. Required Expertise"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                      {prob.required_expertise?.map((s) => (
                        <span key={s} style={{ fontSize: "0.72rem", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "#ffffff", border: "1px solid var(--border-color)" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Your Matching Skills */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
                      {isHi ? "2. आपके मेल खाते कौशल" : "2. Your Matching Skills"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                      {prob.matched_skills?.map((s) => (
                        <span key={s} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Contribution Area */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase" }}>
                      {isHi ? "3. मिलान मूल्यांकन" : "3. Match Evaluation"}
                    </div>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      <strong>{prob.match_tier}</strong> ({prob.match_score}%) &bull; {getContributionArea(prob.matched_skills || [])}
                    </p>
                  </div>

                  {/* Step 4: Next Steps */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-warning)", textTransform: "uppercase" }}>
                      {isHi ? "4. अगला कदम" : "4. Next Steps"}
                    </div>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {isHi ? "इस नागरिक चुनौती पर सहयोग के लिए समाधान प्रस्तावित करें।" : "Propose a solution to collaborate on this civic challenge."}
                    </p>
                  </div>
                </div>

                {/* Explanation & Action Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    💡 {prob.match_reason}
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="arrow-right"
                      onClick={() => navigate(`/problems/${prob.id}`)}
                    >
                      {isHi ? "समस्या देखें" : "View Problem"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="plus-circle"
                      onClick={() => navigate(`/problems/${prob.id}?tab=solutions`)}
                    >
                      {isHi ? "समाधान प्रस्तावित करें" : "Contribute Solution"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STUDENT PROJECTS */}
      <Card title="My Associated Projects" subtitle="Institutional workspaces you have access to">
        {projects.length === 0 ? (
          <EmptyState icon="briefcase" title="No active projects" description="You are not part of any active institutional project teams yet." />
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
                    Mentor: {proj.mentor_name || "None"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-muted)" }}>
                    {proj.project_status}
                  </span>
                  <Button variant="outline" size="sm">View Workspace</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
