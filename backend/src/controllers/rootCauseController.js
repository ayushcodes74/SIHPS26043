/**
 * rootCauseController.js
 *
 * MODULE 11 — ROOT CAUSE ANALYSIS CONTROLLER
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    analyzeRootCauses,
    createRootCause,
    getProblemRootCauses,
    getRootCauseById,
    updateRootCause,
    addEvidence,
    getRootCauseEvidence,
    verifyRootCause,
    getProblemRootCausesSummary,
} = require("../services/rootCauseService");

function handleError(error, res, fallbackMessage) {
    if (error instanceof ValidationError || error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
    }
    if (error instanceof ForbiddenError || error.name === "ForbiddenError") {
        return res.status(403).json({ message: error.message });
    }
    if (error instanceof NotFoundError || error.name === "NotFoundError") {
        return res.status(404).json({ message: error.message });
    }
    if (error instanceof ConflictError || error.name === "ConflictError") {
        return res.status(409).json({ message: error.message });
    }

    console.error(fallbackMessage, error);
    res.status(500).json({ message: fallbackMessage });
}

const { parseProblemId } = require("../utils/validation");

// POST /api/problems/:id/root-causes/analyze
async function analyzeRootCausesHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const rootCauses = await analyzeRootCauses(problemId, req.user);
        res.status(201).json({
            message: "Root causes analyzed successfully",
            problem_id: problemId,
            total_generated: rootCauses.length,
            root_causes: rootCauses,
        });
    } catch (err) {
        handleError(err, res, "Failed to analyze root causes");
    }
}

// POST /api/problems/:id/root-causes
async function createRootCauseHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const rootCause = await createRootCause({
            problemId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Root cause proposed successfully",
            root_cause: rootCause,
        });
    } catch (err) {
        handleError(err, res, "Failed to propose root cause");
    }
}

// GET /api/problems/:id/root-causes
async function getProblemRootCausesHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const rootCauses = await getProblemRootCauses(problemId);
        res.json({
            problem_id: problemId,
            total: rootCauses.length,
            root_causes: rootCauses,
        });
    } catch (err) {
        handleError(err, res, "Failed to fetch root causes");
    }
}

// GET /api/root-causes/:id
async function getRootCauseByIdHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid root cause id" });
    }

    try {
        const rootCause = await getRootCauseById(id);
        res.json({ root_cause: rootCause });
    } catch (err) {
        handleError(err, res, "Failed to fetch root cause");
    }
}

// PATCH /api/root-causes/:id
async function updateRootCauseHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid root cause id" });
    }

    try {
        const rootCause = await updateRootCause({
            id,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Root cause updated successfully",
            root_cause: rootCause,
        });
    } catch (err) {
        handleError(err, res, "Failed to update root cause");
    }
}

// POST /api/root-causes/:id/evidence
async function addEvidenceHandler(req, res) {
    const rootCauseId = parseInt(req.params.id, 10);
    if (isNaN(rootCauseId)) {
        return res.status(400).json({ message: "Invalid root cause id" });
    }

    try {
        const evidence = await addEvidence({
            rootCauseId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Evidence attached successfully",
            evidence,
        });
    } catch (err) {
        handleError(err, res, "Failed to attach evidence");
    }
}

// GET /api/root-causes/:id/evidence
async function getRootCauseEvidenceHandler(req, res) {
    const rootCauseId = parseInt(req.params.id, 10);
    if (isNaN(rootCauseId)) {
        return res.status(400).json({ message: "Invalid root cause id" });
    }

    try {
        const evidence = await getRootCauseEvidence(rootCauseId);
        res.json({
            root_cause_id: rootCauseId,
            total: evidence.length,
            evidence,
        });
    } catch (err) {
        handleError(err, res, "Failed to fetch evidence");
    }
}

// PATCH /api/root-causes/:id/verify
async function verifyRootCauseHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid root cause id" });
    }

    try {
        const rootCause = await verifyRootCause({
            id,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Root cause verification status updated successfully",
            root_cause: rootCause,
        });
    } catch (err) {
        handleError(err, res, "Failed to verify root cause");
    }
}

// GET /api/problems/:id/root-causes/summary
async function getProblemRootCausesSummaryHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const summary = await getProblemRootCausesSummary(problemId);
        res.json(summary);
    } catch (err) {
        handleError(err, res, "Failed to fetch root causes summary");
    }
}

module.exports = {
    analyzeRootCausesHandler,
    createRootCauseHandler,
    getProblemRootCausesHandler,
    getRootCauseByIdHandler,
    updateRootCauseHandler,
    addEvidenceHandler,
    getRootCauseEvidenceHandler,
    verifyRootCauseHandler,
    getProblemRootCausesSummaryHandler,
};
