const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

let uniToken;
let citizenToken;
let uniUserId;
let faculty1Id;
let faculty2Id;
let projectId;
let fac1Email;
let fac2Email;

beforeAll(async () => {
    // 1. Create University
    const uniRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test University",
            email: `uni_mentor_${Date.now()}@civicsync.gov.in`,
            password: "Password123!",
            role: "UNIVERSITY"
        });
    uniToken = uniRes.body.token;
    
    // Get uni ID
    const uniUser = await pool.query("SELECT id FROM users WHERE email = $1", [uniRes.body.user.email]);
    uniUserId = uniUser.rows[0].id;

    // Create an institution and link to university
    const instRes = await pool.query("INSERT INTO institutions (name, type) VALUES ('Test Uni Inst', 'UNIVERSITY') RETURNING id");
    const instId1 = instRes.rows[0].id;
    await pool.query("INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)", [uniUserId, instId1]);

    const instRes2 = await pool.query("INSERT INTO institutions (name, type) VALUES ('Other Uni Inst', 'UNIVERSITY') RETURNING id");
    const instId2 = instRes2.rows[0].id;

    // 2. Create Citizen (for unauthorized check)
    const citRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test Citizen",
            email: `cit_mentor_${Date.now()}@civicsync.gov.in`,
            password: "Password123!",
            role: "CITIZEN"
        });
    citizenToken = citRes.body.token;

    // 3. Create Faculty 1 (same institution)
    fac1Email = `fac1_${Date.now()}@civicsync.gov.in`;
    const fac1Res = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Faculty One', $1, 'hash', 'FACULTY') RETURNING id",
        [fac1Email]
    );
    faculty1Id = fac1Res.rows[0].id;
    await pool.query("INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)", [faculty1Id, instId1]);

    // 4. Create Faculty 2 (different institution)
    fac2Email = `fac2_${Date.now()}@civicsync.gov.in`;
    const fac2Res = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Faculty Two', $1, 'hash', 'FACULTY') RETURNING id",
        [fac2Email]
    );
    faculty2Id = fac2Res.rows[0].id;
    await pool.query("INSERT INTO university_profiles (user_id, institution_id) VALUES ($1, $2)", [faculty2Id, instId2]);

    // 5. Create a problem and project
    const probRes = await pool.query(
        "INSERT INTO problems (title, description, reporter_id, status) VALUES ('Test Prob', 'Desc', $1, 'OPEN') RETURNING id",
        [uniUserId]
    );
    const probId = probRes.rows[0].id;

    const projRes = await pool.query(
        "INSERT INTO institutional_projects (title, problem_id, university_id, project_status) VALUES ('Test Proj', $1, $2, 'PROPOSAL') RETURNING id",
        [probId, uniUserId]
    );
    projectId = projRes.rows[0].id;
});

afterAll(async () => {
    await pool.query("DELETE FROM problems WHERE reporter_id IN (SELECT id FROM users WHERE email LIKE '%@civicsync.gov.in')");
    await pool.query("DELETE FROM users WHERE email LIKE '%@civicsync.gov.in'");
});

describe("M21 - Mentor Assignment", () => {
    test("1. Reject unauthorized mentor assignment", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ mentor_id: faculty1Id });
        expect(res.status).toBe(403);
    });

    test("2. Reject invalid/non-faculty user assignment", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ mentor_id: uniUserId }); // uniUserId is role=UNIVERSITY
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("User is not a faculty member");
    });

    test("3. Reject cross-institution mentor assignment", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ mentor_id: faculty2Id }); // faculty2Id is in instId2
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Mentor does not belong to the project's institution");
    });

    test("4. Valid mentor assignment", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ mentor_id: faculty1Id });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Mentor assigned");

        // Check if mentor is fetched correctly
        const getRes = await request(app)
            .get(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.mentor).toBeDefined();
        expect(getRes.body.mentor.id).toBe(faculty1Id);

        // Check activity log
        const actRes = await request(app)
            .get(`/api/projects/${projectId}/activity`)
            .set("Authorization", `Bearer ${uniToken}`);
        expect(actRes.status).toBe(200);
        const actions = actRes.body.activity.map(a => a.action);
        expect(actions).toContain("MENTOR_ASSIGNED");
    });

    test("5. Valid mentor replacement", async () => {
        // First temporarily move faculty2 to the same institution for the test
        await pool.query("UPDATE university_profiles SET institution_id = (SELECT institution_id FROM university_profiles WHERE user_id = $1) WHERE user_id = $2", [uniUserId, faculty2Id]);
        
        const res = await request(app)
            .post(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ mentor_id: faculty2Id });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Mentor replaced");

        const actRes = await request(app)
            .get(`/api/projects/${projectId}/activity`)
            .set("Authorization", `Bearer ${uniToken}`);
        const actions = actRes.body.activity.map(a => a.action);
        expect(actions).toContain("MENTOR_REPLACED");
    });

    test("6. Valid mentor removal", async () => {
        const res = await request(app)
            .delete(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Mentor removed successfully");

        const getRes = await request(app)
            .get(`/api/projects/${projectId}/mentor`)
            .set("Authorization", `Bearer ${uniToken}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.mentor).toBeNull();
    });
});
