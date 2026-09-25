/**
 * solutionController.js
 *
 * MODULE 7 — SOLUTION SUBMISSION
 *
 * HTTP handlers for:
 *   POST /api/problems/:id/solutions
 *   GET  /api/problems/:id/solutions
 *   GET  /api/solutions/:id
 */

"use strict";

const {
    ValidationError,
    isAuthorizedRole,
    submitSolution,
    getSolutionsForProblem,
    getSolutionById,
} = require("../services/solutionService");

/**
 * Parse and validate an integer parameter.
 */
function parseIntParam(value, name, min, max) {
    if (value === undefined || value === null || value === "") return null;
    const n = parseInt(value, 10);
    if (isNaN(n) || String(n) !== String(value).trim()) {
        throw new ValidationError(`"${name}" must be a valid integer`);
    }
    if (n < min || n > max) {
        throw new ValidationError(`"${name}" must be between ${min} and ${max}`);
    }
    return n;
}

const { parseProblemId } = require("../utils/validation");

// ---------------------------------------------------------------------------
// POST /api/problems/:id/solutions
// ---------------------------------------------------------------------------

async function createSolution(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    // Check authorized role
    if (!isAuthorizedRole(req.user.role)) {
        return res.status(403).json({
            message: "You do not have permission to submit solutions"
        });
    }

    try {
        const solution = await submitSolution({
            problemId,
            userId: req.user.id,
            payload: req.body,
        });

        if (solution === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.status(201).json({
            message: "Solution submitted successfully",
            solution,
        });
    } catch (error) {
        if (error.name === "ValidationError" || error instanceof ValidationError) {
            return res.status(400).json({ message: error.message });
        }

        console.error("Solution submission error:", error);
        res.status(500).json({ message: "Failed to submit solution" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/problems/:id/solutions
// ---------------------------------------------------------------------------

async function getSolutions(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    let limit;

    try {
        limit = parseIntParam(req.query.limit, "limit", 1, 50) ?? 10;
    } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
    }

    try {
        const result = await getSolutionsForProblem(problemId, { limit });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            total: result.total,
            solutions: result.solutions,
        });
    } catch (error) {
        console.error("Get solutions error:", error);
        res.status(500).json({ message: "Failed to fetch solutions" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/solutions/:id
// ---------------------------------------------------------------------------

async function getSolution(req, res) {
    const solutionId = parseInt(req.params.id, 10);

    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const solution = await getSolutionById(solutionId);

        if (!solution) {
            return res.status(404).json({ message: "Solution not found" });
        }

        res.json({ solution });
    } catch (error) {
        console.error("Get solution error:", error);
        res.status(500).json({ message: "Failed to fetch solution" });
    }
}

module.exports = {
    createSolution,
    getSolutions,
    getSolution,
};
