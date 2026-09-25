/**
 * studentMatchingController.js
 *
 * MODULE 5 — STUDENT MATCHING
 *
 * HTTP handler for GET /api/problems/:id/student-matches
 */

"use strict";

const {
    findStudentMatches,
    getStudentProfile,
    updateStudentSkills,
    findMatchingProblemsForStudent,
    parseIntParam
} = require("../services/studentMatchingService");

const { parseProblemId } = require("../utils/validation");

// GET /api/problems/:id/student-matches
// ---------------------------------------------------------------------------

async function getStudentMatches(req, res) {
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
        const result = await findStudentMatches(problemId, { limit });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches
        });

    } catch (error) {
        console.error("Student matching error:", error);

        res.status(500).json({
            message: "Failed to fetch student matches"
        });
    }
}

// ---------------------------------------------------------------------------
// GET /api/students/me/profile
// ---------------------------------------------------------------------------

async function getStudentProfileHandler(req, res) {
    try {
        const profile = await getStudentProfile(req.user.id);
        if (!profile) {
            return res.status(404).json({ message: "Student profile not found" });
        }
        res.json({ profile });
    } catch (error) {
        console.error("Fetch student profile error:", error);
        res.status(500).json({ message: "Failed to fetch student profile" });
    }
}

// ---------------------------------------------------------------------------
// PUT /api/students/me/skills
// ---------------------------------------------------------------------------

async function updateStudentSkillsHandler(req, res) {
    try {
        const { skills } = req.body;
        if (!Array.isArray(skills)) {
            return res.status(400).json({ message: "Skills must be an array of strings" });
        }
        const updatedSkills = await updateStudentSkills(req.user.id, skills);
        res.json({
            message: "Student skills updated successfully",
            skills: updatedSkills
        });
    } catch (error) {
        console.error("Update student skills error:", error);
        res.status(500).json({ message: "Failed to update student skills" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/students/me/matches
// ---------------------------------------------------------------------------

async function getStudentMatchedProblemsHandler(req, res) {
    try {
        const sort = req.query.sort || "best_match";
        const result = await findMatchingProblemsForStudent(req.user.id, { sort });
        res.json(result);
    } catch (error) {
        console.error("Student matched problems error:", error);
        res.status(500).json({ message: "Failed to find matching problems" });
    }
}

module.exports = {
    getStudentMatches,
    getStudentProfileHandler,
    updateStudentSkillsHandler,
    getStudentMatchedProblemsHandler
};

