import { useState } from "react";
import { Input } from "../../components/common/FormControls";
import { Button } from "../../components/common/Button";
import { Icon } from "../../components/common/Icons";
import { useAuth, DEMO_ACCOUNTS } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { useToast } from "../../context/useToast.js";

// Google-style social button
function SocialButton({ icon, children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: "0.7rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        background: hovered ? "#f5f4f1" : "#faf9f6",
        border: "1px solid #e8e5df",
        borderRadius: "10px",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "#0a0a0a",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: "inherit",
        letterSpacing: "-0.01em",
      }}
    >
      <Icon name={icon} size={16} />
      {children}
    </button>
  );
}

export function LoginPage() {
  const { login, demoSwitchRole } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError("");
    setLoading(true);
    try {
      const user = await demoSwitchRole(role);
      toast.success(`Signed in as ${user.role} — ${user.name}`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#faf9f6",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Left Panel: Branding ─────────────────────────────────────── */}
      <div style={{
        background: "#0a0a0a",
        padding: "3rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "#ffffff",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="shield-check" size={18} color="#0a0a0a" />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#ffffff", letterSpacing: "-0.03em" }}>
            CivicSync
          </span>
        </div>

        {/* Central content */}
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.85rem",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "999px",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#9e9e9e",
            marginBottom: "1.5rem",
          }}>
            <Icon name="award" size={11} color="#9e9e9e" />
            CIVIC INNOVATION
          </div>

          <h2 style={{
            fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 1rem",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}>
            Real problems,<br />solved together.
          </h2>
          <p style={{
            color: "#6e6e6e",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            maxWidth: "340px",
          }}>
            Join India's civic innovation platform. Connect challenges with expertise, build solutions, and verify real-world impact.
          </p>

          {/* Stats */}
          <div style={{
            marginTop: "2.5rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
          }}>
            {[
              { v: "2,400+", l: "Active Challenges" },
              { v: "180+", l: "Institutions" },
              { v: "340+", l: "Solutions Delivered" },
              { v: "12", l: "States Covered" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
              }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {s.v}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6e6e6e", marginTop: "0.25rem" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: "0.72rem", color: "#3d3d3d" }}>
          Smart India Hackathon 2026 · PS-26043
        </div>
      </div>

      {/* ── Right Panel: Auth ────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        background: "#faf9f6",
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <h2 style={{
            fontSize: "1.6rem",
            fontWeight: 900,
            color: "#0a0a0a",
            margin: "0 0 0.35rem",
            letterSpacing: "-0.04em",
          }}>
            Sign in
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6e6e6e", margin: "0 0 2rem", lineHeight: 1.5 }}>
            Don&apos;t have an account?{" "}
            <Link to="/register" style={{ fontWeight: 700, color: "#0a0a0a", textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Create one
            </Link>
          </p>

          {/* Social auth buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.5rem" }}>
            <SocialButton icon="globe" onClick={() => {}}>
              Continue with Google
            </SocialButton>
            <SocialButton icon="mail" onClick={() => setShowDemo(!showDemo)}>
              Continue with Email (Demo)
            </SocialButton>
          </div>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ flex: 1, height: "1px", background: "#e8e5df" }} />
            <span style={{ fontSize: "0.75rem", color: "#9e9e9e", fontWeight: 500 }}>or sign in with email</span>
            <div style={{ flex: 1, height: "1px", background: "#e8e5df" }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "#fef5f4",
              border: "1px solid #e8b4b0",
              color: "#c0392b",
              fontSize: "0.83rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <Icon name="alert-triangle" size={15} />
              {error}
            </div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              placeholder="you@institution.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: "relative" }}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "36px",
                  background: "none",
                  border: "none",
                  color: "#9e9e9e",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              Sign In →
            </Button>
          </form>

          {/* Demo role quick-login */}
          {showDemo && (
            <div style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              background: "#ffffff",
              border: "1px solid #e8e5df",
              borderRadius: "12px",
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9e9e9e", marginBottom: "0.85rem" }}>
                Demo Access — Select Role
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {["CITIZEN", "STUDENT", "UNIVERSITY", "FACULTY", "RESEARCHER", "STARTUP", "AUTHORITY", "ADMIN"].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleDemoLogin(role)}
                    disabled={loading}
                    style={{
                      padding: "0.5rem 0.6rem",
                      background: "#faf9f6",
                      border: "1px solid #e8e5df",
                      borderRadius: "8px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#3d3d3d",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "background 0.12s, border-color 0.12s",
                      letterSpacing: "0.01em",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "#0a0a0a"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#faf9f6"; e.currentTarget.style.color = "#3d3d3d"; e.currentTarget.style.borderColor = "#e8e5df"; }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Back to home */}
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/" style={{ fontSize: "0.8rem", color: "#9e9e9e", fontWeight: 500 }}>
              ← Back to CivicSync
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
