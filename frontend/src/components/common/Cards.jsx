import { Icon } from "./Icons";

export function Card({
  children,
  title = null,
  subtitle = null,
  actions = null,
  className = "",
  hover = false,
  padding = "1.5rem",
  ...props
}) {
  return (
    <div
      className={`cs-card ${hover ? "cs-card-hover" : ""} ${className}`}
      style={{ padding }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div>
            {title && (
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, fontFamily: "var(--font-serif)", letterSpacing: "-0.015em", color: "var(--text-primary)" }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: "flex", gap: "0.5rem" }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle = null,
  icon = null,
  iconColor = "var(--color-primary)",
  trend = null, // { label: "+12%", positive: true }
  className = "",
  onClick = null,
}) {
  return (
    <div
      className={`cs-card ${onClick ? "cs-card-hover" : ""} ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card)",
        boxShadow: "var(--shadow-xs)",
        padding: "1.25rem 1.4rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            {title}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 600, fontFamily: "var(--font-serif)", color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {value ?? "0"}
          </div>
        </div>
        {icon && (
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-primary-subtle)",
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} size={20} />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem", fontSize: "0.8rem" }}>
          {trend && (
            <span
              style={{
                fontWeight: 600,
                color: trend.positive ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {trend.label}
            </span>
          )}
          {subtitle && <span style={{ color: "var(--text-muted)" }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
