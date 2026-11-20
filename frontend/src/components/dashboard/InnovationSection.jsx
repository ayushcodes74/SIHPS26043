import { useState, useEffect } from "react";
import { problemApi, reputationApi, projectApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";

export function InnovationSection({ role }) {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const isHi = language === "hi";

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
            // Authority approved/selected problems ready for MSME/Startup implementation
            const selected = all.filter((p) =>
              ["APPROVED", "EXECUTION_SUBMITTED", "PILOT", "IMPLEMENTING"].includes((p.status || "").toUpperCase())
            );
            setAuthoritySelectedProblems(selected);

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
          title={isHi ? "निष्पादन हेतु तैयार" : "Ready for Execution"}
          value={loading ? "..." : String(authoritySelectedProblems.length)}
          subtitle={isHi ? "प्राधिकरण द्वारा चयनित समाधान" : "Authority-selected solutions"}
          icon="shield-check"
          iconColor="var(--color-success)"
        />
        <StatCard
          title={isHi ? "नवाचार मिलान" : "Innovation Matches"}
          value={loading ? "..." : String(techProblems.length)}
          subtitle={isHi ? "सत्यापित नागरिक चुनौतियाँ" : "Validated civic challenges"}
          icon="rocket"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={isHi ? "संगठन ट्रैक रिकॉर्ड" : "Organization Track Record"}
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={isHi ? `श्रेणी: ${reputation?.tier || "कांस्य"}` : `Tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title={isHi ? "सत्यापित बैज" : "Verified Badges"}
          value={String(reputation?.badges?.length || 0)}
          subtitle={isHi ? "अनुभवजन्य नागरिक सत्यापन" : "Empirical civic validation"}
          icon="activity"
          iconColor="var(--color-secondary)"
        />
      </div>

      {/* Authority Handover Callout Banner */}
      <div
        style={{
          padding: "1.1rem 1.35rem",
          borderRadius: "var(--radius-lg)",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
          border: "1.5px solid rgba(16, 185, 129, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-success)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
          }}
        >
          <Icon name="award" size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                backgroundColor: "var(--color-success)",
                color: "#ffffff",
              }}
            >
              {isHi ? "प्राधिकरण से हस्तांतरण" : "Authority Handover"}
            </span>
            <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {isHi ? "प्राधिकरण द्वारा अनुमोदित समाधान अब स्टार्टअप/एमएसएमई निष्पादन के लिए तैयार हैं" : "Authority-Selected Solutions Ready for MSME & Startup Implementation"}
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            {isHi
              ? "नगरपालिका अधिकारियों ने नवाचार प्रस्तावों की समीक्षा और चयन किया है। स्टार्टअप और एमएसएमई अब वास्तविक पायलट शुरू कर सकते हैं, टेलीमेट्री ट्रैक कर सकते हैं, और क्षेत्र सत्यापन प्रस्तुत कर सकते हैं।"
              : "Municipal authorities review, validate, and select top solutions. Startups & MSMEs can now claim and execute field pilots, submit sensor telemetry, and unlock civic milestone funding."}
          </p>
        </div>
      </div>

      {/* Authority-Selected Solutions for Enterprise Execution */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ color: "var(--color-success)" }}>★</span>
            <span>{isHi ? "कार्यान्वयन के लिए तैयार समाधान (प्राधिकरण द्वारा चयनित)" : "Solutions Ready for Implementation (Authority-Selected)"}</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.15rem 0.55rem",
                borderRadius: "12px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
              }}
            >
              {authoritySelectedProblems.length} {isHi ? "सक्रिय" : "Active"}
            </span>
          </div>
        }
        subtitle={
          isHi
            ? "इन समस्याओं के लिए समाधान का चयन हो चुका है और ये पायलट परिनियोजन के लिए एमएसएमई और स्टार्टअप्स को सौंप दी गई हैं"
            : "These problems have had winning solution ideas selected by municipal authorities and are now handed over for enterprise pilot execution"
        }
      >
        {loading ? (
          <LoadingSkeleton lines={3} />
        ) : authoritySelectedProblems.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title={isHi ? "कोई चयनित समाधान प्रतीक्षारत नहीं है" : "No selected solutions pending pilot"}
            description={
              isHi
                ? "जब प्राधिकरण नए समाधानों को मंजूरी देगा, तो वे तुरंत यहां पायलट परिनियोजन के लिए दिखाई देंगे।"
                : "When municipal authorities approve solution ideas, they will appear here immediately for field pilot claiming and execution."
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {authoritySelectedProblems.map((prob, idx) => (
              <div
                key={`${prob.id || "sel"}-${idx}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  padding: "1.1rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1.5px solid rgba(16, 185, 129, 0.35)",
                  backgroundColor: "rgba(16, 185, 129, 0.03)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      ✓ {isHi ? "प्राधिकरण द्वारा चयनित" : "Selected by Authority"}
                    </span>
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
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      #{prob.id} &bull; 📍 {prob.district || (isHi ? "जिला" : "District")}
                    </span>
                  </div>

                  <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {prob.title}
                  </h4>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {prob.description?.slice(0, 140)}...
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span>⚡ <strong>{isHi ? "वर्तमान चरण:" : "Stage:"}</strong> {prob.status === "EXECUTION_SUBMITTED" ? (isHi ? "साक्ष्य प्रस्तुत (सत्यापन प्रतीक्षारत)" : "Execution Proofs Submitted") : (isHi ? "निष्पादन हेतु तैयार" : "Ready for Field Execution")}</span>
                    <span>🏢 <strong>{isHi ? "पात्र संगठन:" : "Eligible:"}</strong> Startups & MSMEs</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="external-link"
                    onClick={() => navigate(`/problems/${prob.id}?tab=solutions`)}
                  >
                    {isHi ? "समाधान देखें" : "View Solutions"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon="upload"
                    onClick={() => navigate(`/problems/${prob.id}?tab=solutions`)}
                  >
                    {isHi ? "निष्पादन एवं साक्ष्य अपलोड" : "Execute & Upload Proofs"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Technology-Relevant Problems Seeking Solutions */}
      <Card
        title={isHi ? "तकनीक की आवश्यकता वाली अन्य नागरिक चुनौतियाँ" : "Open Civic Challenges Seeking Technology Solutions"}
        subtitle={isHi ? "सत्यापित मूल कारणों वाली समस्याएं जहां नए नवाचार प्रस्ताव प्रस्तुत किए जा सकते हैं" : "Problems with verified root causes where new innovative concepts can be submitted"}
        actions={
          <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
            {isHi ? "कैटलॉग देखें" : "Explore Catalog"}
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
            title={isHi ? "कोई तकनीकी समस्या नहीं मिली" : "No technology-relevant problems found"}
            description={isHi ? "सभी सक्रिय मामले वर्तमान में मूल्यांकन अधीन हैं या गैर-तकनीकी क्षेत्रों में हैं।" : "All active cases are currently under evaluation or in non-technical domains."}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {techProblems.slice(0, 6).map((prob, idx) => {
              const prio = prob.priority_score ?? ((prob.severity || 0) * 5 + (prob.urgency || 0) * 5);
              const skills = Array.isArray(prob.required_expertise) ? prob.required_expertise : [];

              return (
                <div
                  key={`${prob.id || "tech"}-${idx}`}
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
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || (isHi ? "जिला" : "District")}
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
                    {isHi ? "समाधान प्रस्तावित करें" : "Propose Solution"}
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
