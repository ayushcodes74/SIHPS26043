const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

describe("M24 - Project Testing & Evidence", () => {
    let adminToken, universityToken, facultyToken, studentToken, authorityToken, citizenToken;
    let problemId, projectId, teamId, studentId, facultyId;

    beforeAll(async () => {
        const ts = Date.now();
        // Create users for tests
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin_m24_${ts}@test.com', 'hash', 'ADMIN') RETURNING id`
        );
        const uniRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Uni M24', 'uni_m24_${ts}@test.com', 'hash', 'UNIVERSITY') RETURNING id`
        );
        const facRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Fac M24', 'fac_m24_${ts}@test.com', 'hash', 'FACULTY') RETURNING id`
        );
        const stuRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Stu M24', 'stu_m24_${ts}@test.com', 'hash', 'STUDENT') RETURNING id`
        );
        const authRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Auth M24', 'auth_m24_${ts}@test.com', 'hash', 'AUTHORITY') RETURNING id`
        );
        const citRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Cit M24', 'cit_m24_${ts}@test.com', 'hash', 'CITIZEN') RETURNING id`
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
            `INSERT INTO problems (title, description, reporter_id) VALUES ('M24 Prob', 'Desc', $1) RETURNING id`,
            [citRes.rows[0].id]
        );
        problemId = probRes.rows[0].id;

        // Create project
        const projRes = await pool.query(
            `INSERT INTO institutional_projects (title, description, problem_id, university_id, faculty_mentor_id) 
             VALUES ('M24 Project', 'Desc', $1, $2, $3) RETURNING id`,
            [problemId, uniRes.rows[0].id, facultyId]
        );
        projectId = projRes.rows[0].id;

        // Create team and assign student
        const teamRes = await pool.query(
            `INSERT INTO collaboration_teams (problem_id, created_by, name) VALUES ($1, $2, 'M24 Team') RETURNING id`,
            [problemId, uniRes.rows[0].id]
        );
        teamId = teamRes.rows[0].id;
        await pool.query(`UPDATE institutional_projects SET team_id = $1 WHERE id = $2`, [teamId, projectId]);
        await pool.query(`INSERT INTO collaboration_team_members (team_id, user_id, role) VALUES ($1, $2, 'STUDENT')`, [teamId, studentId]);
    });

    afterAll(async () => {
        await pool.query(`DELETE FROM institutional_projects WHERE title = 'M24 Project'`);
        await pool.query(`DELETE FROM problems WHERE title = 'M24 Prob'`);
        await pool.query(`DELETE FROM users WHERE email LIKE '%_m24@test.com'`);
    });

    test("1. Unauthorized user cannot create test result", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                test_description: "Performance Test",
                test_result: "99% efficiency",
                outcome: "PASS"
            });
        expect(res.status).toBe(403);
    });

    test("2. Authorized team member (Student) can create test result", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                test_description: "Integration Test",
                test_result: "All modules passing",
                outcome: "PASS",
                remarks: "Looks good",
                evidence_url: "http://example.com/evidence"
            });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Test result recorded");
        expect(res.body.testResult.test_description).toBe("Integration Test");

        // Verify activity log
        const logRes = await pool.query(`SELECT * FROM project_activity_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [projectId]);
        expect(logRes.rows[0].action).toBe("TEST_RECORDED");
    });

    test("3. Authorized Faculty Mentor can create test result", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${facultyToken}`)
            .send({
                test_description: "Code Review",
                test_result: "Minor issues found",
                outcome: "PARTIAL"
            });
        expect(res.status).toBe(201);
    });

    test("4. Owning University can create test result", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                test_description: "System Test",
                test_result: "System failed",
                outcome: "FAIL"
            });
        expect(res.status).toBe(201);
    });

    test("5. External Faculty cannot create test result", async () => {
        const extFacRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Ext Fac M24', 'ext_fac_m24_${Date.now()}@test.com', 'hash', 'FACULTY') RETURNING id`
        );
        const extFacToken = jwt.sign({ id: extFacRes.rows[0].id, role: 'FACULTY' }, process.env.JWT_SECRET || 'testsecret');
        
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${extFacToken}`)
            .send({
                test_description: "Hack Test",
                test_result: "Hacked",
                outcome: "PASS"
            });
        expect(res.status).toBe(403);
    });

    test("6. Invalid outcome rejected", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                test_description: "Invalid Test",
                test_result: "Invalid",
                outcome: "UNKNOWN"
            });
        expect(res.status).toBe(500); // Because of CHECK constraint in db
    });

    test("7. Get project test results", async () => {
        const res = await request(app)
            .get(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${universityToken}`);
            
        expect(res.status).toBe(200);
        expect(res.body.tests).toBeInstanceOf(Array);
        expect(res.body.tests.length).toBeGreaterThanOrEqual(3);
        // Ensure ordered by created_at DESC (latest first)
        expect(res.body.tests[0].test_description).toBe("System Test");
    });
});
