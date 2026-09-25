import { useState, useRef, useEffect, useContext } from "react";
import { Icon } from "../common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { useNotification } from "../../context/useNotification.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { StatusBadge } from "../common/Badges";
import { useTranslation } from "../../context/useTranslation.js";
import { problemApi } from "../../services/api.js";
import { ThemeContext } from "../../context/ThemeContext";

export function Topbar() {
  const { user, role, logout } = useAuth();
  const { unreadCount } = useNotification();
  const { navigate } = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useContext(ThemeContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const searchRef = useRef(null);
  const profileRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Debounced Search against Backend Database
  useEffect(() => {
    const query = searchQuery.trim();

    const timer = setTimeout(async () => {
      if (!query) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError("");
        return;
      }

      setSearchLoading(true);
      setSearchError("");
      try {
        const res = await problemApi.getProblems({ search: query, limit: 6 });
        setSearchResults(res.problems || []);
      } catch (err) {
        console.error("Live search failed:", err);
        setSearchError(err.message || "Search failed");
      } finally {
        setSearchLoading(false);
      }
    }, query ? 250 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectProblem = (id) => {
    setSearchOpen(false);
    navigate(`/problems/${id}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  return (
    <header
      style={{
        height: "76px",
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 40,
        marginTop: "1rem",
      }}
    >
      {/* Functional Global Search Bar & Live Dropdown */}
      <div ref={searchRef} style={{ position: "relative", width: "min(400px, 100%)" }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-full)",
            padding: "0.6rem 1.25rem",
            width: "100%",
            border: searchOpen ? "1px solid var(--color-primary-border)" : "1px solid var(--border-color)",
            boxShadow: "var(--shadow-xs)",
            transition: "all var(--transition-fast)",
          }}
        >
          <Icon name="search" size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder={t("header.searchPlaceholder")}
            value={searchQuery}
            onFocus={() => {
              if (searchQuery.trim()) setSearchOpen(true);
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!searchOpen) setSearchOpen(true);
            }}
            style={{
              border: "none",
              background: "none",
              outline: "none",
              marginLeft: "0.5rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              width: "100%",
            }}
            aria-label={t("header.searchPlaceholder")}
          />

          {/* Search Loading Indicator or Clear Button */}
          {searchLoading ? (
            <Icon name="spinner" size={14} color="var(--color-primary)" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              title={t("header.clearSearch")}
              aria-label={t("header.clearSearch")}
            >
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </form>

        {/* Live Search Results Popover */}
        {searchOpen && searchQuery.trim() && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              width: "100%",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 100,
              overflow: "hidden",
              maxHeight: "420px",
              display: "flex",
              flexDirection: "column",
              marginTop: "0.5rem",
            }}
          >
            <div
              style={{
                padding: "0.6rem 0.85rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border-color)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{t("header.searchResults")}</span>
              {searchResults.length > 0 && (
                <span>
                  {searchResults.length} {language === "hi" ? "परिणाम" : "found"}
                </span>
              )}
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {searchLoading ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <Icon name="spinner" size={20} color="var(--color-primary)" />
                  <div style={{ marginTop: "0.5rem" }}>{t("header.searching")}</div>
                </div>
              ) : searchError ? (
                <div style={{ padding: "1rem", color: "var(--color-danger)", fontSize: "0.85rem", textAlign: "center" }}>
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <Icon name="search" size={24} color="var(--border-color)" />
                  <div style={{ marginTop: "0.5rem", fontWeight: 500 }}>{t("header.noResults")}</div>
                </div>
              ) : (
                searchResults.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() => handleSelectProblem(problem.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.65rem 0.85rem",
                      border: "none",
                      borderBottom: "1px solid var(--border-color)",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                        }}
                      >
                        {problem.title}
                      </span>
                      <StatusBadge status={problem.status} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <span
                        style={{
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 600,
                        }}
                      >
                        {problem.category}
                      </span>
                      {problem.district && <span>📍 {problem.district}</span>}
                      <span style={{ color: "var(--text-muted)" }}>ID: #{problem.id}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {searchQuery.trim() && (
              <div
                onClick={handleSearchSubmit}
                style={{
                  padding: "0.55rem 0.85rem",
                  backgroundColor: "var(--bg-muted)",
                  borderTop: "1px solid var(--border-color)",
                  textAlign: "center",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  cursor: "pointer",
                }}
              >
                {t("header.viewAllResults")} →
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Zone: Language Selector, Notifications, User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Dark Mode Toggle */}
        {role !== 'CITIZEN' && (
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#ffffff",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-full)",
              padding: "0.6rem",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-xs)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Dark Mode"
          >
            <Icon name={theme === 'dark' ? "sun" : "moon"} size={20} />
          </button>
        )}

        {/* Language Selector (EN | हिन्दी) */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-full)",
            padding: "0.3rem",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-xs)",
          }}
          role="group"
          aria-label={t("header.language")}
        >
          <button
            type="button"
            onClick={() => setLanguage("en")}
            style={{
              border: "none",
              background: language === "en" ? "var(--bg-muted)" : "transparent",
              color: language === "en" ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: language === "en" ? 700 : 500,
              fontSize: "0.78rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              boxShadow: "none",
              transition: "all var(--transition-fast)",
            }}
            aria-pressed={language === "en"}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("hi")}
            style={{
              border: "none",
              background: language === "hi" ? "var(--bg-muted)" : "transparent",
              color: language === "hi" ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: language === "hi" ? 700 : 500,
              fontSize: "0.78rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              boxShadow: "none",
              transition: "all var(--transition-fast)",
            }}
            aria-pressed={language === "hi"}
          >
            हिन्दी
          </button>
        </div>

        {/* Notifications Bell */}
        <Link
          to="/notifications"
          style={{
            position: "relative",
            padding: "0.6rem",
            backgroundColor: "#ffffff",
            color: "var(--text-primary)",
            borderRadius: "var(--radius-full)",
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-xs)",
          }}
          title={t("nav.notifications")}
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                fontSize: "0.65rem",
                fontWeight: 700,
                borderRadius: "var(--radius-full)",
                padding: "0.1rem 0.35rem",
                lineHeight: 1,
                boxShadow: "0 0 0 2px #ffffff",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Dropdown */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-xs)",
              cursor: "pointer",
              padding: "0.3rem 0.75rem 0.3rem 0.3rem",
              borderRadius: "var(--radius-full)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {user?.name || "CivicSync User"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {role || "CITIZEN"}
              </span>
            </div>

            <Icon name="chevron-down" size={14} color="var(--text-muted)" />
          </button>

          {profileMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                right: 0,
                width: "240px",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                padding: "0.5rem 0",
                zIndex: 100,
                marginTop: "0.5rem",
              }}
            >
              <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user?.email}</div>
              </div>

              <Link
                to="/profile"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="shield-check" size={16} />
                <span>{t("nav.profile")}</span>
              </Link>

              <Link
                to="/reputation"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="award" size={16} />
                <span>{t("nav.reputation")}</span>
              </Link>

              <Link
                to="/rankings"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="trending-up" size={16} />
                <span>{t("nav.leaderboards")}</span>
              </Link>

              <div style={{ borderTop: "1px solid var(--border-color)", margin: "0.25rem 0" }} />

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                  navigate("/");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "#ef4444",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <Icon name="log-out" size={16} color="#ef4444" />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
