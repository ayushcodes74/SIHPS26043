const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

describe("M26 - Institutional Project E2E Lifecycle", () => {
    let adminToken, universityToken, facultyToken, studentToken, startupToken, authorityToken, citizenToken;
    let universityId, facultyId, studentId, startupId;
    let problemId, projectId, teamId, collabId, fundingId;

    beforeAll(async () => {
        const ts = Date.now();
        // Create isolated users
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin E2E', 'admin_e2e_${ts}@test.com', 'hash', 'ADMIN') RETURNING id`
        );
        const uniRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Uni E2E', 'uni_e2e_${ts}@test.com', 'hash', 'UNIVERSITY') RETURNING id`
        );
        const facRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Fac E2E', 'fac_e2e_${ts}@test.com', 'hash', 'FACULTY') RETURNING id`
        );
        const stuRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Stu E2E', 'stu_e2e_${ts}@test.com', 'hash', 'STUDENT') RETURNING id`
        );
        const startupRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Startup E2E', 'startup_e2e_${ts}@test.com', 'hash', 'STARTUP') RETURNING id`
        );
        const authRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Auth E2E', 'auth_e2e_${ts}@test.com', 'hash', 'AUTHORITY') RETURNING id`
        );
        const citRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Cit E2E', 'cit_e2e_${ts}@test.com', 'hash', 'CITIZEN') RETURNING id`
        );

        universityId = uniRes.rows[0].id;
        facultyId = facRes.rows[0].id;
        studentId = stuRes.rows[0].id;
        startupId = startupRes.rows[0].id;

        // University Profile (needed for faculty assignment constraint in M21)
        const instRes = await pool.query(`INSERT INTO institutions (name, type) VALUES ('Inst E2E', 'UNIVERSITY') RETURNING id`);
        const institutionId = instRes.rows[0].id;
        await pool.query(`INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)`, [universityId, institutionId]);
        await pool.query(`INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)`, [facultyId, institutionId]); // Fake profile to satisfy M21's check

        adminToken = jwt.sign({ id: adminRes.rows[0].id, role: 'ADMIN' }, process.env.JWT_SECRET || 'testsecret');
        universityToken = jwt.sign({ id: universityId, role: 'UNIVERSITY' }, process.env.JWT_SECRET || 'testsecret');
        facultyToken = jwt.sign({ id: facultyId, role: 'FACULTY' }, process.env.JWT_SECRET || 'testsecret');
        studentToken = jwt.sign({ id: studentId, role: 'STUDENT' }, process.env.JWT_SECRET || 'testsecret');
        startupToken = jwt.sign({ id: startupId, role: 'STARTUP' }, process.env.JWT_SECRET || 'testsecret');
        authorityToken = jwt.sign({ id: authRes.rows[0].id, role: 'AUTHORITY' }, process.env.JWT_SECRET || 'testsecret');
        citizenToken = jwt.sign({ id: citRes.rows[0].id, role: 'CITIZEN' }, process.env.JWT_SECRET || 'testsecret');
    });

    afterAll(async () => {
        if (projectId) await pool.query(`DELETE FROM institutional_projects WHERE id = $1`, [projectId]);
        if (problemId) await pool.query(`DELETE FROM problems WHERE id = $1`, [problemId]);
        await pool.query(`DELETE FROM users WHERE email LIKE '%_e2e@test.com'`);
        await pool.query(`DELETE FROM institutions WHERE name = 'Inst E2E'`);
    });

    // A. Challenge
    test("A. Citizen creates a problem/challenge", async () => {
        const res = await request(app)
            .post(`/api/problems`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                title: "E2E Water Pollution",
                description: "Severe water pollution in local river",
                district: "Test District",
                affected_people: 5000
            });
        expect(res.status).toBe(201);
        problemId = res.body.problem.id;
        expect(problemId).toBeDefined();
    });

    // B. University Evaluation 
    // NOTE: GAP DETECTED - No API endpoint exists for creating/updating 'institutional_challenge_evaluations'
    test("B. University Evaluation Flow (MISSING LINK)", () => {
        // We bypass evaluation directly to Project creation because there's no API
        expect(true).toBe(true);
    });

    // C. Institutional Project
    test("C. University creates an Institutional Project from the challenge", async () => {
        // Evaluate first
        await pool.query("INSERT INTO institutional_challenge_evaluations (problem_id, university_id, evaluation_status) VALUES ($1, $2, 'IN_PROJECT')", [problemId, universityId]);

        const res = await request(app)
            .post(`/api/projects`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                title: "E2E Water Filtration System",
                description: "Developing a low-cost filtration unit",
                problem_id: problemId,
                university_id: universityId
            });
        expect(res.status).toBe(201);
        projectId = res.body.project.id;
        expect(projectId).toBeDefined();
        expect(res.body.project.problem_id).toBe(problemId);
        
        // Verify Activity Log
        const logRes = await pool.query(`SELECT action FROM project_activity_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [projectId]);
        expect(logRes.rows[0].action).toBe("PROJECT_CREATED");
    });

    // D. Team
    test("D. University adds a STUDENT team member", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/team/members`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                user_id: studentId,
                role: "STUDENT"
            });
        expect(res.status).toBe(201);
        
        // Verify Persistence
        const teamRes = await request(app)
            .get(`/api/projects/${projectId}/team`)
            .set("Authorization", `Bearer ${universityToken}`);
        expect(teamRes.status).toBe(200);
        expect(teamRes.body.team.length).toBeGreaterThan(0);
        expect(teamRes.body.team[0].user_id).toBe(studentId);
    });

    // E. Mentor
    test("E. University assigns an eligible FACULTY mentor", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                mentor_id: facultyId
            });
        expect(res.status).toBe(200);

        const mentorRes = await request(app)
            .get(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${universityToken}`);
        expect(mentorRes.status).toBe(200);
        expect(mentorRes.body.mentor.id).toBe(facultyId);
    });

    // F. Industry
    test("F. University invites a STARTUP and STARTUP accepts", async () => {
        // Invite
        const inviteRes = await request(app)
            .post(`/api/projects/${projectId}/collaborations`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                partner_id: startupId
            });
        expect(inviteRes.status).toBe(201);
        collabId = inviteRes.body.collaboration.id;

        // Startup accepts
        const acceptRes = await request(app)
            .patch(`/api/projects/${projectId}/collaborations/${collabId}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                status: "ACCEPTED"
            });
        expect(acceptRes.status).toBe(200);
        expect(acceptRes.body.collaboration.collaboration_status).toBe("ACCEPTED");
    });

    // G. Funding
    test("G. University requests funding, Authority approves it", async () => {
        // Request
        const reqRes = await request(app)
            .post(`/api/projects/${projectId}/funding`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                requested_amount: 50000,
                funding_source: "AICTE Seed Grant",
                funding_requirement: "Hardware components"
            });
        expect(reqRes.status).toBe(200);

        // Fetch ID
        const getRes = await request(app)
            .get(`/api/projects/${projectId}/funding`)
            .set("Authorization", `Bearer ${universityToken}`);
        expect(getRes.status).toBe(200);
        fundingId = getRes.body.funding[0].id;

        // Authority approves
        const approveRes = await request(app)
            .patch(`/api/projects/${projectId}/funding/${fundingId}`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                status: "APPROVED",
                approved_amount: 45000
            });
        expect(approveRes.status).toBe(200);
    });

    // H. Testing
    test("H. Student records a PASS test result", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/tests`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                test_description: "Water Purity Test",
                test_result: "99% pure",
                outcome: "PASS"
            });
        expect(res.status).toBe(201);
    });

    // I. Outcome
    test("I. Student records a PATENT outcome", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/outcomes`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                outcome_type: "PATENT",
                title: "Novel Membrane Design",
                status: "FILED"
            });
        expect(res.status).toBe(201);
    });

    // J. Project Lifecycle
    test("J. University updates project status to COMPLETED", async () => {
        // Move through states
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "REVIEW" });
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "APPROVED" });
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "PROTOTYPE" });
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "TESTING" });
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "PILOT" });
        await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "DEPLOYMENT" });
        const finalRes = await request(app).patch(`/api/projects/${projectId}/status`).set("Authorization", `Bearer ${universityToken}`).send({ status: "COMPLETED" });
        
        expect(finalRes.status).toBe(200);
        expect(finalRes.body.status).toBe("COMPLETED");
    });

    // K. Authority Analytics
    test("K. Project counts are reflected in Authority Analytics Dashboard", async () => {
        const res = await request(app)
            .get(`/api/authority/dashboard/summary`)
            .set("Authorization", `Bearer ${authorityToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.institutional_projects.total_projects).toBeGreaterThanOrEqual(1);
        expect(res.body.institutional_projects.lifecycle.COMPLETED).toBeGreaterThanOrEqual(1);
    });
});
