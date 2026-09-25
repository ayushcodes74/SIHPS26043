const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

describe("M25 - Project Outcomes", () => {
    let adminToken, universityToken, facultyToken, studentToken, authorityToken, citizenToken;
    let problemId, projectId, teamId, studentId, facultyId;

    beforeAll(async () => {
        const ts = Date.now();
        // Create users for tests
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin_m25_${ts}@test.com', 'hash', 'ADMIN') RETURNING id`
        );
        const uniRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Uni M25', 'uni_m25_${ts}@test.com', 'hash', 'UNIVERSITY') RETURNING id`
        );
        const facRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Fac M25', 'fac_m25_${ts}@test.com', 'hash', 'FACULTY') RETURNING id`
        );
        const stuRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Stu M25', 'stu_m25_${ts}@test.com', 'hash', 'STUDENT') RETURNING id`
        );
        const authRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Auth M25', 'auth_m25_${ts}@test.com', 'hash', 'AUTHORITY') RETURNING id`
        );
        const citRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Cit M25', 'cit_m25_${ts}@test.com', 'hash', 'CITIZEN') RETURNING id`
        );

        facultyId = facRes.rows[0].id;
        studentId = stuRes.rows[0].id;

        adminToken = jwt.sign({ id: adminRes.rows[0].id, role: 'ADMIN' }, process.env.JWT_SECRET || 'testsecret');
        universityToken = jwt.sign({ id: uniRes.rows[0].id, role: 'UNIVERSITY' }, process.env.JWT_SECRET || 'testsecret');
        facultyToken = jwt.sign({ id: facultyId, role: 'FACULTY' }, process.env.JWT_SECRET || 'testsecret');
        studentToken = jwt.sign({ id: studentId, role: 'STUDENT' }, process.env.JWT_SECRET || 'testsecret');
        authorityToken = jwt.sign({ id: authRes.rows[0].id, role: 'AUTHORITY' }, process.env.JWT_SECRET || 'testsecret');
        citizenToken = jwt.sign({ id: citRes.rows[0].id, role: 'CITIZEN' }, process.env.JWT_SECRET || 'testsecret');

        // Create problem
        const probRes = await pool.query(
            `INSERT INTO problems (title, description, reporter_id) VALUES ('M25 Prob', 'Desc', $1) RETURNING id`,
            [citRes.rows[0].id]
        );
        problemId = probRes.rows[0].id;

        // Create project
        const projRes = await pool.query(
            `INSERT INTO institutional_projects (title, description, problem_id, university_id, faculty_mentor_id) 
             VALUES ('M25 Project', 'Desc', $1, $2, $3) RETURNING id`,
            [problemId, uniRes.rows[0].id, facultyId]
        );
        projectId = projRes.rows[0].id;

        // Create team and assign student
        const teamRes = await pool.query(
            `INSERT INTO collaboration_teams (problem_id, created_by, name) VALUES ($1, $2, 'M25 Team') RETURNING id`,
            [problemId, uniRes.rows[0].id]
        );
        teamId = teamRes.rows[0].id;
        await pool.query(`UPDATE institutional_projects SET team_id = $1 WHERE id = $2`, [teamId, projectId]);
        await pool.query(`INSERT INTO collaboration_team_members (team_id, user_id, role) VALUES ($1, $2, 'STUDENT')`, [teamId, studentId]);
    });

    afterAll(async () => {
        await pool.query(`DELETE FROM institutional_projects WHERE title = 'M25 Project'`);
        await pool.query(`DELETE FROM problems WHERE title = 'M25 Prob'`);
        await pool.query(`DELETE FROM users WHERE email LIKE '%_m25@test.com'`);
    });

    test("1. Unauthorized user cannot create outcome", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                outcome_type: "PATENT",
                title: "New Patent",
                status: "FILED"
            });
        expect(res.status).toBe(403);
    });

    test("2. Authorized team member (Student) can create outcome", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                outcome_type: "PUBLICATION",
                title: "Research Paper",
                status: "PUBLISHED",
                reference_document_url: "http://example.com/paper"
            });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Outcome added");
        expect(res.body.outcome.title).toBe("Research Paper");

        // Verify activity log
        const logRes = await pool.query(`SELECT * FROM project_activity_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [projectId]);
        expect(logRes.rows[0].action).toBe("OUTCOME_ADDED");
    });

    test("3. Owning University can create outcome", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                outcome_type: "PATENT",
                title: "Tech Patent",
                status: "FILED"
            });
        expect(res.status).toBe(201);
    });

    test("4. External Faculty cannot create outcome", async () => {
        const extFacRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Ext Fac M25', 'ext_fac_m25_${Date.now()}@test.com', 'hash', 'FACULTY') RETURNING id`
        );
        const extFacToken = jwt.sign({ id: extFacRes.rows[0].id, role: 'FACULTY' }, process.env.JWT_SECRET || 'testsecret');
        
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${extFacToken}`)
            .send({
                outcome_type: "DESIGN",
                title: "Design",
                status: "REGISTERED"
            });
        expect(res.status).toBe(403);
    });

    test("5. Invalid outcome rejected", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                outcome_type: "INVALID_TYPE",
                title: "Invalid",
                status: "UNKNOWN"
            });
        expect(res.status).toBe(500); // DB Constraint check
    });

    test("6. Get project outcomes", async () => {
        const res = await request(app)
            .get(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${universityToken}`);
            
        expect(res.status).toBe(200);
        expect(res.body.outcomes).toBeInstanceOf(Array);
        expect(res.body.outcomes.length).toBeGreaterThanOrEqual(2);
        // Ensure ordered by created_at DESC (latest first)
        expect(res.body.outcomes[0].title).toBe("Tech Patent");
    });
});
