const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { analyzeChallenge } = require("../services/aiService");
const {
    isValidTransition
} = require("../services/statusService");
const { calculatePriority } = require("../services/priorityService");
const {
    findDuplicates,
    getDuplicatesForProblem
} = require("../services/duplicateService");

const {
    clusterProblem
} = require("../services/clusteringService");

async function createProblem(req, res) {
    try {
        const {
            title,
            description,
            category,
            district,
            city,
            address,
            latitude,
            longitude,
            affected_people,
            available_from,
            available_until,
            evidence_url,
            evidence_type,
            evidence_name,
            evidence_size
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        const ai = await analyzeChallenge({
            title,
            description,
            district,
            affected_people
        });

        const priorityScore = calculatePriority({
    severity: ai.severity,
    affectedPeople: affected_people || 0,
    recurrence: 0,
    dependencyImportance: 0,
    daysUnresolved: 0
});
console.log("🔥 PRIORITY SCORE:", priorityScore);

        const result = await pool.query(
    `INSERT INTO problems
    (
        reporter_id,
        title,
        description,
        category,
        subcategory,
        district,
        city,
        address,
        latitude,
        longitude,
        available_from,
        available_until,
        affected_people,
        ai_summary,
        ai_keywords,
        required_expertise,
        severity,
        urgency,
        ai_confidence,
        priority_score,
        evidence_url,
        evidence_type,
        evidence_name,
        evidence_size
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    RETURNING *`,
    [
        req.user.id,
        title,
        description,
        ai.domain || category || null,
        ai.subdomain,
        district || null,
        city || null,
        address || null,
        latitude || null,
        longitude || null,
        available_from || null,
        available_until || null,
        affected_people || null,
        ai.summary,
        ai.keywords,
        ai.required_expertise,
        ai.severity,
        ai.urgency,
        ai.confidence,
        priorityScore,
        evidence_url || null,
        evidence_type || null,
        evidence_name || null,
        evidence_size ? parseInt(evidence_size, 10) : null
    ]
);
               
        const problem = result.rows[0];
        if (problem) {
            problem.ai_description = problem.ai_description || ai.ai_description || ai.summary || "";
        }

        // ------------------------------------------------------------------
        // Persist Challenge Dossier into PostgreSQL (if dossier table exists)
        // ------------------------------------------------------------------
        if (ai.dossier) {
            try {
                await pool.query(
                    `INSERT INTO challenge_dossiers
                    (problem_id, domain, subdomain, problem_type, summary, severity, urgency_label, urgency_score, dossier_data, overall_confidence, requires_human_review)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        problem.id,
                        ai.domain,
                        ai.subdomain,
                        ai.problem_type,
                        ai.summary,
                        ai.severity,
                        ai.dossier.assessment?.urgency || 'Medium',
                        ai.urgency,
                        JSON.stringify(ai.dossier),
                        ai.confidence,
                        ai.dossier.quality?.requires_human_review || false
                    ]
                );
            } catch (dossierErr) {
                console.warn("⚠️ Challenge dossier table persistence (non-fatal):", dossierErr.message);
            }
        }

        // ------------------------------------------------------------------
        // Duplicate detection — runs after insert so the new problem is
        // already in the DB. Errors are caught and logged; they must never
        // cause problem creation to fail.
        // ------------------------------------------------------------------
        let duplicateCheck = null;

        try {
            const duplicates = await findDuplicates(problem.id);
            duplicateCheck = {
                checked: true,
                duplicates_found: duplicates.length,
                possible_duplicates: duplicates.filter(
                    (d) => d.classification === "POSSIBLE_DUPLICATE"
                ).length,
                results: duplicates
            };
        } catch (dupError) {
            console.error("⚠️  Duplicate detection failed (non-fatal):", dupError.message);
            duplicateCheck = {
                checked: false,
                error: "Duplicate detection temporarily unavailable"
            };
        }

        // ------------------------------------------------------------------
        // Clustering — runs after duplicate detection. Errors must never
        // cause problem creation to fail.
        // ------------------------------------------------------------------
        let clusterCheck = null;

        try {
            const clusterResult = await clusterProblem(problem.id);
            clusterCheck = {
                checked: true,
                action: clusterResult.action,
                cluster_id: clusterResult.cluster_id,
                cluster: clusterResult.cluster || null
            };
        } catch (clusterError) {
            console.error("⚠️  Clustering failed (non-fatal):", clusterError.message);
            clusterCheck = {
                checked: false,
                error: "Clustering temporarily unavailable"
            };
        }

        res.status(201).json({
            message: "Problem submitted successfully",
            problem,
            ai_analysis: ai,
            duplicate_check: duplicateCheck,
            cluster_check: clusterCheck
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create problem",
            error: error.message
        });
    }
}

async function getProblems(req, res) {
    try {
        const {
            category,
            district,
            status,
            search,
            q,
            limit,
            mine
        } = req.query;

        let query = `
            SELECT
                p.*,
                u.name AS reporter_name
            FROM problems p
            LEFT JOIN users u
                ON p.reporter_id = u.id
            WHERE 1=1
        `;

        const values = [];

        if ((mine === "true" || mine === true) && req.user?.id) {
            values.push(req.user.id);
            query += ` AND p.reporter_id = $${values.length}`;
        }

        if (category && category !== "ALL") {
            values.push(category);
            query += ` AND p.category = $${values.length}`;
        }

        if (district && district !== "ALL") {
            values.push(district);
            query += ` AND p.district = $${values.length}`;
        }

        if (status && status !== "ALL") {
            values.push(status);
            query += ` AND p.status = $${values.length}`;
        }

        const rawSearch = (search || q || "").trim();
        if (rawSearch) {
            values.push(`%${rawSearch}%`);
            const paramIdx = values.length;

            // Check if user entered an ID or PRB-xxx
            let idMatch = null;
            if (/^\d+$/.test(rawSearch)) {
                idMatch = parseInt(rawSearch, 10);
            } else {
                const prbMatch = rawSearch.match(/^prb-?0*(\d+)$/i);
                if (prbMatch) {
                    idMatch = parseInt(prbMatch[1], 10);
                }
            }

            if (idMatch !== null) {
                values.push(idMatch);
                const idParamIdx = values.length;
                query += ` AND (
                    p.title ILIKE $${paramIdx}
                    OR p.description ILIKE $${paramIdx}
                    OR p.category ILIKE $${paramIdx}
                    OR p.subcategory ILIKE $${paramIdx}
                    OR p.district ILIKE $${paramIdx}
                    OR p.city ILIKE $${paramIdx}
                    OR p.address ILIKE $${paramIdx}
                    OR array_to_string(p.ai_keywords, ' ') ILIKE $${paramIdx}
                    OR array_to_string(p.required_expertise, ' ') ILIKE $${paramIdx}
                    OR p.id = $${idParamIdx}
                )`;
            } else {
                query += ` AND (
                    p.title ILIKE $${paramIdx}
                    OR p.description ILIKE $${paramIdx}
                    OR p.category ILIKE $${paramIdx}
                    OR p.subcategory ILIKE $${paramIdx}
                    OR p.district ILIKE $${paramIdx}
                    OR p.city ILIKE $${paramIdx}
                    OR p.address ILIKE $${paramIdx}
                    OR array_to_string(p.ai_keywords, ' ') ILIKE $${paramIdx}
                    OR array_to_string(p.required_expertise, ' ') ILIKE $${paramIdx}
                )`;
            }
        }

        query += " ORDER BY p.created_at DESC";

        if (limit && !isNaN(parseInt(limit, 10))) {
            values.push(parseInt(limit, 10));
            query += ` LIMIT $${values.length}`;
        }

        const result = await pool.query(query, values);

        res.json({
            count: result.rows.length,
            problems: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch problems"
        });
    }
}

async function getProblemById(req, res) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM problems
             WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        res.json({
            problem: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch problem"
        });
    }
}

async function getMyProblems(req, res) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM problems
             WHERE reporter_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            problems: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch your problems"
        });
    }
}

async function updateProblemStatus(req, res) {
    const problemId = req.params.id;
    const { status, note } = req.body;

    try {
        if (!status) {
            return res.status(400).json({
                message: "New status is required"
            });
        }

        const problemResult = await pool.query(
            `SELECT id, status
             FROM problems
             WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const currentStatus = problemResult.rows[0].status;

        if (!isValidTransition(currentStatus, status)) {
            return res.status(400).json({
                message: `Invalid status transition from ${currentStatus} to ${status}`
            });
        }

        await pool.query(
            `UPDATE problems
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [status, problemId]
        );

        await pool.query(
            `INSERT INTO problem_status_history
             (problem_id, old_status, new_status, changed_by, note)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                problemId,
                currentStatus,
                status,
                req.user.id,
                note || null
            ]
        );

        res.json({
            message: "Problem status updated successfully",
            problem_id: Number(problemId),
            old_status: currentStatus,
            new_status: status
        });

    } catch (error) {
        console.error("Status update error:", error);

        res.status(500).json({
            message: "Failed to update problem status"
        });
    }
}


async function getProblemStatusHistory(req, res) {
    const problemId = req.params.id;

    try {
        const problemResult = await pool.query(
            `SELECT id
             FROM problems
             WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                old_status,
                new_status,
                changed_by,
                note,
                created_at
             FROM problem_status_history
             WHERE problem_id = $1
             ORDER BY created_at ASC`,
            [problemId]
        );

        res.json({
            problem_id: Number(problemId),
            history: result.rows
        });

    } catch (error) {
        console.error("Status history error:", error);

        res.status(500).json({
            message: "Failed to fetch status history"
        });
    }
}

const { parseProblemId } = require("../utils/validation");

async function getDuplicates(req, res) {
    const problemId = parseProblemId(req.params.id);

    if (!problemId) {
        return res.status(400).json({
            message: "Invalid problem id"
        });
    }

    try {
        // Verify the problem exists
        const problemResult = await pool.query(
            `SELECT id FROM problems WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const duplicates = await getDuplicatesForProblem(problemId);

        res.json({
            problem_id: problemId,
            duplicates
        });

    } catch (error) {
        console.error("Duplicate fetch error:", error);

        res.status(500).json({
            message: "Failed to fetch duplicates"
        });
    }
}

async function uploadEvidence(req, res) {
    try {
        const { fileName, fileType, fileData } = req.body;

        if (!fileName || !fileData) {
            return res.status(400).json({ message: "File name and file data are required" });
        }

        const ext = path.extname(fileName).toLowerCase();
        const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov", ".pdf", ".ppt", ".pptx"];
        const allowedTypes = [
            "image/jpeg", "image/jpg", "image/png", "image/webp",
            "video/mp4", "video/webm", "video/quicktime",
            "application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ];

        const isAllowedExt = allowedExts.includes(ext);
        const isAllowedType = fileType && allowedTypes.includes(fileType.toLowerCase());

        if (!isAllowedExt && !isAllowedType) {
            return res.status(400).json({
                message: `Unsupported file format. Supported formats: JPG, PNG, MP4, PDF, PPT, PPTX.`
            });
        }

        let base64String = fileData;
        if (fileData.includes(",")) {
            base64String = fileData.split(",")[1];
        }

        const buffer = Buffer.from(base64String, "base64");
        
        // 25MB max size
        const MAX_SIZE = 25 * 1024 * 1024;
        if (buffer.length > MAX_SIZE) {
            return res.status(400).json({
                message: `File size exceeds the 25MB limit. Selected file is ${(buffer.length / (1024 * 1024)).toFixed(1)}MB.`
            });
        }

        const uploadsDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const safeExt = ext || (fileType && fileType.includes("video") ? ".mp4" : ".jpg");
        const uniqueFileName = `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
        const filePath = path.join(uploadsDir, uniqueFileName);

        await fs.promises.writeFile(filePath, buffer);

        const fileUrl = `/uploads/${uniqueFileName}`;

        return res.status(201).json({
            success: true,
            file_url: fileUrl,
            file_name: fileName,
            file_type: fileType || (fileUrl.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
            file_size: buffer.length
        });
    } catch (err) {
        console.error("Evidence upload error:", err);
        return res.status(500).json({ message: "Failed to upload evidence", error: err.message });
    }
}

module.exports = {
    createProblem,
    getProblems,
    getProblemById,
    getMyProblems,
    updateProblemStatus,
    getProblemStatusHistory,
    getDuplicates,
    uploadEvidence
};