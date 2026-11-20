const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

let uniToken;
let citizenToken;
let startupToken;
let otherStartupToken;
let uniUserId;
let startupUserId;
let otherStartupUserId;
let projectId;
let collabId;

beforeAll(async () => {
    // 1. Create University
    const uniEmail = `uni_collab_${Date.now()}@civicsync.gov.in`;
    const uniRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test University",
            email: uniEmail,
            password: "Password123!",
            role: "UNIVERSITY"
        });
    uniToken = uniRes.body.token;
    const uniUser = await pool.query("SELECT id FROM users WHERE email = $1", [uniEmail]);
    uniUserId = uniUser.rows[0].id;

    // 2. Create Citizen (for unauthorized check)
    const citRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test Citizen",
            email: `cit_collab_${Date.now()}@civicsync.gov.in`,
            password: "Password123!",
            role: "CITIZEN"
        });
    citizenToken = citRes.body.token;

    // 3. Create Startup
    const startup1Email = `startup1_${Date.now()}@civicsync.gov.in`;
    const startupRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test Startup",
            email: startup1Email,
            password: "Password123!",
            role: "STARTUP"
        });
    startupToken = startupRes.body.token;
    const startupUser = await pool.query("SELECT id FROM users WHERE email = $1", [startup1Email]);
    startupUserId = startupUser.rows[0].id;

    // 4. Create another Startup
    const startup2Email = `startup2_${Date.now()}@civicsync.gov.in`;
    const otherStartupRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Test Startup 2",
            email: startup2Email,
            password: "Password123!",
            role: "STARTUP"
        });
    otherStartupToken = otherStartupRes.body.token;
    const otherStartupUser = await pool.query("SELECT id FROM users WHERE email = $1", [startup2Email]);
    otherStartupUserId = otherStartupUser.rows[0].id;

    // 5. Create a problem and project
    console.log("M22 debug - uniUserId:", uniUserId);
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

describe("M22 - Industry Collaboration", () => {
    test("1. Reject unauthorized user inviting partner", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/collaborations`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ partner_id: startupUserId });
        expect(res.status).toBe(403);
    });

    test("2. University can invite Startup/MSME", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/collaborations`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ partner_id: startupUserId });
        
        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Partner invited");
        expect(res.body.collaboration).toBeDefined();
        collabId = res.body.collaboration.id;

        // Activity log check
        const actRes = await request(app)
            .get(`/api/projects/${projectId}/activity`)
            .set("Authorization", `Bearer ${uniToken}`);
        const actions = actRes.body.activity.map(a => a.action);
        expect(actions).toContain("INDUSTRY_INVITED");
    });

    test("3. Reject duplicate invitation", async () => {
        const res = await request(app)
            .post(`/api/projects/${projectId}/collaborations`)
            .set("Authorization", `Bearer ${uniToken}`)
            .send({ partner_id: startupUserId });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Collaboration already exists");
    });

    test("4. Startup/MSME can see its own invitation", async () => {
        const res = await request(app)
            .get(`/api/projects/${projectId}/collaborations`)
            .set("Authorization", `Bearer ${startupToken}`);
        expect(res.status).toBe(200);
        expect(res.body.collaborations).toBeDefined();
        const myCollab = res.body.collaborations.find(c => c.partner_id === startupUserId);
        expect(myCollab).toBeDefined();
        expect(myCollab.collaboration_status).toBe("INVITED");
    });

    test("5. Startup/MSME cannot modify another organization's collaboration", async () => {
        const res = await request(app)
            .patch(`/api/projects/${projectId}/collaborations/${collabId}`)
            .set("Authorization", `Bearer ${otherStartupToken}`)
            .send({ status: "ACCEPTED" });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized to modify this collaboration");
    });

    test("6. Startup/MSME can accept invitation", async () => {
        const res = await request(app)
            .patch(`/api/projects/${projectId}/collaborations/${collabId}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ status: "ACCEPTED" });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Collaboration updated");
        expect(res.body.collaboration.collaboration_status).toBe("ACCEPTED");

        // Activity log check
        const actRes = await request(app)
            .get(`/api/projects/${projectId}/activity`)
            .set("Authorization", `Bearer ${uniToken}`);
        const actions = actRes.body.activity.map(a => a.action);
        expect(actions).toContain("INDUSTRY_ACCEPTED");
    });

    test("7. Startup/MSME can decline/cancel active", async () => {
        const res = await request(app)
            .patch(`/api/projects/${projectId}/collaborations/${collabId}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ status: "DECLINED" });
        expect(res.status).toBe(200);
        expect(res.body.collaboration.collaboration_status).toBe("DECLINED");

        // Activity log check
        const actRes = await request(app)
            .get(`/api/projects/${projectId}/activity`)
            .set("Authorization", `Bearer ${uniToken}`);
        const actions = actRes.body.activity.map(a => a.action);
        expect(actions).toContain("INDUSTRY_DECLINED");
    });
});
