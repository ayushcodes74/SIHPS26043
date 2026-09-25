import { useState, useEffect } from "react";
import { authorityDashboardApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { Icon } from "../common/Icons";
import { LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";

export function AdminSection() {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const isHi = language === "hi";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadAdminData() {
      setError("");
      try {
        const [sumRes, rankRes, distRes] = await Promise.allSettled([
          authorityDashboardApi.getSummary(),
          reputationApi.getRankingsOverview(),
          authorityDashboardApi.getDistricts(),
        ]);

        if (!ignore) {
          if (sumRes.status === "fulfilled") setSummary(sumRes.value);
          if (rankRes.status === "fulfilled") setRankings(rankRes.value);
          if (distRes.status === "fulfilled") {
            const raw = distRes.value;
            setDistricts(Array.isArray(raw?.districts) ? raw.districts : (Array.isArray(raw) ? raw : []));
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Admin dashboard load error:", err);
          setError("Failed to load platform administration metrics");
          setLoading(false);
        }
      }
    }
    loadAdminData();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="cs-grid-4">
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-danger)" }}>
        <Icon name="alert-circle" size={32} />
        <h4 style={{ margin: "0.5rem 0" }}>Administration Metrics Error</h4>
        <p style={{ margin: 0, fontSize: "0.85rem" }}>{error}</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Stat Grid from Real Backend Endpoints */}
      <div className="cs-grid-4">
        <StatCard
          title={isHi ? "कुल नागरिक समस्याएं" : "Total Civic Problems"}
          value={String(summary?.total_problems || 0)}
          subtitle={isHi ? `${summary?.reported || 0} प्रारंभिक / ${summary?.resolved || 0} हल` : `${summary?.reported || 0} initial / ${summary?.resolved || 0} resolved`}
          icon="layers"
        />
        <StatCard
          title={isHi ? "सक्रिय क्लस्टर" : "Active Clusters"}
          value={String(summary?.total_clusters || 0)}
          subtitle={isHi ? "समस्या-पार क्लस्टर" : "Cross-problem clusters"}
          icon="share-2"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={isHi ? "प्रशासनिक जिले" : "Administrative Districts"}
          value={String(districts.length || 0)}
          subtitle={isHi ? "मामले दर्ज करने वाले जिले" : "Districts reporting cases"}
          icon="map-pin"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title={isHi ? "गंभीर समस्याएं" : "Critical Issues"}
          value={String(summary?.critical_priority || 0)}
          subtitle={isHi ? "अति-गंभीर मामले" : "Critical cases"}
          icon="alert-triangle"
          iconColor="var(--color-danger)"
        />
      </div>

      {/* Admin Governance Notice */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-muted)",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
        }}
      >
        <Icon name="shield-check" size={18} color="var(--color-primary)" />
        <span>
          <strong>{isHi ? "प्लेटफॉर्म शासन मोड:" : "Platform Governance Mode:"}</strong>
          {isHi
            ? " प्लेटफॉर्म प्रशासन दृश्य नगरपालिका परिचालन वर्कफ़्लो से व्यापक ऑडिट सांख्यिकी को अलग करता है।"
            : " Platform administration view distinguishes macro-level audit statistics from operational municipal authority workflows."}
        </span>
      </div>

      {/* Category Breakdown & District Coverage Grid */}
      <div className="cs-grid-2" style={{ alignItems: "start" }}>
        {/* Category Breakdown from actual summary */}
        <Card
          title={isHi ? "डोमेन वितरण" : "Domain Distribution"}
          subtitle={isHi ? "प्रति डोमेन श्रेणी में दर्ज समस्याएं" : "Problems recorded per domain category"}
        >
          {summary?.categories?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {summary.categories.map((cat) => (
                <div
                  key={cat.category}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{cat.category}</span>
                  <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                    {cat.count} {isHi ? "समस्याएं" : (cat.count !== 1 ? "problems" : "problem")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {isHi ? "कोई श्रेणी मौजूद नहीं है" : "No categories present"}
            </p>
          )}
        </Card>

        {/* District Coverage from /api/authority/dashboard/districts */}
        <Card
          title={isHi ? "जिला परिचालन अवलोकन" : "District Operations Overview"}
          subtitle={isHi ? "झारखंड भर में भौगोलिक वितरण" : "Geographic distribution across Jharkhand"}
          actions={
            <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
              {isHi ? "कैटलॉग देखें" : "Explore Catalog"}
            </Button>
          }
        >
          {Array.isArray(districts) && districts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto" }}>
              {districts.map((d) => (
                <div
                  key={d.district}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#ffffff",
                    fontSize: "0.825rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>📍 {d.district}</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-danger)" }}>{d.high_priority} {isHi ? "उच्च" : "High"}</span>
                    <strong>{d.total_problems} {isHi ? "कुल" : "Total"}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {isHi ? "कोई जिला दर्ज नहीं" : "No districts recorded"}
            </p>
          )}
        </Card>
      </div>

      {/* Rankings & Community Reputation Overview from /api/rankings */}
      {rankings && (
        <Card
          title={isHi ? "नागरिक मंच लीडरबोर्ड और स्थिति" : "Civic Platform Leaderboard & Standing"}
          subtitle={isHi ? "बहु-भूमिका सहभागिता और सत्यापित नागरिक योगदान" : "Cross-role participation and verified civic contributions"}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {rankings.top_contributors?.length > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {isHi ? "शीर्ष नागरिक योगदानकर्ता" : "TOP CITIZEN CONTRIBUTORS"}
                </div>
                {rankings.top_contributors.slice(0, 3).map((c, i) => (
                  <div key={c.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.25rem 0" }}>
                    <span>{i + 1}. {c.name}</span>
                    <strong>{c.score} {isHi ? "अंक" : "pts"}</strong>
                  </div>
                ))}
              </div>
            )}

            {rankings.top_universities?.length > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {isHi ? "शीर्ष विश्वविद्यालय" : "TOP UNIVERSITIES"}
                </div>
                {rankings.top_universities.slice(0, 3).map((u, i) => (
                  <div key={u.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.25rem 0" }}>
                    <span>{i + 1}. {u.name}</span>
                    <strong>{u.score} {isHi ? "अंक" : "pts"}</strong>
                  </div>
                ))}
              </div>
            )}

            {rankings.top_organizations?.length > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {isHi ? "शीर्ष स्टार्टअप और एमएसएमई" : "TOP STARTUPS & MSMES"}
                </div>
                {rankings.top_organizations.slice(0, 3).map((o, i) => (
                  <div key={o.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.25rem 0" }}>
                    <span>{i + 1}. {o.name}</span>
                    <strong>{o.score} {isHi ? "अंक" : "pts"}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
