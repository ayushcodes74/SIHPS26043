const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

describe("M27 - University Challenge Evaluation", () => {
    let adminToken, universityToken, citizenToken;
    let universityId, problemId;

    beforeAll(async () => {
        const ts = Date.now();
        // Create users
        const uniRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Uni E2E', 'uni_eval_${ts}@test.com', 'hash', 'UNIVERSITY') RETURNING id`
        );
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin E2E', 'admin_eval_${ts}@test.com', 'hash', 'ADMIN') RETURNING id`
        );
        const citRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ('Cit E2E', 'cit_eval_${ts}@test.com', 'hash', 'CITIZEN') RETURNING id`
        );

        universityId = uniRes.rows[0].id;

        // Create institution and profile
        const instRes = await pool.query(`INSERT INTO institutions (name, type) VALUES ('Eval Inst', 'UNIVERSITY') RETURNING id`);
        const institutionId = instRes.rows[0].id;
        await pool.query(`INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)`, [universityId, institutionId]);

        // Add expertise to institution
        const expRes = await pool.query(`INSERT INTO expertise (name) VALUES ('Water Purification') RETURNING id`);
        await pool.query(`INSERT INTO institution_expertise (institution_id, expertise_id) VALUES ($1, $2)`, [institutionId, expRes.rows[0].id]);

        // Create matched problem
        const probRes = await pool.query(`
            INSERT INTO problems (title, description, required_expertise, status) 
            VALUES ('Water Issue', 'Need clean water', ARRAY['Water Purification'], 'VERIFIED') 
            RETURNING id
        `);
        problemId = probRes.rows[0].id;

        adminToken = jwt.sign({ id: adminRes.rows[0].id, role: 'ADMIN' }, process.env.JWT_SECRET || 'testsecret');
        universityToken = jwt.sign({ id: universityId, role: 'UNIVERSITY' }, process.env.JWT_SECRET || 'testsecret');
        citizenToken = jwt.sign({ id: citRes.rows[0].id, role: 'CITIZEN' }, process.env.JWT_SECRET || 'testsecret');
    });

    afterAll(async () => {
        await pool.query(`DELETE FROM problems WHERE id = $1`, [problemId]);
        await pool.query(`DELETE FROM users WHERE email LIKE '%_eval_%@test.com'`);
        await pool.query(`DELETE FROM institution_expertise WHERE expertise_id IN (SELECT id FROM expertise WHERE name = 'Water Purification')`);
        await pool.query(`DELETE FROM institutions WHERE name = 'Eval Inst'`);
        await pool.query(`DELETE FROM expertise WHERE name = 'Water Purification'`);
    });

    test("1. Unauthorized user rejected from evaluation APIs", async () => {
        const res = await request(app).get(`/api/university/challenges`).set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(403);
    });

    test("2. University can view eligible challenges", async () => {
        const res = await request(app).get(`/api/university/challenges`).set("Authorization", `Bearer ${universityToken}`);
        expect(res.status).toBe(200);
        expect(res.body.challenges.length).toBeGreaterThanOrEqual(1);
        expect(res.body.challenges.some(c => c.id === problemId)).toBe(true);
    });

    test("3. University can create evaluation", async () => {
        const res = await request(app)
            .post(`/api/university/challenges/${problemId}/evaluation`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({ review_note: "Initial assessment" });
        expect(res.status).toBe(201);
        expect(res.body.evaluation.evaluation_status).toBe('NEW');
    });

    test("4. Evaluation persists in DB and status is correct", async () => {
        const res = await request(app)
            .get(`/api/university/challenges/${problemId}/evaluation`)
            .set("Authorization", `Bearer ${universityToken}`);
        expect(res.status).toBe(200);
        expect(res.body.evaluation.evaluation_status).toBe('NEW');
    });

    test("5. Project creation blocked if evaluation is NOT IN_PROJECT", async () => {
        const res = await request(app)
            .post(`/api/projects`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({ title: "Premature Project", problem_id: problemId, university_id: universityId });
        expect(res.status).toBe(403);
    });

    test("6. Duplicate evaluation handled correctly", async () => {
        const res = await request(app)
            .post(`/api/university/challenges/${problemId}/evaluation`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({ review_note: "Duplicate assessment" });
        expect(res.status).toBe(400);
    });

    test("7. Accepted/IN_PROJECT evaluation can proceed to project creation", async () => {
        // Update to IN_PROJECT
        const patchRes = await request(app)
            .patch(`/api/university/challenges/${problemId}/evaluation`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({ evaluation_status: "IN_PROJECT", review_note: "Ready" });
        expect(patchRes.status).toBe(200);

        // Project Creation Should Succeed Now
        const projRes = await request(app)
            .post(`/api/projects`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({ title: "Valid Project", description: "Good", problem_id: problemId, university_id: universityId });
        expect(projRes.status).toBe(201);

        // Cleanup project
        await pool.query(`DELETE FROM institutional_projects WHERE id = $1`, [projRes.body.project.id]);
    });
});
