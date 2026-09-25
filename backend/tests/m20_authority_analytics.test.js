const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

let adminToken;
let citizenToken;

beforeAll(async () => {
    // 1. Create ADMIN
    const adminRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Authority Admin",
            email: `admin_${Date.now()}@civicsync.gov.in`,
            password: "Password123!",
            role: "ADMIN"
        });
    adminToken = adminRes.body.token;

    // 2. Create CITIZEN
    const citizenRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Normal Citizen",
            email: `citizen_${Date.now()}@civicsync.in`,
            password: "Password123!",
            role: "CITIZEN"
        });
    citizenToken = citizenRes.body.token;

    // We don't seed heavily here because the prompt asks to test that "empty database does not crash aggregation"
    // and just verify the structure is correct.
});

afterAll(async () => {
    // Cleanup users
    await pool.query("DELETE FROM users WHERE email LIKE '%@civicsync.gov.in' OR email LIKE '%@civicsync.in'");
});

describe("M20 - Authority Dashboard Analytics", () => {
    test("1. Unauthorized roles cannot access authority analytics", async () => {
        const res = await request(app)
            .get("/api/authority/dashboard/summary")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(403);
    });

    test("2. Admin can retrieve analytics and empty database does not crash aggregation", async () => {
        const res = await request(app)
            .get("/api/authority/dashboard/summary")
            .set("Authorization", `Bearer ${adminToken}`);
        
        expect(res.status).toBe(200);
        
        const summary = res.body;
        expect(summary).toBeDefined();
        expect(summary.institutional_projects).toBeDefined();
        
        const ip = summary.institutional_projects;
        expect(typeof ip.total_projects).toBe("number");
        expect(typeof ip.participating_universities).toBe("number");
        
        expect(ip.lifecycle).toBeDefined();
        expect(typeof ip.lifecycle.CHALLENGE_ACCEPTED).toBe("number");
        expect(typeof ip.lifecycle.COMPLETED).toBe("number");
        
        expect(ip.academic_participation).toBeDefined();
        expect(typeof ip.academic_participation.students).toBe("number");
        
        expect(ip.industry).toBeDefined();
        expect(typeof ip.industry.total_collaborations).toBe("number");
        
        expect(ip.funding).toBeDefined();
        expect(typeof ip.funding.funding_requests).toBe("number");
    });
});
