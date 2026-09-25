/**
 * innovationMatchingController.js
 *
 * MODULE 6 — STARTUP & MSME MATCHING
 *
 * HTTP handlers for:
 *   GET /api/problems/:id/startup-matches
 *   GET /api/problems/:id/msme-matches
 */

"use strict";

const {
    findInnovationMatches,
    parseIntParam,
} = require("../services/innovationMatchingService");
const { parseProblemId } = require("../utils/validation");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/startup-matches
// ---------------------------------------------------------------------------

async function getStartupMatches(req, res) {
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
        const result = await findInnovationMatches(problemId, {
            organizationType: "STARTUP",
            limit,
        });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches,
        });
    } catch (error) {
        console.error("Startup matching error:", error);
        res.status(500).json({ message: "Failed to fetch startup matches" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/problems/:id/msme-matches
// ---------------------------------------------------------------------------

async function getMsmMatches(req, res) {
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
        const result = await findInnovationMatches(problemId, {
            organizationType: "MSME",
            limit,
        });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches,
        });
    } catch (error) {
        console.error("MSME matching error:", error);
        res.status(500).json({ message: "Failed to fetch MSME matches" });
    }
}

module.exports = {
    getStartupMatches,
    getMsmMatches,
};
