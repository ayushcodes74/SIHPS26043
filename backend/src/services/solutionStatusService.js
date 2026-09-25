/**
 * solutionStatusService.js
 *
 * MODULE 8 — SOLUTION EVALUATION & LIFECYCLE
 *
 * Dedicated status lifecycle service for solutions.
 * Governs allowed transitions:
 *
 *   SUBMITTED
 *       ↓
 *   UNDER_EVALUATION
 *       ↓
 *   EVALUATED
 *       ├── APPROVED
 *       └── REJECTED
 *             ↓ (future reconsideration)
 *
 *   APPROVED
 *       ↓
 *   PILOT
 */

"use strict";

const pool = require("../config/db");

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

/**
 * Valid solution status transitions map.
 */
const SOLUTION_STATUS_FLOW = {
    SUBMITTED: ["UNDER_EVALUATION", "EVALUATED", "APPROVED", "REJECTED"],
    UNDER_EVALUATION: ["EVALUATED", "APPROVED", "REJECTED", "SUBMITTED"],
    EVALUATED: ["APPROVED", "REJECTED", "UNDER_EVALUATION", "SUBMITTED"],
    APPROVED: ["EXECUTION_SUBMITTED", "COMPLETED", "CLOSED", "EVALUATED", "UNDER_EVALUATION", "SUBMITTED", "REJECTED"],
    EXECUTION_SUBMITTED: ["COMPLETED", "CLOSED", "APPROVED"],
    COMPLETED: ["CLOSED", "APPROVED"],
    CLOSED: [],
    REJECTED: ["UNDER_EVALUATION", "EVALUATED", "SUBMITTED", "APPROVED"],
};

/**
 * Roles permitted to modify solution status.
 */
const STATUS_UPDATE_ROLES = ["AUTHORITY", "ADMIN"];

/**
 * Check whether a status transition is permitted.
 */
function isValidSolutionTransition(currentStatus, newStatus) {
    if (!currentStatus || !newStatus) return false;
    return SOLUTION_STATUS_FLOW[currentStatus]?.includes(newStatus) || false;
}

/**
 * Update solution status with validation and role protection.
 *
 * @param {object} params
 * @param {number} params.solutionId
 * @param {string} params.newStatus
 * @param {object} params.user
 * @returns {Promise<object>}
 */
async function updateSolutionStatus({ solutionId, newStatus, user }) {
    if (!user || !STATUS_UPDATE_ROLES.includes(user.role)) {
        throw new ForbiddenError(
            "Only authorities and administrators can update solution status"
        );
    }

    if (!newStatus || typeof newStatus !== "string") {
        throw new ValidationError("Status must be a non-empty string");
    }

    const trimmedStatus = newStatus.trim().toUpperCase();

    // Check valid status value exists in the flow
    if (!Object.keys(SOLUTION_STATUS_FLOW).includes(trimmedStatus)) {
        throw new ValidationError(`Unknown solution status: "${newStatus}"`);
    }

    // Retrieve solution
    const solRes = await pool.query(
        `SELECT id, status, problem_id, submitted_by, title
         FROM solutions
         WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const currentStatus = solRes.rows[0].status;

    if (currentStatus === trimmedStatus) {
        // No-op or return current
        return solRes.rows[0];
    }

    if (!isValidSolutionTransition(currentStatus, trimmedStatus)) {
        throw new ValidationError(
            `Invalid status transition from "${currentStatus}" to "${trimmedStatus}"`
        );
    }

    const updateRes = await pool.query(
        `UPDATE solutions
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, problem_id, submitted_by, title, status, updated_at`,
        [trimmedStatus, solutionId]
    );

    // Synchronize parent problem status to APPROVED on solution approval
    if (trimmedStatus === "APPROVED") {
        try {
            const probId = solRes.rows[0].problem_id;
            await pool.query(
                `UPDATE problems
                 SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [probId]
            );

            await pool.query(
                `INSERT INTO problem_status_history
                 (problem_id, old_status, new_status, changed_by, note)
                 VALUES ($1, $2, 'APPROVED', $3, $4)`,
                [
                    probId,
                    "SOLUTION_EVALUATION",
                    user.id,
                    `Solution idea "${solRes.rows[0].title}" selected & approved by Authority. Handed over to Startups & MSMEs for pilot implementation.`
                ]
            );
        } catch (syncErr) {
            console.error("Parent problem status sync error on solution approval:", syncErr);
        }
    }

    // Synchronize parent problem status to CLOSED on solution closure
    if (trimmedStatus === "CLOSED") {
        try {
            const probId = solRes.rows[0].problem_id;
            await pool.query(
                `UPDATE problems
                 SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [probId]
            );

            await pool.query(
                `INSERT INTO problem_status_history
                 (problem_id, old_status, new_status, changed_by, note)
                 VALUES ($1, $2, 'CLOSED', $3, $4)`,
                [
                    probId,
                    "EXECUTION_SUBMITTED",
                    user.id,
                    `Problem officially verified, resolved, and closed by Municipal Authority following startup/MSME execution.`
                ]
            );
        } catch (syncErr) {
            console.error("Parent problem status sync error on solution closure:", syncErr);
        }
    }

    // Non-blocking Module 14 Reputation Integration (Mandatory Fix 3)
    if (trimmedStatus === "APPROVED") {
        try {
            const { recordEvent } = require("./reputationService");
            const evalRes = await pool.query(
                `SELECT composite_score FROM solution_evaluations WHERE solution_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [solutionId]
            );
            const evalScore = evalRes.rows.length > 0 ? Number(evalRes.rows[0].composite_score) : null;

            if (solRes.rows[0].submitted_by) {
                await recordEvent({
                    userId: solRes.rows[0].submitted_by,
                    contributionType: "SOLUTION_APPROVED",
                    sourceEntityType: "SOLUTION",
                    sourceEntityId: solutionId,
                    actorId: user.id,
                    description: `Solution "${solRes.rows[0].title}" approved`,
                    evaluationScore: evalScore,
                });
            }

            const contribRes = await pool.query(
                `SELECT user_id, contribution_role FROM solution_contributors WHERE solution_id = $1`,
                [solutionId]
            );
            for (const c of contribRes.rows) {
                await recordEvent({
                    userId: c.user_id,
                    contributionType: "SOLUTION_CONTRIBUTION_APPROVED",
                    sourceEntityType: "SOLUTION",
                    sourceEntityId: solutionId,
                    actorId: user.id,
                    description: `Contributor (${c.contribution_role}) on approved solution "${solRes.rows[0].title}"`,
                    evaluationScore: evalScore,
                });
            }
        } catch (repErr) {
            console.error("Non-blocking reputation error on solution approval:", repErr);
        }
    }

    return updateRes.rows[0];
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    SOLUTION_STATUS_FLOW,
    STATUS_UPDATE_ROLES,
    isValidSolutionTransition,
    updateSolutionStatus,
};
