import { useState } from "react";
import { Icon } from "../components/common/Icons";
import { Button } from "../components/common/Button";
import { useRouter } from "../context/useRouter.js";
import { useAuth } from "../context/useAuth.js";
import { useTranslation } from "../context/useTranslation.js";

// Language toggle state
const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
];

const COPY = {
  en: {
    badge: "CIVIC INNOVATION",
    hero1: "Real problems,",
    hero2: "solved together.",
    sub: "CivicSync connects citizens, universities, and government institutions to solve India's most pressing societal challenges through AI-powered matching and transparent accountability.",
    cta1: "Get Started",
    cta2: "Sign In",
    stat1: "Active Challenges",
    stat2: "Institutions",
    stat3: "Solutions Delivered",
    how: "How It Works",
    stakeholders: "Stakeholders",
    governance: "Governance Pipeline",
    step1t: "Citizens Report",
    step1d: "A problem is flagged in any district — water, roads, health, education.",
    step2t: "AI Analyses",
    step2d: "Our AI engine classifies the challenge, identifies required expertise, and finds matching institutions.",
    step3t: "Teams Form",
    step3d: "Universities, researchers, startups, and government bodies collaborate in a shared workspace.",
    step4t: "Impact Verified",
    step4d: "Solutions are tested, evidence is submitted, and outcomes are publicly tracked.",
    rolesTitle: "Built for Every Stakeholder",
    roles: [
      { icon: "users", title: "Citizens", desc: "Report real local problems. Track resolution status. Validate outcomes." },
      { icon: "graduation-cap", title: "Universities", desc: "Match challenges to faculty expertise. Create institutional project workspaces." },
      { icon: "briefcase", title: "Industry", desc: "Collaborate on pilot projects. Fund research. Drive commercialization." },
      { icon: "shield-check", title: "Government", desc: "Monitor challenges across districts. Approve implementations. Measure verified impact." },
    ],
    govTitle: "Governance Pipeline",
    govDesc: "Every problem follows a transparent, auditable lifecycle — from citizen report to verified real-world impact.",
    govStages: ["Reported", "AI Analysed", "Matched", "In Project", "Under Review", "Impact Verified"],
    footer: "CivicSync · Smart India Hackathon 2026 · PS-26043",
  },
  hi: {
    badge: "नागरिक नवाचार",
    hero1: "असली समस्याएं,",
    hero2: "मिलकर सुलझाएं।",
    sub: "CivicSync नागरिकों, विश्वविद्यालयों और सरकारी संस्थाओं को AI-संचालित मिलान और पारदर्शी जवाबदेही के माध्यम से जोड़ता है।",
    cta1: "शुरू करें",
    cta2: "साइन इन",
    stat1: "सक्रिय चुनौतियाँ",
    stat2: "संस्थाएं",
    stat3: "समाधान वितरित",
    how: "यह कैसे काम करता है",
    stakeholders: "हितधारक",
    governance: "शासन पाइपलाइन",
    step1t: "नागरिक रिपोर्ट करते हैं",
    step1d: "किसी भी जिले में समस्या दर्ज की जाती है — पानी, सड़क, स्वास्थ्य, शिक्षा।",
    step2t: "AI विश्लेषण करती है",
    step2d: "AI इंजन चुनौती को वर्गीकृत करता है और मिलान संस्थाएं खोजता है।",
    step3t: "टीमें बनती हैं",
    step3d: "विश्वविद्यालय, शोधकर्ता, स्टार्टअप और सरकारी निकाय साझा कार्यस्थल में सहयोग करते हैं।",
    step4t: "प्रभाव सत्यापित",
    step4d: "समाधानों का परीक्षण किया जाता है, साक्ष्य प्रस्तुत किए जाते हैं और परिणाम सार्वजनिक रूप से ट्रैक किए जाते हैं।",
    rolesTitle: "हर हितधारक के लिए निर्मित",
    roles: [
      { icon: "users", title: "नागरिक", desc: "स्थानीय समस्याएं रिपोर्ट करें। समाधान स्थिति ट्रैक करें।" },
      { icon: "graduation-cap", title: "विश्वविद्यालय", desc: "शिक्षकों की विशेषज्ञता से चुनौतियां मिलाएं।" },
      { icon: "briefcase", title: "उद्योग", desc: "पायलट परियोजनाओं में सहयोग करें।" },
      { icon: "shield-check", title: "सरकार", desc: "जिलों में चुनौतियों की निगरानी करें।" },
    ],
    govTitle: "शासन पाइपलाइन",
    govDesc: "प्रत्येक समस्या एक पारदर्शी, ऑडिट योग्य जीवनचक्र का अनुसरण करती है।",
    govStages: ["रिपोर्ट की", "AI विश्लेषण", "मिलान", "परियोजना में", "समीक्षाधीन", "प्रभाव सत्यापित"],
    footer: "CivicSync · स्मार्ट इंडिया हैकाथॉन 2026 · PS-26043",
  },
};

// Pill-style stat
function StatPill({ value, label }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.15rem",
    }}>
      <span style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#0a0a0a", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.75rem", color: "#6e6e6e", fontWeight: 500, letterSpacing: "0.02em" }}>
        {label}
      </span>
    </div>
  );
}

// Step card for "How It Works"
function StepCard({ num, title, desc }) {
  return (
    <div style={{
      padding: "1.75rem",
      background: "#ffffff",
      border: "1px solid #e8e5df",
      borderRadius: "16px",
      transition: "box-shadow 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(10,10,10,0.10)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{
        width: "36px", height: "36px",
        background: "#0a0a0a",
        borderRadius: "8px",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#ffffff",
        fontSize: "0.85rem",
        fontWeight: 800,
        marginBottom: "1.25rem",
      }}>
        {String(num).padStart(2, "0")}
      </div>
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#0a0a0a" }}>
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "#6e6e6e", lineHeight: 1.6 }}>
        {desc}
      </p>
    </div>
  );
}

export function LandingPage() {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState("en");
  const c = COPY[lang];

  return (
    <div style={{ backgroundColor: "#faf9f6", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <header style={{
        background: "rgba(250, 249, 246, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #e8e5df",
        padding: "0 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "60px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        maxWidth: "100%",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "#0a0a0a",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#ffffff",
          }}>
            <Icon name="shield-check" size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0a0a0a", letterSpacing: "-0.03em" }}>
            CivicSync
          </span>
        </div>

        {/* Center nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {[
            { label: c.how, id: "how-it-works" },
            { label: c.stakeholders, id: "stakeholders" },
            { label: c.governance, id: "governance" },
          ].map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "#3d3d3d",
                padding: "0.4rem 0.75rem",
                borderRadius: "8px",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.target.style.background = "#f0ede6"; e.target.style.color = "#0a0a0a"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#3d3d3d"; }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side: lang toggle + auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Language toggle */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "#f0ede6",
            borderRadius: "8px",
            padding: "3px",
            gap: "2px",
          }}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.6rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: lang === l.code ? "#0a0a0a" : "transparent",
                  color: lang === l.code ? "#ffffff" : "#6e6e6e",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard →
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                {c.cta2}
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate("/register")}>
                {c.cta1}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section style={{
        padding: "5rem 2rem 4rem",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4rem",
        alignItems: "center",
      }}>
        {/* Left: Text */}
        <div>
          {/* CIVIC INNOVATION badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.9rem",
            background: "#0a0a0a",
            color: "#ffffff",
            borderRadius: "999px",
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "1.75rem",
          }}>
            <Icon name="award" size={12} />
            <span>{c.badge}</span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)",
            fontWeight: 900,
            letterSpacing: "-0.05em",
            color: "#0a0a0a",
            margin: "0 0 1.25rem",
            lineHeight: 1.05,
          }}>
            {c.hero1}<br />
            {c.hero2}
          </h1>

          <p style={{
            fontSize: "1.05rem",
            color: "#4a4a4a",
            margin: "0 0 2.5rem",
            maxWidth: "480px",
            lineHeight: 1.7,
            fontWeight: 400,
          }}>
            {c.sub}
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "3rem" }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(isAuthenticated ? "/report" : "/register")}
            >
              {c.cta1} →
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/explore")}
            >
              Explore Challenges
            </Button>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex",
            gap: "2.5rem",
            paddingTop: "2rem",
            borderTop: "1px solid #e8e5df",
          }}>
            <StatPill value="2,400+" label={c.stat1} />
            <StatPill value="180+" label={c.stat2} />
            <StatPill value="340+" label={c.stat3} />
          </div>
        </div>

        {/* Right: Civic Report Showcase Card */}
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e8e5df",
          overflow: "hidden",
          boxShadow: "0 20px 60px -10px rgba(10,10,10,0.12)",
        }}>
          {/* Card header */}
          <div style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #f0ede6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#2d7a4f",
                boxShadow: "0 0 0 3px rgba(45,122,79,0.15)",
              }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.01em" }}>
                CivicSync Intelligence
              </span>
            </div>
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, color: "#6e6e6e",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              LIVE
            </span>
          </div>

          {/* Challenge card */}
          <div style={{ padding: "1.25rem" }}>
            {/* Report submitted */}
            <div style={{
              padding: "1rem",
              background: "#faf9f6",
              borderRadius: "12px",
              border: "1px solid #e8e5df",
              marginBottom: "0.75rem",
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6e6e6e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
                Citizen Challenge
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0a0a0a", marginBottom: "0.25rem" }}>
                Unsafe Drinking Water
              </div>
              <div style={{ fontSize: "0.78rem", color: "#6e6e6e" }}>
                Dhanbad District · 5,200 affected
              </div>
            </div>
          )}

            {/* AI pipeline steps */}
            {[
              { label: "AI Analysis", value: "Water Quality · Env. Engineering · IoT", icon: "cpu" },
              { label: "Academic Expertise", value: "3 Faculty · 12 Students matched", icon: "graduation-cap" },
              { label: "Project Workspace", value: "ISM Dhanbad · Active", icon: "briefcase" },
              { label: "Solution → Impact", value: "Pilot running · Evidence submitted", icon: "check-circle" },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                padding: "0.75rem 0",
                borderBottom: i < 3 ? "1px solid #f0ede6" : "none",
              }}>
                <div style={{
                  width: "28px", height: "28px",
                  background: i === 3 ? "#0a0a0a" : "#f5f4f1",
                  borderRadius: "6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon name={step.icon} size={13} color={i === 3 ? "#ffffff" : "#3d3d3d"} />
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6e6e6e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#0a0a0a", fontWeight: 600, marginTop: "0.15rem" }}>
                    {step.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee strip ────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #e8e5df",
        borderBottom: "1px solid #e8e5df",
        padding: "0.85rem 0",
        background: "#f5f4f1",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          gap: "3rem",
          justifyContent: "center",
          flexWrap: "wrap",
          padding: "0 2rem",
        }}>
          {["AI Challenge Intelligence", "Explainable Expertise Matching", "Collaborative Solutions", "Verified Real-World Impact", "Governance Pipeline", "Multi-Stakeholder Platform"].map((item, i) => (
            <span key={i} style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#6e6e6e",
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
            }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#c4c0b8", display: "inline-block" }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: "5rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6e6e6e",
            marginBottom: "1rem",
          }}>
            <span style={{ width: "16px", height: "1px", background: "#c4c0b8", display: "inline-block" }} />
            {c.how}
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 900, color: "#0a0a0a", margin: "0 0 0.75rem", letterSpacing: "-0.04em" }}>
            From problem to verified impact
          </h2>
          <p style={{ color: "#6e6e6e", maxWidth: "520px", fontSize: "1rem", lineHeight: 1.6 }}>
            A transparent, auditable pipeline connecting citizens to institutions — with AI at every step.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <StepCard num={1} title={c.step1t} desc={c.step1d} />
          <StepCard num={2} title={c.step2t} desc={c.step2d} />
          <StepCard num={3} title={c.step3t} desc={c.step3d} />
          <StepCard num={4} title={c.step4t} desc={c.step4d} />
        </div>
      </section>

      {/* ── Stakeholders ─────────────────────────────────────────────── */}
      <section id="stakeholders" style={{
        padding: "5rem 2rem",
        background: "#f5f4f1",
        borderTop: "1px solid #e8e5df",
        borderBottom: "1px solid #e8e5df",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "3rem" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6e6e6e",
              marginBottom: "1rem",
            }}>
              <span style={{ width: "16px", height: "1px", background: "#c4c0b8", display: "inline-block" }} />
              {c.stakeholders}
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 900, color: "#0a0a0a", margin: 0, letterSpacing: "-0.04em" }}>
              {c.rolesTitle}
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {c.roles.map((role, i) => (
              <div key={i} style={{
                padding: "1.75rem",
                background: "#ffffff",
                border: "1px solid #e8e5df",
                borderRadius: "16px",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(10,10,10,0.10)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                <div style={{
                  width: "40px", height: "40px",
                  background: "#f5f4f1",
                  borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1.25rem",
                }}>
                  <Icon name={role.icon} size={20} color="#0a0a0a" />
                </div>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                  {role.title}
                </h4>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#6e6e6e", lineHeight: 1.6 }}>
                  {role.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Governance Pipeline ──────────────────────────────────────── */}
      <section id="governance" style={{
        padding: "5rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6e6e6e",
            marginBottom: "1rem",
          }}>
            <span style={{ width: "16px", height: "1px", background: "#c4c0b8", display: "inline-block" }} />
            {c.governance}
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 900, color: "#0a0a0a", margin: "0 0 0.75rem", letterSpacing: "-0.04em" }}>
            {c.govTitle}
          </h2>
          <p style={{ color: "#6e6e6e", maxWidth: "520px", fontSize: "1rem", lineHeight: 1.6 }}>
            {c.govDesc}
          </p>
        </div>

        {/* Pipeline stages */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "#ffffff",
          border: "1px solid #e8e5df",
          borderRadius: "16px",
          padding: "0",
          overflow: "hidden",
        }}>
          {c.govStages.map((stage, i) => (
            <div key={i} style={{
              flex: 1,
              padding: "1.25rem 1rem",
              borderRight: i < c.govStages.length - 1 ? "1px solid #f0ede6" : "none",
              background: i === c.govStages.length - 1 ? "#0a0a0a" : "#ffffff",
              textAlign: "center",
              transition: "background 0.2s",
            }}>
              <div style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: i === c.govStages.length - 1 ? "#ffffff" : "#9e9e9e",
                marginBottom: "0.35rem",
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: i === c.govStages.length - 1 ? "#ffffff" : "#0a0a0a",
                letterSpacing: "-0.01em",
              }}>
                {stage}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <div style={{
        background: "#0a0a0a",
        padding: "4rem 2rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ color: "#ffffff", fontWeight: 900, fontSize: "clamp(1.8rem, 3vw, 2.5rem)", letterSpacing: "-0.04em", margin: "0 0 1rem" }}>
            Join the civic innovation movement
          </h2>
          <p style={{ color: "#9e9e9e", fontSize: "1rem", marginBottom: "2rem" }}>
            Citizens, institutions, researchers, and government — solving India's challenges together.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/register")}
              style={{
                padding: "0.875rem 2rem",
                background: "#ffffff",
                color: "#0a0a0a",
                border: "none",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.target.style.opacity = "0.85"}
              onMouseLeave={e => e.target.style.opacity = "1"}
            >
              {c.cta1} →
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "0.875rem 2rem",
                background: "transparent",
                color: "#9e9e9e",
                border: "1px solid #2e2d29",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.target.style.borderColor = "#5c5a54"; e.target.style.color = "#ffffff"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#2e2d29"; e.target.style.color = "#9e9e9e"; }}
            >
              {c.cta2}
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid #e8e5df",
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#faf9f6",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: "24px", height: "24px",
            background: "#0a0a0a",
            borderRadius: "5px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="shield-check" size={13} color="#ffffff" />
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.01em" }}>
            CivicSync
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#9e9e9e" }}>
          {c.footer}
        </span>
      </footer>

      {/* Quick Role Selection Modal */}
      {showRoleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(24, 24, 22, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "24px",
              padding: "2.25rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      backgroundColor: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                    }}
                  >
                    <Icon name="shield-check" size={16} />
                  </div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", margin: 0, color: "var(--text-primary)" }}>
                    {isHi ? "अपनी भूमिका चुनें" : "Select Your Role"}
                  </h3>
                </div>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {isHi
                    ? "वह कार्यक्षेत्र चुनें जिसे आप अनुभव करना चाहते हैं:"
                    : "Choose which stakeholder view you want to experience:"}
                </p>
              </div>

              <button
                onClick={() => setShowRoleModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.5rem 0" }}>
              {[
                {
                  role: "CITIZEN",
                  label: isHi ? "नागरिक" : "Citizen",
                  desc: isHi ? "समस्या दर्ज करें और सत्यापन ट्रैक करें" : "Report problems & track verified progress",
                },
                {
                  role: "STUDENT",
                  label: isHi ? "छात्र / शोधकर्ता" : "Student / Researcher",
                  desc: isHi ? "चुनौतियां देखें और तकनीकी समाधान दें" : "View challenges & submit technical proposals",
                },
                {
                  role: "AUTHORITY",
                  label: isHi ? "नगरपालिका प्राधिकरण" : "Municipal Authority",
                  desc: isHi ? "प्रस्ताव अपनाएं और कार्य आदेश जारी करें" : "Review proposals & issue implementation orders",
                },
                {
                  role: "MSME",
                  label: isHi ? "स्टार्टअप / एमएसएमई" : "Startup / MSME",
                  desc: isHi ? "परियोजनाएं कार्यान्वित करें और साक्ष्य दें" : "Execute projects & upload milestone proof",
                },
                {
                  role: "UNIVERSITY",
                  label: isHi ? "शैक्षणिक संस्थान" : "Academic Institution",
                  desc: isHi ? "विभाग सहभागिता और शोध दल" : "Department engagement & research teams",
                },
                {
                  role: "ADMIN",
                  label: isHi ? "प्लेटफॉर्म प्रशासन" : "Platform Oversight",
                  desc: isHi ? "विश्वसनीयता, एसएलए और सार्वजनिक शासन" : "Integrity, SLAs, and public governance",
                },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleRoleSelect(item.role)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.9rem 1.2rem",
                    borderRadius: "14px",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-muted-hover)";
                    e.currentTarget.style.borderColor = "var(--ink-700)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {item.desc}
                    </div>
                  </div>
                  <span style={{ fontSize: "1rem", color: "var(--text-primary)" }}>&rarr;</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  navigate("/login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isHi ? "या ईमेल और पासवर्ड से साइन इन करें" : "Or sign in with an existing email & password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
