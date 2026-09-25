/**
 * implementationService.js
 *
 * MODULE 9 — IMPLEMENTATION + PILOT TRACKING
 *
 * Core service for tracking real-world pilot projects,
 * milestones, progress, evidence, and blocker resolution.
 */

"use strict";

const pool = require("../config/db");
const { notify } = require("./notificationService");
const trustService = require("./trustService");

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbiddenError";
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
    }
}

class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConflictError";
    }
}

const IMPLEMENTATION_STATUS_FLOW = {
    PILOT: ["IMPLEMENTING", "COMPLETED", "PAUSED", "BLOCKED", "TERMINATED"],
    IMPLEMENTING: ["COMPLETED", "PAUSED", "BLOCKED", "PILOT", "TERMINATED"],
    PAUSED: ["PILOT", "IMPLEMENTING", "TERMINATED"],
    BLOCKED: ["PILOT", "IMPLEMENTING", "COMPLETED", "TERMINATED"],
    COMPLETED: ["IMPLEMENTING"],
    TERMINATED: [],
};


const VALID_STATUSES = Object.keys(IMPLEMENTATION_STATUS_FLOW);
const VALID_MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];
const VALID_EVIDENCE_TYPES = ["PHOTO", "LAB_REPORT", "DOCUMENT", "METRIC_DATA", "CERTIFICATE", "OTHER"];
const VALID_BLOCKER_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_UPDATE_TYPES = ["PROGRESS_NOTE", "MILESTONE_REACHED", "METRIC_UPDATE", "STATUS_CHANGE", "BLOCKER_LOG"];

/**
 * Check if a user is an authority or administrator.
 */
function isAuthorityOrAdmin(user) {
    return user && ["AUTHORITY", "ADMIN"].includes(user.role);
}

/**
 * Check if a user is authorized to perform execution tasks (updates, milestones, evidence, blockers)
 * on a specific implementation.
 *
 * Authorized:
 * - Authority / Admin
 * - Solution Submitter (solutions.submitted_by)
 * - Implementation Executing User (solution_implementations.executing_user_id)
 * - Confirmed Contributor (solution_contributors)
 */
async function canExecute(user, implementationId) {
    if (!user) return false;
    if (isAuthorityOrAdmin(user)) return true;

    const res = await pool.query(
        `SELECT si.id, si.solution_id, si.executing_user_id, s.submitted_by
         FROM solution_implementations si
         JOIN solutions s ON s.id = si.solution_id
         WHERE si.id = $1`,
        [implementationId]
    );

    if (res.rows.length === 0) return false;
    const row = res.rows[0];

    if (Number(row.submitted_by) === Number(user.id)) return true;
    if (row.executing_user_id && Number(row.executing_user_id) === Number(user.id)) return true;

    // Check solution_contributors
    const contribRes = await pool.query(
        `SELECT 1 FROM solution_contributors
         WHERE solution_id = $1 AND user_id = $2`,
        [row.solution_id, user.id]
    );

    return contribRes.rows.length > 0;
}

/**
 * Format implementation row with numbers and sanitized author objects.
 */
function formatImplementation(row, derivedMilestoneProgress = 0, blockersSummary = { open: 0, critical: 0 }) {
    if (!row) return null;
    return {
        id: row.id,
        solution_id: row.solution_id,
        problem_id: row.problem_id,
        title: row.title,
        description: row.description,
        status: row.status,
        progress_percentage: Number(row.progress_percentage),
        derived_milestone_progress: derivedMilestoneProgress,
        target_start_date: row.target_start_date,
        actual_start_date: row.actual_start_date,
        target_end_date: row.target_end_date,
        actual_end_date: row.actual_end_date,
        budget_allocated: row.budget_allocated !== null ? Number(row.budget_allocated) : 0,
        budget_spent: row.budget_spent !== null ? Number(row.budget_spent) : 0,
        location_details: row.location_details,
        outcome_metrics: row.outcome_metrics || {},
        open_blockers: blockersSummary.open,
        critical_blockers: blockersSummary.critical,
        created_at: row.created_at,
        updated_at: row.updated_at,
        lead_authority: row.lead_authority_name
            ? { id: row.lead_authority_id, name: row.lead_authority_name, role: row.lead_authority_role }
            : { id: row.lead_authority_id },
        executing_user: row.executing_user_name
            ? { id: row.executing_user_id, name: row.executing_user_name, role: row.executing_user_role }
            : row.executing_user_id
            ? { id: row.executing_user_id }
            : null,
    };
}

/**
 * Calculate derived milestone progress.
 * Formula: (sum of weights of COMPLETED milestones / sum of weights of ALL milestones) * 100
 */
async function calculateMilestoneProgress(implementationId) {
    const res = await pool.query(
        `SELECT
            COALESCE(SUM(weight) FILTER (WHERE status = 'COMPLETED'), 0)::numeric AS completed_weight,
            COALESCE(SUM(weight), 0)::numeric AS total_weight
         FROM implementation_milestones
         WHERE implementation_id = $1`,
        [implementationId]
    );

    const totalWeight = Number(res.rows[0]?.total_weight || 0);
    const completedWeight = Number(res.rows[0]?.completed_weight || 0);

    if (totalWeight === 0) return 0;
    return Number(((completedWeight / totalWeight) * 100).toFixed(2));
}

/**
 * Get count of open and critical blockers for an implementation.
 */
async function getBlockersSummary(implementationId) {
    const res = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE status != 'RESOLVED')::int AS open,
            COUNT(*) FILTER (WHERE status != 'RESOLVED' AND severity = 'CRITICAL')::int AS critical
         FROM implementation_blockers
         WHERE implementation_id = $1`,
        [implementationId]
    );

    return {
        open: res.rows[0]?.open || 0,
        critical: res.rows[0]?.critical || 0,
    };
}

// ---------------------------------------------------------------------------
// 1. INITIATE IMPLEMENTATION
// ---------------------------------------------------------------------------

async function initiateImplementation({ solutionId, user, payload }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can initiate implementations");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    // 1. Fetch solution
    const solRes = await pool.query(
        `SELECT id, problem_id, submitted_by, title, status FROM solutions WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const solution = solRes.rows[0];

    // 2. Precondition check: solution must be APPROVED or PILOT
    if (!["APPROVED", "PILOT"].includes(solution.status)) {
        throw new ValidationError(
            `Cannot initiate implementation for solution in "${solution.status}" status. Only APPROVED or PILOT solutions can start implementation.`
        );
    }

    // 3. Prevent duplicate implementation for same solution (UNIQUE solution_id)
    const dupRes = await pool.query(
        `SELECT id FROM solution_implementations WHERE solution_id = $1`,
        [solutionId]
    );
    if (dupRes.rows.length > 0) {
        throw new ConflictError("An implementation project already exists for this solution");
    }

    // 4. Validate fields
    const title = (payload.title && typeof payload.title === "string" && payload.title.trim())
        ? payload.title.trim()
        : `Pilot Implementation: ${solution.title}`;

    const startDateStr = payload.target_start_date || new Date().toISOString().split("T")[0];
    const endDateStr = payload.target_end_date || payload.expected_completion_date || new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0];

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError("Dates must be valid calendar dates (YYYY-MM-DD)");
    }
    if (end < start) {
        throw new ValidationError('"target_end_date" must be on or after "target_start_date"');
    }

    const budgetAllocated = payload.budget_allocated !== undefined && payload.budget_allocated !== null
        ? Number(payload.budget_allocated)
        : 0;

    if (isNaN(budgetAllocated) || budgetAllocated < 0) {
        throw new ValidationError('"budget_allocated" must be a non-negative number');
    }

    let outcomeMetrics = {};
    if (payload.outcome_metrics !== undefined && payload.outcome_metrics !== null) {
        if (typeof payload.outcome_metrics !== "object" || Array.isArray(payload.outcome_metrics)) {
            throw new ValidationError('"outcome_metrics" must be a valid JSON object');
        }
        outcomeMetrics = payload.outcome_metrics;
    }

    const executingUserId = payload.executing_user_id || payload.partner_id || payload.partnerId || solution.submitted_by;

    // 5. Insert implementation
    const insertRes = await pool.query(
        `INSERT INTO solution_implementations
            (solution_id, problem_id, lead_authority_id, executing_user_id,
             title, description, status, progress_percentage,
             target_start_date, target_end_date, budget_allocated,
             location_details, outcome_metrics)
         VALUES ($1, $2, $3, $4, $5, $6, 'PILOT', 0, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            solutionId,
            solution.problem_id,
            user.id,
            executingUserId,
            title,
            payload.description ? payload.description.trim() : null,
            startDateStr,
            endDateStr,
            budgetAllocated,
            payload.location_details ? payload.location_details.trim() : null,
            JSON.stringify(outcomeMetrics),
        ]
    );

    const implementation = insertRes.rows[0];

    // 6. Synchronize solution status to 'PILOT'
    if (solution.status !== "PILOT") {
        await pool.query(
            `UPDATE solutions SET status = 'PILOT', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [solutionId]
        );
    }

    // 7. Log initial activity record
    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content, progress_snapshot)
         VALUES ($1, $2, 'STATUS_CHANGE', $3, 0)`,
        [implementation.id, user.id, `Pilot project initiated by ${user.name || "Authority"}`]
    );

    return formatImplementation(implementation, 0, { open: 0, critical: 0 });
}

// ---------------------------------------------------------------------------
// 2. GET IMPLEMENTATION BY ID
// ---------------------------------------------------------------------------

async function getImplementationById(id) {
    const res = await pool.query(
        `SELECT si.*,
                u1.name AS lead_authority_name, u1.role AS lead_authority_role,
                u2.name AS executing_user_name, u2.role AS executing_user_role
         FROM solution_implementations si
         LEFT JOIN users u1 ON u1.id = si.lead_authority_id
         LEFT JOIN users u2 ON u2.id = si.executing_user_id
         WHERE si.id = $1`,
        [id]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Implementation project not found");
    }

    const milestoneProgress = await calculateMilestoneProgress(id);
    const blockersSummary = await getBlockersSummary(id);

    return formatImplementation(res.rows[0], milestoneProgress, blockersSummary);
}

// ---------------------------------------------------------------------------
// 3. GET IMPLEMENTATION BY SOLUTION ID
// ---------------------------------------------------------------------------

async function getImplementationBySolutionId(solutionId) {
    const res = await pool.query(
        `SELECT si.*,
                u1.name AS lead_authority_name, u1.role AS lead_authority_role,
                u2.name AS executing_user_name, u2.role AS executing_user_role
         FROM solution_implementations si
         LEFT JOIN users u1 ON u1.id = si.lead_authority_id
         LEFT JOIN users u2 ON u2.id = si.executing_user_id
         WHERE si.solution_id = $1`,
        [solutionId]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("No implementation found for this solution");
    }

    const milestoneProgress = await calculateMilestoneProgress(res.rows[0].id);
    const blockersSummary = await getBlockersSummary(res.rows[0].id);

    return formatImplementation(res.rows[0], milestoneProgress, blockersSummary);
}

// ---------------------------------------------------------------------------
// 4. GET IMPLEMENTATIONS BY PROBLEM ID
// ---------------------------------------------------------------------------

async function getImplementationsByProblemId(problemId) {
    const probCheck = await pool.query(`SELECT id FROM problems WHERE id = $1`, [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const res = await pool.query(
        `SELECT si.*,
                u1.name AS lead_authority_name, u1.role AS lead_authority_role,
                u2.name AS executing_user_name, u2.role AS executing_user_role
         FROM solution_implementations si
         LEFT JOIN users u1 ON u1.id = si.lead_authority_id
         LEFT JOIN users u2 ON u2.id = si.executing_user_id
         WHERE si.problem_id = $1
         ORDER BY si.created_at DESC`,
        [problemId]
    );

    const results = [];
    for (const row of res.rows) {
        const milestoneProgress = await calculateMilestoneProgress(row.id);
        const blockersSummary = await getBlockersSummary(row.id);
        results.push(formatImplementation(row, milestoneProgress, blockersSummary));
    }

    return {
        problem_id: problemId,
        total: results.length,
        implementations: results,
    };
}

// ---------------------------------------------------------------------------
// 5. UPDATE STATUS (PILOT -> IMPLEMENTING -> COMPLETED, PAUSED, BLOCKED)
// ---------------------------------------------------------------------------

async function updateStatus({ id, newStatus, user }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can change implementation status");
    }

    if (!newStatus || typeof newStatus !== "string") {
        throw new ValidationError("Status must be a non-empty string");
    }

    const trimmedStatus = newStatus.trim().toUpperCase();

    if (!VALID_STATUSES.includes(trimmedStatus)) {
        throw new ValidationError(
            `Unknown implementation status: "${newStatus}". Allowed: ${VALID_STATUSES.join(", ")}`
        );
    }

    const implRes = await pool.query(
        `SELECT id, solution_id, status, progress_percentage FROM solution_implementations WHERE id = $1`,
        [id]
    );

    if (implRes.rows.length === 0) {
        throw new NotFoundError("Implementation project not found");
    }

    const impl = implRes.rows[0];
    const currentStatus = impl.status;

    if (currentStatus === trimmedStatus) {
        return getImplementationById(id);
    }

    // Check transition flow
    const allowedTransitions = IMPLEMENTATION_STATUS_FLOW[currentStatus] || [];
    if (!allowedTransitions.includes(trimmedStatus)) {
        throw new ValidationError(
            `Invalid status transition from "${currentStatus}" to "${trimmedStatus}"`
        );
    }

    // Completion requirements: progress == 100 AND zero OPEN CRITICAL blockers
    if (trimmedStatus === "COMPLETED") {
        if (Number(impl.progress_percentage) < 100) {
            throw new ValidationError(
                `Cannot mark implementation as COMPLETED until progress_percentage reaches 100% (current: ${impl.progress_percentage}%)`
            );
        }

        const blockersSummary = await getBlockersSummary(id);
        if (blockersSummary.critical > 0) {
            throw new ValidationError(
                `Cannot mark implementation as COMPLETED while ${blockersSummary.critical} critical blocker(s) remain unresolved`
            );
        }
    }

    const actualEndDate = trimmedStatus === "COMPLETED" ? new Date() : null;

    await pool.query(
        `UPDATE solution_implementations
         SET status = $1,
             actual_end_date = COALESCE($2, actual_end_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [trimmedStatus, actualEndDate, id]
    );

    // Synchronize solution status
    if (trimmedStatus === "IMPLEMENTING") {
        await pool.query(
            `UPDATE solutions SET status = 'IMPLEMENTING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [impl.solution_id]
        );
    } else if (trimmedStatus === "COMPLETED") {
        await pool.query(
            `UPDATE solutions SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [impl.solution_id]
        );

        // Non-blocking Module 14 Reputation Integration (Mandatory Fix 3)
        try {
            const { recordEvent } = require("./reputationService");
            if (impl.executing_user_id) {
                await recordEvent({
                    userId: impl.executing_user_id,
                    contributionType: "IMPLEMENTATION_COMPLETED",
                    sourceEntityType: "IMPLEMENTATION",
                    sourceEntityId: id,
                    actorId: user.id,
                    description: `Completed implementation pilot "${impl.title}"`,
                });
            }
        } catch (repErr) {
            console.error("Non-blocking reputation error on implementation complete:", repErr);
        }
    }

    // Log update
    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content, progress_snapshot)
         VALUES ($1, $2, 'STATUS_CHANGE', $3, $4)`,
        [id, user.id, `Status updated from ${currentStatus} to ${trimmedStatus}`, impl.progress_percentage]
    );

    return getImplementationById(id);
}

// ---------------------------------------------------------------------------
// 6. UPDATE PROGRESS
// ---------------------------------------------------------------------------

async function updateProgress({ id, progressPercentage, budgetSpent, outcomeMetrics, notes, user }) {
    const hasAccess = await canExecute(user, id);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to update progress for this implementation");
    }

    if (progressPercentage === undefined || progressPercentage === null) {
        throw new ValidationError('"progress_percentage" is required');
    }

    if (typeof progressPercentage === "boolean") {
        throw new ValidationError('"progress_percentage" must be an integer between 0 and 100');
    }

    const progressNum = Number(progressPercentage);
    if (!Number.isInteger(progressNum) || progressNum < 0 || progressNum > 100) {
        throw new ValidationError('"progress_percentage" must be an integer between 0 and 100');
    }

    let budgetVal = null;
    if (budgetSpent !== undefined && budgetSpent !== null) {
        budgetVal = Number(budgetSpent);
        if (isNaN(budgetVal) || budgetVal < 0) {
            throw new ValidationError('"budget_spent" must be a non-negative number');
        }
    }

    let metricsJson = null;
    if (outcomeMetrics !== undefined && outcomeMetrics !== null) {
        if (typeof outcomeMetrics !== "object" || Array.isArray(outcomeMetrics)) {
            throw new ValidationError('"outcome_metrics" must be a valid JSON object');
        }
        metricsJson = JSON.stringify(outcomeMetrics);
    }

    await pool.query(
        `UPDATE solution_implementations
         SET progress_percentage = $1,
             budget_spent = COALESCE($2, budget_spent),
             outcome_metrics = COALESCE($3::jsonb, outcome_metrics),
             actual_start_date = COALESCE(actual_start_date, CURRENT_DATE),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [progressNum, budgetVal, metricsJson, id]
    );

    // Create activity update record
    const updateContent = notes && notes.trim()
        ? notes.trim()
        : `Progress updated to ${progressNum}%`;

    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content, progress_snapshot)
         VALUES ($1, $2, 'PROGRESS_NOTE', $3, $4)`,
        [id, user.id, updateContent, progressNum]
    );

    return getImplementationById(id);
}

// ---------------------------------------------------------------------------
// 7. MILESTONES
// ---------------------------------------------------------------------------

async function addMilestone({ implementationId, user, payload }) {
    const hasAccess = await canExecute(user, implementationId);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to add milestones");
    }

    if (!payload || !payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
        throw new ValidationError('"title" is required');
    }

    const weight = payload.weight !== undefined && payload.weight !== null ? Number(payload.weight) : 1;
    if (!Number.isInteger(weight) || weight < 1) {
        throw new ValidationError('"weight" must be an integer >= 1');
    }

    let status = "PENDING";
    if (payload.status) {
        const s = String(payload.status).trim().toUpperCase();
        if (!VALID_MILESTONE_STATUSES.includes(s)) {
            throw new ValidationError(`"status" must be one of: ${VALID_MILESTONE_STATUSES.join(", ")}`);
        }
        status = s;
    }

    const completionDate = status === "COMPLETED" ? new Date() : null;

    const res = await pool.query(
        `INSERT INTO implementation_milestones
            (implementation_id, title, description, target_date, completion_date, status, weight)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            implementationId,
            payload.title.trim(),
            payload.description ? payload.description.trim() : null,
            payload.target_date || null,
            completionDate,
            status,
            weight,
        ]
    );

    // Activity log
    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content)
         VALUES ($1, $2, 'PROGRESS_NOTE', $3)`,
        [implementationId, user.id, `New milestone added: "${payload.title.trim()}"`]
    );

    return res.rows[0];
}

async function updateMilestone({ implementationId, milestoneId, user, payload }) {
    const hasAccess = await canExecute(user, implementationId);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to update milestones");
    }

    const mRes = await pool.query(
        `SELECT * FROM implementation_milestones WHERE id = $1 AND implementation_id = $2`,
        [milestoneId, implementationId]
    );

    if (mRes.rows.length === 0) {
        throw new NotFoundError("Milestone not found");
    }

    let newStatus = mRes.rows[0].status;
    let completionDate = mRes.rows[0].completion_date;

    if (payload.status) {
        const s = String(payload.status).trim().toUpperCase();
        if (!VALID_MILESTONE_STATUSES.includes(s)) {
            throw new ValidationError(`"status" must be one of: ${VALID_MILESTONE_STATUSES.join(", ")}`);
        }
        newStatus = s;
        if (newStatus === "COMPLETED" && !completionDate) {
            completionDate = new Date();
        } else if (newStatus !== "COMPLETED") {
            completionDate = null;
        }
    }

    const title = payload.title ? payload.title.trim() : mRes.rows[0].title;
    const description = payload.description !== undefined ? payload.description : mRes.rows[0].description;
    const weight = payload.weight !== undefined ? Number(payload.weight) : mRes.rows[0].weight;

    if (!Number.isInteger(weight) || weight < 1) {
        throw new ValidationError('"weight" must be an integer >= 1');
    }

    const updateRes = await pool.query(
        `UPDATE implementation_milestones
         SET title = $1, description = $2, status = $3, completion_date = $4, weight = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [title, description, newStatus, completionDate, weight, milestoneId]
    );

    if (newStatus === "COMPLETED" && mRes.rows[0].status !== "COMPLETED") {
        await pool.query(
            `INSERT INTO implementation_updates
                (implementation_id, user_id, update_type, content)
             VALUES ($1, $2, 'MILESTONE_REACHED', $3)`,
            [implementationId, user.id, `Milestone completed: "${title}"`]
        );

        // Non-blocking Module 14 Reputation Integration (Mandatory Fix 3)
        try {
            const { recordEvent } = require("./reputationService");
            await recordEvent({
                userId: user.id,
                contributionType: "MILESTONE_COMPLETED",
                sourceEntityType: "MILESTONE",
                sourceEntityId: milestoneId,
                actorId: user.id,
                description: `Completed milestone "${title}"`,
            });
        } catch (repErr) {
            console.error("Non-blocking reputation error on milestone complete:", repErr);
        }
    }

    return updateRes.rows[0];
}

// ---------------------------------------------------------------------------
// 8. UPDATES / ACTIVITY FEED
// ---------------------------------------------------------------------------

async function addUpdate({ implementationId, user, payload }) {
    const hasAccess = await canExecute(user, implementationId);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to post updates");
    }

    if (!payload || !payload.content || typeof payload.content !== "string" || !payload.content.trim()) {
        throw new ValidationError('"content" is required');
    }

    let updateType = "PROGRESS_NOTE";
    if (payload.update_type) {
        const t = String(payload.update_type).trim().toUpperCase();
        if (!VALID_UPDATE_TYPES.includes(t)) {
            throw new ValidationError(`"update_type" must be one of: ${VALID_UPDATE_TYPES.join(", ")}`);
        }
        updateType = t;
    }

    const res = await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content, progress_snapshot)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [implementationId, user.id, updateType, payload.content.trim(), payload.progress_snapshot || null]
    );

    return {
        ...res.rows[0],
        author: { id: user.id, name: user.name, role: user.role },
    };
}

async function getUpdates(implementationId) {
    const implCheck = await pool.query(`SELECT id FROM solution_implementations WHERE id = $1`, [implementationId]);
    if (implCheck.rows.length === 0) {
        throw new NotFoundError("Implementation project not found");
    }

    const res = await pool.query(
        `SELECT iu.*, u.name AS author_name, u.role AS author_role
         FROM implementation_updates iu
         JOIN users u ON u.id = iu.user_id
         WHERE iu.implementation_id = $1
         ORDER BY iu.created_at ASC`,
        [implementationId]
    );

    return res.rows.map((row) => ({
        id: row.id,
        implementation_id: row.implementation_id,
        update_type: row.update_type,
        content: row.content,
        progress_snapshot: row.progress_snapshot,
        created_at: row.created_at,
        author: {
            id: row.user_id,
            name: row.author_name,
            role: row.author_role,
        },
    }));
}

// ---------------------------------------------------------------------------
// 9. EVIDENCE
// ---------------------------------------------------------------------------

async function addEvidence({ implementationId, user, payload }) {
    const hasAccess = await canExecute(user, implementationId);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to attach evidence");
    }

    if (!payload || !payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
        throw new ValidationError('"title" is required');
    }
    if (!payload.file_url || typeof payload.file_url !== "string" || !payload.file_url.trim()) {
        throw new ValidationError('"file_url" is required');
    }

    if (!payload.evidence_type) {
        throw new ValidationError('"evidence_type" is required');
    }

    const eType = String(payload.evidence_type).trim().toUpperCase();
    if (!VALID_EVIDENCE_TYPES.includes(eType)) {
        throw new ValidationError(`"evidence_type" must be one of: ${VALID_EVIDENCE_TYPES.join(", ")}`);
    }

    const res = await pool.query(
        `INSERT INTO verification_evidence
            (implementation_id, milestone_id, submitted_by, title, evidence_type, reference, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            implementationId,
            payload.milestone_id || null,
            user.id,
            payload.title.trim(),
            eType,
            payload.file_url.trim(),
            payload.description ? payload.description.trim() : null,
        ]
    );

    return {
        ...res.rows[0],
        file_url: res.rows[0].reference,
        uploaded_by: { id: user.id, name: user.name, role: user.role },
        submitted_by: { id: user.id, name: user.name, role: user.role },
    };
}

async function getEvidence(implementationId) {
    const implCheck = await pool.query(`SELECT id FROM solution_implementations WHERE id = $1`, [implementationId]);
    if (implCheck.rows.length === 0) {
        throw new NotFoundError("Implementation project not found");
    }

    const res = await pool.query(
        `SELECT ie.*, u.name AS uploader_name, u.role AS uploader_role,
                v.name AS verifier_name, v.role AS verifier_role
         FROM verification_evidence ie
         JOIN users u ON u.id = ie.submitted_by
         LEFT JOIN users v ON v.id = ie.verified_by
         WHERE ie.implementation_id = $1
         ORDER BY ie.created_at DESC`,
        [implementationId]
    );

    return res.rows.map((row) => ({
        id: row.id,
        implementation_id: row.implementation_id,
        milestone_id: row.milestone_id,
        title: row.title,
        evidence_type: row.evidence_type,
        file_url: row.reference,
        reference: row.reference,
        description: row.description,
        created_at: row.created_at,
        verification_status: row.verification_status,
        reviewer_remarks: row.reviewer_remarks,
        verified_at: row.verified_at,
        uploaded_by: {
            id: row.submitted_by,
            name: row.uploader_name,
            role: row.uploader_role,
        },
        submitted_by: {
            id: row.submitted_by,
            name: row.uploader_name,
            role: row.uploader_role,
        },
        verified_by: row.verified_by ? {
            id: row.verified_by,
            name: row.verifier_name,
            role: row.verifier_role,
        } : null,
    }));
}

// ---------------------------------------------------------------------------
// 9.5 VERIFY EVIDENCE (M13)
// ---------------------------------------------------------------------------
async function verifyEvidence({ implementationId, evidenceId, user, status, remarks }) {
    if (!["VERIFIED", "REJECTED"].includes(status)) {
        throw new ValidationError("Status must be VERIFIED or REJECTED");
    }

    if (user.role !== "AUTHORITY" && user.role !== "ADMIN") {
        throw new ForbiddenError("Only authorities can verify evidence.");
    }

    const check = await pool.query(
        `SELECT id, submitted_by, verification_status 
         FROM verification_evidence 
         WHERE id = $1 AND implementation_id = $2`,
        [evidenceId, implementationId]
    );

    if (check.rows.length === 0) {
        throw new NotFoundError("Evidence not found");
    }
    const evRes = check;
    const evidence = evRes.rows[0];

    // M16: Anti-Gaming check for self-verification
    if (Number(evidence.submitted_by) === Number(user.id)) {
        await trustService.logTrustEvent(user.id, 'SELF_ACTION_ATTEMPT', 'IMPLEMENTATION_EVIDENCE', evidenceId, 'HIGH', 'Attempted to verify own evidence');
        trustService.preventSelfAction(evidence.submitted_by, user.id, 'verify');
    }

    if (evidence.verification_status !== "PENDING") {
        throw new ValidationError(`Evidence is already ${evidence.verification_status}`);
    }

    const res = await pool.query(
        `UPDATE verification_evidence
         SET verification_status = $1,
             verified_by = $2,
             reviewer_remarks = $3,
             verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, user.id, remarks || null, evidenceId]
    );

    // Notify submitter
    await notify({
        userId: evidence.submitted_by,
        type: "EVIDENCE_REVIEWED",
        priority: "HIGH",
        title: `Evidence ${status}`,
        message: `Your submitted evidence has been ${status.toLowerCase()} by an authority.`,
        actionUrl: `/implementations/${implementationId}`,
    });

    return res.rows[0];
}

// ---------------------------------------------------------------------------
// 10. BLOCKERS
// ---------------------------------------------------------------------------

async function raiseBlocker({ implementationId, user, payload }) {
    const hasAccess = await canExecute(user, implementationId);
    if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to raise blockers");
    }

    if (!payload || !payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
        throw new ValidationError('"title" is required');
    }
    if (!payload.description || typeof payload.description !== "string" || !payload.description.trim()) {
        throw new ValidationError('"description" is required');
    }

    let severity = "MEDIUM";
    if (payload.severity) {
        const s = String(payload.severity).trim().toUpperCase();
        if (!VALID_BLOCKER_SEVERITIES.includes(s)) {
            throw new ValidationError(`"severity" must be one of: ${VALID_BLOCKER_SEVERITIES.join(", ")}`);
        }
        severity = s;
    }

    const res = await pool.query(
        `INSERT INTO implementation_blockers
            (implementation_id, raised_by, title, description, severity, status)
         VALUES ($1, $2, $3, $4, $5, 'OPEN')
         RETURNING *`,
        [implementationId, user.id, payload.title.trim(), payload.description.trim(), severity]
    );

    // If critical blocker raised, update implementation status to BLOCKED if currently active
    if (severity === "CRITICAL") {
        await pool.query(
            `UPDATE solution_implementations
             SET status = 'BLOCKED', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status IN ('PILOT', 'IMPLEMENTING')`,
            [implementationId]
        );
    }

    // Activity feed record
    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content)
         VALUES ($1, $2, 'BLOCKER_LOG', $3)`,
        [implementationId, user.id, `Blocker raised [${severity}]: "${payload.title.trim()}"`]
    );

    return {
        ...res.rows[0],
        raised_by: { id: user.id, name: user.name, role: user.role },
    };
}

async function resolveBlocker({ implementationId, blockerId, user, resolutionNotes }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can resolve blockers");
    }

    if (!resolutionNotes || typeof resolutionNotes !== "string" || !resolutionNotes.trim()) {
        throw new ValidationError('"resolution_notes" is required to resolve a blocker');
    }

    const bRes = await pool.query(
        `SELECT * FROM implementation_blockers WHERE id = $1 AND implementation_id = $2`,
        [blockerId, implementationId]
    );

    if (bRes.rows.length === 0) {
        throw new NotFoundError("Blocker not found");
    }

    const blocker = bRes.rows[0];

    const updateRes = await pool.query(
        `UPDATE implementation_blockers
         SET status = 'RESOLVED',
             resolution_notes = $1,
             resolved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [resolutionNotes.trim(), blockerId]
    );

    // If implementation was BLOCKED, check if any other critical blockers remain
    const remainingCritical = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM implementation_blockers
         WHERE implementation_id = $1 AND severity = 'CRITICAL' AND status != 'RESOLVED'`,
        [implementationId]
    );

    if (remainingCritical.rows[0].count === 0) {
        // Unblock implementation back to PILOT or IMPLEMENTING if it was BLOCKED
        await pool.query(
            `UPDATE solution_implementations
             SET status = 'PILOT', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'BLOCKED'`,
            [implementationId]
        );
    }

    // Activity feed record
    await pool.query(
        `INSERT INTO implementation_updates
            (implementation_id, user_id, update_type, content)
         VALUES ($1, $2, 'BLOCKER_LOG', $3)`,
        [implementationId, user.id, `Blocker resolved: "${blocker.title}"`]
    );

    return {
        ...updateRes.rows[0],
        resolved_by: { id: user.id, name: user.name, role: user.role },
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    IMPLEMENTATION_STATUS_FLOW,
    VALID_STATUSES,
    VALID_MILESTONE_STATUSES,
    VALID_EVIDENCE_TYPES,
    VALID_BLOCKER_SEVERITIES,
    VALID_UPDATE_TYPES,
    isAuthorityOrAdmin,
    canExecute,
    calculateMilestoneProgress,
    getBlockersSummary,
    initiateImplementation,
    getImplementationById,
    getImplementationBySolutionId,
    getImplementationsByProblemId,
    updateStatus,
    updateProgress,
    addMilestone,
    updateMilestone,
    addUpdate,
    getUpdates,
    addEvidence,
    getEvidence,
    verifyEvidence,
    raiseBlocker,
    resolveBlocker,
};
