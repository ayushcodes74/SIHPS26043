import { useState } from "react";
import { Input, Select } from "../../components/common/FormControls";
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
  const { language } = useTranslation();

  const isHi = language === "hi";

  const ROLE_OPTIONS = [
    { value: "CITIZEN", label: isHi ? "नागरिक — सामाजिक चुनौतियां दर्ज करें और समाधान ट्रैक करें" : "Citizen — Report societal challenges and track resolution" },
    { value: "STUDENT", label: isHi ? "छात्र — कौशल से मेल खाती समस्याएं खोजें और समाधान दें" : "Student — Discover matching problems and contribute skills" },
    { value: "RESEARCHER", label: isHi ? "शोधकर्ता — मूल कारण विश्लेषण और वैज्ञानिक समाधान" : "Researcher — Root cause analysis and research solutions" },
    { value: "STARTUP", label: isHi ? "स्टार्टअप — नवीन तकनीक और पायलट समाधान तैनात करें" : "Startup — Deploy innovative technology and pilot solutions" },
    { value: "MSME", label: isHi ? "एमएसएमई — स्थानीय निर्माण, इंजीनियरिंग और कार्यान्वयन" : "MSME — Local manufacturing, engineering, and implementation" },
    { value: "UNIVERSITY", label: isHi ? "विश्वविद्यालय — विभाग विशेषज्ञता और संकाय भागीदारी" : "University — Department expertise and faculty participation" },
    { value: "AUTHORITY", label: isHi ? "प्राधिकरण — नगरपालिका, जिला और क्षेत्रीय प्रशासन" : "Authority — Municipal, district, and regional administration" },
  ];

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
      setError(isHi ? "कृपया सभी आवश्यक फ़ील्ड भरें।" : "Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError(isHi ? "पासवर्ड कम से कम 6 वर्णों का होना चाहिए।" : "Password must be at least 6 characters.");
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

      toast.success(isHi ? `खाता सफलतापूर्वक बनाया गया! स्वागत है, ${user.name}।` : `Account created successfully! Welcome, ${user.name}.`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || (isHi ? "पंजीकरण विफल रहा। कृपया अपनी जानकारी जांचें।" : "Registration failed. Please check your information."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--canvas)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1rem",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "500px" }}>
        {/* CivicSync Official Shield Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.65rem",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Icon name="shield-check" size={20} />
            </div>
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              CivicSync
            </span>
          </Link>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.5rem",
              fontWeight: 500,
              margin: "0.85rem 0 0.25rem",
              color: "var(--text-primary)",
            }}
          >
            {isHi ? "अपना खाता बनाएं" : "Create your account"}
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {isHi ? "सामाजिक समस्या समाधान और शासन नेटवर्क से जुड़ें" : "Join the societal problem-solving and governance network"}
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "22px",
            border: "1px solid var(--border-color)",
            padding: "2rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              label={isHi ? "पूरा नाम / संस्था का नाम" : "Full Name / Organization Name"}
              name="name"
              placeholder={isHi ? "उदा. डॉ. प्रिया नायर या ग्रीनहाइड्रो इनोवेशन्स" : "e.g. Dr. Priya Nair or GreenHydro Innovations"}
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label={isHi ? "ईमेल पता" : "Email Address"}
              name="email"
              type="email"
              placeholder="you@domain.org"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              label={isHi ? "फ़ोन नंबर (वैकल्पिक)" : "Phone Number (Optional)"}
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
            />

            <Select
              label={isHi ? "आपकी प्राथमिक भूमिका" : "Your Primary Role"}
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={ROLE_OPTIONS}
              required
              placeholder=""
              hint={isHi ? "आपके डैशबोर्ड और योगदान वर्कफ़्लो को अनुकूलित करता है।" : "Tailors your dashboard and matched contribution workflows."}
            />

            <Input
              label={isHi ? "पासवर्ड" : "Password"}
              name="password"
              type="password"
              placeholder={isHi ? "कम से कम 6 वर्ण" : "At least 6 characters"}
              value={formData.password}
              onChange={handleChange}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.85rem 1.25rem",
                borderRadius: "12px",
                backgroundColor: "var(--color-primary)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                marginTop: "0.5rem",
                transition: "opacity 150ms ease",
              }}
            >
              {loading ? (isHi ? "खाता बनाया जा रहा है..." : "Creating Account...") : (isHi ? "खाता बनाएं" : "Create Account")}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          {isHi ? "पहले से खाता है?" : "Already have an account?"}{" "}
          <Link to="/login" style={{ fontWeight: 600, color: "var(--color-primary)", textDecoration: "underline" }}>
            {isHi ? "साइन इन करें" : "Sign in"}
          </Link>
        </div>
      </div>
    </div>
  );
}
