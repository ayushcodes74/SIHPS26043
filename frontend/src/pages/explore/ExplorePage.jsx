import { useState, useEffect, useMemo } from "react";
import { problemApi } from "../../services/api";
import { ProblemCard } from "../../components/problems/ProblemCard";
import { Icon } from "../../components/common/Icons";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useAuth } from "../../context/useAuth";

export function ExplorePage() {
  const { navigate, query } = useRouter();
  const { role } = useAuth();
  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState(query?.search || "");

  useEffect(() => {
    if (query?.search !== undefined) {
      const t = setTimeout(() => setSearchQuery(query.search), 0);
      return () => clearTimeout(t);
    }
  }, [query?.search]);

  // Filter states
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [subcategoryFilter, setSubcategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // ALL | HIGH | CRITICAL
  const [severityFilter, setSeverityFilter] = useState("ALL"); // ALL | LOW | MEDIUM | HIGH | CRITICAL

  // Sort state
  const [sortBy, setSortBy] = useState("NEWEST"); // NEWEST | PRIORITY | AFFECTED | RECENT_UPDATE

  // View mode
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "district-intel"
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadProblems() {
      try {
        const res = await problemApi.getProblems({ limit: 100 });
        if (!ignore) {
          const isTestRecord = (p) => {
            const t = (p.title || "").trim();
            return /^(M\d+|Test\s+M\d+|Passport\s+Problem|Cit\d+|Auth\d+)/i.test(t);
          };
          const cleanProblems = (res.problems || []).filter((p) => !isTestRecord(p));
          setProblems(cleanProblems);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Unable to load problems from server");
          setLoading(false);
        }
      }
    }

    loadProblems();
    return () => {
      ignore = true;
    };
  }, [reloadKey, isAuthorityOrAdmin]);

  // Extract unique filter options from actual backend data
  const availableDistricts = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (p.district) set.add(p.district.trim());
    });
    return Array.from(set).sort();
  }, [problems]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [problems]);

  const availableSubcategories = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (categoryFilter === "ALL" || p.category === categoryFilter) {
        if (p.subcategory) set.add(p.subcategory.trim());
      }
    });
    return Array.from(set).sort();
  }, [problems, categoryFilter]);

  const availableStatuses = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (p.status) set.add(p.status.trim());
    });
    return Array.from(set).sort();
  }, [problems]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (districtFilter !== "ALL") count++;
    if (categoryFilter !== "ALL") count++;
    if (subcategoryFilter !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (priorityFilter !== "ALL") count++;
    if (severityFilter !== "ALL") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [districtFilter, categoryFilter, subcategoryFilter, statusFilter, priorityFilter, severityFilter, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDistrictFilter("ALL");
    setCategoryFilter("ALL");
    setSubcategoryFilter("ALL");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSeverityFilter("ALL");
    setSortBy("NEWEST");
  };

  // Filter & Search Engine (client-side execution over actual backend response)
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // 1. Search query (operates on title, description, ai_summary, district, city, category, subcategory, skills)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (p.title || "").toLowerCase().includes(query);
        const descMatch = (p.description || "").toLowerCase().includes(query);
        const aiMatch = (p.ai_summary || "").toLowerCase().includes(query);
        const districtMatch = (p.district || "").toLowerCase().includes(query);
        const cityMatch = (p.city || "").toLowerCase().includes(query);
        const catMatch = (p.category || "").toLowerCase().includes(query);
        const subMatch = (p.subcategory || "").toLowerCase().includes(query);
        const skillsStr = Array.isArray(p.required_expertise)
          ? p.required_expertise.join(" ").toLowerCase()
          : (p.required_expertise || "").toLowerCase();
        const skillMatch = skillsStr.includes(query);

        if (!(titleMatch || descMatch || aiMatch || districtMatch || cityMatch || catMatch || subMatch || skillMatch)) {
          return false;
        }
      }

      // 2. District filter
      if (districtFilter !== "ALL" && (p.district || "").toLowerCase() !== districtFilter.toLowerCase()) {
        return false;
      }

      // 3. Category filter
      if (categoryFilter !== "ALL" && (p.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // 4. Subcategory filter
      if (subcategoryFilter !== "ALL" && (p.subcategory || "").toLowerCase() !== subcategoryFilter.toLowerCase()) {
        return false;
      }

      // 5. Status filter
      if (statusFilter !== "ALL" && (p.status || "").toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // 6. Priority filter
      const _ps1 = Number(p.priority_score);
      const pScore = (!isNaN(_ps1) && p.priority_score !== null) ? _ps1 : ((p.severity || 0) * 5 + (p.urgency || 0) * 5);
      if (priorityFilter === "HIGH" && pScore < 60) return false;
      if (priorityFilter === "CRITICAL" && pScore < 80) return false;

      // 7. Severity filter
      const sev = p.severity || 0;
      if (severityFilter === "LOW" && (sev < 1 || sev > 3)) return false;
      if (severityFilter === "MEDIUM" && (sev < 4 || sev > 6)) return false;
      if (severityFilter === "HIGH" && (sev < 7 || sev > 8)) return false;
      if (severityFilter === "CRITICAL" && sev < 9) return false;

      return true;
    });
  }, [problems, searchQuery, districtFilter, categoryFilter, subcategoryFilter, statusFilter, priorityFilter, severityFilter]);

  // Deterministic Sorting
  const sortedProblems = useMemo(() => {
    const list = [...filteredProblems];
    switch (sortBy) {
      case "PRIORITY":
        return list.sort((a, b) => {
          const _psA = Number(a.priority_score);
          const scoreA = (!isNaN(_psA) && a.priority_score !== null) ? _psA : ((a.severity || 0) * 5 + (a.urgency || 0) * 5);
          const _psB = Number(b.priority_score);
          const scoreB = (!isNaN(_psB) && b.priority_score !== null) ? _psB : ((b.severity || 0) * 5 + (b.urgency || 0) * 5);
          return scoreB - scoreA;
        });
      case "AFFECTED":
        return list.sort((a, b) => (Number(b.affected_people) || 0) - (Number(a.affected_people) || 0));
      case "RECENT_UPDATE":
        return list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      case "NEWEST":
      default:
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }, [filteredProblems, sortBy]);

  // District Intelligence aggregation (computed deterministically over actual backend problems)
  const districtAnalytics = useMemo(() => {
    const map = {};
    problems.forEach((p) => {
      const dist = p.district ? p.district.trim() : "Unknown";
      if (!map[dist]) {
        map[dist] = {
          district: dist,
          total: 0,
          high_priority: 0,
          resolved: 0,
          total_affected: 0,
          priority_sum: 0,
        };
      }
      map[dist].total += 1;
      const _psD = Number(p.priority_score);
      const prio = (!isNaN(_psD) && p.priority_score !== null) ? _psD : ((p.severity || 0) * 5 + (p.urgency || 0) * 5);
      if (prio >= 60) map[dist].high_priority += 1;
      if (p.status === "RESOLVED") map[dist].resolved += 1;
      map[dist].total_affected += Number(p.affected_people) || 0;
      map[dist].priority_sum += prio;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [problems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Problem Catalog & Explore
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Discover societal challenges, civic updates, and verified problem records
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Tab Switcher: Catalog vs District Intelligence (Restricted to Authority/Admin) */}
          {isAuthorityOrAdmin && (
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--bg-muted)",
                padding: "0.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                style={{
                  border: "none",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: activeTab === "catalog" ? "#ffffff" : "transparent",
                  color: activeTab === "catalog" ? "var(--color-primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "catalog" ? "var(--shadow-xs)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Icon name="layers" size={14} />
                Problem Feed ({filteredProblems.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("district-intel")}
                style={{
                  border: "none",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: activeTab === "district-intel" ? "#ffffff" : "transparent",
                  color: activeTab === "district-intel" ? "var(--color-primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "district-intel" ? "var(--shadow-xs)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Icon name="map-pin" size={14} />
                District Intelligence ({districtAnalytics.length})
              </button>
            </div>
          )}

          {role === "CITIZEN" && (
            <Button
              variant="primary"
              icon="plus-circle"
              size="sm"
              onClick={() => navigate("/report")}
            >
              Report Problem
            </Button>
          )}
        </div>
      </div>

      {/* Main View Mode 1: Catalog with Search & Multi-Filters */}
      {activeTab === "catalog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Prominent Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-lg)",
              padding: "0.6rem 1rem",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Icon name="search" size={20} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search societal problems (e.g. 'water', 'groundwater', 'Dhanbad', 'fluoride', 'GIS')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                backgroundColor: "transparent",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                }}
                title="Clear search"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              boxShadow: "var(--shadow-xs)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Filters
                </span>
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.45rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary)",
                      color: "#ffffff",
                    }}
                  >
                    {activeFilterCount} Active
                  </span>
                )}
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-danger)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Icon name="x" size={13} />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {/* District Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                  District
                </label>
                <select
                  className="cs-select"
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                >
                  <option value="ALL">All Districts</option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                  Category
                </label>
                <select
                  className="cs-select"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setSubcategoryFilter("ALL");
                  }}
                  style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                >
                  <option value="ALL">All Categories</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                  Subcategory
                </label>
                <select
                  className="cs-select"
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                  disabled={availableSubcategories.length === 0}
                >
                  <option value="ALL">All Subcategories</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                  Status
                </label>
                <select
                  className="cs-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                >
                  <option value="ALL">All Statuses</option>
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter (Authority/Admin Only) */}
              {isAuthorityOrAdmin && (
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Priority Tier
                  </label>
                  <select
                    className="cs-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="HIGH">High Priority (60+)</option>
                    <option value="CRITICAL">Critical Priority (80+)</option>
                  </select>
                </div>
              )}

              {/* Severity Filter (Authority/Admin Only) */}
              {isAuthorityOrAdmin && (
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Severity
                  </label>
                  <select
                    className="cs-select"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                  >
                    <option value="ALL">All Severities</option>
                    <option value="LOW">Low (1-3)</option>
                    <option value="MEDIUM">Medium (4-6)</option>
                    <option value="HIGH">High (7-8)</option>
                    <option value="CRITICAL">Critical (9-10)</option>
                  </select>
                </div>
              )}

              {/* Sort Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem" }}>
                  Sort Order
                </label>
                <select
                  className="cs-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem", fontWeight: 600 }}
                >
                  <option value="NEWEST">Newest First</option>
                  {isAuthorityOrAdmin && <option value="PRIORITY">Highest Priority</option>}
                  <option value="AFFECTED">Most Affected</option>
                  <option value="RECENT_UPDATE">Recently Updated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <span>
              Showing <strong>{sortedProblems.length}</strong> of <strong>{problems.length}</strong> problems recorded in database
            </span>
          </div>

          {/* Problem Cards Feed */}
          {loading ? (
            <div className="cs-grid-3">
              <Card><LoadingSkeleton lines={4} /></Card>
              <Card><LoadingSkeleton lines={4} /></Card>
              <Card><LoadingSkeleton lines={4} /></Card>
            </div>
          ) : error ? (
            <Card style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
              <Icon name="alert-circle" size={32} />
              <h4 style={{ margin: "0.75rem 0 0.25rem" }}>Unable to load problems</h4>
              <p style={{ margin: "0 0 1rem", fontSize: "0.85rem" }}>{error}</p>
              <Button
                variant="primary"
                size="sm"
                icon="rotate-cw"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setReloadKey((k) => k + 1);
                }}
              >
                Retry
              </Button>
            </Card>
          ) : sortedProblems.length === 0 ? (
            <EmptyState
              icon="search"
              title="No problems found"
              description={
                activeFilterCount > 0
                  ? "No civic problem records match your current filter and search criteria. Try changing your filters or search terms."
                  : "No problems have been recorded in the platform yet."
              }
              actionLabel={activeFilterCount > 0 ? "Clear All Filters" : role === "CITIZEN" ? "Report First Problem" : undefined}
              onAction={activeFilterCount > 0 ? handleClearFilters : role === "CITIZEN" ? () => navigate("/report") : undefined}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {sortedProblems.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main View Mode 2: District Intelligence Overview */}
      {activeTab === "district-intel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary-subtle)",
              border: "1px solid var(--color-primary-border)",
              fontSize: "0.85rem",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <Icon name="info" size={16} />
            <span>
              <strong>District Intelligence:</strong> Reveals geographic concentrations of societal problems across administrative blocks to support targeted municipal interventions.
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {districtAnalytics.map((d) => {
              const avgPrio = d.total > 0 ? Math.round(d.priority_sum / d.total) : 0;
              return (
                <div
                  key={d.district}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                      📍 {d.district}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {d.total} Case{d.total !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", margin: "1rem 0" }}>
                    <div style={{ padding: "0.6rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>HIGH PRIORITY</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-danger)" }}>
                        {d.high_priority}
                      </div>
                    </div>

                    <div style={{ padding: "0.6rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>RESOLVED</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-success)" }}>
                        {d.resolved}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
                    <span>Population Affected:</span>
                    <strong>{d.total_affected.toLocaleString()}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    <span>Avg Civic Priority:</span>
                    <strong>{avgPrio} / 100</strong>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    style={{ width: "100%" }}
                    onClick={() => {
                      setDistrictFilter(d.district);
                      setActiveTab("catalog");
                    }}
                  >
                    Filter Problems in {d.district}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
