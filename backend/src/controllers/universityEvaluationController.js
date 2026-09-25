const pool = require("../config/db");

// 1. GET /api/university/challenges
// Return challenges that the authenticated University is eligible/matched to
exports.getMatchedChallenges = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find institution_id
        const profileQuery = await pool.query(
            "SELECT institution_id FROM university_profiles WHERE user_id = $1",
            [userId]
        );
        if (profileQuery.rows.length === 0) {
            return res.status(404).json({ error: "Institution profile not found for user" });
        }
        const institutionId = profileQuery.rows[0].institution_id;

        // Fetch matched problems
        const problemsRes = await pool.query(`
            SELECT p.*,
                   ice.evaluation_status,
                   ice.id as evaluation_id
            FROM problems p
            LEFT JOIN institutional_challenge_evaluations ice 
                ON ice.problem_id = p.id AND ice.university_id = $1
            WHERE EXISTS (
                SELECT 1 
                FROM institution_expertise ie
                JOIN expertise e ON e.id = ie.expertise_id
                WHERE ie.institution_id = $2 
                AND e.name = ANY(p.required_expertise)
            )
            ORDER BY p.created_at DESC
        `, [userId, institutionId]);

        // Return matched problems
        res.json({ challenges: problemsRes.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. GET /api/university/challenges/:problemId/evaluation
exports.getEvaluation = async (req, res) => {
    try {
        const userId = req.user.id;
        const problemId = req.params.problemId;
        
        const evalRes = await pool.query(
            "SELECT * FROM institutional_challenge_evaluations WHERE problem_id = $1 AND university_id = $2",
            [problemId, userId]
        );
        
        if (evalRes.rows.length === 0) {
            return res.json({ evaluation: null });
        }
        
        res.json({ evaluation: evalRes.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 3. POST /api/university/challenges/:problemId/evaluation
exports.createEvaluation = async (req, res) => {
    try {
        const userId = req.user.id;
        const problemId = req.params.problemId;
        const { review_note } = req.body;
        
        const evalRes = await pool.query(
            `INSERT INTO institutional_challenge_evaluations (problem_id, university_id, evaluation_status, review_note, reviewer_id)
             VALUES ($1, $2, 'NEW', $3, $4)
             RETURNING *`,
            [problemId, userId, review_note || null, userId]
        );
        
        res.status(201).json({ message: "Evaluation created", evaluation: evalRes.rows[0] });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // unique violation
            return res.status(400).json({ error: "Evaluation already exists" });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. PATCH /api/university/challenges/:problemId/evaluation
exports.updateEvaluation = async (req, res) => {
    try {
        const userId = req.user.id;
        const problemId = req.params.problemId;
        const { evaluation_status, review_note } = req.body;
        
        const validStatuses = ['NEW', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'NEEDS_INFORMATION', 'TEAM_FORMATION', 'IN_PROJECT'];
        if (!validStatuses.includes(evaluation_status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const evalRes = await pool.query(
            `UPDATE institutional_challenge_evaluations 
             SET evaluation_status = $1, review_note = COALESCE($2, review_note), reviewer_id = $3, updated_at = CURRENT_TIMESTAMP
             WHERE problem_id = $4 AND university_id = $5
             RETURNING *`,
            [evaluation_status, review_note, userId, problemId, userId]
        );
        
        if (evalRes.rows.length === 0) {
            return res.status(404).json({ error: "Evaluation not found" });
        }
        
        res.json({ message: "Evaluation updated", evaluation: evalRes.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
