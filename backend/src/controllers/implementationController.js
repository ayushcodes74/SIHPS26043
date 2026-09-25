/**
 * implementationController.js
 *
 * MODULE 9 — IMPLEMENTATION + PILOT TRACKING
 *
 * HTTP Handlers for:
 *   POST  /api/solutions/:id/implementations
 *   GET   /api/implementations/:id
 *   GET   /api/solutions/:id/implementation
 *   GET   /api/problems/:id/implementations
 *   PATCH /api/implementations/:id/status
 *   PATCH /api/implementations/:id/progress
 *   POST  /api/implementations/:id/milestones
 *   PATCH /api/implementations/:id/milestones/:mId
 *   POST  /api/implementations/:id/updates
 *   GET   /api/implementations/:id/updates
 *   POST  /api/implementations/:id/evidence
 *   GET   /api/implementations/:id/evidence
 *   POST  /api/implementations/:id/blockers
 *   PATCH /api/implementations/:id/blockers/:bId/resolve
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
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
} = require("../services/implementationService");

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

// ---------------------------------------------------------------------------
// POST /api/solutions/:id/implementations
// ---------------------------------------------------------------------------
async function createImplementation(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const implementation = await initiateImplementation({
            solutionId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Pilot implementation initiated successfully",
            implementation,
        });
    } catch (err) {
        handleError(err, res, "Failed to initiate implementation");
    }
}

// ---------------------------------------------------------------------------
// GET /api/implementations/:id
// ---------------------------------------------------------------------------
async function getImplementation(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const implementation = await getImplementationById(id);
        res.json({ implementation });
    } catch (err) {
        handleError(err, res, "Failed to fetch implementation");
    }
}

// ---------------------------------------------------------------------------
// GET /api/solutions/:id/implementation
// ---------------------------------------------------------------------------
async function getSolutionImplementation(req, res) {
    const solutionId = parseInt(req.params.id, 10);
    if (isNaN(solutionId)) {
        return res.status(400).json({ message: "Invalid solution id" });
    }

    try {
        const implementation = await getImplementationBySolutionId(solutionId);
        res.json({ implementation });
    } catch (err) {
        handleError(err, res, "Failed to fetch solution implementation");
    }
}

const { parseProblemId } = require("../utils/validation");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/implementations
// ---------------------------------------------------------------------------
async function getProblemImplementations(req, res) {
    const rawId = req.params.id;
    const problemId = parseProblemId(rawId) || rawId;
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const result = await getImplementationsByProblemId(problemId);
        res.json(result);
    } catch (err) {
        handleError(err, res, "Failed to fetch problem implementations");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/implementations/:id/status
// ---------------------------------------------------------------------------
async function updateStatusHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const updated = await updateStatus({
            id,
            newStatus: req.body?.status,
            user: req.user,
        });

        res.json({
            message: "Implementation status updated successfully",
            implementation: updated,
        });
    } catch (err) {
        handleError(err, res, "Failed to update implementation status");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/implementations/:id/progress
// ---------------------------------------------------------------------------
async function updateProgressHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const updated = await updateProgress({
            id,
            progressPercentage: req.body?.progress_percentage,
            budgetSpent: req.body?.budget_spent,
            outcomeMetrics: req.body?.outcome_metrics,
            notes: req.body?.notes,
            user: req.user,
        });

        res.json({
            message: "Progress updated successfully",
            implementation: updated,
        });
    } catch (err) {
        handleError(err, res, "Failed to update progress");
    }
}

// ---------------------------------------------------------------------------
// POST /api/implementations/:id/milestones
// ---------------------------------------------------------------------------
async function addMilestoneHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const milestone = await addMilestone({
            implementationId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Milestone added successfully",
            milestone,
        });
    } catch (err) {
        handleError(err, res, "Failed to add milestone");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/implementations/:id/milestones/:mId
// ---------------------------------------------------------------------------
async function updateMilestoneHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    const milestoneId = parseInt(req.params.mId, 10);

    if (isNaN(implementationId) || isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid implementation or milestone id" });
    }

    try {
        const milestone = await updateMilestone({
            implementationId,
            milestoneId,
            user: req.user,
            payload: req.body,
        });

        res.json({
            message: "Milestone updated successfully",
            milestone,
        });
    } catch (err) {
        handleError(err, res, "Failed to update milestone");
    }
}

// ---------------------------------------------------------------------------
// POST /api/implementations/:id/updates
// ---------------------------------------------------------------------------
async function addUpdateHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const update = await addUpdate({
            implementationId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Update recorded successfully",
            update,
        });
    } catch (err) {
        handleError(err, res, "Failed to record update");
    }
}

// ---------------------------------------------------------------------------
// GET /api/implementations/:id/updates
// ---------------------------------------------------------------------------
async function getUpdatesHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const updates = await getUpdates(implementationId);
        res.json({ implementation_id: implementationId, total: updates.length, updates });
    } catch (err) {
        handleError(err, res, "Failed to fetch updates");
    }
}

// ---------------------------------------------------------------------------
// POST /api/implementations/:id/evidence
// ---------------------------------------------------------------------------
async function addEvidenceHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const evidence = await addEvidence({
            implementationId,
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

// ---------------------------------------------------------------------------
// GET /api/implementations/:id/evidence
// ---------------------------------------------------------------------------
async function getEvidenceHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const evidence = await getEvidence(implementationId);
        res.json({ implementation_id: implementationId, total: evidence.length, evidence });
    } catch (err) {
        handleError(err, res, "Failed to fetch evidence");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/implementations/:id/evidence/:evidenceId/verify
// ---------------------------------------------------------------------------
async function verifyEvidenceHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);
    
    if (isNaN(implementationId) || isNaN(evidenceId)) {
        return res.status(400).json({ message: "Invalid implementation or evidence id" });
    }

    try {
        const evidence = await verifyEvidence({
            implementationId,
            evidenceId,
            user: req.user,
            status: req.body?.status,
            remarks: req.body?.remarks,
        });

        res.json({
            message: `Evidence ${req.body?.status} successfully`,
            evidence,
        });
    } catch (err) {
        handleError(err, res, "Failed to verify evidence");
    }
}

// ---------------------------------------------------------------------------
// POST /api/implementations/:id/blockers
// ---------------------------------------------------------------------------
async function raiseBlockerHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    if (isNaN(implementationId)) {
        return res.status(400).json({ message: "Invalid implementation id" });
    }

    try {
        const blocker = await raiseBlocker({
            implementationId,
            user: req.user,
            payload: req.body,
        });

        res.status(201).json({
            message: "Blocker raised successfully",
            blocker,
        });
    } catch (err) {
        handleError(err, res, "Failed to raise blocker");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/implementations/:id/blockers/:bId/resolve
// ---------------------------------------------------------------------------
async function resolveBlockerHandler(req, res) {
    const implementationId = parseInt(req.params.id, 10);
    const blockerId = parseInt(req.params.bId, 10);

    if (isNaN(implementationId) || isNaN(blockerId)) {
        return res.status(400).json({ message: "Invalid implementation or blocker id" });
    }

    try {
        const blocker = await resolveBlocker({
            implementationId,
            blockerId,
            user: req.user,
            resolutionNotes: req.body?.resolution_notes,
        });

        res.json({
            message: "Blocker resolved successfully",
            blocker,
        });
    } catch (err) {
        handleError(err, res, "Failed to resolve blocker");
    }
}

module.exports = {
    createImplementation,
    getImplementation,
    getSolutionImplementation,
    getProblemImplementations,
    updateStatusHandler,
    updateProgressHandler,
    addMilestoneHandler,
    updateMilestoneHandler,
    addUpdateHandler,
    getUpdatesHandler,
    addEvidenceHandler,
    getEvidenceHandler,
    verifyEvidenceHandler,
    raiseBlockerHandler,
    resolveBlockerHandler,
};
