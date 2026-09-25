/**
 * solutionEvaluationController.js
 *
 * MODULE 8 — SOLUTION EVALUATION & LIFECYCLE
 *
 * Handlers for:
 *   POST  /api/solutions/:id/evaluations
 *   GET   /api/solutions/:id/evaluations
 *   GET   /api/solutions/:id/evaluations/summary
 *   GET   /api/problems/:id/solutions/ranked
 *   PATCH /api/solutions/:id/status
 */

"use strict";

const {
    evaluateSolution,
    getSolutionEvaluations,
    getSolutionEvaluationSummary,
    getRankedSolutionsForProblem,
} = require("../services/solutionEvaluationService");

const {
    updateSolutionStatus,
} = require("../services/solutionStatusService");

/**
 * POST /api/solutions/:id/evaluations
 */
async function submitEvaluation(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const evaluation = await evaluateSolution({
            solutionId,
            evaluatorId: req.user.id,
            evaluatorRole: req.user.role,
            payload: req.body,
        });

        res.status(201).json({
            message: "Solution evaluated successfully",
            evaluation,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        if (error.name === "ForbiddenError") {
            return res.status(403).json({ message: error.message });
        }
        if (error.name === "NotFoundError") {
            return res.status(404).json({ message: error.message });
        }

        console.error("Submit evaluation error:", error);
        res.status(500).json({ message: "Failed to evaluate solution" });
    }
}

/**
 * GET /api/solutions/:id/evaluations
 */
async function getEvaluations(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const data = await getSolutionEvaluations(solutionId);
        res.json(data);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.status(404).json({ message: error.message });
        }

        console.error("Get evaluations error:", error);
        res.status(500).json({ message: "Failed to fetch evaluations" });
    }
}

/**
 * GET /api/solutions/:id/evaluations/summary
 */
async function getEvaluationSummary(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const summary = await getSolutionEvaluationSummary(solutionId);
        res.json(summary);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.status(404).json({ message: error.message });
        }

        console.error("Get evaluation summary error:", error);
        res.status(500).json({ message: "Failed to fetch evaluation summary" });
    }
}

const { parseProblemId } = require("../utils/validation");

/**
 * GET /api/problems/:id/solutions/ranked
 */
async function getRankedSolutions(req, res) {
    const rawId = req.params.id;
    const problemId = parseProblemId(rawId) || rawId;
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const data = await getRankedSolutionsForProblem(problemId);
        res.json(data);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.status(404).json({ message: error.message });
        }

        console.error("Get ranked solutions error:", error);
        res.status(500).json({ message: "Failed to fetch ranked solutions" });
    }
}

/**
 * PATCH /api/solutions/:id/status
 */
async function updateStatus(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const updated = await updateSolutionStatus({
            solutionId,
            newStatus: req.body?.status,
            user: req.user,
        });

        res.json({
            message: "Solution status updated successfully",
            solution: updated,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        if (error.name === "ForbiddenError") {
            return res.status(403).json({ message: error.message });
        }
        if (error.name === "NotFoundError") {
            return res.status(404).json({ message: error.message });
        }

        console.error("Update solution status error:", error);
        res.status(500).json({ message: "Failed to update solution status" });
    }
}

module.exports = {
    submitEvaluation,
    getEvaluations,
    getEvaluationSummary,
    getRankedSolutions,
    updateStatus,
};
