const pool = require("../config/db");

async function authorizeProjectAccess(req, res, next) {
    try {
        const projectId = req.params.id;
        if (!projectId) return next();

        const role = req.user.role;
        const userId = req.user.id;

        // ADMIN and AUTHORITY have full visibility
        if (role === 'ADMIN' || role === 'AUTHORITY') {
            return next();
        }

        // STARTUP/MSME: route-level authorizeRoles + controller already enforce
        // per-record access (partner_id check in updateCollaborationStatus).
        // Allow them through at this middleware layer.
        if (role === 'STARTUP' || role === 'MSME') {
            return next();
        }

        const projRes = await pool.query(`SELECT university_id, faculty_mentor_id, team_id FROM institutional_projects WHERE id = $1`, [projectId]);
        
        if (projRes.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" });
        }

        const proj = projRes.rows[0];

        if (role === 'UNIVERSITY' && proj.university_id === userId) {
            return next();
        }

        if ((role === 'STUDENT' || role === 'RESEARCHER' || role === 'FACULTY') && proj.team_id) {
            const teamRes = await pool.query(`SELECT 1 FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2`, [proj.team_id, userId]);
            if (teamRes.rows.length > 0) return next();
        }

        if (role === 'FACULTY' && proj.faculty_mentor_id === userId) {
            return next();
        }

        return res.status(403).json({ message: "Forbidden: You do not have access to this project" });
    } catch (err) {
        console.error("Project access authorization error:", err);
        return res.status(500).json({ message: "Internal server error during authorization" });
    }
}

module.exports = { authorizeProjectAccess };

