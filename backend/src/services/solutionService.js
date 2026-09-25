/**
 * solutionService.js
 *
 * MODULE 7 — SOLUTION SUBMISSION
 *
 * PURPOSE:
 *   Handles submission, retrieval of solutions to problems.
 *
 * AUTHORIZED ROLES:
 *   UNIVERSITY, STUDENT, RESEARCHER, STARTUP, MSME
 *
 * VALIDATION:
 *   - Problem must exist
 *   - Title and description are required
 *   - Input lengths must be reasonable
 *   - New solutions always start with SUBMITTED status
 *   - Clients cannot arbitrarily set approved/resolved/pilot status
 */

"use strict";

const pool = require("../config/db");

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * Allowed roles for solution submission.
 */
const SUBMISSION_ROLES = [
    "UNIVERSITY",
    "STUDENT",
    "RESEARCHER",
    "STARTUP",
    "MSME",
];

/**
 * Maximum allowed input lengths.
 */
const MAX_LENGTHS = {
    title: 500,
    description: 10000,
    methodology: 5000,
    technology: 2000,
    expected_impact: 5000,
    implementation_time: 200,
    scalability: 3000,
    required_resources: 5000,
    risks: 5000,
    evidence: 5000,
};

/**
 * Format solution row to ensure numeric types and clean representation.
 */
function formatSolution(row) {
    if (!row) return null;
    let images = Array.isArray(row.images) ? row.images : [];
    let videos = Array.isArray(row.videos) ? row.videos : [];

    if (typeof row.evidence === "string" && row.evidence.startsWith("{")) {
        try {
            const parsed = JSON.parse(row.evidence);
            if (Array.isArray(parsed.images)) images = parsed.images;
            if (Array.isArray(parsed.videos)) videos = parsed.videos;
        } catch {
            // fallback
        }
    }

    return {
        ...row,
        images: images.slice(0, 5),
        videos: videos.slice(0, 2),
        estimated_cost:
            row.estimated_cost !== null && row.estimated_cost !== undefined
                ? Number(row.estimated_cost)
                : null,
    };
}

/**
 * Validate a solution submission payload.
 * Returns an array of error messages (empty if valid).
 */
function validateSolution(payload) {
    const errors = [];

    if (!payload || typeof payload !== "object") {
        errors.push("Payload must be an object");
        return errors;
    }

    if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length === 0) {
        errors.push("Title is required");
    }

    if (!payload.description || typeof payload.description !== "string" || payload.description.trim().length === 0) {
        errors.push("Description is required");
    }

    // Validate lengths and types of string fields
    for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
        if (payload[field] !== undefined && payload[field] !== null) {
            if (typeof payload[field] !== "string") {
                errors.push(`${field} must be a string`);
            } else if (payload[field].length > maxLen) {
                errors.push(`${field} must not exceed ${maxLen} characters`);
            }
        }
    }

    // Validate estimated_cost
    if (payload.estimated_cost !== undefined && payload.estimated_cost !== null) {
        if (
            typeof payload.estimated_cost === "boolean" ||
            (typeof payload.estimated_cost === "string" && payload.estimated_cost.trim() === "")
        ) {
            errors.push("estimated_cost must be a non-negative number");
        } else {
            const cost = Number(payload.estimated_cost);
            if (isNaN(cost) || !isFinite(cost) || cost < 0) {
                errors.push("estimated_cost must be a non-negative number");
            }
        }
    }

    return errors;
}

/**
 * Check if a user's role is authorized to submit solutions.
 */
function isAuthorizedRole(role) {
    return SUBMISSION_ROLES.includes(role);
}

/**
 * Submit a new solution to a problem.
 *
 * @param {object} params
 * @param {number} params.problemId
 * @param {number} params.userId
 * @param {object} params.payload - solution fields
 * @returns {Promise<object|null>} - created solution or null if problem not found
 * @throws {ValidationError} if validation fails
 */
async function submitSolution({ problemId, userId, payload }) {
    // 1. Validate payload
    const errors = validateSolution(payload);
    if (errors.length > 0) {
        throw new ValidationError(errors.join("; "));
    }

    // 2. Check problem exists
    const problemCheck = await pool.query(
        `SELECT id FROM problems WHERE id = $1`,
        [problemId]
    );

    if (problemCheck.rows.length === 0) {
        return null;
    }

    // 3. Optional team_id — validate and link if present
    let teamId = null;
    if (payload.team_id !== undefined && payload.team_id !== null && payload.team_id !== "") {
        teamId = parseInt(payload.team_id, 10);
        if (isNaN(teamId)) {
            throw new ValidationError('"team_id" must be a valid integer');
        }
        const teamCheck = await pool.query(
            "SELECT id FROM collaboration_teams WHERE id = $1",
            [teamId]
        );
        if (teamCheck.rows.length === 0) {
            throw new ValidationError("Team not found");
        }
    }

    // 4. Serialize images and videos into evidence JSON if present
    let finalEvidence = payload.evidence ? payload.evidence.trim() : null;
    const images = Array.isArray(payload.images) ? payload.images.slice(0, 5) : [];
    const videos = Array.isArray(payload.videos) ? payload.videos.slice(0, 2) : [];

    if (images.length > 0 || videos.length > 0) {
        finalEvidence = JSON.stringify({
            documentUrl: finalEvidence,
            images,
            videos,
        });
    }

    // 5. Insert solution with SUBMITTED status (never allow client to set status)
    const result = await pool.query(
        `INSERT INTO solutions
            (problem_id, submitted_by, title, description,
             methodology, technology, expected_impact,
             estimated_cost, implementation_time, scalability,
             required_resources, risks, evidence,
             status, team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SUBMITTED', $14)
         RETURNING id, problem_id, submitted_by, title, description,
                   methodology, technology, expected_impact,
                   estimated_cost, implementation_time, scalability,
                   required_resources, risks, evidence,
                   status, team_id, created_at, updated_at`,
        [
            problemId,
            userId,
            payload.title.trim(),
            payload.description.trim(),
            payload.methodology ? payload.methodology.trim() : null,
            payload.technology ? payload.technology.trim() : null,
            payload.expected_impact ? payload.expected_impact.trim() : null,
            payload.estimated_cost !== undefined && payload.estimated_cost !== null && payload.estimated_cost !== ""
                ? Number(payload.estimated_cost)
                : null,
            payload.implementation_time ? payload.implementation_time.trim() : null,
            payload.scalability ? payload.scalability.trim() : null,
            payload.required_resources ? payload.required_resources.trim() : null,
            payload.risks ? payload.risks.trim() : null,
            finalEvidence,
            teamId,
        ]
    );

    return formatSolution(result.rows[0]);
}

/**
 * Get all solutions for a problem.
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ solutions: object[], total: number } | null>}
 */
async function getSolutionsForProblem(problemId, options = {}) {
    const { limit = 10 } = options;

    // Check problem exists
    const problemCheck = await pool.query(
        `SELECT id FROM problems WHERE id = $1`,
        [problemId]
    );

    if (problemCheck.rows.length === 0) {
        return null;
    }

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM solutions WHERE problem_id = $1`,
        [problemId]
    );

    const result = await pool.query(
        `SELECT s.id, s.problem_id, s.submitted_by, s.title, s.description,
                s.methodology, s.technology, s.expected_impact,
                s.estimated_cost, s.implementation_time, s.scalability,
                s.required_resources, s.risks, s.evidence,
                s.status, s.created_at, s.updated_at,
                u.name AS submitter_name, u.role AS submitter_role
         FROM solutions s
         JOIN users u ON u.id = s.submitted_by
         WHERE s.problem_id = $1
         ORDER BY s.created_at DESC
         LIMIT $2`,
        [problemId, limit]
    );

    return {
        solutions: (result?.rows || []).map(formatSolution),
        total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total, 10) : (result?.rows?.length || 0),
    };
}

/**
 * Get a single solution by ID.
 *
 * @param {number} solutionId
 * @returns {Promise<object|null>}
 */
async function getSolutionById(solutionId) {
    const result = await pool.query(
        `SELECT s.id, s.problem_id, s.submitted_by, s.title, s.description,
                s.methodology, s.technology, s.expected_impact,
                s.estimated_cost, s.implementation_time, s.scalability,
                s.required_resources, s.risks, s.evidence,
                s.status, s.created_at, s.updated_at,
                u.name AS submitter_name, u.role AS submitter_role
         FROM solutions s
         JOIN users u ON u.id = s.submitted_by
         WHERE s.id = $1`,
        [solutionId]
    );

    return result.rows.length > 0 ? formatSolution(result.rows[0]) : null;
}

module.exports = {
    ValidationError,
    SUBMISSION_ROLES,
    MAX_LENGTHS,
    validateSolution,
    isAuthorizedRole,
    formatSolution,
    submitSolution,
    getSolutionsForProblem,
    getSolutionById,
};
