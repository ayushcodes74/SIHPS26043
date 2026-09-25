const pool = require("../config/db");

// 1. Get institutional projects
async function getProjects(req, res) {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        
        let query = `
            SELECT p.*, prob.title as problem_title, u.name as mentor_name, u_uni.name as university_name
            FROM institutional_projects p
            JOIN problems prob ON p.problem_id = prob.id
            LEFT JOIN users u ON p.faculty_mentor_id = u.id
            LEFT JOIN users u_uni ON p.university_id = u_uni.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (role === 'UNIVERSITY') {
            query += ` AND p.university_id = $${paramCount++}`;
            params.push(userId);
        } else if (role === 'STUDENT' || role === 'RESEARCHER') {
            query += ` AND p.team_id IN (SELECT team_id FROM collaboration_team_members WHERE user_id = $${paramCount++})`;
            params.push(userId);
        } else if (role === 'FACULTY') {
            query += ` AND (p.faculty_mentor_id = $${paramCount} OR p.team_id IN (SELECT team_id FROM collaboration_team_members WHERE user_id = $${paramCount}))`;
            params.push(userId);
            paramCount++;
        } else if (role === 'STARTUP' || role === 'MSME') {
            query += ` AND p.id IN (SELECT project_id FROM industry_collaborations WHERE partner_id = $${paramCount++})`;
            params.push(userId);
        } else if (role === 'AUTHORITY' || role === 'ADMIN') {
            // Full visibility
        } else {
            // Default block for CITIZEN and others
            query += ` AND 1=0`;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ projects: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch projects" });
    }
}

// 2. Create project
async function createProject(req, res) {
    try {
        const { title, description, problem_id, university_id, faculty_mentor_id, team_id } = req.body;
        // Check evaluation requirement for universities
        if (req.user.role === 'UNIVERSITY') {
            const evalRes = await pool.query(
                "SELECT evaluation_status FROM institutional_challenge_evaluations WHERE problem_id = $1 AND university_id = $2",
                [problem_id, university_id]
            );
            
            // Strictly ensure evaluation is IN_PROJECT.
            if (evalRes.rows.length === 0 || evalRes.rows[0].evaluation_status !== 'IN_PROJECT') {
                return res.status(403).json({ message: "Challenge must be evaluated and accepted (IN_PROJECT) before creating a project." });
            }
        }
        
        const result = await pool.query(
            `INSERT INTO institutional_projects
            (title, description, problem_id, university_id, faculty_mentor_id, team_id, project_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'PROPOSAL')
            RETURNING *`,
            [title, description, problem_id, university_id, faculty_mentor_id || null, team_id || null]
        );
        
        // Log Activity
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [result.rows[0].id, req.user.id, req.user.role, 'PROJECT_CREATED', 'Project workspace created by university.']
        );

        res.status(201).json({ message: "Project created", project: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create project" });
    }
}

// 3. Update project status
async function updateProjectStatus(req, res) {
    try {
        const { status } = req.body;
        const projectId = req.params.id;
        
        // Fetch current status and university
        const projRes = await pool.query(`SELECT project_status, university_id FROM institutional_projects WHERE id = $1`, [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        const currentStatus = projRes.rows[0].project_status;
        const universityId = projRes.rows[0].university_id;

        // Authorization check: only the owning university, authority, or admin can update
        if (req.user.role === 'UNIVERSITY' && req.user.id !== universityId) {
            return res.status(403).json({ message: "Unauthorized: You can only update your own institution's projects" });
        }

        const validTransitions = {
            'CHALLENGE_ACCEPTED': ['TEAM_FORMED', 'PROPOSAL'],
            'TEAM_FORMED': ['PROPOSAL'],
            'PROPOSAL': ['REVIEW', 'APPROVED', 'PROTOTYPE'],
            'REVIEW': ['APPROVED', 'PROPOSAL'],
            'APPROVED': ['PROTOTYPE'],
            'PROTOTYPE': ['TESTING'],
            'TESTING': ['PILOT', 'PROTOTYPE'],
            'PILOT': ['DEPLOYMENT', 'TESTING'],
            'DEPLOYMENT': ['COMPLETED', 'PILOT'],
            'COMPLETED': []
        };

        if (status !== currentStatus && (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status))) {
            return res.status(400).json({ message: `Invalid transition from ${currentStatus} to ${status}` });
        }
        
        await pool.query(
            `UPDATE institutional_projects SET project_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [status, projectId]
        );

        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'STATUS_UPDATED', "Project status updated to " + status]
        );

        res.json({ message: "Project status updated successfully", status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update project status" });
    }
}

// 4. Record Test Result
async function getProjectTests(req, res) {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `SELECT * FROM project_test_results WHERE project_id = $1 ORDER BY created_at DESC`,
            [projectId]
        );
        res.json({ tests: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch tests" });
    }
}

async function recordTestResult(req, res) {
    try {
        const { test_description, test_result, outcome, remarks, evidence_url } = req.body;
        const projectId = req.params.id;
        
        // RBAC: Verify project exists and user is authorized
        const projRes = await pool.query(`SELECT university_id, team_id, faculty_mentor_id FROM institutional_projects WHERE id = $1`, [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        const proj = projRes.rows[0];
        
        let authorized = false;
        if (req.user.role === 'UNIVERSITY' && req.user.id === proj.university_id) {
            authorized = true;
        } else if (req.user.role === 'ADMIN') {
            authorized = true;
        } else {
            if (req.user.role === 'FACULTY' && req.user.id === proj.faculty_mentor_id) {
                authorized = true;
            } else if (proj.team_id) {
                const teamRes = await pool.query(`SELECT 1 FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2`, [proj.team_id, req.user.id]);
                if (teamRes.rows.length > 0) authorized = true;
            }
        }
        
        if (!authorized) {
            return res.status(403).json({ message: "Unauthorized to record test results for this project" });
        }

        const result = await pool.query(
            `INSERT INTO project_test_results (project_id, test_description, test_result, outcome, remarks, evidence_url)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [projectId, test_description, test_result, outcome, remarks, evidence_url]
        );
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'TEST_RECORDED', 'Recorded test result: ' + outcome]
        );
        
        res.status(201).json({ message: "Test result recorded", testResult: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to record test result" });
    }
}

// 5. Add Industry Collaboration
async function getProjectCollaborations(req, res) {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `SELECT ic.id as collab_id, ic.project_id, ic.collaboration_status, ic.created_at, u.id as partner_id, u.name, u.role
             FROM industry_collaborations ic
             JOIN users u ON ic.partner_id = u.id
             WHERE ic.project_id = $1`,
            [projectId]
        );
        res.json({ collaborations: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch collaborations" });
    }
}

async function getEligiblePartners(req, res) {
    try {
        const result = await pool.query("SELECT id, name, role FROM users WHERE role IN ('STARTUP', 'MSME')");
        res.json({ eligiblePartners: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch eligible partners" });
    }
}

async function addIndustryCollaboration(req, res) {
    try {
        const { partner_id } = req.body;
        const projectId = req.params.id;
        
        // verify partner_id exists and is STARTUP or MSME
        const userRes = await pool.query("SELECT id, role FROM users WHERE id = $1", [partner_id]);
        if (userRes.rows.length === 0 || !['STARTUP', 'MSME'].includes(userRes.rows[0].role)) {
            return res.status(400).json({ message: "Partner must be a valid STARTUP or MSME" });
        }

        const result = await pool.query(
            `INSERT INTO industry_collaborations (project_id, partner_id, invited_by, collaboration_status)
             VALUES ($1, $2, $3, 'INVITED') RETURNING *`,
            [projectId, partner_id, req.user.id]
        );
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'INDUSTRY_INVITED', 'Invited industry partner ' + partner_id]
        );

        res.status(201).json({ message: "Partner invited", collaboration: result.rows[0] });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(400).json({ message: "Collaboration already exists" });
        }
        res.status(500).json({ message: "Failed to invite partner" });
    }
}

// 6. Project Team
async function getProjectTeam(req, res) {
    try {
        const projectId = req.params.id;
        const projRes = await pool.query(`SELECT team_id FROM institutional_projects WHERE id = $1`, [projectId]);
        if (!projRes.rows[0]?.team_id) return res.json({ team: null });

        const teamRes = await pool.query(`
            SELECT tm.*, u.name, u.role as user_role 
            FROM collaboration_team_members tm 
            JOIN users u ON tm.user_id = u.id 
            WHERE tm.team_id = $1
        `, [projRes.rows[0].team_id]);
        res.json({ team: teamRes.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch team" });
    }
}

async function setProjectTeam(req, res) {
    try {
        const { team_id } = req.body;
        const projectId = req.params.id;
        await pool.query(`UPDATE institutional_projects SET team_id = $1 WHERE id = $2`, [team_id, projectId]);
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'TEAM_ASSIGNED', 'Assigned team ' + team_id]
        );
        res.json({ message: "Team assigned" });
    } catch (err) {
        res.status(500).json({ message: "Failed to assign team" });
    }
}

async function addProjectTeamMember(req, res) {
    try {
        const { user_id, role } = req.body;
        const projectId = req.params.id;
        
        // 1. Verify user exists and role matches somewhat
        const userRes = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [user_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
        
        // 2. Check project
        const projRes = await pool.query("SELECT id, team_id, problem_id FROM institutional_projects WHERE id = $1", [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        const proj = projRes.rows[0];

        let teamId = proj.team_id;

        // 3. Auto-create team if missing
        if (!teamId) {
            const teamInsert = await pool.query(
                `INSERT INTO collaboration_teams (problem_id, name, created_by, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
                [proj.problem_id, `Project Team ${projectId}`, req.user.id]
            );
            teamId = teamInsert.rows[0].id;
            await pool.query(`UPDATE institutional_projects SET team_id = $1 WHERE id = $2`, [teamId, projectId]);
        }

        // 4. Add member
        await pool.query(
            `INSERT INTO collaboration_team_members (team_id, user_id, role, membership_status, joined_at)
             VALUES ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP)
             ON CONFLICT (team_id, user_id) DO UPDATE SET membership_status = 'ACTIVE', role = $3`,
            [teamId, user_id, role || userRes.rows[0].role]
        );

        // 5. Activity log
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'MEMBER_ADDED', `Added user ${user_id} to project team`]
        );

        res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add member" });
    }
}

async function removeProjectTeamMember(req, res) {
    try {
        const projectId = req.params.id;
        const userId = req.params.userId;
        
        const projRes = await pool.query("SELECT id, team_id FROM institutional_projects WHERE id = $1", [projectId]);
        if (projRes.rows.length === 0 || !projRes.rows[0].team_id) {
            return res.status(404).json({ message: "Project or team not found" });
        }
        
        await pool.query(`DELETE FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2`, [projRes.rows[0].team_id, userId]);

        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'MEMBER_REMOVED', `Removed user ${userId} from project team`]
        );

        res.json({ message: "Member removed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to remove member" });
    }
}

// 7. Mentor
async function getProjectMentor(req, res) {
    try {
        const projectId = req.params.id;
        
        const projRes = await pool.query("SELECT faculty_mentor_id FROM institutional_projects WHERE id = $1", [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        
        const mentorId = projRes.rows[0].faculty_mentor_id;
        if (!mentorId) return res.json({ mentor: null });
        
        const mentorRes = await pool.query(
            "SELECT pm.mentorship_status, u.id, u.name, u.email, u.role FROM project_mentors pm JOIN users u ON pm.mentor_id = u.id WHERE pm.project_id = $1 AND pm.mentor_id = $2",
            [projectId, mentorId]
        );
        
        res.json({ mentor: mentorRes.rows[0] || null });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch mentor" });
    }
}

async function assignFacultyMentor(req, res) {
    try {
        const { mentor_id } = req.body;
        const projectId = req.params.id;
        
        // 1. Verify user exists and is faculty
        const userRes = await pool.query("SELECT id, role FROM users WHERE id = $1", [mentor_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "Mentor user not found" });
        if (userRes.rows[0].role !== 'FACULTY') return res.status(400).json({ message: "User is not a faculty member" });
        
        // 2. Check project
        const projRes = await pool.query("SELECT id, faculty_mentor_id, university_id FROM institutional_projects WHERE id = $1", [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        
        // 3. Check institution match
        const uniProfile = await pool.query("SELECT institution_id FROM university_profiles WHERE user_id = $1", [projRes.rows[0].university_id]);
        const mentorProfile = await pool.query("SELECT institution_id FROM university_profiles WHERE user_id = $1", [mentor_id]);
        
        if (uniProfile.rows.length > 0 && mentorProfile.rows.length > 0) {
            if (uniProfile.rows[0].institution_id !== mentorProfile.rows[0].institution_id) {
                return res.status(403).json({ message: "Mentor does not belong to the project's institution" });
            }
        }
        
        const isReplacement = !!projRes.rows[0].faculty_mentor_id;

        // 3. Upsert mentor
        await pool.query(
            `INSERT INTO project_mentors (project_id, mentor_id, mentorship_status) VALUES ($1, $2, 'ACTIVE')
             ON CONFLICT (project_id, mentor_id) DO UPDATE SET mentorship_status = 'ACTIVE'`,
            [projectId, mentor_id]
        );
        
        // 4. Update project
        await pool.query(`UPDATE institutional_projects SET faculty_mentor_id = $1 WHERE id = $2`, [mentor_id, projectId]);
        
        // 5. Activity log
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, isReplacement ? 'MENTOR_REPLACED' : 'MENTOR_ASSIGNED', 'Assigned faculty mentor ' + mentor_id]
        );
        res.json({ message: isReplacement ? "Mentor replaced" : "Mentor assigned" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to assign mentor" });
    }
}

async function removeFacultyMentor(req, res) {
    try {
        const projectId = req.params.id;
        
        const projRes = await pool.query("SELECT faculty_mentor_id FROM institutional_projects WHERE id = $1", [projectId]);
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        
        const mentorId = projRes.rows[0].faculty_mentor_id;
        if (!mentorId) return res.status(400).json({ message: "No mentor assigned" });
        
        await pool.query("DELETE FROM project_mentors WHERE project_id = $1 AND mentor_id = $2", [projectId, mentorId]);
        await pool.query("UPDATE institutional_projects SET faculty_mentor_id = NULL WHERE id = $1", [projectId]);
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'MENTOR_REMOVED', 'Removed faculty mentor ' + mentorId]
        );
        
        res.json({ message: "Mentor removed successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to remove mentor" });
    }
}

async function getEligibleMentors(req, res) {
    try {
        const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'FACULTY'");
        res.json({ eligibleMentors: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch eligible mentors" });
    }
}

// 8. Collaboration Status
async function updateCollaborationStatus(req, res) {
    try {
        const { status } = req.body; // ACCEPTED, DECLINED, ACTIVE, COMPLETED
        const collabId = req.params.collabId;
        const projectId = req.params.id;
        
        // Authorization: only the partner can accept/decline/activate their own collaboration, unless ADMIN
        if (req.user.role !== 'ADMIN' && req.user.role !== 'UNIVERSITY' && req.user.role !== 'AUTHORITY') {
            const collabRes = await pool.query("SELECT partner_id FROM industry_collaborations WHERE id = $1 AND project_id = $2", [collabId, projectId]);
            if (collabRes.rows.length === 0) return res.status(404).json({ message: "Collaboration not found" });
            if (collabRes.rows[0].partner_id !== req.user.id) return res.status(403).json({ message: "Unauthorized to modify this collaboration" });
        }

        const result = await pool.query(
            `UPDATE industry_collaborations SET collaboration_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND project_id = $3 RETURNING *`,
            [status, collabId, projectId]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: "Collaboration not found" });

        let actionType = 'INDUSTRY_UPDATED';
        if (status === 'ACCEPTED') actionType = 'INDUSTRY_ACCEPTED';
        if (status === 'DECLINED') actionType = 'INDUSTRY_DECLINED';
        if (status === 'ACTIVE') actionType = 'INDUSTRY_ACTIVATED';
        if (status === 'COMPLETED') actionType = 'INDUSTRY_COMPLETED';

        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, actionType, 'Collaboration status updated to ' + status]
        );
        res.json({ message: "Collaboration updated", collaboration: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Failed to update collaboration" });
    }
}

// 9. Funding
async function requestFunding(req, res) {
    try {
        const { requested_amount, funding_source, funding_requirement } = req.body;
        const projectId = req.params.id;
        
        await pool.query(
            `INSERT INTO project_funding (project_id, requested_amount, funding_source, funding_requirement) VALUES ($1, $2, $3, $4)`,
            [projectId, requested_amount, funding_source, funding_requirement]
        );
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'FUNDING_REQUESTED', 'Requested funding of ' + requested_amount]
        );
        res.json({ message: "Funding requested" });
    } catch (err) {
        res.status(500).json({ message: "Failed to request funding" });
    }
}

async function getProjectFunding(req, res) {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `SELECT * FROM project_funding WHERE project_id = $1 ORDER BY created_at DESC`,
            [projectId]
        );
        res.json({ funding: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch funding" });
    }
}

async function updateFundingStatus(req, res) {
    try {
        const { status, approved_amount } = req.body;
        const fundingId = req.params.fundingId;
        const projectId = req.params.id;
        
        await pool.query(
            `UPDATE project_funding SET funding_status = $1, approved_amount = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [status, approved_amount || 0, fundingId]
        );
        
        let actionType = 'FUNDING_UPDATED';
        if (status === 'UNDER_REVIEW') actionType = 'FUNDING_UNDER_REVIEW';
        if (status === 'APPROVED') actionType = 'FUNDING_APPROVED';
        if (status === 'REJECTED') actionType = 'FUNDING_REJECTED';
        if (status === 'RECEIVED') actionType = 'FUNDING_RECEIVED';

        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, actionType, 'Funding status updated to ' + status]
        );
        res.json({ message: "Funding updated" });
    } catch (err) {
        res.status(500).json({ message: "Failed to update funding" });
    }
}

// 10. Outcomes
async function getProjectOutcomes(req, res) {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `SELECT * FROM project_outcomes WHERE project_id = $1 ORDER BY created_at DESC`,
            [projectId]
        );
        res.json({ outcomes: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch outcomes" });
    }
}

async function addOutcome(req, res) {
    try {
        const { outcome_type, title, status, reference_document_url } = req.body;
        const projectId = req.params.id;
        
        const projRes = await pool.query(
            "SELECT id, university_id, faculty_mentor_id, team_id FROM institutional_projects WHERE id = $1", 
            [projectId]
        );
        if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        const proj = projRes.rows[0];
        
        let isAuthorized = false;
        if (req.user.role === 'ADMIN' || req.user.role === 'AUTHORITY') {
            isAuthorized = true;
        } else if (req.user.id === proj.university_id) {
            isAuthorized = true;
        } else if (req.user.id === proj.faculty_mentor_id) {
            isAuthorized = true;
        } else {
            if (proj.team_id) {
                const teamRes = await pool.query("SELECT id FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2", [proj.team_id, req.user.id]);
                if (teamRes.rows.length > 0) isAuthorized = true;
            }
            const collabRes = await pool.query("SELECT id FROM industry_collaborations WHERE project_id = $1 AND partner_id = $2 AND collaboration_status = 'ACTIVE'", [projectId, req.user.id]);
            if (collabRes.rows.length > 0) isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: "Unauthorized to add outcome" });
        }

        const result = await pool.query(
            `INSERT INTO project_outcomes (project_id, outcome_type, title, status, reference_document_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [projectId, outcome_type, title, status, reference_document_url]
        );
        
        await pool.query(
            `INSERT INTO project_activity_log (project_id, actor_id, role, action, message) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, req.user.id, req.user.role, 'OUTCOME_ADDED', 'Added outcome: ' + title]
        );
        res.status(201).json({ message: "Outcome added", outcome: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add outcome" });
    }
}

// 11. Activity Log
async function getProjectActivity(req, res) {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `SELECT * FROM project_activity_log WHERE project_id = $1 ORDER BY created_at DESC`,
            [projectId]
        );
        res.json({ activity: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch activity" });
    }
}

module.exports = {
    getProjects,
    createProject,
    updateProjectStatus,
    getProjectTests,
    recordTestResult,
    getProjectCollaborations,
    getEligiblePartners,
    addIndustryCollaboration,
    getProjectTeam,
    setProjectTeam,
    addProjectTeamMember,
    removeProjectTeamMember,
    getProjectMentor,
    assignFacultyMentor,
    removeFacultyMentor,
    getEligibleMentors,
    updateCollaborationStatus,
    getProjectFunding,
    requestFunding,
    updateFundingStatus,
    getProjectOutcomes,
    addOutcome,
    getProjectActivity
};
