const pool = require("../config/db");
const { calculatePriority } = require("../services/priorityService");
const trustService = require("../services/trustService");

async function updateProblemPriority(problemId) {
    // Recalculate priority based on existing fields and new community support
    const problemRes = await pool.query("SELECT * FROM problems WHERE id = $1", [problemId]);
    if (problemRes.rows.length === 0) return;
    const p = problemRes.rows[0];

    const supportRes = await pool.query("SELECT COUNT(*) FROM problem_supports WHERE problem_id = $1", [problemId]);
    const communitySupport = parseInt(supportRes.rows[0].count, 10);

    // Call priorityService.js calculatePriority
    const newPriority = calculatePriority({
        severity: p.severity,
        affectedPeople: p.affected_people || 0,
        recurrence: 0,
        dependencyImportance: 0,
        daysUnresolved: 0,
        communitySupport: communitySupport
    });

    await pool.query("UPDATE problems SET priority_score = $1 WHERE id = $2", [newPriority, problemId]);
}

const { parseProblemId } = require("../utils/validation");

async function supportProblem(req, res) {
    const problemId = parseProblemId(req.params.id);
    const userId = req.user.id;

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        // M16: Anti-Gaming check for rate limiting
        // We will query to see if user has > 10 supports in the last 1 minute
        const rateCheck = await pool.query(
            `SELECT COUNT(*) FROM problem_supports WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
            [userId]
        );
        if (parseInt(rateCheck.rows[0].count, 10) >= 10) {
            await trustService.logTrustEvent(userId, 'RATE_LIMIT_EXCEEDED', 'PROBLEM_SUPPORT', problemId, 'MEDIUM', 'Excessive problem supports in a short period');
            return res.status(429).json({ message: "Too many actions in a short period. Please try again later." });
        }

        const problemCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
        if (problemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Problem not found" });
        }

        await pool.query(
            "INSERT INTO problem_supports (problem_id, user_id) VALUES ($1, $2)",
            [problemId, userId]
        );

        await updateProblemPriority(problemId);

        const countRes = await pool.query("SELECT COUNT(*) FROM problem_supports WHERE problem_id = $1", [problemId]);
        
        res.status(201).json({
            message: "Problem supported",
            supported: true,
            support_count: parseInt(countRes.rows[0].count, 10)
        });
    } catch (error) {
        if (error.code === '23505') { // unique violation
            await trustService.logTrustEvent(userId, 'DUPLICATE_SUPPORT', 'PROBLEM_SUPPORT', problemId, 'LOW', 'Attempted to support problem multiple times');
            return res.status(400).json({ message: "You have already supported this problem." });
        }
        console.error("Support problem error:", error);
        res.status(500).json({ message: "Failed to support problem" });
    }
}

async function removeSupport(req, res) {
    const problemId = parseProblemId(req.params.id);
    const userId = req.user.id;

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const problemCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
        if (problemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Problem not found" });
        }

        await pool.query(
            "DELETE FROM problem_supports WHERE problem_id = $1 AND user_id = $2",
            [problemId, userId]
        );

        await updateProblemPriority(problemId);

        const countRes = await pool.query("SELECT COUNT(*) FROM problem_supports WHERE problem_id = $1", [problemId]);
        
        res.status(200).json({
            message: "Support removed",
            supported: false,
            support_count: parseInt(countRes.rows[0].count, 10)
        });
    } catch (error) {
        console.error("Remove support error:", error);
        res.status(500).json({ message: "Failed to remove support" });
    }
}

async function getSupports(req, res) {
    const problemId = parseProblemId(req.params.id);
    const userId = req.user ? req.user.id : null;

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const countRes = await pool.query("SELECT COUNT(*) FROM problem_supports WHERE problem_id = $1", [problemId]);
        const supportCount = countRes.rows[0]?.count ? parseInt(countRes.rows[0].count, 10) : 0;

        let supported = false;
        if (userId) {
            const userSupport = await pool.query(
                "SELECT id FROM problem_supports WHERE problem_id = $1 AND user_id = $2",
                [problemId, userId]
            );
            supported = userSupport.rows.length > 0;
        }

        res.json({
            support_count: supportCount,
            supported
        });
    } catch (error) {
        console.error("Get supports error:", error);
        res.status(500).json({ message: "Failed to get supports" });
    }
}

async function addComment(req, res) {
    const problemId = parseProblemId(req.params.id);
    const userId = req.user.id;
    let { comment } = req.body;

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        return res.status(400).json({ message: "Comment cannot be empty" });
    }

    comment = comment.trim();
    if (comment.length > 1000) {
        return res.status(400).json({ message: "Comment too long" });
    }

    const commentText = comment;

    try {
        // M16: Anti-Gaming checks for comments
        const rateCheck = await pool.query(
            `SELECT COUNT(*) FROM problem_comments WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
            [userId]
        );
        if (parseInt(rateCheck.rows[0].count, 10) >= 5) {
            await trustService.logTrustEvent(userId, 'RATE_LIMIT_EXCEEDED', 'PROBLEM_COMMENT', problemId, 'MEDIUM', 'Excessive comments in a short period');
            return res.status(429).json({ message: "Too many actions in a short period. Please try again later." });
        }

        const isDuplicate = await trustService.checkDuplicateComment(userId, problemId, commentText);
        if (isDuplicate) {
            await trustService.logTrustEvent(userId, 'DUPLICATE_COMMENT', 'PROBLEM_COMMENT', problemId, 'LOW', 'Attempted to post identical comment');
            return res.status(400).json({ message: "You have already posted this identical comment recently." });
        }

        const problemCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
        if (problemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const result = await pool.query(
            "INSERT INTO problem_comments (problem_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *",
            [problemId, userId, comment]
        );

        res.status(201).json({
            message: "Comment added",
            comment: result.rows[0]
        });
    } catch (error) {
        console.error("Add comment error:", error);
        res.status(500).json({ message: "Failed to add comment" });
    }
}

async function getComments(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    try {
        const problemCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
        if (problemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const isModerator = req.user && (req.user.role === 'AUTHORITY' || req.user.role === 'ADMIN');
        let queryStr = `
            SELECT c.id, c.comment, c.status, c.created_at, u.name AS user_name, u.role AS user_role 
            FROM problem_comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.problem_id = $1
        `;
        
        if (!isModerator) {
            queryStr += ` AND c.status = 'VISIBLE'`;
        }

        queryStr += ` ORDER BY c.created_at DESC`;

        const result = await pool.query(queryStr, [problemId]);

        res.json({
            comments: result.rows
        });
    } catch (error) {
        console.error("Get comments error:", error);
        res.status(500).json({ message: "Failed to get comments" });
    }
}

async function moderateComment(req, res) {
    const commentId = parseInt(req.params.commentId, 10);
    const { status } = req.body;

    if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment id" });
    }

    if (!['VISIBLE', 'HIDDEN', 'FLAGGED'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const result = await pool.query(
            "UPDATE problem_comments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
            [status, commentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        res.json({
            message: "Comment moderated",
            comment: result.rows[0]
        });
    } catch (error) {
        console.error("Moderate comment error:", error);
        res.status(500).json({ message: "Failed to moderate comment" });
    }
}

module.exports = {
    supportProblem,
    removeSupport,
    getSupports,
    addComment,
    getComments,
    moderateComment
};
