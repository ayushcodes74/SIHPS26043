/**
 * dependencyController.js
 *
 * MODULE 12 — PROBLEM DEPENDENCY MAPPING CONTROLLER
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    detectDependencies,
    createDependency,
    getProblemDependencies,
    getDependencyById,
    updateDependency,
    deleteDependency,
    verifyDependency,
    getDependencyGraph,
    getImpactChain,
    getCriticalPaths,
} = require("../services/dependencyService");

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
        return res.status(409).json({ message: error.message, ...(error.details || {}) });
    }

    console.error(fallbackMessage, error);
    res.status(500).json({ message: fallbackMessage });
}

const { parseProblemId } = require("../utils/validation");

// POST /api/problems/:id/dependencies/detect
async function detectDependenciesHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const detected = await detectDependencies(problemId, req.user);
        res.status(201).json({
            message: "Dependencies detected successfully",
            problem_id: problemId,
            total_detected: detected.length,
            dependencies: detected,
        });
    } catch (err) {
        handleError(err, res, "Failed to detect dependencies");
    }
}

// POST /api/problems/:id/dependencies
async function createDependencyHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const dependency = await createDependency({
            problemId,
            user: req.user,
            payload: req.body,
        });
        res.status(201).json({
            message: "Dependency proposed successfully",
            dependency,
        });
    } catch (err) {
        handleError(err, res, "Failed to create dependency");
    }
}

// GET /api/problems/:id/dependencies
async function getProblemDependenciesHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const data = await getProblemDependencies(problemId);
        res.status(200).json(data);
    } catch (err) {
        handleError(err, res, "Failed to fetch problem dependencies");
    }
}

// GET /api/dependencies/:id
async function getDependencyByIdHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dependency id" });
    }

    try {
        const dependency = await getDependencyById(id);
        res.status(200).json({ dependency });
    } catch (err) {
        handleError(err, res, "Failed to fetch dependency");
    }
}

// PATCH /api/dependencies/:id
async function updateDependencyHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dependency id" });
    }

    try {
        const dependency = await updateDependency({
            id,
            user: req.user,
            payload: req.body,
        });
        res.status(200).json({
            message: "Dependency updated successfully",
            dependency,
        });
    } catch (err) {
        handleError(err, res, "Failed to update dependency");
    }
}

// DELETE /api/dependencies/:id
async function deleteDependencyHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dependency id" });
    }

    try {
        const result = await deleteDependency({ id, user: req.user });
        res.status(200).json(result);
    } catch (err) {
        handleError(err, res, "Failed to delete dependency");
    }
}

// PATCH /api/dependencies/:id/verify
async function verifyDependencyHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dependency id" });
    }

    try {
        const dependency = await verifyDependency({
            id,
            user: req.user,
            payload: req.body,
        });
        res.status(200).json({
            message: "Dependency verification status updated successfully",
            dependency,
        });
    } catch (err) {
        handleError(err, res, "Failed to update verification status");
    }
}

// GET /api/problems/:id/dependency-graph
async function getDependencyGraphHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }
    const depth = parseInt(req.query.depth, 10) || 2;

    try {
        const graph = await getDependencyGraph(problemId, depth);
        res.status(200).json(graph);
    } catch (err) {
        handleError(err, res, "Failed to fetch dependency graph");
    }
}

// GET /api/problems/:id/impact-chain
async function getImpactChainHandler(req, res) {
    const problemId = parseProblemId(req.params.id);
    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const chain = await getImpactChain(problemId);
        res.status(200).json(chain);
    } catch (err) {
        handleError(err, res, "Failed to calculate impact chain");
    }
}

// GET /api/dependencies/critical-paths
async function getCriticalPathsHandler(req, res) {
    const district = req.query.district;

    try {
        const paths = await getCriticalPaths(district);
        res.status(200).json(paths);
    } catch (err) {
        handleError(err, res, "Failed to fetch critical paths");
    }
}

module.exports = {
    detectDependenciesHandler,
    createDependencyHandler,
    getProblemDependenciesHandler,
    getDependencyByIdHandler,
    updateDependencyHandler,
    deleteDependencyHandler,
    verifyDependencyHandler,
    getDependencyGraphHandler,
    getImpactChainHandler,
    getCriticalPathsHandler,
};
