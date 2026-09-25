import { useState } from "react";
import { Icon } from "../common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { StatusBadge } from "../common/Badges";
import { useTranslation } from "../../context/useTranslation.js";

export function Sidebar() {
  const { user, role, logout } = useAuth();
  const { path } = useRouter();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Helper to determine active state
  const isActive = (itemPath) => {
    if (itemPath === "/dashboard" && (path === "/dashboard" || path === "/")) {
      return true;
    }
    return path.startsWith(itemPath);
  };

  // Role-filtered navigation definitions
  const getNavItems = () => {
    const commonItems = [
      { path: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
      { path: "/explore", label: t("nav.explore"), icon: "search" },
    ];

    let roleItems;

    switch (role) {
      case "CITIZEN":
        roleItems = [
          { path: "/report", label: t("nav.report"), icon: "plus-circle" },
          { path: "/my-reports", label: t("nav.myReports"), icon: "layers" },
        ];
        break;

      case "STUDENT":
        roleItems = [
          { path: "/matches", label: t("nav.matchingSkills"), icon: "target" },
          { path: "/collaborations", label: t("nav.collaborations"), icon: "users" },
          { path: "/solutions", label: t("nav.solutions"), icon: "cpu" },
        ];
        break;

      case "RESEARCHER":
        roleItems = [
          { path: "/matches", label: t("nav.researchMatches"), icon: "microscope" },
          { path: "/collaborations", label: t("nav.collaborations"), icon: "users" },
          { path: "/solutions", label: t("nav.solutions"), icon: "cpu" },
        ];
        break;

      case "UNIVERSITY":
        roleItems = [
          { path: "/matches",          label: "Matched Challenges",  icon: "target" },
          { path: "/projects",         label: "My Projects",          icon: "briefcase" },
          { path: "/faculty-students", label: "Faculty & Students",   icon: "graduation-cap" },
        ];
        break;

      case "STARTUP":
      case "MSME":
        roleItems = [
          { path: "/matches", label: t("nav.innovationMatches"), icon: "rocket" },
          { path: "/solutions", label: t("nav.solutions"), icon: "cpu" },
          { path: "/impact", label: t("nav.pilotsProjects"), icon: "activity" },
        ];
        break;

      case "AUTHORITY":
        roleItems = [
          { path: "/projects", label: "Institutional Projects", icon: "briefcase" },
          { path: "/explore", label: "Priority Problems", icon: "alert-triangle" },
          { path: "/report", label: t("nav.report"), icon: "plus-circle" },
          { path: "/solutions", label: "Solution Review", icon: "cpu" },
          { path: "/impact", label: "Implementation & Pilot", icon: "activity" },
          { path: "/dashboard/analytics", label: "Analytics Dashboard", icon: "activity" },
          { path: "/dashboard/trust", label: "Trust & Anti-Gaming", icon: "shield-check" },
        ];
        break;

      case "ADMIN":
        roleItems = [
          { path: "/solutions", label: t("nav.solutionReview"), icon: "cpu" },
          { path: "/impact", label: t("nav.implementationPilot"), icon: "activity" },
          { path: "/dashboard/analytics", label: t("nav.analyticsDashboard"), icon: "activity" },
          { path: "/dashboard/trust", label: t("nav.trustAntiGaming"), icon: "shield-check" },
        ];
        break;

      default:
        roleItems = [];
    }

    const trailingItems = [
      { path: "/notifications", label: t("nav.notifications"), icon: "bell" },
      { path: "/reputation", label: t("nav.reputation"), icon: "award" },
      { path: "/rankings", label: t("nav.leaderboards"), icon: "trending-up" },
      { path: "/profile", label: t("nav.profile"), icon: "shield-check" },
    ];

    return [...commonItems, ...roleItems, ...trailingItems];
  };

  const navItems = getNavItems();

  return (
    <aside
      style={{
        width: collapsed ? "78px" : "260px",
        minHeight: "100vh",
        backgroundColor: "var(--bg-sidebar)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        transition: "width var(--transition-normal)",
        flexShrink: 0,
        zIndex: 50,
        borderRight: "1px solid var(--border-color)",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "1.25rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
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
              boxShadow: "0 2px 8px rgba(10, 10, 10, 0.15)",
              flexShrink: 0,
            }}
          >
            <Icon name="shield-check" size={22} />
          </div>

          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                CivicSync
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-light)", fontWeight: 500 }}>
                Civic Innovation
              </div>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-light)",
            cursor: "pointer",
            padding: "0.35rem",
            display: collapsed ? "none" : "flex",
            alignItems: "center",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="menu" size={18} />
        </button>
      </div>

      {/* Role Pill Banner */}
      {!collapsed && user && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            backgroundColor: "var(--bg-muted)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Logged as:</span>
          <StatusBadge status={role} />
        </div>
      )}

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: "1rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: collapsed ? "0.75rem" : "0.75rem 1rem",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-lg)",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: active ? "var(--bg-sidebar-active)" : "transparent",
                fontWeight: active ? 700 : 500,
                fontSize: "0.875rem",
                textDecoration: "none",
                transition: "all var(--transition-fast)",
                borderLeft: active ? "2px solid var(--color-primary)" : "2px solid transparent",
              }}
              title={collapsed ? item.label : undefined}
            >
              <div style={{ color: active ? "var(--text-primary)" : "var(--text-muted)", display: "flex" }}>
                <Icon name={item.icon} size={20} />
              </div>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Footprint & Logout */}
      <div
        style={{
          padding: "1rem 0.75rem",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {!collapsed && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--bg-muted)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.875rem",
                border: "1px solid var(--color-primary-border)",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "0.65rem 0.85rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-danger)",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
            transition: "background var(--transition-fast)",
          }}
          title="Log out"
        >
          <Icon name="log-out" size={17} />
          {!collapsed && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
