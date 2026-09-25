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

    // Institutional Projects Aggregations
    let ipResult = { rows: [] };
    let membersResult = { rows: [] };
    let industryResult = { rows: [] };
    let outcomesResult = { rows: [] };
    let fundingResult = { rows: [] };
    let challengeOverviewResult = { rows: [] };
    let attentionItems = [];

    try {
        challengeOverviewResult = await pool.query(`
            SELECT
                COUNT(*) AS total_challenges,
                COUNT(*) FILTER (WHERE status IN ('REPORTED', 'UNDER_REVIEW')) AS new_pending,
                COUNT(*) FILTER (WHERE priority_score != 'NaN'::numeric AND priority_score >= 80) AS high_critical,
                (SELECT COUNT(DISTINCT problem_id) FROM institutional_challenge_evaluations WHERE evaluation_status IN ('ACCEPTED', 'IN_PROJECT', 'TEAM_FORMATION')) AS accepted_by_universities,
                (SELECT COUNT(DISTINCT problem_id) FROM institutional_projects) AS in_project,
                (SELECT COUNT(*) FROM problems p WHERE NOT EXISTS (SELECT 1 FROM institutional_challenge_evaluations ice WHERE ice.problem_id = p.id)) AS no_institutional_response
            FROM problems
        `);

        ipResult = await pool.query(`
            SELECT 
                COUNT(*) AS total_projects,
                COUNT(*) FILTER (WHERE project_status = 'CHALLENGE_ACCEPTED') AS status_challenge_accepted,
                COUNT(*) FILTER (WHERE project_status = 'PROPOSAL') AS status_proposal,
                COUNT(*) FILTER (WHERE project_status = 'PROTOTYPE') AS status_prototype,
                COUNT(*) FILTER (WHERE project_status = 'TESTING') AS status_testing,
                COUNT(*) FILTER (WHERE project_status = 'PILOT') AS status_pilot,
                COUNT(*) FILTER (WHERE project_status = 'DEPLOYMENT') AS status_deployment,
                COUNT(*) FILTER (WHERE project_status = 'COMPLETED') AS status_completed,
                COUNT(DISTINCT university_id) AS participating_universities,
                COUNT(DISTINCT university_id) FILTER (WHERE project_status != 'COMPLETED') AS active_universities,
                COUNT(DISTINCT university_id) FILTER (WHERE project_status = 'COMPLETED') AS universities_with_completed_projects
            FROM institutional_projects
        `);
        
        membersResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT ctm.user_id) FILTER (WHERE ctm.role = 'STUDENT') AS students,
                COUNT(DISTINCT ctm.user_id) FILTER (WHERE ctm.role = 'FACULTY') AS faculty,
                COUNT(DISTINCT ctm.user_id) FILTER (WHERE ctm.role = 'RESEARCHER') AS researchers
            FROM collaboration_team_members ctm
            JOIN institutional_projects ip ON ip.team_id = ctm.team_id
            WHERE ctm.membership_status = 'ACTIVE'
        `);
        
        industryResult = await pool.query(`
            SELECT 
                COUNT(*) AS total_collaborations,
                COUNT(*) FILTER (WHERE collaboration_status = 'ACTIVE') AS active_collaborations,
                COUNT(*) FILTER (WHERE collaboration_status = 'ACCEPTED') AS accepted_collaborations,
                COUNT(*) FILTER (WHERE collaboration_status = 'COMPLETED') AS completed_collaborations,
                COUNT(DISTINCT partner_id) AS participating_startups_msmes
            FROM industry_collaborations
        `);

        outcomesResult = await pool.query(`
            SELECT 
                COUNT(*) AS total_outcomes,
                COUNT(*) FILTER (WHERE status IN ('PUBLISHED', 'VERIFIED', 'COMPLETED', 'GRANTED')) AS verified_outcomes,
                COUNT(*) FILTER (WHERE outcome_type = 'TECHNICAL_REPORT') AS technical_reports,
                COUNT(*) FILTER (WHERE outcome_type = 'PUBLICATION') AS publications,
                COUNT(*) FILTER (WHERE outcome_type = 'PATENT') AS patents,
                COUNT(*) FILTER (WHERE outcome_type = 'STARTUP_SPINOFF') AS startup_spinoffs,
                COUNT(*) FILTER (WHERE outcome_type IN ('COPYRIGHT', 'DESIGN', 'TECH_TRANSFER', 'OTHER')) AS other_outcomes
            FROM project_outcomes
        `);
        
        fundingResult = await pool.query(`
            SELECT 
                COUNT(*) AS funding_requests,
                COUNT(*) FILTER (WHERE funding_status = 'UNDER_REVIEW') AS under_review,
                COUNT(*) FILTER (WHERE funding_status IN ('APPROVED', 'RECEIVED')) AS approved_requests,
                COUNT(*) FILTER (WHERE funding_status = 'REJECTED') AS rejected_requests,
                COALESCE(SUM(requested_amount), 0) AS total_requested_amount,
                COALESCE(SUM(approved_amount) FILTER (WHERE funding_status IN ('APPROVED', 'RECEIVED')), 0) AS approved_amount
            FROM project_funding
        `);

        // Deterministic Attention Items / Alerts (Section 10)
        // 1. High/Critical challenge without university evaluation
        const unEvalChallenges = await pool.query(`
            SELECT p.id, p.title, p.priority_score, p.district
            FROM problems p
            WHERE p.priority_score != 'NaN'::numeric AND p.priority_score >= 80
            AND NOT EXISTS (SELECT 1 FROM institutional_challenge_evaluations ice WHERE ice.problem_id = p.id)
            ORDER BY p.priority_score DESC LIMIT 3
        `);
        for (const r of unEvalChallenges.rows) {
            attentionItems.push({
                id: `uneval-${r.id}`,
                type: "HIGH_PRIORITY_UNEVALUATED",
                severity: "HIGH",
                title: r.title,
                subtitle: `Critical challenge in ${r.district || "Jharkhand"} with priority ${r.priority_score} awaits institutional university evaluation.`,
                target_type: "problem",
                target_id: r.id,
                link: `/problems/${r.id}`
            });
        }

        // 2. Pending funding requests
        const pendingFunding = await pool.query(`
            SELECT pf.id, pf.project_id, ip.title as project_title, pf.requested_amount, pf.funding_source, pf.funding_status
            FROM project_funding pf
            JOIN institutional_projects ip ON ip.id = pf.project_id
            WHERE pf.funding_status IN ('REQUESTED', 'UNDER_REVIEW')
            ORDER BY pf.created_at DESC LIMIT 3
        `);
        for (const r of pendingFunding.rows) {
            attentionItems.push({
                id: `funding-${r.id}`,
                type: "FUNDING_REVIEW_PENDING",
                severity: "MEDIUM",
                title: r.project_title,
                subtitle: `Grant request of ₹${Number(r.requested_amount).toLocaleString('en-IN')} (${r.funding_source}) requires authority review.`,
                target_type: "project",
                target_id: r.project_id,
                link: `/projects/${r.project_id}`
            });
        }

        // 3. Testing failed or partial
        const testIssues = await pool.query(`
            SELECT ptr.id, ptr.project_id, ip.title as project_title, ptr.test_description, ptr.outcome
            FROM project_test_results ptr
            JOIN institutional_projects ip ON ip.id = ptr.project_id
            WHERE ptr.outcome IN ('FAIL', 'PARTIAL')
            ORDER BY ptr.created_at DESC LIMIT 3
        `);
        for (const r of testIssues.rows) {
            attentionItems.push({
                id: `test-${r.id}`,
                type: "TESTING_ATTENTION",
                severity: "HIGH",
                title: r.project_title,
                subtitle: `Test verification outcome "${r.outcome}": ${r.test_description.slice(0, 70)}...`,
                target_type: "project",
                target_id: r.project_id,
                link: `/projects/${r.project_id}`
            });
        }

        // 4. Accepted challenge without project
        const acceptedNoProj = await pool.query(`
            SELECT p.id, p.title, ice.university_id, u.name as university_name
            FROM problems p
            JOIN institutional_challenge_evaluations ice ON ice.problem_id = p.id
            JOIN users u ON u.id = ice.university_id
            WHERE ice.evaluation_status IN ('ACCEPTED', 'TEAM_FORMATION')
            AND NOT EXISTS (SELECT 1 FROM institutional_projects ip WHERE ip.problem_id = p.id)
            LIMIT 3
        `);
        for (const r of acceptedNoProj.rows) {
            attentionItems.push({
                id: `accepted-noproj-${r.id}`,
                type: "ACCEPTED_NO_PROJECT",
                severity: "LOW",
                title: r.title,
                subtitle: `Accepted by ${r.university_name}; awaiting institutional project initialization.`,
                target_type: "problem",
                target_id: r.id,
                link: `/problems/${r.id}`
            });
        }
    } catch (e) {
        console.warn("Institutional projects schema not fully migrated, returning empty analytics", e.message);
    }

    const row = result.rows[0];
    const coRow = challengeOverviewResult.rows[0] || {};
    const ipRow = ipResult.rows[0] || {};
    const indRow = industryResult.rows[0] || {};
    const outRow = outcomesResult.rows[0] || {};
    const fundRow = fundingResult.rows[0] || {};

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
        })),
        challenge_overview: {
            total_challenges: parseInt(coRow.total_challenges || row.total_problems || 0),
            new_pending: parseInt(coRow.new_pending || 0),
            high_critical: parseInt(coRow.high_critical || 0),
            accepted_by_universities: parseInt(coRow.accepted_by_universities || 0),
            in_project: parseInt(coRow.in_project || 0),
            no_institutional_response: parseInt(coRow.no_institutional_response || 0)
        },
        attention_items: attentionItems,
        institutional_projects: {
            total_projects: parseInt(ipRow.total_projects || 0),
            participating_universities: parseInt(ipRow.participating_universities || 0),
            active_universities: parseInt(ipRow.active_universities || 0),
            universities_with_active_projects: parseInt(ipRow.active_universities || 0),
            universities_with_completed_projects: parseInt(ipRow.universities_with_completed_projects || 0),
            lifecycle: {
                CHALLENGE_ACCEPTED: parseInt(ipRow.status_challenge_accepted || 0),
                PROPOSAL: parseInt(ipRow.status_proposal || 0),
                PROTOTYPE: parseInt(ipRow.status_prototype || 0),
                TESTING: parseInt(ipRow.status_testing || 0),
                PILOT: parseInt(ipRow.status_pilot || 0),
                DEPLOYMENT: parseInt(ipRow.status_deployment || 0),
                COMPLETED: parseInt(ipRow.status_completed || 0)
            },
            academic_participation: {
                students: parseInt(membersResult.rows[0]?.students || 0),
                faculty: parseInt(membersResult.rows[0]?.faculty || 0),
                researchers: parseInt(membersResult.rows[0]?.researchers || 0)
            },
            industry: {
                total_collaborations: parseInt(indRow.total_collaborations || 0),
                active_collaborations: parseInt(indRow.active_collaborations || 0),
                accepted_collaborations: parseInt(indRow.accepted_collaborations || 0),
                completed_collaborations: parseInt(indRow.completed_collaborations || 0),
                participating_startups_msmes: parseInt(indRow.participating_startups_msmes || 0)
            },
            outcomes: {
                total_outcomes: parseInt(outRow.total_outcomes || 0),
                verified_outcomes: parseInt(outRow.verified_outcomes || 0),
                technical_reports: parseInt(outRow.technical_reports || 0),
                publications: parseInt(outRow.publications || 0),
                patents: parseInt(outRow.patents || 0),
                startup_spinoffs: parseInt(outRow.startup_spinoffs || 0),
                other_outcomes: parseInt(outRow.other_outcomes || 0)
            },
            funding: {
                funding_requests: parseInt(fundRow.funding_requests || 0),
                under_review: parseInt(fundRow.under_review || 0),
                approved: parseInt(fundRow.approved_requests || 0),
                approved_requests: parseInt(fundRow.approved_requests || 0),
                rejected: parseInt(fundRow.rejected_requests || 0),
                total_requested_amount: parseFloat(fundRow.total_requested_amount || 0),
                total_approved_amount: parseFloat(fundRow.approved_amount || 0),
                approved_amount: parseFloat(fundRow.approved_amount || 0)
            }
        }
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
        search,
        source,
        university_participation,
        project_status,
        min_priority,
        max_priority,
        min_severity,
        min_urgency,
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

    if (source) {
        values.push(source);
        conditions.push(`p.submitter_source = $${values.length}`);
    }

    if (search) {
        values.push(`%${search}%`);
        conditions.push(`(p.title ILIKE $${values.length} OR p.description ILIKE $${values.length} OR p.address ILIKE $${values.length})`);
    }

    if (min_priority !== null && min_priority !== undefined) {
        values.push(min_priority);
        conditions.push(`p.priority_score >= $${values.length}`);
    }

    if (max_priority !== null && max_priority !== undefined) {
        values.push(max_priority);
        conditions.push(`p.priority_score <= $${values.length}`);
    }

    if (min_severity !== null && min_severity !== undefined) {
        values.push(min_severity);
        conditions.push(`p.severity >= $${values.length}`);
    }

    if (min_urgency !== null && min_urgency !== undefined) {
        values.push(min_urgency);
        conditions.push(`p.urgency >= $${values.length}`);
    }

    if (cluster_id !== null && cluster_id !== undefined) {
        values.push(cluster_id);
        conditions.push(`p.cluster_id = $${values.length}`);
    }

    if (university_participation === "EVALUATED") {
        conditions.push(`EXISTS (SELECT 1 FROM institutional_challenge_evaluations ice WHERE ice.problem_id = p.id)`);
    } else if (university_participation === "IN_PROJECT") {
        conditions.push(`EXISTS (SELECT 1 FROM institutional_projects ip_sub WHERE ip_sub.problem_id = p.id)`);
    } else if (university_participation === "UNASSIGNED") {
        conditions.push(`NOT EXISTS (SELECT 1 FROM institutional_challenge_evaluations ice WHERE ice.problem_id = p.id) AND NOT EXISTS (SELECT 1 FROM institutional_projects ip_sub WHERE ip_sub.problem_id = p.id)`);
    }

    if (project_status) {
        values.push(project_status);
        conditions.push(`EXISTS (SELECT 1 FROM institutional_projects ip_sub WHERE ip_sub.problem_id = p.id AND ip_sub.project_status = $${values.length})`);
    }

    const whereClause = conditions.join(" AND ");

    // Total count for pagination
    const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM problems p WHERE ${whereClause}`,
        values
    );

    const total = parseInt(countResult.rows[0].total);

    // Data query with LATERAL joins for University and Project governance
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
             p.address,
             p.affected_people,
             p.severity,
             p.urgency,
             p.priority_score,
             p.status,
             p.submitter_source,
             p.verified,
             p.cluster_id,
             p.reporter_id,
             p.created_at,
             p.updated_at,
             latest_eval.evaluation_status,
             u_uni.name AS university_name,
             ip.id AS project_id,
             ip.title AS project_title,
             ip.project_status AS project_stage,
             COALESCE((SELECT COUNT(*) FROM project_outcomes po WHERE po.project_id = ip.id), 0)::int AS outcomes_count
         FROM problems p
         LEFT JOIN LATERAL (
             SELECT ice.evaluation_status, ice.university_id, ice.updated_at AS eval_updated
             FROM institutional_challenge_evaluations ice
             WHERE ice.problem_id = p.id
             ORDER BY ice.updated_at DESC
             LIMIT 1
         ) latest_eval ON true
         LEFT JOIN users u_uni ON u_uni.id = latest_eval.university_id
         LEFT JOIN LATERAL (
             SELECT ip_sub.id, ip_sub.title, ip_sub.project_status
             FROM institutional_projects ip_sub
             WHERE ip_sub.problem_id = p.id
             ORDER BY ip_sub.created_at DESC
             LIMIT 1
         ) ip ON true
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
// 8. INSTITUTIONAL PARTICIPATION TABLE (Section 5)
// ---------------------------------------------------------------------------

async function getInstitutionalParticipation() {
    const result = await pool.query(`
        SELECT 
            u.id AS university_id,
            u.name AS university_name,
            inst.name AS institution_name,
            inst.district,
            inst.city,
            inst.state,
            COUNT(DISTINCT ice.problem_id) AS challenges_evaluated,
            COUNT(DISTINCT ice.problem_id) FILTER (WHERE ice.evaluation_status IN ('ACCEPTED', 'IN_PROJECT', 'TEAM_FORMATION')) AS challenges_accepted,
            COUNT(DISTINCT ip.id) AS total_projects,
            COUNT(DISTINCT ip.id) FILTER (WHERE ip.project_status != 'COMPLETED') AS active_projects,
            COUNT(DISTINCT ip.id) FILTER (WHERE ip.project_status = 'PILOT') AS pilot_projects,
            COUNT(DISTINCT ip.id) FILTER (WHERE ip.project_status = 'COMPLETED') AS completed_projects,
            COUNT(DISTINCT ic.id) AS industry_collaborations,
            COUNT(DISTINCT po.id) FILTER (WHERE po.status IN ('PUBLISHED', 'VERIFIED', 'COMPLETED', 'GRANTED')) AS verified_outcomes
        FROM users u
        LEFT JOIN university_profiles up ON up.user_id = u.id
        LEFT JOIN institutions inst ON inst.id = up.institution_id
        LEFT JOIN institutional_challenge_evaluations ice ON ice.university_id = u.id
        LEFT JOIN institutional_projects ip ON ip.university_id = u.id
        LEFT JOIN industry_collaborations ic ON ic.project_id = ip.id
        LEFT JOIN project_outcomes po ON po.project_id = ip.id
        WHERE u.role = 'UNIVERSITY' AND u.is_active = TRUE
        GROUP BY u.id, u.name, inst.name, inst.district, inst.city, inst.state
        ORDER BY active_projects DESC, challenges_accepted DESC, u.name ASC
    `);

    return result.rows.map(r => ({
        university_id: r.university_id,
        university_name: r.university_name,
        institution_name: r.institution_name,
        location: [r.city, r.state].filter(Boolean).join(", ") || r.district || "Jharkhand",
        challenges_received: parseInt(r.challenges_evaluated || 0),
        challenges_accepted: parseInt(r.challenges_accepted || 0),
        active_projects: parseInt(r.active_projects || 0),
        pilot_projects: parseInt(r.pilot_projects || 0),
        completed_projects: parseInt(r.completed_projects || 0),
        industry_collaborations: parseInt(r.industry_collaborations || 0),
        verified_outcomes: parseInt(r.verified_outcomes || 0)
    }));
}

// ---------------------------------------------------------------------------
// 9. INDUSTRY ECOSYSTEM MONITORING (Section 6)
// ---------------------------------------------------------------------------

async function getIndustryEcosystem() {
    const result = await pool.query(`
        SELECT 
            ic.id AS collab_id,
            u_part.id AS partner_id,
            u_part.name AS partner_name,
            u_part.role AS partner_role,
            u_uni.id AS university_id,
            u_uni.name AS university_name,
            ip.id AS project_id,
            ip.title AS project_title,
            ip.project_status AS project_stage,
            ic.collaboration_status,
            COALESCE(
                (SELECT message FROM project_activity_log pal WHERE pal.project_id = ip.id AND pal.action = 'COLLABORATION_ACTIVE' ORDER BY pal.created_at DESC LIMIT 1),
                'Technical Mentoring, Prototype Development, Sensor Integration, Field Testing, Pilot Deployment'
            ) AS collaboration_scope,
            (SELECT pf.funding_status FROM project_funding pf WHERE pf.project_id = ip.id ORDER BY pf.created_at DESC LIMIT 1) AS funding_status,
            (SELECT ptr.outcome FROM project_test_results ptr WHERE ptr.project_id = ip.id ORDER BY ptr.created_at DESC LIMIT 1) AS test_outcome,
            ic.created_at,
            ic.updated_at
        FROM industry_collaborations ic
        JOIN users u_part ON u_part.id = ic.partner_id
        JOIN institutional_projects ip ON ip.id = ic.project_id
        JOIN users u_uni ON u_uni.id = ip.university_id
        ORDER BY ic.updated_at DESC, ic.created_at DESC
    `);

    return result.rows;
}

// ---------------------------------------------------------------------------
// 10. FUNDING MONITORING (Section 7)
// ---------------------------------------------------------------------------

async function getFundingMonitoring() {
    const result = await pool.query(`
        SELECT 
            pf.id,
            pf.project_id,
            ip.title AS project_title,
            u_uni.name AS university_name,
            pf.funding_source,
            pf.requested_amount,
            pf.approved_amount,
            pf.funding_status,
            pf.funding_requirement,
            pf.notes,
            pf.created_at,
            pf.updated_at
        FROM project_funding pf
        JOIN institutional_projects ip ON ip.id = pf.project_id
        JOIN users u_uni ON u_uni.id = ip.university_id
        ORDER BY pf.created_at DESC
    `);

    return result.rows;
}

// ---------------------------------------------------------------------------
// 11. TESTING & EVIDENCE MONITORING (Section 8)
// ---------------------------------------------------------------------------

async function getTestingMonitoring() {
    const result = await pool.query(`
        SELECT 
            ptr.id,
            ptr.project_id,
            ip.title AS project_title,
            u_uni.name AS university_name,
            ptr.test_description,
            ptr.test_result,
            ptr.outcome,
            ptr.remarks,
            ptr.evidence_url,
            ptr.created_at
        FROM project_test_results ptr
        JOIN institutional_projects ip ON ip.id = ptr.project_id
        JOIN users u_uni ON u_uni.id = ip.university_id
        ORDER BY ptr.created_at DESC
    `);

    return result.rows;
}

// ---------------------------------------------------------------------------
// 12. OUTCOMES & IMPACT MONITORING (Section 9)
// ---------------------------------------------------------------------------

async function getOutcomesMonitoring() {
    const result = await pool.query(`
        SELECT 
            po.id,
            po.project_id,
            ip.title AS project_title,
            u_uni.name AS university_name,
            po.outcome_type,
            po.title,
            po.status,
            po.reference_document_url,
            po.created_at
        FROM project_outcomes po
        JOIN institutional_projects ip ON ip.id = po.project_id
        JOIN users u_uni ON u_uni.id = ip.university_id
        ORDER BY po.created_at DESC
    `);

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
    getInstitutionalParticipation,
    getIndustryEcosystem,
    getFundingMonitoring,
    getTestingMonitoring,
    getOutcomesMonitoring,
    parseIntParam,
    PRIORITY_HIGH,
    PRIORITY_CRITICAL
};
