/**
 * clusteringController.js
 *
 * HTTP handlers for MODULE 2 — PROBLEM CLUSTERING.
 *
 * Handlers:
 *   getProblemCluster   — GET  /api/problems/:id/cluster
 *   triggerClustering   — POST /api/problems/:id/cluster
 *   getClusterById      — GET  /api/clusters/:id
 */

"use strict";

const pool = require("../config/db");

const {
    clusterProblem,
    getClusterForProblem,
    getClusterById: fetchClusterById
} = require("../services/clusteringService");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/cluster
// ---------------------------------------------------------------------------

const { parseProblemId } = require("../utils/validation");

async function getProblemCluster(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({
            message: "Invalid problem id"
        });
    }

    try {
        // Verify problem exists
        const problemResult = await pool.query(
            `SELECT id FROM problems WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const cluster = await getClusterForProblem(problemId);

        res.json({
            problem_id: problemId,
            cluster
        });

    } catch (error) {
        console.error("Cluster fetch error:", error);

        res.status(500).json({
            message: "Failed to fetch cluster"
        });
    }
}

// ---------------------------------------------------------------------------
// POST /api/problems/:id/cluster
// Manually trigger or re-run clustering for an existing problem.
// Available to AUTHORITY and ADMIN roles (and CITIZEN on their own problems
// if needed — but authority/admin is more appropriate for re-clustering).
// ---------------------------------------------------------------------------

async function triggerClustering(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({
            message: "Invalid problem id"
        });
    }

    try {
        // Verify problem exists
        const problemResult = await pool.query(
            `SELECT id FROM problems WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const result = await clusterProblem(problemId);

        res.json({
            problem_id: problemId,
            clustering: result
        });

    } catch (error) {
        console.error("Trigger clustering error:", error);

        res.status(500).json({
            message: "Failed to run clustering"
        });
    }
}

// ---------------------------------------------------------------------------
// GET /api/clusters/:id
// ---------------------------------------------------------------------------

async function getClusterDetail(req, res) {
    const clusterId = parseInt(req.params.id, 10);

    if (isNaN(clusterId)) {
        return res.status(400).json({
            message: "Invalid cluster id"
        });
    }

    try {
        const data = await fetchClusterById(clusterId);

        if (!data) {
            return res.status(404).json({
                message: "Cluster not found"
            });
        }

        res.json(data);

    } catch (error) {
        console.error("Cluster detail error:", error);

        res.status(500).json({
            message: "Failed to fetch cluster"
        });
    }
}

module.exports = {
    getProblemCluster,
    triggerClustering,
    getClusterDetail
};
