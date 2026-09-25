/**
 * researcherMatchingController.js
 *
 * MODULE 5 — RESEARCHER MATCHING
 *
 * HTTP handler for GET /api/problems/:id/researcher-matches
 */

"use strict";

const {
    findResearcherMatches
} = require("../services/researcherMatchingService");

// Re-use parser from student matching service
const { parseIntParam } = require("../services/studentMatchingService");
const { parseProblemId } = require("../utils/validation");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/researcher-matches
// ---------------------------------------------------------------------------

async function getResearcherMatches(req, res) {
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
        const result = await findResearcherMatches(problemId, { limit });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches
        });

    } catch (error) {
        console.error("Researcher matching error:", error);

        res.status(500).json({
            message: "Failed to fetch researcher matches"
        });
    }
}

module.exports = {
    getResearcherMatches
};
