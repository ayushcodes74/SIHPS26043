import { useState } from "react";
import { Input, Select } from "../../components/common/FormControls";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { Icon } from "../../components/common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { useToast } from "../../context/useToast.js";

const ROLE_OPTIONS = [
  { value: "CITIZEN", label: "Citizen — Report societal challenges and track resolution" },
  { value: "UNIVERSITY", label: "University — Evaluate challenges and coordinate solution teams" },
  { value: "STARTUP", label: "Startup / MSME — Technology, mentoring, and implementation support" },
  { value: "AUTHORITY", label: "Authority — Govern, monitor, verify, and track impact" },
];

export function RegisterPage() {
  const { register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "CITIZEN",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        password: formData.password,
        role: formData.role,
      });

      toast.success(`Account created successfully! Welcome, ${user.name}.`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* Header Link */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Icon name="shield-check" size={22} />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.4rem" }}>CivicSync</span>
          </Link>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Join the societal problem-solving network
          </p>
        </div>

        {/* Register Card */}
        <Card padding="2rem" style={{ boxShadow: "var(--shadow-md)" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name / Organization Name"
              name="name"
              placeholder="e.g. Dr. Priya Nair or GreenHydro Innovations"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@domain.org"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Phone Number (Optional)"
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
            />

            <Select
              label="Your Primary Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={ROLE_OPTIONS}
              required
              hint="Tailors your dashboard and matched contribution workflows."
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              Create Account
            </Button>
          </form>
        </Card>

        {/* Footer Link */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
