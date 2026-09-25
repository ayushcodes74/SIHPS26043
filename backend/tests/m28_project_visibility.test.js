const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

describe("M28 - Project Visibility & Filtering", () => {
    let tokens = {};
    let users = {};
    let p1, p2, p3; // Projects

    beforeAll(async () => {
        const ts = Date.now();
        
        // Create users for each role
        const roles = ['ADMIN', 'AUTHORITY', 'UNIVERSITY', 'STUDENT', 'FACULTY', 'STARTUP', 'MSME', 'CITIZEN', 'OTHER_UNIVERSITY'];
        for (const role of roles) {
            const res = await pool.query(
                `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, 'hash', $3) RETURNING id`,
                [`${role} User`, `${role.toLowerCase()}_m28_${ts}@test.com`, role === 'OTHER_UNIVERSITY' ? 'UNIVERSITY' : role]
            );
            users[role] = res.rows[0].id;
            tokens[role] = jwt.sign({ id: users[role], role: role === 'OTHER_UNIVERSITY' ? 'UNIVERSITY' : role }, process.env.JWT_SECRET || 'testsecret');
        }

        // Create a problem
        const probRes = await pool.query(
            `INSERT INTO problems (title, description, required_expertise, status) VALUES ('Vis Issue', 'Desc', ARRAY['Test'], 'VERIFIED') RETURNING id`
        );
        const probId = probRes.rows[0].id;

        // Create team
        const teamRes = await pool.query(`INSERT INTO collaboration_teams (name, problem_id, status, created_by) VALUES ('Test Team', $1, 'ACTIVE', $2) RETURNING id`, [probId, users.UNIVERSITY]);
        const teamId = teamRes.rows[0].id;
        
        // Add STUDENT to team
        await pool.query(`INSERT INTO collaboration_team_members (team_id, user_id, role) VALUES ($1, $2, 'STUDENT')`, [teamId, users.STUDENT]);

        // P1: Owned by UNIVERSITY, mentor=FACULTY, team=STUDENT, industry=STARTUP
        const p1Res = await pool.query(
            `INSERT INTO institutional_projects (title, description, problem_id, university_id, faculty_mentor_id, team_id, project_status) 
             VALUES ('Project 1', 'Desc 1', $1, $2, $3, $4, 'PROPOSAL') RETURNING id`,
            [probId, users.UNIVERSITY, users.FACULTY, teamId]
        );
        p1 = p1Res.rows[0].id;
        await pool.query(`INSERT INTO industry_collaborations (project_id, partner_id) VALUES ($1, $2)`, [p1, users.STARTUP]);

        // P2: Owned by OTHER_UNIVERSITY, no mentor, no team, industry=MSME
        const p2Res = await pool.query(
            `INSERT INTO institutional_projects (title, description, problem_id, university_id, project_status) 
             VALUES ('Project 2', 'Desc 2', $1, $2, 'PROPOSAL') RETURNING id`,
            [probId, users.OTHER_UNIVERSITY]
        );
        p2 = p2Res.rows[0].id;
        await pool.query(`INSERT INTO industry_collaborations (project_id, partner_id) VALUES ($1, $2)`, [p2, users.MSME]);

        // P3: Owned by UNIVERSITY, mentor=null, team=null
        const p3Res = await pool.query(
            `INSERT INTO institutional_projects (title, description, problem_id, university_id, project_status) 
             VALUES ('Project 3', 'Desc 3', $1, $2, 'PROPOSAL') RETURNING id`,
            [probId, users.UNIVERSITY]
        );
        p3 = p3Res.rows[0].id;
    });

    afterAll(async () => {
        await pool.query(`DELETE FROM problems WHERE title = 'Vis Issue'`);
        await pool.query(`DELETE FROM users WHERE email LIKE '%_m28_%@test.com'`);
    });

    test("1. ADMIN sees all permitted projects", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.ADMIN}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
        expect(ids).toContain(p2);
        expect(ids).toContain(p3);
    });

    test("2. AUTHORITY sees government-level project data", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.AUTHORITY}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
        expect(ids).toContain(p2);
        expect(ids).toContain(p3);
    });

    test("3. UNIVERSITY sees its own institutional projects", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.UNIVERSITY}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
        expect(ids).toContain(p3);
    });

    test("4. UNIVERSITY cannot see another university's restricted project", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.UNIVERSITY}`);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).not.toContain(p2);
    });

    test("5. STUDENT sees projects where they are a team member", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.STUDENT}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
    });

    test("6. STUDENT cannot see unrelated projects", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.STUDENT}`);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).not.toContain(p2);
        expect(ids).not.toContain(p3);
    });

    test("7. FACULTY sees projects where they are mentor/member", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.FACULTY}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
        expect(ids).not.toContain(p2);
    });

    test("8. STARTUP sees projects where it has a collaboration", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.STARTUP}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p1);
        expect(ids).not.toContain(p2);
    });

    test("9. MSME sees projects where it has a collaboration", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.MSME}`);
        expect(res.status).toBe(200);
        const ids = res.body.projects.map(p => p.id);
        expect(ids).toContain(p2);
        expect(ids).not.toContain(p1);
    });

    test("10. CITIZEN cannot access restricted projects", async () => {
        const res = await request(app).get(`/api/projects`).set("Authorization", `Bearer ${tokens.CITIZEN}`);
        expect(res.status).toBe(200);
        expect(res.body.projects.length).toBe(0);
    });

    test("11. Direct project detail access is blocked for unrelated users", async () => {
        const res = await request(app).get(`/api/projects/${p1}/team`).set("Authorization", `Bearer ${tokens.OTHER_UNIVERSITY}`);
        expect(res.status).toBe(403);
    });

    test("12. Unauthenticated request is rejected", async () => {
        const res = await request(app).get(`/api/projects`);
        expect(res.status).toBe(401);
    });
});
