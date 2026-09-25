/**
 * facultyMatchingController.js
 *
 * MODULE 4 — FACULTY-LEVEL EXPERTISE MATCHING
 *
 * HTTP handler for GET /api/problems/:id/faculty-matches
 */

"use strict";

const {
    findFacultyMatches,
    parseIntParam
} = require("../services/facultyMatchingService");

const { parseProblemId } = require("../utils/validation");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/faculty-matches
// ---------------------------------------------------------------------------

async function getFacultyMatches(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    // Validate optional query parameters
    let institution_id, department_id, limit;

    try {
        institution_id = parseIntParam(
            req.query.institution_id, "institution_id", 1, 2147483647
        );
        department_id = parseIntParam(
            req.query.department_id, "department_id", 1, 2147483647
        );
        limit = parseIntParam(req.query.limit, "limit", 1, 50) ?? 10;
    } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
    }

    try {
        const result = await findFacultyMatches(problemId, {
            institution_id,
            department_id,
            limit
        });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches
        });

    } catch (error) {
        console.error("Faculty matching error:", error);

        res.status(500).json({
            message: "Failed to fetch faculty matches"
        });
    }
}

module.exports = {
    getFacultyMatches
};
