/**
 * authorityDashboardService.js
 *
 * MODULE 3 — AUTHORITY DASHBOARD
 *
 * All read-only aggregation queries for the authority dashboard.
 * This service only reads existing data — it never modifies problems,
 * clusters, duplicate detection results, or any other module's state.
 *
 * Priority thresholds (aligned with existing priority_score scale 0-100):
 *   high_priority     >= 60
 *   critical_priority >= 80
 *
 * In-progress statuses (all statuses between ASSIGNED and IMPLEMENTING):
 *   ASSIGNED, ROOT_CAUSE_ANALYSIS, SOLUTION_SEARCH,
 *   SOLUTION_EVALUATION, APPROVED, PILOT, IMPLEMENTING
 */

"use strict";

const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Constants — thresholds and status groupings
// ---------------------------------------------------------------------------

const PRIORITY_HIGH = 60;
const PRIORITY_CRITICAL = 80;

const IN_PROGRESS_STATUSES = [
    "ASSIGNED",
    "ROOT_CAUSE_ANALYSIS",
    "SOLUTION_SEARCH",
    "SOLUTION_EVALUATION",
    "APPROVED",
    "PILOT",
    "IMPLEMENTING"
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate a query-parameter integer.
 * Returns the integer value, or null if the parameter was not supplied.
 * Throws an Error with a user-readable message if the value is invalid.
 *
 * @param {*}      value   - raw query string value
 * @param {string} name    - parameter name (for error messages)
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
function parseIntParam(value, name, min, max) {
    if (value === undefined || value === null || value === "") return null;

    const n = parseInt(value, 10);

    if (isNaN(n) || String(n) !== String(value).trim()) {
        throw new Error(`"${name}" must be a valid integer`);
    }

    if (n < min || n > max) {
        throw new Error(`"${name}" must be between ${min} and ${max}`);
    }

    return n;
}

// ---------------------------------------------------------------------------
// 1. SUMMARY
// ---------------------------------------------------------------------------

/**
 * Returns high-level metrics for the dashboard overview panel.
 *
 * @returns {Promise<object>}
 */
async function getSummary() {
    // Single pass: count by status + priority buckets + clusters
    const result = await pool.query(
        `SELECT
            COUNT(*)                                             AS total_problems,

            COUNT(*) FILTER (WHERE status = 'REPORTED')         AS reported,
            COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')     AS under_review,
            COUNT(*) FILTER (WHERE status = 'VERIFIED')         AS verified,
            COUNT(*) FILTER (WHERE status = 'ASSIGNED')         AS assigned,

            COUNT(*) FILTER (
                WHERE status = ANY($1::text[])
            )                                                    AS in_progress,

            COUNT(*) FILTER (WHERE status = 'RESOLVED')         AS resolved,

            COUNT(*) FILTER (
                WHERE priority_score != 'NaN'::numeric AND priority_score >= $2
            )                                                    AS high_priority,

            COUNT(*) FILTER (
                WHERE priority_score != 'NaN'::numeric AND priority_score >= $3
            )                                                    AS critical_priority,

            COUNT(DISTINCT cluster_id) FILTER (
                WHERE cluster_id IS NOT NULL
            )                                                    AS clustered_problems
         FROM problems`,
        [IN_PROGRESS_STATUSES, PRIORITY_HIGH, PRIORITY_CRITICAL]
    );

    // Cluster count (distinct clusters that have at least one problem)
    const clusterResult = await pool.query(
        `SELECT COUNT(*) AS clusters FROM problem_clusters`
    );

    // Category distribution
    const catResult = await pool.query(
        `SELECT
             COALESCE(category, 'Unknown') AS category,
             COUNT(*)::int                  AS count
         FROM problems
         GROUP BY category
         ORDER BY count DESC`
    );

    const row = result.rows[0];

    return {
        total_problems: parseInt(row.total_problems),
        reported: parseInt(row.reported),
        under_review: parseInt(row.under_review),
        verified: parseInt(row.verified),
        assigned: parseInt(row.assigned),
        in_progress: parseInt(row.in_progress),
        resolved: parseInt(row.resolved),
        high_priority: parseInt(row.high_priority),
        critical_priority: parseInt(row.critical_priority),
        total_clusters: parseInt(clusterResult.rows[0].clusters),
        categories: catResult.rows.map((r) => ({
            category: r.category,
            count: r.count
        }))
    };
}

// ---------------------------------------------------------------------------
// 2. PRIORITY QUEUE
// ---------------------------------------------------------------------------

/**
 * Returns the highest-priority unresolved problems.
 *
 * @param {number} limit  - max results (1–50, default 10)
 * @returns {Promise<object[]>}
 */
async function getPriorityProblems(limit = 10) {
    const result = await pool.query(
        `SELECT
             id,
             title,
             district,
             city,
             category,
             subcategory,
             severity,
             urgency,
             priority_score,
             status,
             affected_people,
             cluster_id,
             created_at,
             updated_at
         FROM problems
         WHERE status NOT IN ('RESOLVED', 'MONITORING', 'SUSTAINED')
         ORDER BY CASE WHEN priority_score = 'NaN'::numeric THEN -1 ELSE priority_score END DESC, severity DESC, created_at DESC
         LIMIT $1`,
        [limit]
    );

    return result.rows;
}

// ---------------------------------------------------------------------------
// 3. FILTERED PROBLEM LIST
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, filtered list of problems for the authority view.
 * All filter parameters are optional. Never interpolates user input into SQL.
 *
 * @param {object} filters
 * @returns {Promise<{ problems: object[], pagination: object }>}
 */
async function getProblems(filters = {}) {
    const {
        district,
        category,
        subcategory,
        status,
        min_priority,
        max_priority,
        cluster_id,
        limit = 20,
        offset = 0
    } = filters;

    const values = [];
    const conditions = ["1=1"];

    if (district) {
        values.push(district);
        conditions.push(`p.district = $${values.length}`);
    }

    if (category) {
        values.push(category);
        conditions.push(`p.category = $${values.length}`);
    }

    if (subcategory) {
        values.push(subcategory);
        conditions.push(`p.subcategory = $${values.length}`);
    }

    if (status) {
        values.push(status);
        conditions.push(`p.status = $${values.length}`);
    }

    if (min_priority !== null && min_priority !== undefined) {
        values.push(min_priority);
        conditions.push(`p.priority_score >= $${values.length}`);
    }

    if (max_priority !== null && max_priority !== undefined) {
        values.push(max_priority);
        conditions.push(`p.priority_score <= $${values.length}`);
    }

    if (cluster_id !== null && cluster_id !== undefined) {
        values.push(cluster_id);
        conditions.push(`p.cluster_id = $${values.length}`);
    }

    const whereClause = conditions.join(" AND ");

    // Total count for pagination (separate query, no LIMIT/OFFSET)
    const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM problems p WHERE ${whereClause}`,
        values
    );

    const total = parseInt(countResult.rows[0].total);

    // Data query
    values.push(limit);
    const limitParam = values.length;
    values.push(offset);
    const offsetParam = values.length;

    const dataResult = await pool.query(
        `SELECT
             p.id,
             p.title,
             p.ai_summary,
             p.category,
             p.subcategory,
             p.district,
             p.city,
             p.affected_people,
             p.severity,
             p.urgency,
             p.priority_score,
             p.status,
             p.verified,
             p.report_count,
             p.upvote_count,
             p.cluster_id,
             p.reporter_id,
             p.created_at,
             p.updated_at
         FROM problems p
         WHERE ${whereClause}
         ORDER BY CASE WHEN p.priority_score = 'NaN'::numeric THEN -1 ELSE p.priority_score END DESC, p.severity DESC, p.created_at DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        values
    );

    return {
        problems: dataResult.rows,
        pagination: {
            limit,
            offset,
            total
        }
    };
}

// ---------------------------------------------------------------------------
// 4. DISTRICT ANALYTICS
// ---------------------------------------------------------------------------

/**
 * Returns problem distribution by district.
 *
 * @returns {Promise<object[]>}
 */
async function getDistrictAnalytics() {
    const result = await pool.query(
        `SELECT
             COALESCE(district, 'Unknown')         AS district,
             COUNT(*)::int                         AS total_problems,
             COUNT(*) FILTER (
                 WHERE priority_score != 'NaN'::numeric AND priority_score >= $1
             )::int                                AS high_priority,
             COUNT(*) FILTER (
                 WHERE status = 'RESOLVED'
             )::int                                AS resolved,
             COALESCE(ROUND(AVG(NULLIF(priority_score, 'NaN'::numeric)))::int, 0) AS average_priority
         FROM problems
         GROUP BY district
         ORDER BY total_problems DESC`,
        [PRIORITY_HIGH]
    );

    return result.rows;
}

// ---------------------------------------------------------------------------
// 5. STATUS ANALYTICS
// ---------------------------------------------------------------------------

/**
 * Returns count of problems per status, only for statuses present in the DB.
 *
 * @returns {Promise<object[]>}
 */
async function getStatusAnalytics() {
    const result = await pool.query(
        `SELECT
             status,
             COUNT(*)::int AS count
         FROM problems
         GROUP BY status
         ORDER BY count DESC`
    );

    return result.rows;
}

// ---------------------------------------------------------------------------
// 6. CLUSTER ANALYTICS
// ---------------------------------------------------------------------------

/**
 * Returns cluster overview with high-priority problem counts.
 *
 * @returns {Promise<object[]>}
 */
async function getClusterAnalytics() {
    const result = await pool.query(
        `SELECT
             pc.id,
             pc.cluster_name,
             pc.category,
             pc.district,
             pc.severity,
             pc.report_count,
             COUNT(p.id) FILTER (
                 WHERE p.priority_score != 'NaN'::numeric AND p.priority_score >= $1
             )::int AS high_priority_problems,
             COUNT(p.id)::int AS confirmed_report_count
         FROM problem_clusters pc
         LEFT JOIN problems p ON p.cluster_id = pc.id
         GROUP BY pc.id, pc.cluster_name, pc.category,
                  pc.district, pc.severity, pc.report_count
         ORDER BY pc.report_count DESC, pc.severity DESC`,
        [PRIORITY_HIGH]
    );

    return result.rows;
}

// ---------------------------------------------------------------------------
// 7. RECENT ACTIVITY
// ---------------------------------------------------------------------------

/**
 * Returns recently updated problems.
 *
 * @param {number} limit - max results (1-50, default 10)
 * @returns {Promise<object[]>}
 */
async function getRecentActivity(limit = 10) {
    const result = await pool.query(
        `SELECT
             id,
             title,
             district,
             category,
             subcategory,
             priority_score,
             status,
             cluster_id,
             created_at,
             updated_at
         FROM problems
         ORDER BY updated_at DESC, created_at DESC
         LIMIT $1`,
        [limit]
    );

    return result.rows;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    getSummary,
    getPriorityProblems,
    getProblems,
    getDistrictAnalytics,
    getStatusAnalytics,
    getClusterAnalytics,
    getRecentActivity,
    parseIntParam,
    PRIORITY_HIGH,
    PRIORITY_CRITICAL
};
