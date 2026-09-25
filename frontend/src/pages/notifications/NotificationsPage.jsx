import { useState, useEffect } from "react";
import { notificationApi } from "../../services/api";
import { useNotification } from "../../context/useNotification";
import { useRouter } from "../../context/useRouter";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Badge, DemoBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

export default function NotificationsPage() {
  const { navigate } = useRouter();
  const { refreshUnread, decrementUnread } = useNotification();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL | UNREAD | CRITICAL
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      try {
        const params = { limit: 50 };
        if (activeFilter === "UNREAD") {
          params.is_read = "false";
        } else if (activeFilter === "CRITICAL") {
          params.priority = "CRITICAL";
        }

        const res = await notificationApi.getNotifications(params);
        if (!ignore) {
          setNotifications(Array.isArray(res?.notifications) ? res.notifications : []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load notifications:", err);
          setError(err.message || "Failed to retrieve notifications from server");
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [activeFilter, reloadKey]);

  const handleMarkAsRead = async (id) => {
    setProcessingId(id);
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      decrementUnread();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      refreshUnread();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    setProcessingId(id);
    try {
      await notificationApi.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.is_read) {
        decrementUnread();
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityBadge = (priority) => {
    const p = String(priority || "NORMAL").toUpperCase();
    switch (p) {
      case "CRITICAL":
        return <Badge variant="danger">CRITICAL</Badge>;
      case "HIGH":
        return <Badge variant="warning">HIGH</Badge>;
      case "NORMAL":
      case "MEDIUM":
        return <Badge variant="info">NORMAL</Badge>;
      default:
        return <Badge variant="default">LOW</Badge>;
    }
  };

  const getEventLabel = (eventType) => {
    if (!eventType) return "Update";
    return eventType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const unreadCountOnPage = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Notification Center
            </h1>
            <DemoBadge />
            {unreadCountOnPage > 0 && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                {unreadCountOnPage} unread
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Real-time notifications on verified municipal challenges, collaborative solution evaluations, and reputation awards.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Button
            variant="outline"
            size="sm"
            icon="check-circle"
            disabled={markingAll || unreadCountOnPage === 0}
            onClick={handleMarkAllRead}
          >
            {markingAll ? "Marking..." : "Mark All as Read"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="rotate-cw"
            onClick={() => {
              setLoading(true);
              setError("");
              setReloadKey((k) => k + 1);
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.75rem",
        }}
      >
        <Button
          variant={activeFilter === "ALL" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("ALL")}
        >
          All Notifications
        </Button>
        <Button
          variant={activeFilter === "UNREAD" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("UNREAD")}
        >
          Unread Only
        </Button>
        <Button
          variant={activeFilter === "CRITICAL" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("CRITICAL")}
        >
          Critical Priority
        </Button>
      </div>

      {/* Notifications List Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card><LoadingSkeleton lines={3} /></Card>
          <Card><LoadingSkeleton lines={3} /></Card>
          <Card><LoadingSkeleton lines={3} /></Card>
        </div>
      ) : error ? (
        <Card style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          <Icon name="alert-circle" size={36} />
          <h4 style={{ margin: "0.75rem 0 0.25rem" }}>Unable to load notifications</h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem" }}>{error}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setLoading(true);
              setError("");
              setReloadKey((k) => k + 1);
            }}
          >
            Retry Connection
          </Button>
        </Card>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          description={
            activeFilter === "UNREAD"
              ? "You have reviewed all your civic updates. All clear!"
              : activeFilter === "CRITICAL"
                ? "No critical priority notifications recorded."
                : "Notifications will appear here when authorities verify your reports, when matching opportunities arise, or when your solutions receive evaluation."
          }
          actionLabel={activeFilter !== "ALL" ? "View All Notifications" : "Explore Civic Challenges"}
          onAction={activeFilter !== "ALL" ? () => setActiveFilter("ALL") : () => navigate("/explore")}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {notifications.map((n) => {
            const isUnread = !n.is_read;
            const isCritical = String(n.priority).toUpperCase() === "CRITICAL";

            return (
              <div
                key={n.id}
                style={{
                  position: "relative",
                  padding: "1.1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: isUnread
                    ? "1px solid var(--color-primary-border)"
                    : "1px solid var(--border-color)",
                  backgroundColor: isUnread ? "rgba(37, 99, 235, 0.025)" : "#ffffff",
                  boxShadow: isUnread ? "var(--shadow-xs)" : "none",
                  transition: "all var(--transition-fast)",
                }}
              >
                {/* Left unread accent indicator */}
                {isUnread && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "12px",
                      bottom: "12px",
                      width: "4px",
                      backgroundColor: isCritical ? "var(--color-danger)" : "var(--color-primary)",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    {/* Meta Row: Priority, Event Type, Date */}
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      {getPriorityBadge(n.priority)}
                      <span
                        style={{
                          fontSize: "0.725rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-muted)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {getEventLabel(n.event_type)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(n.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Title & Message */}
                    <h3
                      style={{
                        margin: "0 0 0.35rem",
                        fontSize: "0.95rem",
                        fontWeight: isUnread ? 700 : 600,
                        color: isUnread ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {n.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {n.message}
                    </p>

                    {/* Actor context if present */}
                    {n.actor?.name && (
                      <div style={{ marginTop: "0.45rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Initiated by <strong>{n.actor.name}</strong> ({n.actor.role})
                      </div>
                    )}
                  </div>

                  {/* Actions right-column */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {n.action_url && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon="arrow-right"
                        onClick={() => {
                          if (isUnread) handleMarkAsRead(n.id);
                          // Normalize action_url to hash route
                          const target = n.action_url.startsWith("/") ? n.action_url : `/${n.action_url}`;
                          navigate(target);
                        }}
                      >
                        Open Action
                      </Button>
                    )}

                    {isUnread && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        title="Mark as read"
                      >
                        Mark Read
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      icon="trash-2"
                      disabled={processingId === n.id}
                      onClick={() => handleDelete(n.id)}
                      title="Delete notification"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
