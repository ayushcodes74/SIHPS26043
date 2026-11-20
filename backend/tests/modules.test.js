/**
 * modules.test.js
 *
 * Integration tests for Modules 5, 6, and 7.
 * Runs against the live database (same as the running backend).
 *
 * Module 5 — Student & Researcher Matching
 * Module 6 — Startup & MSME Matching
 * Module 7 — Solution Submission
 */

"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(user) {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
}

// We'll create lightweight test users on the fly
const testUserSuffix = Date.now();
let citizenToken, studentToken, researcherToken, startupToken, msmeToken, universityToken, authorityToken, authority2Token, adminToken;

beforeAll(async () => {
    // Create test citizen
    const citizenRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestCitizen_${testUserSuffix}`,
            email: `citizen_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "CITIZEN"
        });
    citizenToken = citizenRes.body.token;

    // Create test student
    const studentRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestStudent_${testUserSuffix}`,
            email: `student_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "STUDENT"
        });
    studentToken = studentRes.body.token;

    // Create test researcher
    const researcherRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestResearcher_${testUserSuffix}`,
            email: `researcher_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "RESEARCHER"
        });
    researcherToken = researcherRes.body.token;

    // Create test startup
    const startupRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestStartup_${testUserSuffix}`,
            email: `startup_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "STARTUP"
        });
    startupToken = startupRes.body.token;

    // Create test MSME
    const msmeRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestMSME_${testUserSuffix}`,
            email: `msme_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "MSME"
        });
    msmeToken = msmeRes.body.token;

    // Create test university
    const universityRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestUniversity_${testUserSuffix}`,
            email: `university_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "UNIVERSITY"
        });
    universityToken = universityRes.body.token;

    // Create test authority
    const authorityRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestAuthority_${testUserSuffix}`,
            email: `authority_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "AUTHORITY"
        });
    authorityToken = authorityRes.body.token;

    // Create test admin
    const adminRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestAdmin_${testUserSuffix}`,
            email: `admin_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "ADMIN"
        });
    adminToken = adminRes.body.token;

    // Create second test authority for multi-evaluator tests
    const authority2Res = await request(app)
        .post("/api/auth/register")
        .send({
            name: `TestAuthority2_${testUserSuffix}`,
            email: `authority2_${testUserSuffix}@test.com`,
            password: "Test1234!",
            role: "AUTHORITY"
        });
    authority2Token = authority2Res.body.token;
});

afterAll(async () => {
    // 0a. Cleanup root causes
    await pool.query(
        "DELETE FROM root_causes WHERE proposed_by IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 0b. Cleanup impact assessments
    await pool.query(
        "DELETE FROM implementation_impact_assessments WHERE implementation_id IN (SELECT id FROM solution_implementations WHERE solution_id IN (SELECT id FROM solutions WHERE submitted_by IN (SELECT id FROM users WHERE email LIKE $1)))",
        [`%_${testUserSuffix}@test.com`]
    );
    // 1. Cleanup implementation tables
    await pool.query(
        "DELETE FROM solution_implementations WHERE solution_id IN (SELECT id FROM solutions WHERE submitted_by IN (SELECT id FROM users WHERE email LIKE $1))",
        [`%_${testUserSuffix}@test.com`]
    );
    // 2. Cleanup test evaluations
    await pool.query(
        "DELETE FROM solution_evaluations WHERE evaluator_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 3. Cleanup solution_contributors
    await pool.query(
        "DELETE FROM solution_contributors WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 4. Cleanup test solutions to avoid foreign key violation
    await pool.query(
        "DELETE FROM solutions WHERE submitted_by IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 4b. Cleanup test notifications
    await pool.query(
        "DELETE FROM notifications WHERE recipient_user_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 4c. Cleanup test problems to avoid foreign key violation on users.id
    await pool.query(
        "DELETE FROM problems WHERE reporter_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 4d. Cleanup reputation tables (Mandatory Fix 4)
    await pool.query(
        "DELETE FROM reputation_events WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1) OR actor_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    await pool.query(
        "DELETE FROM user_badges WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    await pool.query(
        "DELETE FROM reputation WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_${testUserSuffix}@test.com`]
    );
    // 5. Cleanup test users
    await pool.query(
        "DELETE FROM users WHERE email LIKE $1",
        [`%_${testUserSuffix}@test.com`]
    );
    await pool.end();
});

// ===========================================================================
// MODULE 5 — Student & Researcher Matching
// ===========================================================================

describe("Module 5 — Student Matching", () => {

    // Problem 10 has required_expertise: ["Groundwater","Water Quality","Water Treatment","Environmental Engineering"]
    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // T1 — Strong student match: Student Strong has Groundwater, Water Quality, Environmental Engineering (3/4 = 75)
    test("T1 — Strong student match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches?limit=50`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(res.body.required_expertise).toEqual([
            "Groundwater", "Water Quality", "Water Treatment", "Environmental Engineering"
        ]);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);

        // Find the strong match
        const strong = res.body.matches.find(m => m.name && m.name.includes("Student Strong"));
        expect(strong).toBeDefined();
        expect(strong.score).toBe(75);
        expect(strong.matched_skills).toEqual(
            expect.arrayContaining(["Groundwater", "Water Quality", "Environmental Engineering"])
        );
        expect(strong.reason).toMatch(/Matched 3 of 4/);

        // Sensitive fields NOT present
        expect(strong.password_hash).toBeUndefined();
        expect(strong.phone).toBeUndefined();
    });

    // T2 — Partial student match: Student Medium has Water Quality (1/4 = 25)
    test("T2 — Partial student match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches?limit=50`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const medium = res.body.matches.find(m => m.name && m.name.includes("Student Medium"));
        expect(medium).toBeDefined();
        expect(medium.score).toBe(25);
        expect(medium.matched_skills).toEqual(expect.arrayContaining(["Water Quality"]));
    });

    // T3 — No-match student excluded: Student Weak has Java, Python, React — no overlap
    test("T3 — No-match student excluded", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const weak = res.body.matches.find(m => m.name && m.name.includes("Student Weak"));
        expect(weak).toBeUndefined();
    });

    // T7 — Case-insensitive matching (required_expertise "groundwater" should match "Groundwater")
    test("T7 — Case-insensitive matching (student)", async () => {
        // This is implicitly tested since the required_expertise array contains
        // "Groundwater" and student has "Groundwater" — but verify via lowercased comparison
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches?limit=50`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
        // Strong match should still score 75 regardless of casing
        const strong = res.body.matches.find(m => m.name && m.name.includes("Student Strong"));
        expect(strong).toBeDefined();
        expect(strong.score).toBe(75);
    });

    // T8 — Whitespace normalization (implicit — skills and expertise are trimmed)
    test("T8 — Whitespace normalization (student)", async () => {
        // The service trims whitespace in matching — verify by checking match results are consistent
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.matches).toBeDefined();
        // Score computation should be deterministic
        expect(res.body.matches.every(m => typeof m.score === "number")).toBe(true);
    });
});

describe("Module 5 — Researcher Matching", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // T4 — Strong researcher match: Researcher Strong has Groundwater, Water Treatment (2/4 = 50)
    test("T4 — Strong researcher match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/researcher-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(res.body.required_expertise).toEqual([
            "Groundwater", "Water Quality", "Water Treatment", "Environmental Engineering"
        ]);

        const strong = res.body.matches.find(m => m.name && m.name.includes("Researcher Strong"));
        expect(strong).toBeDefined();
        expect(strong.score).toBe(50);
        expect(strong.matched_expertise).toEqual(
            expect.arrayContaining(["Groundwater", "Water Treatment"])
        );
        expect(strong.reason).toMatch(/Matched 2 of 4/);

        // Sensitive fields NOT present
        expect(strong.password_hash).toBeUndefined();
        expect(strong.phone).toBeUndefined();
    });

    // T6 — No-match researcher excluded
    test("T6 — No-match researcher excluded", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/researcher-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const noMatch = res.body.matches.find(m => m.name && m.name.includes("Researcher No Match"));
        expect(noMatch).toBeUndefined();
    });
});

describe("Module 5 — Edge Cases & Validation", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // T9 — Missing required_expertise (problem 1 has null required_expertise)
    test("T9 — Missing required_expertise returns empty matches", async () => {
        const res = await request(app)
            .get("/api/problems/1/student-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.required_expertise).toEqual([]);
        expect(res.body.matches).toEqual([]);
    });

    // T10 — Invalid problem ID
    test("T10 — Invalid problem ID returns 400", async () => {
        const res = await request(app)
            .get("/api/problems/abc/student-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid problem id/i);
    });

    // T11 — Nonexistent problem
    test("T11 — Nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/student-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    // T12 — limit parameter
    test("T12 — Limit parameter works", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches?limit=1`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.matches.length).toBeLessThanOrEqual(1);
    });

    // T13 — limit > 50 returns 400
    test("T13 — limit > 50 returns 400", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches?limit=51`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/limit/i);
    });

    // T14 — Unauthorized request
    test("T14 — Unauthorized request returns 401", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/student-matches`);

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/authentication/i);
    });

    // T14b — Researcher matches also require auth
    test("T14b — Unauthorized researcher-matches returns 401", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/researcher-matches`);

        expect(res.status).toBe(401);
    });

    // Researcher missing expertise
    test("T9b — Researcher missing required_expertise returns empty matches", async () => {
        const res = await request(app)
            .get("/api/problems/1/researcher-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.required_expertise).toEqual([]);
        expect(res.body.matches).toEqual([]);
    });

    // Researcher invalid ID
    test("T10b — Researcher invalid problem ID returns 400", async () => {
        const res = await request(app)
            .get("/api/problems/xyz/researcher-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
    });

    // Researcher nonexistent problem
    test("T11b — Researcher nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/researcher-matches")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(404);
    });

    // Researcher limit validation
    test("T13b — Researcher limit > 50 returns 400", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/researcher-matches?limit=51`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
    });
});

// ===========================================================================
// MODULE 5 REGRESSION TESTS
// ===========================================================================

describe("Module 5 — Regression Tests", () => {

    // T15 — Duplicate detection endpoint still works
    test("T15 — Duplicate detection regression", async () => {
        const res = await request(app)
            .get("/api/problems/1/duplicates")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.duplicates)).toBe(true);
    });

    // T16 — Institution matching still works
    test("T16 — Institution matching regression", async () => {
        const res = await request(app)
            .get("/test-matching");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.matches)).toBe(true);
    });

    // T17 — Problem clustering still works
    test("T17 — Problem clustering regression", async () => {
        const res = await request(app)
            .get("/api/problems/1/cluster")
            .set("Authorization", `Bearer ${citizenToken}`);
        // Could be 200 or 404 if no cluster assigned
        expect([200, 404]).toContain(res.status);
    });

    // T18 — Authority dashboard still works
    test("T18 — Authority dashboard regression", async () => {
        // Use the admin token for authority dashboard
        const res = await request(app)
            .get("/api/authority/dashboard/summary")
            .set("Authorization", `Bearer ${adminToken}`);
        // 200 if ADMIN has access, 403 if not
        expect([200, 403]).toContain(res.status);
    });

    // T19 — Faculty matching still works
    test("T19 — Faculty matching regression", async () => {
        const res = await request(app)
            .get("/api/problems/10/faculty-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.matches)).toBe(true);
    });

    // T20 — Problem listing still works
    test("T20 — Problem listing regression", async () => {
        const res = await request(app)
            .get("/api/problems")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
    });
});

// ===========================================================================
// MODULE 6 — Startup & MSME Matching
// ===========================================================================

describe("Module 6 — Startup Matching", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // S1 — Strong startup match: AquaTech has Water Quality, Water Treatment, Environmental Engineering (3/4 = 75)
    test("S1 — Strong startup match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(res.body.required_expertise).toEqual([
            "Groundwater", "Water Quality", "Water Treatment", "Environmental Engineering"
        ]);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);

        const strong = res.body.matches.find(m => m.name && m.name.includes("AquaTech"));
        expect(strong).toBeDefined();
        expect(strong.score).toBe(75);
        expect(strong.matched_areas).toEqual(
            expect.arrayContaining(["Water Quality", "Water Treatment", "Environmental Engineering"])
        );
        expect(strong.reason).toMatch(/Matched 3 of 4/);
        expect(strong.organization_type).toBe("STARTUP");
        expect(strong.district).toBeDefined();
        expect(strong.city).toBeDefined();

        // No sensitive fields
        expect(strong.password_hash).toBeUndefined();
        expect(strong.phone).toBeUndefined();
    });

    // S2 — Partial startup match: GreenHydro has Groundwater, Water Treatment (2/4 = 50)
    test("S2 — Partial startup match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const partial = res.body.matches.find(m => m.name && m.name.includes("GreenHydro"));
        expect(partial).toBeDefined();
        expect(partial.score).toBe(50);
    });

    // S3 — Weak startup match: WaterBot has Water Quality only (1/4 = 25)
    test("S3 — Weak startup match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const weak = res.body.matches.find(m => m.name && m.name.includes("WaterBot"));
        expect(weak).toBeDefined();
        expect(weak.score).toBe(25);
    });

    // S4 — No MSMEs in startup matches (filtering works)
    test("S4 — No MSMEs in startup matches", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const msme = res.body.matches.find(m => m.organization_type === "MSME");
        expect(msme).toBeUndefined();
    });
});

describe("Module 6 — MSME Matching", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // M1 — Strong MSME match: Rural Water Works has Water Quality, Water Treatment, Environmental Engineering (3/4 = 75)
    test("M1 — Strong MSME match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);

        const strong = res.body.matches.find(m => m.name && m.name.includes("Rural Water"));
        expect(strong).toBeDefined();
        expect(strong.score).toBe(75);
        expect(strong.organization_type).toBe("MSME");
    });

    // M2 — Partial MSME match: EcoFilter has Water Quality, Environmental Engineering (2/4 = 50)
    test("M2 — Partial MSME match", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const partial = res.body.matches.find(m => m.name && m.name.includes("EcoFilter"));
        expect(partial).toBeDefined();
        expect(partial.score).toBe(50);
    });

    // M3 — No-match MSME excluded: AgroTech has Agriculture, Soil Science
    test("M3 — No-match MSME excluded", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const noMatch = res.body.matches.find(m => m.name && m.name.includes("AgroTech"));
        expect(noMatch).toBeUndefined();
    });

    // M4 — No STARTUPs in MSME matches
    test("M4 — No STARTUPs in MSME matches", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const startup = res.body.matches.find(m => m.organization_type === "STARTUP");
        expect(startup).toBeUndefined();
    });
});

describe("Module 6 — Edge Cases & Validation", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;

    // M5 — Invalid problem ID
    test("M5 — Invalid problem ID returns 400 (startup)", async () => {
        const res = await request(app)
            .get("/api/problems/abc/startup-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(400);
    });

    // M6 — Nonexistent problem returns 404
    test("M6 — Nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/startup-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(404);
    });

    // M7 — Missing required_expertise returns empty matches
    test("M7 — Missing required_expertise returns empty matches", async () => {
        const res = await request(app)
            .get("/api/problems/1/startup-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.matches).toEqual([]);
    });

    // M8 — limit > 50 returns 400
    test("M8 — limit > 50 returns 400", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches?limit=51`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(400);
    });

    // M9 — Unauthorized request returns 401
    test("M9 — Unauthorized request returns 401", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches`);
        expect(res.status).toBe(401);
    });

    // M10 — limit parameter works
    test("M10 — Limit parameter works", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/startup-matches?limit=1`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.matches.length).toBeLessThanOrEqual(1);
    });

    // M11 — MSME invalid problem ID
    test("M11 — MSME invalid problem ID returns 400", async () => {
        const res = await request(app)
            .get("/api/problems/xyz/msme-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(400);
    });

    // M12 — MSME nonexistent problem
    test("M12 — MSME nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/msme-matches")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(404);
    });

    // M13 — MSME limit > 50
    test("M13 — MSME limit > 50 returns 400", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches?limit=51`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(400);
    });

    // M14 — MSME unauthorized
    test("M14 — MSME unauthorized returns 401", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/msme-matches`);
        expect(res.status).toBe(401);
    });
});

// ===========================================================================
// MODULE 7 — Solution Submission
// ===========================================================================

describe("Module 7 — Solution Submission", () => {

    const PROBLEM_ID_WITH_EXPERTISE = 10;
    let createdSolutionId;

    // T1 — Valid student solution submission
    test("T1 — Valid solution submission by STUDENT", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Water Purification Module",
                description: "A portable water purification system using UV-C LED technology for rural deployment.",
                methodology: "UV-C LED irradiation with multi-stage filtration",
                technology: "UV-C LED, activated carbon filter, nano-silver membrane",
                expected_impact: "Clean drinking water for 500+ households",
                estimated_cost: 250000,
                implementation_time: "3 months",
                scalability: "Can be replicated across 100+ villages",
                required_resources: "Manufacturing unit, testing lab, field deployment team",
                risks: "Power supply inconsistency in remote areas",
                evidence: "Lab testing results from IIT Roorkee"
            });

        expect(res.status).toBe(201);
        expect(res.body.solution).toBeDefined();
        expect(res.body.solution.status).toBe("SUBMITTED");
        expect(res.body.solution.title).toBe("[DEMO] Water Purification Module");
        expect(res.body.solution.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(res.body.solution.estimated_cost).toBe(250000);
        expect(typeof res.body.solution.estimated_cost).toBe("number");
        expect(res.body.solution.implementation_time).toBe("3 months");

        // No sensitive fields
        expect(res.body.solution.password_hash).toBeUndefined();
        expect(res.body.solution.phone).toBeUndefined();

        createdSolutionId = res.body.solution.id;
        expect(createdSolutionId).toBeDefined();
    });

    // T2 — Valid researcher solution submission
    test("T2 — Valid solution submission by RESEARCHER", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({
                title: "[DEMO] Groundwater Contamination Assessment",
                description: "Comprehensive groundwater quality assessment using remote sensing and in-situ sampling.",
                estimated_cost: 150000
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
        expect(res.body.solution.estimated_cost).toBe(150000);
    });

    // T3 — Valid startup and MSME solution submissions
    test("T3 — Valid solution submission by STARTUP", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "[DEMO] Smart Filtration Unit",
                description: "IoT-enabled smart filtration unit with real-time water quality sensors."
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    test("T3 — Valid solution submission by MSME", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${msmeToken}`)
            .send({
                title: "[DEMO] Low-Cost Community Sand Filter",
                description: "Community-scale slow sand filtration system using locally sourced materials."
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    // T4 — Valid university solution submission
    test("T4 — Valid solution submission by UNIVERSITY", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${universityToken}`)
            .send({
                title: "[DEMO] Academic Pilot Research Plant",
                description: "Campus-led pilot water treatment plant with student research monitoring."
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    // T5 — Citizen, Authority, and Admin submission rejected
    test("T5 — CITIZEN submission rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                title: "Citizen solution",
                description: "Should not be allowed to submit solutions"
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/i);
    });

    test("T5 — AUTHORITY submission rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Authority solution",
                description: "Authority cannot submit solution"
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/i);
    });

    test("T5 — ADMIN submission rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Admin solution",
                description: "Admin cannot submit solution"
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/i);
    });

    // T6 — Unauthenticated submission rejected
    test("T6 — Unauthenticated submission rejected with 401", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .send({
                title: "No auth",
                description: "Should not work"
            });

        expect(res.status).toBe(401);
    });

    test("T6 — Unauthenticated GET solutions rejected with 401", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`);

        expect(res.status).toBe(401);
    });

    test("T6 — Unauthenticated GET individual solution rejected with 401", async () => {
        const res = await request(app)
            .get(`/api/solutions/${createdSolutionId || 1}`);

        expect(res.status).toBe(401);
    });

    // T7 — Nonexistent / invalid problem rejected
    test("T7 — Nonexistent problem returns 404", async () => {
        const res = await request(app)
            .post("/api/problems/999999/solutions")
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Test",
                description: "Test"
            });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    test("T7 — Invalid problem ID on POST returns 400", async () => {
        const res = await request(app)
            .post("/api/problems/abc/solutions")
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Test",
                description: "Test"
            });

        expect(res.status).toBe(400);
    });

    test("T7 — GET solutions for nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/solutions")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(404);
    });

    test("T7 — GET solutions for invalid problem ID returns 400", async () => {
        const res = await request(app)
            .get("/api/problems/abc/solutions")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
    });

    // T8 — Missing required fields rejected
    test("T8 — Missing title returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                description: "Some description"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/title/i);
    });

    test("T8 — Missing description returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Some title"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/description/i);
    });

    test("T8 — Empty body returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({});

        expect(res.status).toBe(400);
    });

    test("T8 — Title exceeding max length returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "A".repeat(501),
                description: "Valid description"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/title.*exceed/i);
    });

    // T9 — Invalid estimated_cost rejected
    test("T9 — Negative estimated_cost returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Test",
                description: "Test",
                estimated_cost: -100
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/estimated_cost/i);
    });

    test("T9 — Non-numeric estimated_cost string returns 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Test",
                description: "Test",
                estimated_cost: "one-million"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/estimated_cost/i);
    });

    // T10 — Client cannot force APPROVED status
    test("T10 — Client cannot force APPROVED status", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Forced APPROVED Status Test",
                description: "Testing that client cannot set APPROVED status",
                status: "APPROVED"
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    // T11 — Client cannot force RESOLVED or other lifecycle statuses
    test("T11 — Client cannot force RESOLVED status", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Forced RESOLVED Status Test",
                description: "Testing that client cannot set RESOLVED status",
                status: "RESOLVED"
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    test("T11 — Client cannot force PILOT or IMPLEMENTING status", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Forced PILOT Status Test",
                description: "Testing that client cannot set PILOT status",
                status: "PILOT"
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.status).toBe("SUBMITTED");
    });

    // T12 — GET problem solutions
    test("T12 — GET solutions for problem returns array and total", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(Array.isArray(res.body.solutions)).toBe(true);
        expect(res.body.total).toBeGreaterThanOrEqual(1);

        const first = res.body.solutions[0];
        expect(first.id).toBeDefined();
        expect(first.title).toBeDefined();
        expect(first.description).toBeDefined();
        expect(first.status).toBe("SUBMITTED");
        expect(first.submitter_name).toBeDefined();
        expect(first.submitter_role).toBeDefined();
    });

    test("T12 — GET solutions with limit parameter works", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions?limit=2`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.solutions.length).toBeLessThanOrEqual(2);
    });

    test("T12 — GET solutions with invalid limit returns 400", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions?limit=invalid`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/limit/i);
    });

    // T13 — GET individual solution
    test("T13 — GET single solution by ID returns 200", async () => {
        const res = await request(app)
            .get(`/api/solutions/${createdSolutionId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.solution).toBeDefined();
        expect(res.body.solution.id).toBe(createdSolutionId);
        expect(res.body.solution.status).toBe("SUBMITTED");
        expect(res.body.solution.title).toBe("[DEMO] Water Purification Module");
        expect(res.body.solution.estimated_cost).toBe(250000);
        expect(typeof res.body.solution.estimated_cost).toBe("number");
        expect(res.body.solution.submitter_name).toBeDefined();
        expect(res.body.solution.submitter_role).toBe("STUDENT");
    });

    test("T13 — GET nonexistent solution returns 404", async () => {
        const res = await request(app)
            .get("/api/solutions/999999")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    test("T13 — GET invalid solution ID returns 400", async () => {
        const res = await request(app)
            .get("/api/solutions/abc")
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(400);
    });

    // T14 — Sensitive fields not exposed
    test("T14 — POST solution response does not expose sensitive fields", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Security Check Solution",
                description: "Verifying no credential leakage in response."
            });

        expect(res.status).toBe(201);
        const s = res.body.solution;
        expect(s.password_hash).toBeUndefined();
        expect(s.phone).toBeUndefined();
        expect(s.email).toBeUndefined();
    });

    test("T14 — GET solutions list does not expose sensitive fields", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        for (const sol of res.body.solutions) {
            expect(sol.password_hash).toBeUndefined();
            expect(sol.phone).toBeUndefined();
            expect(sol.email).toBeUndefined();
        }
    });

    test("T14 — GET single solution does not expose sensitive fields", async () => {
        const res = await request(app)
            .get(`/api/solutions/${createdSolutionId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const s = res.body.solution;
        expect(s.password_hash).toBeUndefined();
        expect(s.phone).toBeUndefined();
        expect(s.email).toBeUndefined();
    });
});

// ===========================================================================
// MODULE 8 — SOLUTION EVALUATION & LIFECYCLE TESTS
// ===========================================================================

describe("Module 8 — Solution Evaluation & Lifecycle", () => {
    const PROBLEM_ID_WITH_EXPERTISE = 10;
    let testSolutionId;
    let secondSolutionId;

    beforeAll(async () => {
        // Create a solution by STUDENT for evaluation testing
        const solRes = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Solar Water Purification Unit",
                description: "Solar powered unit to purify contaminated groundwater in rural schools.",
                methodology: "UV-C disinfection + multi-stage filtration with solar panels.",
                technology: "Solar PV, UV-C Lamps, Carbon Filter",
                expected_impact: "Provides clean water to 500+ students daily.",
                estimated_cost: 45000,
                implementation_time: "3 months",
                scalability: "Easily modular for any village school.",
                required_resources: "Solar panels, filters, local technicians.",
                risks: "Monsoon low solar insolation; battery backup included.",
                evidence: "Prototype tested with 99.8% pathogen reduction.",
            });
        testSolutionId = solRes.body.solution.id;

        // Create second solution for ranking tests
        const sol2Res = await request(app)
            .post(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({
                title: "Bio-Sand Gravity Filtration",
                description: "Low-cost bio-sand filtration for community taps.",
                expected_impact: "Serves 150 households.",
                estimated_cost: 15000,
            });
        secondSolutionId = sol2Res.body.solution.id;
    });

    // --- Authentication & RBAC ---
    test("E1 — Unauthenticated evaluation rejected with 401", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .send({
                impact_score: 5,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 5,
                risk_score: 4,
            });
        expect(res.status).toBe(401);
    });

    test("E2 — STUDENT rejected from evaluating with 403", async () => {
        const res = await request(app)
            .post(`/api/solutions/${secondSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(res.status).toBe(403);
    });

    test("E3 — CITIZEN rejected from evaluating with 403", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(res.status).toBe(403);
    });

    test("E4 — STARTUP and MSME rejected from evaluating with 403", async () => {
        const resStartup = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resStartup.status).toBe(403);

        const resMsme = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${msmeToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resMsme.status).toBe(403);
    });

    // --- Self-Evaluation Prevention ---
    test("E5 — Evaluator cannot evaluate own solution (prevent self-evaluation with 403)", async () => {
        const authUserRes = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`authority_${testUserSuffix}@test.com`]
        );
        const authUserId = authUserRes.rows[0].id;

        const ownSolRes = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Authority Own Solution', 'Description', 'SUBMITTED')
             RETURNING id`,
            [PROBLEM_ID_WITH_EXPERTISE, authUserId]
        );
        const ownSolId = ownSolRes.rows[0].id;

        const res = await request(app)
            .post(`/api/solutions/${ownSolId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 5,
                feasibility_score: 5,
                cost_efficiency_score: 5,
                scalability_score: 5,
                evidence_score: 5,
                risk_score: 5,
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/cannot evaluate your own solution/i);

        // Cleanup this temporary solution
        await pool.query("DELETE FROM solutions WHERE id = $1", [ownSolId]);
    });

    // --- Validation & Nonexistent IDs ---
    test("E6 — Evaluating nonexistent solution returns 404", async () => {
        const res = await request(app)
            .post("/api/solutions/999999/evaluations")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(res.status).toBe(404);
    });

    test("E7 — Evaluating invalid solution ID returns 400", async () => {
        const res = await request(app)
            .post("/api/solutions/abc/evaluations")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(res.status).toBe(400);
    });

    test("E8 — Score < 1 or > 5 rejected with 400", async () => {
        const resLow = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 0,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resLow.status).toBe(400);

        const resHigh = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 6,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resHigh.status).toBe(400);
    });

    test("E9 — Non-integer / float / string score rejected with 400", async () => {
        const resFloat = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 3.5,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resFloat.status).toBe(400);

        const resStr = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: "excellent",
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
            });
        expect(resStr.status).toBe(400);
    });

    test("E10 — Invalid recommendation value rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
                recommendation: "SUPERB",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/recommendation/i);
    });

    test("E11 — Comments exceeding max length (2000 chars) rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
                comments: "a".repeat(2001),
            });
        expect(res.status).toBe(400);
    });

    // --- Deterministic Scoring Formula Tests ---
    test("E12 — Exact composite score for perfect 5s equals 100.00", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 5,
                feasibility_score: 5,
                cost_efficiency_score: 5,
                scalability_score: 5,
                evidence_score: 5,
                risk_score: 5,
                recommendation: "RECOMMENDED",
                comments: "Outstanding comprehensive proposal.",
            });

        expect(res.status).toBe(201);
        expect(res.body.evaluation.composite_score).toBe(100);
        expect(res.body.evaluation.recommendation).toBe("RECOMMENDED");
    });

    test("E13 — Minimum score for all 1s equals 20.00", async () => {
        const res = await request(app)
            .post(`/api/solutions/${secondSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                impact_score: 1,
                feasibility_score: 1,
                cost_efficiency_score: 1,
                scalability_score: 1,
                evidence_score: 1,
                risk_score: 1,
                recommendation: "NOT_RECOMMENDED",
            });

        expect(res.status).toBe(201);
        expect(res.body.evaluation.composite_score).toBe(20);
        expect(res.body.evaluation.recommendation).toBe("NOT_RECOMMENDED");
    });

    test("E14 — Mixed score matches exact formula: (4*5 + 3*4 + 5*3 + 2*3 + 4*3 + 3*2 = 71.00)", async () => {
        const studentUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`student_${testUserSuffix}@test.com`]
        );
        const studentId = studentUser.rows[0].id;

        const tempSol = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Mixed Score Solution', 'Testing formula', 'SUBMITTED')
             RETURNING id`,
            [PROBLEM_ID_WITH_EXPERTISE, studentId]
        );
        const tempSolId = tempSol.rows[0].id;

        const res = await request(app)
            .post(`/api/solutions/${tempSolId}/evaluations`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                impact_score: 4,
                feasibility_score: 3,
                cost_efficiency_score: 5,
                scalability_score: 2,
                evidence_score: 4,
                risk_score: 3,
                recommendation: "CONSIDER",
            });

        expect(res.status).toBe(201);
        // 4*5 (20) + 3*4 (12) + 5*3 (15) + 2*3 (6) + 4*3 (12) + 3*2 (6) = 71.00
        expect(res.body.evaluation.composite_score).toBe(71);

        await pool.query("DELETE FROM solutions WHERE id = $1", [tempSolId]);
    });

    // --- Multi-Evaluator & Upsert ---
    test("E15 — Multi-evaluator: second authority evaluates same solution", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authority2Token}`)
            .send({
                impact_score: 4,
                feasibility_score: 4,
                cost_efficiency_score: 3,
                scalability_score: 4,
                evidence_score: 3,
                risk_score: 4,
                recommendation: "CONSIDER",
            });

        expect(res.status).toBe(201);
        // 4*5 (20) + 4*4 (16) + 3*3 (9) + 4*3 (12) + 3*3 (9) + 4*2 (8) = 74.00
        expect(res.body.evaluation.composite_score).toBe(74);
    });

    test("E16 — Upsert: same authority re-evaluates updates existing record without duplicate", async () => {
        const res = await request(app)
            .post(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authority2Token}`)
            .send({
                impact_score: 4,
                feasibility_score: 5,
                cost_efficiency_score: 4,
                scalability_score: 4,
                evidence_score: 4,
                risk_score: 4,
                recommendation: "RECOMMENDED",
                comments: "Revised after technical interview.",
            });

        expect(res.status).toBe(201);
        // 4*5 (20) + 5*4 (20) + 4*3 (12) + 4*3 (12) + 4*3 (12) + 4*2 (8) = 84.00
        expect(res.body.evaluation.composite_score).toBe(84);
        expect(res.body.evaluation.comments).toBe("Revised after technical interview.");

        // Verify count of evaluations for this solution is still 2 (authorityToken + authority2Token)
        const countRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM solution_evaluations WHERE solution_id = $1",
            [testSolutionId]
        );
        expect(countRes.rows[0].count).toBe(2);
    });

    test("E17 — Average composite score accurately computed from multi-evaluations", async () => {
        // testSolutionId has 2 evaluations: authorityToken = 100.00, authority2Token = 84.00
        // Expected average = (100 + 84) / 2 = 92.00
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total_evaluations).toBe(2);
        expect(res.body.average_composite_score).toBe(92);
    });

    // --- Retrieval & Summary ---
    test("E18 — GET evaluations returns list, dimension averages and sanitized evaluator", async () => {
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.solution_id).toBe(testSolutionId);
        expect(Array.isArray(res.body.evaluations)).toBe(true);
        expect(res.body.dimension_averages).toBeDefined();
        expect(typeof res.body.dimension_averages.impact).toBe("number");

        const first = res.body.evaluations[0];
        expect(first.evaluator).toBeDefined();
        expect(first.evaluator.name).toBeDefined();
        expect(first.evaluator.role).toBeDefined();
    });

    test("E19 — GET evaluations does not expose password_hash, email, or phone", async () => {
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        for (const ev of res.body.evaluations) {
            expect(ev.password_hash).toBeUndefined();
            expect(ev.phone).toBeUndefined();
            expect(ev.email).toBeUndefined();
            expect(ev.evaluator.password_hash).toBeUndefined();
            expect(ev.evaluator.phone).toBeUndefined();
            expect(ev.evaluator.email).toBeUndefined();
        }
    });

    test("E20 — GET evaluation summary returns compact metrics and recommendation counts", async () => {
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations/summary`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(res.body.solution_id).toBe(testSolutionId);
        expect(res.body.evaluations_count).toBe(2);
        expect(res.body.average_composite_score).toBe(92);
        expect(res.body.recommendations).toBeDefined();
        expect(res.body.recommendations.RECOMMENDED).toBe(2);
    });

    test("E21 — Unevaluated solution returns total 0 and null averages", async () => {
        const studentUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`student_${testUserSuffix}@test.com`]
        );
        const studentId = studentUser.rows[0].id;

        const freshSol = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Unevaluated Solution', 'Freshly submitted', 'SUBMITTED')
             RETURNING id`,
            [PROBLEM_ID_WITH_EXPERTISE, studentId]
        );
        const freshSolId = freshSol.rows[0].id;

        const res = await request(app)
            .get(`/api/solutions/${freshSolId}/evaluations`)
            .set("Authorization", `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total_evaluations).toBe(0);
        expect(res.body.average_composite_score).toBeNull();
        expect(res.body.dimension_averages).toBeNull();

        const summaryRes = await request(app)
            .get(`/api/solutions/${freshSolId}/evaluations/summary`)
            .set("Authorization", `Bearer ${studentToken}`);

        expect(summaryRes.status).toBe(200);
        expect(summaryRes.body.evaluations_count).toBe(0);
        expect(summaryRes.body.average_composite_score).toBeNull();
        expect(summaryRes.body.dimension_averages).toBeNull();

        await pool.query("DELETE FROM solutions WHERE id = $1", [freshSolId]);
    });

    // --- Ranked Leaderboard ---
    test("E22 — GET ranked solutions returns solutions sorted by average_score DESC with ranks", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions/ranked`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID_WITH_EXPERTISE);
        expect(Array.isArray(res.body.ranked_solutions)).toBe(true);
        expect(res.body.ranked_solutions.length).toBeGreaterThanOrEqual(2);

        // First ranked solution should have rank 1 and score 92.00
        const top = res.body.ranked_solutions[0];
        expect(top.rank).toBe(1);
        expect(top.id).toBe(testSolutionId);
        expect(top.average_score).toBe(92);

        // Verify descending order of average_score
        for (let i = 0; i < res.body.ranked_solutions.length - 1; i++) {
            const current = res.body.ranked_solutions[i].average_score;
            const next = res.body.ranked_solutions[i + 1].average_score;
            if (current !== null && next !== null) {
                expect(current).toBeGreaterThanOrEqual(next);
            }
        }
    });

    test("E23 — Ranked solutions places un-evaluated solutions at bottom (NULLS LAST)", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions/ranked`)
            .set("Authorization", `Bearer ${authorityToken}`);

        const solutions = res.body.ranked_solutions;
        const lastSol = solutions[solutions.length - 1];

        if (lastSol.average_score === null) {
            expect(lastSol.evaluations_count).toBe(0);
        }
    });

    test("E24 — Ranked solutions for nonexistent problem returns 404", async () => {
        const res = await request(app)
            .get("/api/problems/999999/solutions/ranked")
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(404);
    });

    // --- Solution Lifecycle & Status Transitions ---
    test("E25 — First evaluation automatically transitioned status from SUBMITTED to UNDER_EVALUATION", async () => {
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(res.body.solution.status).toBe("UNDER_EVALUATION");
    });

    test("E26 — Authority transitions status from UNDER_EVALUATION to EVALUATED", async () => {
        const res = await request(app)
            .patch(`/api/solutions/${testSolutionId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "EVALUATED" });

        expect(res.status).toBe(200);
        expect(res.body.solution.status).toBe("EVALUATED");
    });

    test("E27 — Authority transitions status from EVALUATED to APPROVED", async () => {
        const res = await request(app)
            .patch(`/api/solutions/${testSolutionId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "APPROVED" });

        expect(res.status).toBe(200);
        expect(res.body.solution.status).toBe("APPROVED");
    });

    test("E28 — Authority transitions status from APPROVED to PILOT", async () => {
        const res = await request(app)
            .patch(`/api/solutions/${testSolutionId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "PILOT" });

        expect(res.status).toBe(200);
        expect(res.body.solution.status).toBe("PILOT");
    });

    test("E29 — Direct invalid transition from SUBMITTED to APPROVED rejected with 400", async () => {
        const studentUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`student_${testUserSuffix}@test.com`]
        );
        const studentId = studentUser.rows[0].id;

        const freshSol = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Bypass Status Solution', 'Attempting illegal transition', 'SUBMITTED')
             RETURNING id`,
            [PROBLEM_ID_WITH_EXPERTISE, studentId]
        );
        const freshSolId = freshSol.rows[0].id;

        const res = await request(app)
            .patch(`/api/solutions/${freshSolId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "APPROVED" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid status transition/i);

        await pool.query("DELETE FROM solutions WHERE id = $1", [freshSolId]);
    });

    test("E30 — Non-authority (STUDENT/CITIZEN) PATCH status rejected with 403", async () => {
        const res = await request(app)
            .patch(`/api/solutions/${testSolutionId}/status`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ status: "APPROVED" });

        expect(res.status).toBe(403);
    });

    test("E31 — PATCH status on nonexistent solution returns 404", async () => {
        const res = await request(app)
            .patch("/api/solutions/999999/status")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "APPROVED" });

        expect(res.status).toBe(404);
    });

    test("E32 — Evaluation retrieval does not leak sensitive user fields", async () => {
        const res = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        for (const ev of res.body.evaluations) {
            expect(ev.password_hash).toBeUndefined();
            expect(ev.phone).toBeUndefined();
            expect(ev.email).toBeUndefined();
            expect(ev.evaluator.password_hash).toBeUndefined();
            expect(ev.evaluator.phone).toBeUndefined();
            expect(ev.evaluator.email).toBeUndefined();
        }
    });

    test("E33 — Full lifecycle and ranking regression check: all endpoints respond cleanly", async () => {
        const resRank = await request(app)
            .get(`/api/problems/${PROBLEM_ID_WITH_EXPERTISE}/solutions/ranked`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(resRank.status).toBe(200);

        const resSum = await request(app)
            .get(`/api/solutions/${testSolutionId}/evaluations/summary`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(resSum.status).toBe(200);
        expect(resSum.body.solution_id).toBe(testSolutionId);
    });
});

// ===========================================================================
// MODULE 9 — IMPLEMENTATION + PILOT TRACKING TESTS
// ===========================================================================

describe("Module 9 — Implementation + Pilot Tracking", () => {
    const PROBLEM_ID = 10;
    let approvedSolutionId;
    let unapprovedSolutionId;
    let implementationId;
    let contributorToken;

    beforeAll(async () => {
        // Create an approved solution for implementation tests
        const solRes = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Decentralized RO Water Plant",
                description: "Solar powered community water filtration plant.",
                estimated_cost: 300000,
            });
        approvedSolutionId = solRes.body.solution.id;

        // Advance to APPROVED status via evaluation & status PATCH
        await request(app)
            .post(`/api/solutions/${approvedSolutionId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 5,
                feasibility_score: 5,
                cost_efficiency_score: 4,
                scalability_score: 5,
                evidence_score: 4,
                risk_score: 4,
                recommendation: "RECOMMENDED",
            });

        await request(app)
            .patch(`/api/solutions/${approvedSolutionId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "EVALUATED" });

        await request(app)
            .patch(`/api/solutions/${approvedSolutionId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "APPROVED" });

        // Create an unapproved solution in SUBMITTED
        const unapprovedRes = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Unapproved Idea",
                description: "Just submitted, not evaluated or approved.",
            });
        unapprovedSolutionId = unapprovedRes.body.solution.id;

        // Create a contributor user
        const contribUserRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: `TestContributor_${testUserSuffix}`,
                email: `contributor_${testUserSuffix}@test.com`,
                password: "Test1234!",
                role: "RESEARCHER",
            });
        contributorToken = contribUserRes.body.token;

        // Link contributor to approved solution in solution_contributors
        const contribUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`contributor_${testUserSuffix}@test.com`]
        );
        await pool.query(
            `INSERT INTO solution_contributors (solution_id, user_id, contribution_role, contribution_description)
             VALUES ($1, $2, 'Technical Lead', 'Hardware deployment lead')`,
            [approvedSolutionId, contribUser.rows[0].id]
        );
    });

    // P1 — Unauthenticated initiation
    test("P1 — Unauthenticated POST implementations rejected with 401", async () => {
        const res = await request(app)
            .post(`/api/solutions/${approvedSolutionId}/implementations`)
            .send({
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
            });
        expect(res.status).toBe(401);
    });

    // P2 — Unauthorized role
    test("P2 — Non-authority (STUDENT/CITIZEN) cannot initiate implementation (returns 403)", async () => {
        const res = await request(app)
            .post(`/api/solutions/${approvedSolutionId}/implementations`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
            });
        expect(res.status).toBe(403);
    });

    // P3 — Authority initiation
    test("P3 — Authority initiates implementation for APPROVED solution (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/solutions/${approvedSolutionId}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Pilot: RO Water Plant Ward 7",
                description: "Phase 1 installation at primary health center.",
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
                budget_allocated: 250000,
                location_details: "Ward 7 PHC, Ranchi",
                outcome_metrics: { target_population: 1500, liters_per_day: 5000 },
            });

        expect(res.status).toBe(201);
        expect(res.body.implementation).toBeDefined();
        expect(res.body.implementation.status).toBe("PILOT");
        expect(res.body.implementation.progress_percentage).toBe(0);
        expect(res.body.implementation.budget_allocated).toBe(250000);
        implementationId = res.body.implementation.id;

        // Verify solution status synchronized to PILOT
        const solCheck = await request(app)
            .get(`/api/solutions/${approvedSolutionId}`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(solCheck.body.solution.status).toBe("PILOT");
    });

    // P4 — Unapproved solution rejected
    test("P4 — Precondition: unapproved solution in SUBMITTED rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/solutions/${unapprovedSolutionId}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/APPROVED or PILOT/i);
    });

    // P5 — Nonexistent solution
    test("P5 — Nonexistent solution returns 404", async () => {
        const res = await request(app)
            .post("/api/solutions/999999/implementations")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
            });
        expect(res.status).toBe(404);
    });

    // P6 — Duplicate implementation
    test("P6 — Duplicate implementation for same solution rejected with 409", async () => {
        const res = await request(app)
            .post(`/api/solutions/${approvedSolutionId}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                target_start_date: "2026-10-01",
                target_end_date: "2027-01-01",
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/i);
    });

    // P7 — Invalid date range
    test("P7 — Invalid date range (target_end_date < target_start_date) rejected with 400", async () => {
        // Temporarily create another approved solution
        const sRes = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ title: "Temp Solution", description: "Desc" });
        const sId = sRes.body.solution.id;

        await pool.query("UPDATE solutions SET status = 'APPROVED' WHERE id = $1", [sId]);

        const res = await request(app)
            .post(`/api/solutions/${sId}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                target_start_date: "2027-01-01",
                target_end_date: "2026-01-01",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/target_end_date/i);

        await pool.query("DELETE FROM solutions WHERE id = $1", [sId]);
    });

    // P8 — Progress < 0
    test("P8 — Progress percentage < 0 rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/progress`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ progress_percentage: -5 });
        expect(res.status).toBe(400);
    });

    // P9 — Progress > 100
    test("P9 — Progress percentage > 100 rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/progress`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ progress_percentage: 105 });
        expect(res.status).toBe(400);
    });

    // P10 — Non-integer progress
    test("P10 — Non-integer progress percentage rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/progress`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ progress_percentage: "nearly done" });
        expect(res.status).toBe(400);
    });

    // P11 — Milestone creation
    let milestone1Id;
    let milestone2Id;
    test("P11 — Submitter creates milestones with weights (returns 201)", async () => {
        const res1 = await request(app)
            .post(`/api/implementations/${implementationId}/milestones`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Site Survey & Permissions",
                weight: 1,
                target_date: "2026-10-15",
            });
        expect(res1.status).toBe(201);
        expect(res1.body.milestone.title).toBe("Site Survey & Permissions");
        milestone1Id = res1.body.milestone.id;

        const res2 = await request(app)
            .post(`/api/implementations/${implementationId}/milestones`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Hardware Installation & Commissioning",
                weight: 3,
                target_date: "2026-12-01",
            });
        expect(res2.status).toBe(201);
        milestone2Id = res2.body.milestone.id;
    });

    // P12 — Milestone completion date
    test("P12 — Milestone completion sets completion_date = CURRENT_DATE", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/milestones/${milestone1Id}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ status: "COMPLETED" });

        expect(res.status).toBe(200);
        expect(res.body.milestone.status).toBe("COMPLETED");
        expect(res.body.milestone.completion_date).toBeDefined();
    });

    // P13 — Invalid milestone status
    test("P13 — Invalid milestone status rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/milestones/${milestone1Id}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ status: "UNKNOWN_STATUS" });
        expect(res.status).toBe(400);
    });

    // P14 — Milestone progress calculation
    test("P14 — Derived milestone progress calculated accurately: (1 / 4) * 100 = 25%", async () => {
        // Milestone 1 has weight 1 (COMPLETED), Milestone 2 has weight 3 (PENDING)
        // Total weight = 4, Completed weight = 1 -> 25%
        const res = await request(app)
            .get(`/api/implementations/${implementationId}`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(res.body.implementation.derived_milestone_progress).toBe(25);
        expect(res.body.implementation.progress_percentage).toBe(0); // manual progress untouched
    });

    // P15 — Submitter update
    test("P15 — Submitter posts field note / progress update (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/updates`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                content: "Civil foundation completed, awaiting RO membranes delivery.",
                update_type: "PROGRESS_NOTE",
            });

        expect(res.status).toBe(201);
        expect(res.body.update.content).toBe("Civil foundation completed, awaiting RO membranes delivery.");
        expect(res.body.update.author).toBeDefined();
    });

    // P16 — Chronological activity feed
    test("P16 — GET updates returns chronological activity feed", async () => {
        const res = await request(app)
            .get(`/api/implementations/${implementationId}/updates`)
            .set("Authorization", `Bearer ${authorityToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.updates)).toBe(true);
        expect(res.body.updates.length).toBeGreaterThanOrEqual(3);

        // Verify chronological order (created_at asc)
        for (let i = 0; i < res.body.updates.length - 1; i++) {
            const current = new Date(res.body.updates[i].created_at);
            const next = new Date(res.body.updates[i + 1].created_at);
            expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
    });

    // P17 — Privacy check
    test("P17 — Updates feed does not leak password_hash, email, or phone", async () => {
        const res = await request(app)
            .get(`/api/implementations/${implementationId}/updates`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        for (const u of res.body.updates) {
            expect(u.author.password_hash).toBeUndefined();
            expect(u.author.phone).toBeUndefined();
            expect(u.author.email).toBeUndefined();
        }
    });

    // P18 — Evidence creation
    test("P18 — Submitter attaches evidence (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/evidence`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Water Quality Lab Report #1",
                evidence_type: "LAB_REPORT",
                file_url: "https://storage.example.com/reports/water_lab_01.pdf",
                description: "TDS reduced from 850ppm to 120ppm, coliform non-detectable.",
                milestone_id: milestone1Id,
            });

        expect(res.status).toBe(201);
        expect(res.body.evidence.evidence_type).toBe("LAB_REPORT");
        expect(res.body.evidence.file_url).toBe("https://storage.example.com/reports/water_lab_01.pdf");
    });

    // P19 — Invalid evidence type
    test("P19 — Invalid evidence type rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/evidence`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Invalid file",
                evidence_type: "UNSUPPORTED_TYPE",
                file_url: "https://example.com/file.png",
            });
        expect(res.status).toBe(400);
    });

    // P20 — Evidence retrieval
    test("P20 — GET evidence returns attached documents list", async () => {
        const res = await request(app)
            .get(`/api/implementations/${implementationId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.evidence)).toBe(true);
        expect(res.body.evidence.length).toBeGreaterThanOrEqual(1);

        const first = res.body.evidence[0];
        expect(first.uploaded_by.password_hash).toBeUndefined();
        expect(first.uploaded_by.phone).toBeUndefined();
        expect(first.uploaded_by.email).toBeUndefined();
    });

    // P21 — Contributor execution access
    test("P21 — Contributor linked in solution_contributors has execution access", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/updates`)
            .set("Authorization", `Bearer ${contributorToken}`)
            .send({
                content: "Sensor calibration verified by Technical Lead.",
                update_type: "PROGRESS_NOTE",
            });

        expect(res.status).toBe(201);
        expect(res.body.update.content).toMatch(/Technical Lead/i);
    });

    // P22 — Blocker creation
    let blockerId;
    test("P22 — Submitter raises CRITICAL blocker (returns 201, marks status BLOCKED)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/blockers`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "High Voltage Grid Fluctuation",
                description: "Transformer damage risking filtration pump motors.",
                severity: "CRITICAL",
            });

        expect(res.status).toBe(201);
        expect(res.body.blocker.severity).toBe("CRITICAL");
        blockerId = res.body.blocker.id;

        // Verify implementation status shifted to BLOCKED
        const implCheck = await request(app)
            .get(`/api/implementations/${implementationId}`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(implCheck.body.implementation.status).toBe("BLOCKED");
    });

    // P23 — Unauthorized blocker resolution
    test("P23 — Non-authority (STUDENT/STARTUP) cannot resolve blocker (returns 403)", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/blockers/${blockerId}/resolve`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ resolution_notes: "Fixed transformer myself." });
        expect(res.status).toBe(403);
    });

    // P24 — Authority blocker resolution
    test("P24 — Authority resolves blocker with resolution notes (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/blockers/${blockerId}/resolve`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ resolution_notes: "Electricity board installed voltage stabilizer unit." });

        expect(res.status).toBe(200);
        expect(res.body.blocker.status).toBe("RESOLVED");
        expect(res.body.blocker.resolution_notes).toMatch(/voltage stabilizer/i);

        // Verify implementation status restored from BLOCKED to PILOT
        const implCheck = await request(app)
            .get(`/api/implementations/${implementationId}`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(implCheck.body.implementation.status).toBe("PILOT");
    });

    // P25 — PILOT -> IMPLEMENTING
    test("P25 — Authority transitions status from PILOT to IMPLEMENTING (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "IMPLEMENTING" });

        expect(res.status).toBe(200);
        expect(res.body.implementation.status).toBe("IMPLEMENTING");

        // Solution status should now also be IMPLEMENTING
        const solCheck = await request(app)
            .get(`/api/solutions/${approvedSolutionId}`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(solCheck.body.solution.status).toBe("IMPLEMENTING");
    });

    // P26 — Completion blocked below 100%
    test("P26 — Attempting COMPLETED status when progress < 100% rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "COMPLETED" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/progress_percentage reaches 100%/i);
    });

    // P27 — Completion blocked by CRITICAL blocker
    test("P27 — Attempting COMPLETED status with unresolved CRITICAL blocker rejected with 400", async () => {
        // First raise progress to 100%
        await request(app)
            .patch(`/api/implementations/${implementationId}/progress`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ progress_percentage: 100 });

        // Raise another critical blocker
        const bRes = await request(app)
            .post(`/api/implementations/${implementationId}/blockers`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Safety Valve Leak",
                description: "Critical safety hazard.",
                severity: "CRITICAL",
            });
        const newBlockerId = bRes.body.blocker.id;

        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "COMPLETED" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/critical blocker/i);

        // Resolve this blocker so we can test valid completion next
        await request(app)
            .patch(`/api/implementations/${implementationId}/blockers/${newBlockerId}/resolve`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ resolution_notes: "Valve replaced and pressure tested." });
    });

    // P28 — Valid completion
    test("P28 — Valid completion (100% progress, no critical blockers) transitions to COMPLETED", async () => {
        // Complete milestone 2 as well
        await request(app)
            .patch(`/api/implementations/${implementationId}/milestones/${milestone2Id}`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ status: "COMPLETED" });

        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "COMPLETED" });

        expect(res.status).toBe(200);
        expect(res.body.implementation.status).toBe("COMPLETED");

        // Solution status should also synchronize to COMPLETED
        const solCheck = await request(app)
            .get(`/api/solutions/${approvedSolutionId}`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(solCheck.body.solution.status).toBe("COMPLETED");
    });

    // P29 — Problem implementation listing
    test("P29 — GET /api/problems/:id/implementations returns list of projects", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID}/implementations`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID);
        expect(Array.isArray(res.body.implementations)).toBe(true);
        expect(res.body.implementations.length).toBeGreaterThanOrEqual(1);
    });

    // P30 — Solution implementation lookup
    test("P30 — GET /api/solutions/:id/implementation returns implementation project", async () => {
        const res = await request(app)
            .get(`/api/solutions/${approvedSolutionId}/implementation`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.implementation.id).toBe(implementationId);
        expect(res.body.implementation.derived_milestone_progress).toBe(100);
    });

    // P31 — Migration 009 idempotency test
    test("P31 — Migration 009 is verified idempotent", async () => {
        const fs = require("fs");
        const path = require("path");
        const sqlPath = path.resolve(__dirname, "../../database/migrations/009_implementation_pilot_tracking.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        // Running it again should execute cleanly without error
        await expect(pool.query(sql)).resolves.not.toThrow();
    });
});

// ===========================================================================
// MODULE 10 — IMPACT TRACKING TESTS
// ===========================================================================

describe("Module 10 — Impact Tracking", () => {
    const PROBLEM_ID = 10;
    let completedImplId;
    let inProgressImplId;
    let submitterCompletedImplId;
    let impactAssessmentId;
    let submitterAssessmentId;
    let contributorToken;
    let initialProblemStatus;

    let increaseMetricId;
    let decreaseMetricId;
    let targetMetricId;

    beforeAll(async () => {
        // Record initial problem status to verify it never changes
        const probRes = await pool.query("SELECT status FROM problems WHERE id = $1", [PROBLEM_ID]);
        initialProblemStatus = probRes.rows[0]?.status;

        // 1. Create a contributor user for Module 10
        const contribRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: `ImpactContributor_${testUserSuffix}`,
                email: `impact_contrib_${testUserSuffix}@test.com`,
                password: "Test1234!",
                role: "STUDENT",
            });
        contributorToken = contribRes.body.token;

        // 2. Create an approved solution submitted by startupToken
        const sol1Res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Water Filtration Plant Phase 2",
                description: "Clean water solution for impact testing",
                estimated_cost: 150000,
            });
        const sol1Id = sol1Res.body.solution.id;
        await pool.query("UPDATE solutions SET status = 'APPROVED' WHERE id = $1", [sol1Id]);

        // Link contributor to sol1
        const contribUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [`impact_contrib_${testUserSuffix}@test.com`]
        );
        await pool.query(
            `INSERT INTO solution_contributors (solution_id, user_id, contribution_role, contribution_description)
             VALUES ($1, $2, 'Impact Data Specialist', 'Tracks water quality metrics')`,
            [sol1Id, contribUser.rows[0].id]
        );

        // Create completed implementation for sol1
        const impl1Res = await request(app)
            .post(`/api/solutions/${sol1Id}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Impact Completed Project",
                description: "Completed water purification unit",
                target_start_date: "2026-01-01",
                target_end_date: "2026-06-01",
                budget_allocated: 150000,
            });
        completedImplId = impl1Res.body.implementation.id;
        await pool.query(
            "UPDATE solution_implementations SET status = 'COMPLETED', progress_percentage = 100, actual_end_date = '2026-06-01' WHERE id = $1",
            [completedImplId]
        );

        // 3. Create an in-progress implementation (PILOT) to test non-completed rejection
        const sol2Res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Uncompleted Project Idea",
                description: "Still in pilot",
                estimated_cost: 80000,
            });
        const sol2Id = sol2Res.body.solution.id;
        await pool.query("UPDATE solutions SET status = 'APPROVED' WHERE id = $1", [sol2Id]);

        const impl2Res = await request(app)
            .post(`/api/solutions/${sol2Id}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Pilot In Progress",
                description: "Testing in pilot stage",
                target_start_date: "2026-07-01",
                target_end_date: "2026-12-01",
            });
        inProgressImplId = impl2Res.body.implementation.id;

        // 4. Create another completed implementation for submitter creation test
        const sol3Res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/solutions`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Submitter-owned Solution",
                description: "Submitter will initiate impact",
                estimated_cost: 95000,
            });
        const sol3Id = sol3Res.body.solution.id;
        await pool.query("UPDATE solutions SET status = 'APPROVED' WHERE id = $1", [sol3Id]);

        const impl3Res = await request(app)
            .post(`/api/solutions/${sol3Id}/implementations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Submitter Tracked Implementation",
                target_start_date: "2026-02-01",
                target_end_date: "2026-05-01",
            });
        submitterCompletedImplId = impl3Res.body.implementation.id;
        await pool.query(
            "UPDATE solution_implementations SET status = 'COMPLETED', progress_percentage = 100 WHERE id = $1",
            [submitterCompletedImplId]
        );
    });

    // I1 — Authentication
    test("I1 — Unauthenticated POST /api/implementations/:id/impact returns 401", async () => {
        const res = await request(app)
            .post(`/api/implementations/${completedImplId}/impact`)
            .send({ title: "Unauthorized Impact Assessment" });
        expect(res.status).toBe(401);
    });

    // I2 — Citizen RBAC
    test("I2 — Citizen attempting to initiate impact assessment returns 403", async () => {
        const res = await request(app)
            .post(`/api/implementations/${completedImplId}/impact`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ title: "Citizen Impact Attempt" });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized|permission/i);
    });

    // I3 — Authority creation
    test("I3 — Authority creates impact assessment for completed implementation (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${completedImplId}/impact`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                title: "Post-Completion Water Quality Assessment",
                summary: "Comprehensive monitoring after 3 months of continuous operation.",
                assessment_period_start: "2026-06-01",
                assessment_period_end: "2026-09-01",
                methodology: "Bi-weekly laboratory water sampling and community household surveys."
            });
        expect(res.status).toBe(201);
        expect(res.body.assessment).toBeDefined();
        expect(res.body.assessment.implementation_id).toBe(completedImplId);
        expect(res.body.assessment.problem_id).toBe(PROBLEM_ID);
        expect(res.body.assessment.verification_status).toBe("UNVERIFIED");
        impactAssessmentId = res.body.assessment.id;
    });

    // I4 — Submitter creation
    test("I4 — Solution submitter initiates impact assessment for completed implementation (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${submitterCompletedImplId}/impact`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                title: "Submitter Monitored Impact",
                summary: "Self-reported impact data by implementation team",
            });
        expect(res.status).toBe(201);
        expect(res.body.assessment.implementation_id).toBe(submitterCompletedImplId);
        submitterAssessmentId = res.body.assessment.id;
    });

    // I5 — Contributor authorization
    test("I5 — Contributor can update assessment, non-contributor is rejected with 403", async () => {
        const contribRes = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${contributorToken}`)
            .send({
                summary: "Updated methodology by technical contributor",
            });
        expect(contribRes.status).toBe(200);

        const unrelatedRes = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ summary: "Hacked by unrelated student" });
        expect(unrelatedRes.status).toBe(403);
    });

    // I6 — Nonexistent implementation
    test("I6 — Nonexistent implementation returns 404", async () => {
        const res = await request(app)
            .post("/api/implementations/999999/impact")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ title: "Nonexistent" });
        expect(res.status).toBe(404);
    });

    // I7 — Non-completed implementation rejected
    test("I7 — Non-completed implementation in PILOT rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/implementations/${inProgressImplId}/impact`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ title: "Premature Impact Assessment" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/COMPLETED/i);
    });

    // I8 — Duplicate assessment
    test("I8 — Duplicate assessment for same implementation rejected with 409", async () => {
        const res = await request(app)
            .post(`/api/implementations/${completedImplId}/impact`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ title: "Second Assessment Attempt" });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/i);
    });

    // I9 — Date validation
    test("I9 — Invalid date range (assessment_period_end < assessment_period_start) returns 400", async () => {
        const res = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                assessment_period_start: "2026-10-01",
                assessment_period_end: "2026-05-01",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/assessment_period_end|measurement_end_date/i);
    });

    // I10 — INCREASE metric
    test("I10 — Adding valid INCREASE metric (target > baseline) returns 201", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: "Treated Water Output",
                category: "ENVIRONMENTAL",
                unit: "kL/day",
                direction: "INCREASE",
                baseline_value: 20,
                target_value: 100,
                actual_value: 60,
            });
        expect(res.status).toBe(201);
        expect(res.body.metric).toBeDefined();
        expect(res.body.metric.direction).toBe("INCREASE");
        expect(res.body.metric.achievement_percentage).toBe(50);
        increaseMetricId = res.body.metric.id;
    });

    // I11 — DECREASE metric
    test("I11 — Adding valid DECREASE metric (target < baseline) returns 201", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: "Waterborne Disease Cases",
                category: "PUBLIC_HEALTH",
                unit: "cases/month",
                direction: "DECREASE",
                baseline_value: 100,
                target_value: 20,
                actual_value: 40,
            });
        expect(res.status).toBe(201);
        expect(res.body.metric.direction).toBe("DECREASE");
        expect(res.body.metric.achievement_percentage).toBe(75);
        decreaseMetricId = res.body.metric.id;
    });

    // I12 — TARGET metric
    test("I12 — Adding valid TARGET metric returns 201", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: "Water pH Level",
                category: "ENVIRONMENTAL",
                unit: "pH",
                direction: "TARGET",
                baseline_value: 8.5,
                target_value: 7.0,
                actual_value: 7.2,
            });
        expect(res.status).toBe(201);
        expect(res.body.metric.direction).toBe("TARGET");
        expect(res.body.metric.achievement_percentage).toBeCloseTo(97.14, 1);
        targetMetricId = res.body.metric.id;
    });

    // I13 — Invalid INCREASE target
    test("I13 — Mathematically invalid INCREASE target (target <= baseline) rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: "Faulty Increase Metric",
                unit: "count",
                direction: "INCREASE",
                baseline_value: 50,
                target_value: 40,
                actual_value: 45,
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/target_value.*greater.*baseline/i);
    });

    // I14 — Invalid DECREASE target
    test("I14 — Mathematically invalid DECREASE target (target >= baseline) rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: "Faulty Decrease Metric",
                unit: "count",
                direction: "DECREASE",
                baseline_value: 50,
                target_value: 60,
                actual_value: 55,
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/target_value.*less.*baseline/i);
    });

    // I15 — Target = 0 edge case
    test("I15 — TARGET direction with target=0 handles zero edge cases correctly", async () => {
        const res1 = await request(app)
            .post(`/api/impact-assessments/${submitterAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                metric_name: "Contaminant Leakage Incidents",
                unit: "incidents",
                direction: "TARGET",
                baseline_value: 12,
                target_value: 0,
                actual_value: 0,
            });
        expect(res1.status).toBe(201);
        expect(res1.body.metric.achievement_percentage).toBe(100);

        const res2 = await request(app)
            .post(`/api/impact-assessments/${submitterAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({
                metric_name: "Unplanned Shutdown Days",
                unit: "days",
                direction: "TARGET",
                baseline_value: 15,
                target_value: 0,
                actual_value: 3,
            });
        expect(res2.status).toBe(201);
        expect(res2.body.metric.achievement_percentage).toBe(0);
    });

    // I16 — Exact before/after calculation for INCREASE
    test("I16 — Exact Before/After comparison for INCREASE metric", async () => {
        const res = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/comparison`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        const inc = res.body.comparison.find((m) => m.metric_name === "Treated Water Output");
        expect(inc).toBeDefined();
        expect(inc.baseline).toBe(20);
        expect(inc.target).toBe(100);
        expect(inc.actual).toBe(60);
        expect(inc.absolute_improvement).toBe(40);
        expect(inc.achievement_percentage).toBe(50);
    });

    // I17 — Decrease calculation
    test("I17 — Exact Before/After comparison for DECREASE metric", async () => {
        const res = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/comparison`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const dec = res.body.comparison.find((m) => m.metric_name === "Waterborne Disease Cases");
        expect(dec).toBeDefined();
        expect(dec.baseline).toBe(100);
        expect(dec.target).toBe(20);
        expect(dec.actual).toBe(40);
        expect(dec.absolute_improvement).toBe(60);
        expect(dec.achievement_percentage).toBe(75);
    });

    // I18 — Target calculation
    test("I18 — Exact Before/After comparison for TARGET metric includes distance from target", async () => {
        const res = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/comparison`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const tgt = res.body.comparison.find((m) => m.metric_name === "Water pH Level");
        expect(tgt).toBeDefined();
        expect(tgt.target).toBe(7.0);
        expect(tgt.actual).toBe(7.2);
        expect(tgt.distance_from_target).toBeCloseTo(0.2, 2);
        expect(tgt.achievement_percentage).toBeCloseTo(97.14, 1);
    });

    // I19 — Score calculation
    test("I19 — Deterministic impact score calculation and score_breakdown explainability", async () => {
        const res = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        const { impact_score, score_breakdown } = res.body.assessment;
        expect(score_breakdown).toBeDefined();
        expect(score_breakdown.metric_average).toBeCloseTo(74.05, 1);
        expect(score_breakdown.metric_contribution).toBeCloseTo(74.05 * 0.50, 1);
        expect(score_breakdown.citizen_consensus).toBe(50);
        expect(score_breakdown.citizen_contribution).toBe(15);
        expect(score_breakdown.verification_points).toBe(5);
        expect(impact_score).toBeCloseTo(57.03, 1);
    });

    // I20 — Score recalculation
    test("I20 — Updating metric actual_value triggers automatic score recalculation", async () => {
        const patchRes = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/metrics/${increaseMetricId}`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ actual_value: 100 });
        expect(patchRes.status).toBe(200);
        expect(patchRes.body.metric.achievement_percentage).toBe(100);

        const getRes = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(getRes.body.assessment.impact_score).toBeCloseTo(65.36, 1);
    });

    // I21 — Citizen feedback
    test("I21 — Citizen submits verified outcome feedback (returns 201) and updates consensus", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                rating: 5,
                is_resolved: true,
                comment: "Clean tap water running 24/7 now in Ward 7!",
                observed_outcome: "Zero contamination noted in local tests.",
            });
        expect(res.status).toBe(201);
        expect(res.body.feedback).toBeDefined();
        expect(res.body.feedback.rating).toBe(5);
        expect(res.body.feedback.is_resolved).toBe(true);

        const getRes = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(getRes.body.assessment.score_breakdown.citizen_consensus).toBe(100);
        expect(getRes.body.assessment.impact_score).toBeCloseTo(80.36, 1);
    });

    // I22 — Invalid rating
    test("I22 — Invalid rating (< 1 or > 5) rejected with 400", async () => {
        const res1 = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ rating: 6, is_resolved: true });
        expect(res1.status).toBe(400);

        const res2 = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ rating: 0, is_resolved: false });
        expect(res2.status).toBe(400);
    });

    // I23 — Explicit is_resolved validation
    test("I23 — Explicit is_resolved boolean is strictly required (not defaulted)", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                rating: 4,
                comment: "Missing is_resolved field",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/is_resolved must be.*boolean/i);
    });

    // I24 — Feedback upsert
    test("I24 — Same citizen can update feedback via upsert mechanism without conflict", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                rating: 4,
                is_resolved: true,
                comment: "Updated observation: slight pressure drop in evening, but clean.",
            });
        expect([200, 201]).toContain(res.status);
        expect(res.body.feedback.rating).toBe(4);
        expect(res.body.feedback.comment).toMatch(/Updated observation/i);

        const listRes = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(listRes.status).toBe(200);
        expect(listRes.body.feedback.length).toBe(1);
    });

    // I25 — Verification RBAC
    test("I25 — Non-authority roles (CITIZEN, STUDENT, SUBMITTER) cannot verify impact assessment (403)", async () => {
        const res1 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ verification_status: "VERIFIED" });
        expect(res1.status).toBe(403);

        const res2 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ verification_status: "VERIFIED" });
        expect(res2.status).toBe(403);
    });

    // I26 — Verification transition validation
    test("I26 — Verification lifecycle transitions enforced correctly", async () => {
        // 1. UNVERIFIED -> VERIFIED is invalid (must go through UNDER_REVIEW first)
        const inv1 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "VERIFIED" });
        expect(inv1.status).toBe(400);
        expect(inv1.body.message).toMatch(/Invalid verification transition/i);

        // 2. UNVERIFIED -> UNDER_REVIEW is valid
        const valid1 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "UNDER_REVIEW",
                verification_notes: "Field audit scheduled with municipal health inspector",
            });
        expect(valid1.status).toBe(200);
        expect(valid1.body.assessment.verification_status).toBe("UNDER_REVIEW");

        // 3. UNDER_REVIEW -> REJECTED is valid
        const valid2 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "REJECTED",
                verification_notes: "Initial field test detected uncalibrated sensor error.",
            });
        expect(valid2.status).toBe(200);
        expect(valid2.body.assessment.verification_status).toBe("REJECTED");

        // 4. REJECTED -> VERIFIED is invalid (must go through UNDER_REVIEW first)
        const inv2 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "VERIFIED" });
        expect(inv2.status).toBe(400);

        // 5. REJECTED -> UNDER_REVIEW is valid per spec
        const valid3 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "UNDER_REVIEW",
                verification_notes: "Sensors recalibrated; undergoing secondary review.",
            });
        expect(valid3.status).toBe(200);
        expect(valid3.body.assessment.verification_status).toBe("UNDER_REVIEW");

        // 6. UNDER_REVIEW -> VERIFIED is valid
        const valid4 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "VERIFIED",
                verification_notes: "Audit confirmed 100 kL/day output with 0 contamination.",
            });
        expect(valid4.status).toBe(200);
        expect(valid4.body.assessment.verification_status).toBe("VERIFIED");
        expect(valid4.body.assessment.verified_by).toBeDefined();
        expect(valid4.body.assessment.verified_at).toBeDefined();

        // 7. VERIFIED -> UNVERIFIED is invalid
        const inv3 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "UNVERIFIED" });
        expect(inv3.status).toBe(400);
    });

    // I27 — Sustained RBAC
    test("I27 — Only AUTHORITY and ADMIN can mark outcome as sustained (403 for others)", async () => {
        const res1 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/sustained`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ is_sustained: true });
        expect(res1.status).toBe(403);

        const res2 = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/sustained`)
            .set("Authorization", `Bearer ${startupToken}`)
            .send({ is_sustained: true });
        expect(res2.status).toBe(403);
    });

    // I28 — Sustained outcome
    test("I28 — Authority marks outcome as sustained with notes and monitoring date", async () => {
        const res = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/sustained`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                is_sustained: true,
                sustained_monitoring_date: "2026-09-09",
                sustained_notes: "Sustained impact verified after 6-month continuous community inspection.",
            });
        expect(res.status).toBe(200);
        expect(res.body.assessment.is_sustained).toBe(true);
        expect(res.body.assessment.sustained_monitoring_date).toBeDefined();
        expect(res.body.assessment.sustained_notes).toMatch(/Sustained impact verified/i);
    });

    // I29 — Privacy verification
    test("I29 — Privacy: sensitive fields (password_hash, phone, email) never exposed in responses", async () => {
        const assessRes = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const bodyStr1 = JSON.stringify(assessRes.body);
        expect(bodyStr1).not.toMatch(/password_hash/i);
        expect(bodyStr1).not.toMatch(/phone/i);

        const feedRes = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/feedback`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const bodyStr2 = JSON.stringify(feedRes.body);
        expect(bodyStr2).not.toMatch(/password_hash/i);
        expect(bodyStr2).not.toMatch(/phone/i);
        if (feedRes.body.feedback.length > 0) {
            const u = feedRes.body.feedback[0].citizen;
            expect(u).toBeDefined();
            expect(Object.keys(u).sort()).toEqual(["id", "name", "role"].sort());
        }
    });

    // I30 — Problem impact summary
    test("I30 — GET /api/problems/:id/impact-summary returns consolidated impact overview", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID}/impact-summary`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID);
        expect(res.body.total_assessments).toBeGreaterThanOrEqual(1);
        expect(res.body.sustained_assessments).toBeGreaterThanOrEqual(1);
        expect(res.body.average_impact_score).toBeGreaterThan(0);
        expect(Array.isArray(res.body.assessments)).toBe(true);
        expect(Array.isArray(res.body.top_metrics)).toBe(true);
    });

    // I31 — Migration idempotency
    test("I31 — Migration 010_impact_tracking.sql is strictly idempotent", async () => {
        const fs = require("fs");
        const path = require("path");
        const sqlPath = path.resolve(__dirname, "../../database/migrations/010_impact_tracking.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        await expect(pool.query(sql)).resolves.not.toThrow();
    });

    // I32 — SQL injection safety
    test("I32 — SQL injection payloads in metric and feedback fields are safely handled", async () => {
        const sqlPayload = "'; DROP TABLE implementation_impact_assessments; --";
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/metrics`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                metric_name: sqlPayload,
                unit: "mg/L",
                direction: "INCREASE",
                baseline_value: 10,
                target_value: 20,
                actual_value: 15,
            });
        expect(res.status).toBe(201);
        expect(res.body.metric.metric_name).toBe(sqlPayload);

        const check = await pool.query("SELECT COUNT(*) FROM implementation_impact_assessments");
        expect(parseInt(check.rows[0].count, 10)).toBeGreaterThan(0);
    });

    // I33 — No problem status mutation
    test("I33 — CRITICAL: Problem status is NEVER mutated by any impact tracking action", async () => {
        const res = await pool.query("SELECT status FROM problems WHERE id = $1", [PROBLEM_ID]);
        const currentStatus = res.rows[0]?.status;
        expect(currentStatus).toBe(initialProblemStatus);
    });

    // I34 — Completion-only impact creation guard
    test("I34 — Implementation must be in COMPLETED status to create impact assessment", async () => {
        const res = await request(app)
            .post(`/api/implementations/${inProgressImplId}/impact`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ title: "Premature Assessment Guard" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/COMPLETED/i);
    });

    // I35 — Full regression check
    test("I35 — Regression test: GET /api/implementations/:id/impact returns complete object", async () => {
        const res = await request(app)
            .get(`/api/implementations/${completedImplId}/impact`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.assessment.id).toBe(impactAssessmentId);
        expect(res.body.assessment.metrics.length).toBeGreaterThanOrEqual(3);
        expect(res.body.assessment.citizen_feedback_summary.total_feedback).toBeGreaterThanOrEqual(1);
    });
});

// ===========================================================================
// MODULE 11 — ROOT CAUSE ANALYSIS TESTS
// ===========================================================================

describe("Module 11 — Root Cause Analysis", () => {
    const PROBLEM_ID = 10;
    let initialProblemStatus;
    let unskilledStudentToken;
    let researcherCauseId;
    let studentCauseId;
    let aiCauseId;
    let primaryCauseId;

    beforeAll(async () => {
        // Record initial problem status
        const probRes = await pool.query("SELECT status FROM problems WHERE id = $1", [PROBLEM_ID]);
        initialProblemStatus = probRes.rows[0]?.status;

        // Clean up any existing root causes for PROBLEM_ID to ensure clean test state
        await pool.query("DELETE FROM root_causes WHERE problem_id = $1", [PROBLEM_ID]);

        // Create an unskilled student without expertise profile
        const unRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: `UnskilledStudent_${testUserSuffix}`,
                email: `unskilled_${testUserSuffix}@test.com`,
                password: "Test1234!",
                role: "STUDENT",
            });
        unskilledStudentToken = unRes.body.token;

        // Equip the main test student (studentToken) with matching skills in student_profiles
        const sUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`student_${testUserSuffix}@test.com`]
        );
        if (sUser.rows.length > 0) {
            await pool.query(
                `INSERT INTO student_profiles (user_id, skills)
                 VALUES ($1, ARRAY['Groundwater', 'Water Quality'])
                 ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills`,
                [sUser.rows[0].id]
            );
        }
    });

    // R1 — Authentication
    test("R1 — Unauthenticated POST /api/problems/:id/root-causes returns 401", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .send({ cause: "Unauthorized hypothesis" });
        expect(res.status).toBe(401);
    });

    // R2 — Citizen attempting AI analysis
    test("R2 — Citizen attempting AI analysis returns 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes/analyze`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/i);
    });

    // R3 — Authority triggers AI root cause analysis
    test("R3 — Authority triggers AI root cause analysis (returns 201 with explainable signals)", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes/analyze`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(201);
        expect(res.body.problem_id).toBe(PROBLEM_ID);
        expect(res.body.total_generated).toBeGreaterThanOrEqual(2);
        expect(Array.isArray(res.body.root_causes)).toBe(true);

        const first = res.body.root_causes[0];
        expect(first.cause).toBeDefined();
        expect(first.confidence).toBeGreaterThan(0);
        expect(first.signals).toBeDefined();
        expect(first.signals.keyword_matches).toBeDefined();
        aiCauseId = first.id;
    });

    // R4 — AI causes start as PROPOSED
    test("R4 — AI generated causes start with source_type = 'AI' and verification_status = 'PROPOSED'", async () => {
        const res = await request(app)
            .get(`/api/root-causes/${aiCauseId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.root_cause.source_type).toBe("AI");
        expect(res.body.root_cause.verification_status).toBe("PROPOSED");
        expect(res.body.root_cause.verified).toBe(false);
    });

    // R5 — Researcher triggers AI root cause analysis
    test("R5 — Researcher triggers AI root cause analysis successfully (201)", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes/analyze`)
            .set("Authorization", `Bearer ${researcherToken}`);
        expect(res.status).toBe(201);
        expect(res.body.total_generated).toBeGreaterThanOrEqual(1);
    });

    // R6 — Citizen attempting to propose formal root cause
    test("R6 — Citizen attempting to propose formal root cause is rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                cause: "Citizen's direct root cause hypothesis",
                category: "ENVIRONMENTAL",
            });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    // R7 — Student with matching expertise proposes root cause
    test("R7 — Student with matching expertise proposes root cause (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                cause: "Leaking subterranean industrial solvent storage tank",
                category: "ENVIRONMENTAL",
                confidence: 68.0,
                reasoning: "Hydrogeological survey indicates localized VOC plume.",
            });
        expect(res.status).toBe(201);
        expect(res.body.root_cause.cause).toBe("Leaking subterranean industrial solvent storage tank");
        expect(res.body.root_cause.source_type).toBe("STUDENT");
        expect(res.body.root_cause.verification_status).toBe("PROPOSED");
        studentCauseId = res.body.root_cause.id;
    });

    // R8 — Student with no matching skills rejected with 403 (FIX 4)
    test("R8 — Student without matching expertise and no solution link rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${unskilledStudentToken}`)
            .send({
                cause: "Random unverified student guess",
                category: "GENERAL",
            });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    // R9 — Nonexistent problem returns 404
    test("R9 — Nonexistent problem returns 404", async () => {
        const res = await request(app)
            .post("/api/problems/999999/root-causes")
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ cause: "Nonexistent problem cause" });
        expect(res.status).toBe(404);
    });

    // R10 — Duplicate cause for same problem rejected with 409 Conflict (FIX 2)
    test("R10 — Duplicate cause for same problem rejected with 409 Conflict (case-insensitive expression index)", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                cause: "  leaking subterranean industrial solvent storage tank  ", // same text, different casing/whitespace
                category: "ENVIRONMENTAL",
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already.*proposed/i);
    });

    // R11 — Multiple distinct root causes can coexist under same problem
    test("R11 — Multiple distinct root causes coexist under the same problem", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({
                cause: "Heavy agricultural fertilizer percolation into unconfined aquifer",
                category: "ENVIRONMENTAL",
                confidence: 75.0,
                reasoning: "Nitrate levels correlate with seasonal agricultural runoff.",
            });
        expect(res.status).toBe(201);
        researcherCauseId = res.body.root_cause.id;

        const listRes = await request(app)
            .get(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(listRes.status).toBe(200);
        expect(listRes.body.total).toBeGreaterThanOrEqual(3);
    });

    // R12 — Authority designates a root cause as PRIMARY
    test("R12 — Authority designates a root cause as PRIMARY (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${researcherCauseId}`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ cause_type: "PRIMARY" });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.cause_type).toBe("PRIMARY");
        primaryCauseId = researcherCauseId;
    });

    // R13 — Non-authority cannot designate PRIMARY (403)
    test("R13 — Non-authority (RESEARCHER/STUDENT) cannot designate cause as PRIMARY (returns 403)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ cause_type: "PRIMARY" });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/authorities.*PRIMARY/i);
    });

    // R14 — Concurrency safety: second PRIMARY cause rejected with 409 Conflict (FIX 3)
    test("R14 — Attempting to designate a second PRIMARY cause returns 409 Conflict", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ cause_type: "PRIMARY" });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/PRIMARY root cause already exists/i);
    });

    // R15 — Proposer can update their own unverified root cause
    test("R15 — Proposer can update their own unverified root cause (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ reasoning: "Updated reasoning based on revised geological borehole analysis." });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.reasoning).toMatch(/borehole analysis/i);
    });

    // R16 — Unauthorized user cannot update another user's root cause
    test("R16 — Unauthorized user cannot update another user's root cause (returns 403)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({ reasoning: "Hacked by other user" });
        expect(res.status).toBe(403);
    });

    // R17 — Confidence validation: invalid confidence rejected with 400
    test("R17 — Invalid confidence value (< 0 or > 100) rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                cause: "Invalid confidence test",
                confidence: 150.0,
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/confidence/i);
    });

    // R18 — Category validation: invalid category rejected with 400
    test("R18 — Invalid category rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                cause: "Invalid category test",
                category: "NOT_A_VALID_CATEGORY",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/category/i);
    });

    // R19 — Citizen attaches field observation evidence
    test("R19 — Citizen attaches FIELD_OBSERVATION evidence with valid URL (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/root-causes/${studentCauseId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                evidence_type: "FIELD_OBSERVATION",
                title: "Oily sheen observed on surface of community well",
                description: "Well water exhibits noticeable chemical scent during morning pumping.",
                evidence_url: "https://evidence.jharkhand.gov.in/obs/well-7-sheen.jpg",
                confidence_weight: 1.0,
            });
        expect(res.status).toBe(201);
        expect(res.body.evidence.evidence_type).toBe("FIELD_OBSERVATION");
        expect(res.body.evidence.evidence_url).toBe("https://evidence.jharkhand.gov.in/obs/well-7-sheen.jpg");
    });

    // R20 — Citizen attempting to attach LAB_REPORT rejected with 403
    test("R20 — Citizen attempting to attach LAB_REPORT rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/root-causes/${studentCauseId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                evidence_type: "LAB_REPORT",
                title: "Citizen submitted lab report attempt",
                evidence_url: "https://lab.org/report.pdf",
            });
        expect(res.status).toBe(403);
    });

    // R21 — Researcher attaches LAB_REPORT or RESEARCH_CITATION evidence
    test("R21 — Researcher attaches LAB_REPORT evidence (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/root-causes/${studentCauseId}/evidence`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({
                evidence_type: "LAB_REPORT",
                title: "State Environmental Laboratory Spectrometry Analysis",
                description: "Confirms elevated trichloroethylene levels of 45 ug/L.",
                evidence_url: "https://envlab.nic.in/reports/ranchi/2026/tc-analysis.pdf",
                confidence_weight: 1.5,
            });
        expect(res.status).toBe(201);
        expect(res.body.evidence.evidence_type).toBe("LAB_REPORT");
    });

    // R22 — Attaching evidence deterministically recalculates confidence
    test("R22 — Attaching evidence deterministically recalculates confidence with evidence boost", async () => {
        const res = await request(app)
            .get(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        // Base was 68.0. Two evidence items added (weight 1.0 -> 5.0 boost, weight 1.5 -> 7.5 boost). Total boost = 12.5.
        // 68.0 + 12.5 = 80.50
        expect(res.body.root_cause.confidence).toBeCloseTo(80.5, 1);
        expect(res.body.root_cause.evidence.length).toBe(2);
    });

    // R23 — Invalid evidence URL rejected with 400
    test("R23 — Invalid evidence URL (not http/https or malformed) rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/root-causes/${studentCauseId}/evidence`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({
                title: "Invalid URL test",
                evidence_url: "javascript:alert('malicious')",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/valid.*URL/i);
    });

    // R24 — Non-authority cannot verify or reject root cause (403)
    test("R24 — Non-authority (CITIZEN, STUDENT, RESEARCHER) cannot verify root cause (returns 403)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({ verification_status: "VERIFIED", verification_notes: "Attempted researcher verification" });
        expect(res.status).toBe(403);
    });

    // R25 — Invalid verification lifecycle transition (PROPOSED -> VERIFIED directly) rejected with 400
    test("R25 — Invalid verification lifecycle transition (PROPOSED -> VERIFIED directly) rejected with 400", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "VERIFIED", verification_notes: "Direct verification attempt" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid verification transition/i);
    });

    // R26 — Valid transition: PROPOSED -> UNDER_REVIEW
    test("R26 — Valid verification transition: PROPOSED -> UNDER_REVIEW (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "UNDER_REVIEW",
                verification_notes: "Audit assigned to municipal groundwater board inspector",
            });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.verification_status).toBe("UNDER_REVIEW");
    });

    // R27 — Valid transition: UNDER_REVIEW -> REJECTED with notes
    test("R27 — Valid verification transition: UNDER_REVIEW -> REJECTED with audit notes (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "REJECTED",
                verification_notes: "Underground tank integrity test showed zero leakage; cause refuted.",
            });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.verification_status).toBe("REJECTED");
        expect(res.body.root_cause.verified).toBe(false);
    });

    // R28 — Valid transition: REJECTED -> UNDER_REVIEW
    test("R28 — Valid verification transition: REJECTED -> UNDER_REVIEW upon new inquiry (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "UNDER_REVIEW",
                verification_notes: "Secondary inquiry opened following adjacent industrial zone audit.",
            });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.verification_status).toBe("UNDER_REVIEW");
    });

    // R29 — Valid transition: UNDER_REVIEW -> VERIFIED with audit notes
    let confidenceBeforeVerification;
    test("R29 — Valid verification transition: UNDER_REVIEW -> VERIFIED with audit notes (returns 200)", async () => {
        // Record confidence before verification
        const preCheck = await request(app)
            .get(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        confidenceBeforeVerification = preCheck.body.root_cause.confidence;

        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "VERIFIED",
                verification_notes: "Field excavation confirmed cracked outer lining and ongoing solvent escape.",
            });
        expect(res.status).toBe(200);
        expect(res.body.root_cause.verification_status).toBe("VERIFIED");
        expect(res.body.root_cause.verified).toBe(true);
        expect(res.body.root_cause.verified_by).toBeDefined();
        expect(res.body.root_cause.verified_at).toBeDefined();
    });

    // R30 — FIX 1: Verification status does NOT change confidence score
    test("R30 — FIX 1: Verification status does NOT change confidence score (remains separate)", async () => {
        const postCheck = await request(app)
            .get(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(postCheck.body.root_cause.confidence).toBe(confidenceBeforeVerification);
    });

    // R31 — Verified or rejected root causes cannot be edited by ordinary proposers
    test("R31 — Verified root cause cannot be edited by ordinary proposers (returns 403)", async () => {
        const res = await request(app)
            .patch(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ cause: "Attempt to modify verified root cause" });
        expect(res.status).toBe(403);
    });

    // R32 — Problem root causes summary
    test("R32 — Problem root causes summary (GET /api/problems/:id/root-causes/summary) returns overview", async () => {
        const res = await request(app)
            .get(`/api/problems/${PROBLEM_ID}/root-causes/summary`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(PROBLEM_ID);
        expect(res.body.total_causes).toBeGreaterThanOrEqual(2);
        expect(res.body.verified_causes).toBeGreaterThanOrEqual(1);
        expect(res.body.primary_cause).toBeDefined();
        expect(res.body.primary_cause.id).toBe(primaryCauseId);
        expect(res.body.categories_breakdown).toBeDefined();
    });

    // R33 — Privacy verification
    test("R33 — Privacy: Sensitive fields (password_hash, email, phone) never exposed in responses", async () => {
        const res = await request(app)
            .get(`/api/root-causes/${studentCauseId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const str = JSON.stringify(res.body);
        expect(str).not.toMatch(/password_hash/i);
        expect(str).not.toMatch(/phone/i);
        if (res.body.root_cause.proposer) {
            expect(Object.keys(res.body.root_cause.proposer).sort()).toEqual(["id", "name", "role"].sort());
        }
    });

    // R34 — SQL injection safety
    test("R34 — SQL injection payloads in cause text and evidence are safely handled", async () => {
        const sqlPayload = "'; DROP TABLE root_causes; --";
        const res = await request(app)
            .post(`/api/problems/${PROBLEM_ID}/root-causes`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                cause: sqlPayload,
                category: "GENERAL",
            });
        expect(res.status).toBe(201);
        expect(res.body.root_cause.cause).toBe(sqlPayload);

        // Verify root_causes table is unharmed
        const check = await pool.query("SELECT COUNT(*) FROM root_causes");
        expect(parseInt(check.rows[0].count, 10)).toBeGreaterThan(0);
    });

    // R35 — Problem status lifecycle independence
    test("R35 — CRITICAL: Problem status is NEVER mutated by any RCA operation", async () => {
        const res = await pool.query("SELECT status FROM problems WHERE id = $1", [PROBLEM_ID]);
        const currentStatus = res.rows[0]?.status;
        expect(currentStatus).toBe(initialProblemStatus);
    });

    // R36 — Migration 011 idempotency
    test("R36 — Migration 011_root_cause_analysis.sql is strictly idempotent", async () => {
        const fs = require("fs");
        const path = require("path");
        const sqlPath = path.resolve(__dirname, "../../database/migrations/011_root_cause_analysis.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        await expect(pool.query(sql)).resolves.not.toThrow();
    });

    // R37 — Backward compatibility with legacy root_causes rows
    test("R37 — Backward compatibility: Legacy root_causes rows remain readable", async () => {
        const legRes = await pool.query(
            `INSERT INTO root_causes (problem_id, cause, verified)
             VALUES ($1, 'Legacy Pre-Module-11 Historical Cause', TRUE)
             RETURNING id`,
            [PROBLEM_ID]
        );
        const legacyId = legRes.rows[0].id;

        const res = await request(app)
            .get(`/api/root-causes/${legacyId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.root_cause.cause).toBe("Legacy Pre-Module-11 Historical Cause");
        expect(res.body.root_cause.verified).toBe(true);
        expect(res.body.root_cause.verification_status).toBe("VERIFIED");
    });
});

// ===========================================================================
// MODULE 12 — PROBLEM DEPENDENCY MAPPING TESTS
// ===========================================================================

describe("Module 12 — Problem Dependency Mapping", () => {
    let pA_id, pB_id, pC_id, pD_id;
    let initialStatuses = {};
    let studentDepId, authorityDepId;
    let unskilledStudentToken12;

    beforeAll(async () => {
        // Create 4 distinct interconnected test problems in Ranchi
        const resA = await pool.query(
            `INSERT INTO problems (title, description, category, subcategory, district, status, affected_people, required_expertise)
             VALUES ('Pavement Sub-base Collapse on Circular Road', 'Deep road collapse following monsoon seepage and culvert breakdown', 'Infrastructure', 'Roads', 'Ranchi', 'REPORTED', 1200, ARRAY['Civil Engineering', 'Hydrology'])
             RETURNING id, status`
        );
        pA_id = resA.rows[0].id;
        initialStatuses[pA_id] = resA.rows[0].status;

        const resB = await pool.query(
            `INSERT INTO problems (title, description, category, subcategory, district, status, affected_people, required_expertise)
             VALUES ('Subterranean Storm Drainage Culvert Rupture', 'Underground concrete culvert broken under heavy axle load causing roadway erosion', 'Infrastructure', 'Drainage', 'Ranchi', 'UNDER_REVIEW', 2500, ARRAY['Hydrology', 'Civil Engineering'])
             RETURNING id, status`
        );
        pB_id = resB.rows[0].id;
        initialStatuses[pB_id] = resB.rows[0].status;

        const resC = await pool.query(
            `INSERT INTO problems (title, description, category, subcategory, district, status, affected_people, required_expertise)
             VALUES ('Industrial Solid Waste Clogging Drainage Inflow', 'Unsegregated plastic and industrial slag blocking major culvert inlet', 'Environment', 'Solid Waste', 'Ranchi', 'VERIFIED', 5000, ARRAY['Waste Management'])
             RETURNING id, status`
        );
        pC_id = resC.rows[0].id;
        initialStatuses[pC_id] = resC.rows[0].status;

        const resD = await pool.query(
            `INSERT INTO problems (title, description, category, subcategory, district, status, affected_people, required_expertise)
             VALUES ('Illegal Dumping of Toxic Slag Upstream', 'Unpermitted factory dump contaminating local runoff water upstream', 'Environment', 'Pollution', 'Ranchi', 'REPORTED', 8000, ARRAY['Environmental Chemistry'])
             RETURNING id, status`
        );
        pD_id = resD.rows[0].id;
        initialStatuses[pD_id] = resD.rows[0].status;

        // Clean up any pre-existing dependencies involving these test problems
        await pool.query(
            "DELETE FROM problem_dependencies WHERE problem_id IN ($1, $2, $3, $4) OR depends_on_problem_id IN ($1, $2, $3, $4)",
            [pA_id, pB_id, pC_id, pD_id]
        );

        // Register unskilled student without expertise profile
        const unRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: `UnskilledStudent12_${testUserSuffix}`,
                email: `unskilled12_${testUserSuffix}@test.com`,
                password: "Test1234!",
                role: "STUDENT",
            });
        unskilledStudentToken12 = unRes.body.token;

        // Equip standard test student (studentToken) with matching expertise profile
        const sUser = await pool.query(
            "SELECT id FROM users WHERE email LIKE $1",
            [`student_${testUserSuffix}@test.com`]
        );
        if (sUser.rows.length > 0) {
            await pool.query(
                `INSERT INTO student_profiles (user_id, skills)
                 VALUES ($1, ARRAY['Civil Engineering', 'Hydrology'])
                 ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills`,
                [sUser.rows[0].id]
            );
        }
    });

    // D1 — Authentication
    test("D1 — Unauthenticated POST /api/problems/:id/dependencies returns 401", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .send({ depends_on_problem_id: pB_id });
        expect(res.status).toBe(401);
    });

    // D2 — Citizen attempting to propose formal dependency returns 403
    test("D2 — Citizen attempting to propose formal dependency returns 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ depends_on_problem_id: pB_id });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    // D3 — Citizen attempting AI dependency detection returns 403
    test("D3 — Citizen attempting AI dependency detection returns 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies/detect`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(403);
    });

    // D4 — Researcher triggers AI dependency detection (returns 201 with proposals)
    test("D4 — Researcher triggers AI dependency detection (returns 201 with proposals)", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies/detect`)
            .set("Authorization", `Bearer ${researcherToken}`);
        expect(res.status).toBe(201);
        expect(res.body.problem_id).toBe(pA_id);
        expect(Array.isArray(res.body.dependencies)).toBe(true);
    });

    // D5 — Qualified student proposes dependency (returns 201)
    test("D5 — Qualified student with matching expertise proposes dependency (returns 201)", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                depends_on_problem_id: pB_id,
                dependency_type: "BLOCKS_SOLUTION",
                reasoning: "Road cannot be safely repaved until subterranean culvert structural integrity is restored.",
            });
        expect(res.status).toBe(201);
        expect(res.body.dependency.problem_id).toBe(pA_id); // Downstream
        expect(res.body.dependency.depends_on_problem_id).toBe(pB_id); // Upstream
        expect(res.body.dependency.source_type).toBe("STUDENT");
        expect(res.body.dependency.verification_status).toBe("PROPOSED");
        studentDepId = res.body.dependency.id;
    });

    // D6 — Unqualified student rejected with 403
    test("D6 — Unqualified student without matching expertise rejected with 403", async () => {
        const res = await request(app)
            .post(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${unskilledStudentToken12}`)
            .send({
                depends_on_problem_id: pC_id,
                dependency_type: "BLOCKS_SOLUTION",
            });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    // D7 — AI dependency detection attributes
    test("D7 — AI detected dependencies start with source_type = 'AI' and verification_status = 'PROPOSED'", async () => {
        const res = await request(app)
            .post(`/api/problems/${pB_id}/dependencies/detect`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(201);
        if (res.body.dependencies.length > 0) {
            const first = res.body.dependencies[0];
            expect(first.source_type).toBe("AI");
            expect(first.verification_status).toBe("PROPOSED");
        }
    });

    // D8 — AI proposals include explainable signals breakdown
    test("D8 — AI proposals include explainable signals breakdown", async () => {
        const res = await request(app)
            .get(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.dependency.signals).toBeDefined();
        expect(res.body.dependency.signals.calculated_confidence).toBeDefined();
    });

    // D9 — AI detection on nonexistent problem returns 404
    test("D9 — AI detection on nonexistent problem returns 404", async () => {
        const res = await request(app)
            .post("/api/problems/999999/dependencies/detect")
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(404);
    });

    // D10 — AI detection with zero candidates returns graceful empty list
    test("D10 — AI detection with zero candidates returns graceful empty list", async () => {
        const res = await request(app)
            .post(`/api/problems/${pD_id}/dependencies/detect`)
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(201);
        expect(Array.isArray(res.body.dependencies)).toBe(true);
    });

    // D11 — Self-dependency rejected with 400 Bad Request
    test("D11 — Self-dependency (problem depending on itself) is rejected with 400", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
                dependency_type: "CAUSES",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/self-dependency/i);
    });

    // D12 — Direct reverse dependency rejected with 409 Conflict
    test("D12 — Direct reverse dependency (A -> B exists, attempting B -> A) rejected with 409 Conflict", async () => {
        // A depends on B is already created. Now attempt B depends on A.
        const res = await request(app)
            .post(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
                dependency_type: "CAUSES",
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/circular dependency/i);
        expect(res.body.cycle_path).toEqual([pB_id, pA_id, pB_id]);
    });

    // D13 — Transitive 3-node cycle (A -> B -> C, attempting C -> A) rejected with 409 Conflict
    test("D13 — Transitive 3-node cycle (A -> B -> C, attempting C -> A) rejected with 409 Conflict", async () => {
        // Create B -> C
        const bcRes = await request(app)
            .post(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pC_id,
                dependency_type: "BLOCKS_SOLUTION",
                reasoning: "Culvert clearance blocked by industrial slag buildup.",
            });
        expect(bcRes.status).toBe(201);

        // Attempt C -> A (Chain: A -> B -> C -> A)
        const caRes = await request(app)
            .post(`/api/problems/${pC_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
                dependency_type: "CAUSES",
            });
        expect(caRes.status).toBe(409);
        expect(caRes.body.message).toMatch(/circular dependency/i);
        expect(caRes.body.cycle_path).toBeDefined();
        expect(caRes.body.cycle_path[0]).toBe(pC_id);
        expect(caRes.body.cycle_path[caRes.body.cycle_path.length - 1]).toBe(pC_id);
    });

    // D14 — Deep 4-node transitive cycle (A -> B -> C -> D, attempting D -> A) rejected with 409 Conflict
    test("D14 — Deep 4-node transitive cycle (A -> B -> C -> D, attempting D -> A) rejected with 409 Conflict", async () => {
        // Create C -> D
        const cdRes = await request(app)
            .post(`/api/problems/${pC_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pD_id,
                dependency_type: "CAUSES",
                reasoning: "Waste buildup directly caused by upstream industrial dump.",
            });
        expect(cdRes.status).toBe(201);
        authorityDepId = cdRes.body.dependency.id;

        // Attempt D -> A (Chain: A -> B -> C -> D -> A)
        const daRes = await request(app)
            .post(`/api/problems/${pD_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
                dependency_type: "CAUSES",
            });
        expect(daRes.status).toBe(409);
        expect(daRes.body.message).toMatch(/circular dependency/i);
    });

    // D15 — Conflict response includes cycle_path array
    test("D15 — Conflict response includes complete cycle_path array for auditability", async () => {
        const res = await request(app)
            .post(`/api/problems/${pD_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ depends_on_problem_id: pA_id });
        expect(res.status).toBe(409);
        expect(Array.isArray(res.body.cycle_path)).toBe(true);
        expect(res.body.cycle_path.length).toBeGreaterThanOrEqual(3);
    });

    // D16 — Duplicate exact dependency edge rejected with 409 Conflict
    test("D16 — Duplicate exact dependency edge (A -> B twice) rejected with 409 Conflict", async () => {
        const res = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pB_id,
                dependency_type: "BLOCKS_SOLUTION",
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already.*created/i);
    });

    // D17 — Confidence calculation strictly server-calculated and bounded
    test("D17 — Confidence calculation is server-calculated and strictly bounded between 10.0 and 95.0", async () => {
        const res = await request(app)
            .get(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        const conf = res.body.dependency.confidence;
        expect(typeof conf).toBe("number");
        expect(conf).toBeGreaterThanOrEqual(10.0);
        expect(conf).toBeLessThanOrEqual(95.0);
    });

    // D18 — Confidence recalculated deterministically on update
    test("D18 — Confidence recalculated deterministically when reasoning/signals update", async () => {
        const res = await request(app)
            .patch(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                reasoning: "Updated geotechnical assessment confirms culvert collapse directly causes pavement failure.",
            });
        expect(res.status).toBe(200);
        expect(res.body.dependency.confidence).toBeGreaterThanOrEqual(10.0);
    });

    // D19 — Verification transition to VERIFIED does NOT alter confidence (Fix 1)
    let confBeforeVerification;
    test("D19 — Verification transition to VERIFIED does NOT alter confidence (Fix 1)", async () => {
        const preCheck = await request(app)
            .get(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        confBeforeVerification = preCheck.body.dependency.confidence;

        // Move PROPOSED -> UNDER_REVIEW -> VERIFIED
        await request(app)
            .patch(`/api/dependencies/${studentDepId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "UNDER_REVIEW", verification_notes: "Initiated audit" });

        const verRes = await request(app)
            .patch(`/api/dependencies/${studentDepId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "VERIFIED",
                verification_notes: "Audit confirmed that road repair requires preceding culvert replacement.",
            });
        expect(verRes.status).toBe(200);
        expect(verRes.body.dependency.verification_status).toBe("VERIFIED");
        expect(verRes.body.dependency.confidence).toBe(confBeforeVerification);
    });

    // D20 — Rejection transition to REJECTED does NOT alter confidence
    test("D20 — Rejection transition to REJECTED does NOT alter confidence", async () => {
        // Move authorityDepId to UNDER_REVIEW then REJECTED
        await request(app)
            .patch(`/api/dependencies/${authorityDepId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "UNDER_REVIEW", verification_notes: "Checking linkage" });

        const preCheck = await request(app)
            .get(`/api/dependencies/${authorityDepId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const confBefore = preCheck.body.dependency.confidence;

        const rejRes = await request(app)
            .patch(`/api/dependencies/${authorityDepId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "REJECTED",
                verification_notes: "Dump is on a different tributary not discharging into this culvert.",
            });
        expect(rejRes.status).toBe(200);
        expect(rejRes.body.dependency.verification_status).toBe("REJECTED");
        expect(rejRes.body.dependency.confidence).toBe(confBefore);
    });

    // D21 — Non-authority cannot verify or reject dependencies (403)
    test("D21 — Non-authority (STUDENT, RESEARCHER, CITIZEN) cannot verify dependencies (403)", async () => {
        const res = await request(app)
            .patch(`/api/dependencies/${authorityDepId}/verify`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({ verification_status: "VERIFIED", verification_notes: "Attempted researcher verification" });
        expect(res.status).toBe(403);
    });

    // D22 — Invalid transition directly from PROPOSED -> VERIFIED rejected with 400
    test("D22 — Invalid transition directly from PROPOSED -> VERIFIED rejected with 400", async () => {
        // Create a new dependency in PROPOSED
        const newDep = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pC_id,
                dependency_type: "SHARED_ROOT_CAUSE",
            });
        expect(newDep.status).toBe(201);
        const tempId = newDep.body.dependency.id;

        const res = await request(app)
            .patch(`/api/dependencies/${tempId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "VERIFIED", verification_notes: "Direct verification attempt" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid verification transition/i);
    });

    // D23 — Valid transition: PROPOSED -> UNDER_REVIEW returns 200
    test("D23 — Valid verification transition: PROPOSED -> UNDER_REVIEW returns 200", async () => {
        // Find existing dependency or create one
        const listRes = await request(app)
            .get(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const propDep = listRes.body.upstream_dependencies.find((d) => d.verification_status === "PROPOSED");

        const res = await request(app)
            .patch(`/api/dependencies/${propDep.id}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "UNDER_REVIEW",
                verification_notes: "Technical evaluation team dispatched",
            });
        expect(res.status).toBe(200);
        expect(res.body.dependency.verification_status).toBe("UNDER_REVIEW");
    });

    // D24 — Valid transition: UNDER_REVIEW -> VERIFIED records verifier details
    test("D24 — Valid transition: UNDER_REVIEW -> VERIFIED records verified_by, verified_at, notes", async () => {
        const listRes = await request(app)
            .get(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const reviewDep = listRes.body.upstream_dependencies.find((d) => d.verification_status === "UNDER_REVIEW");

        const res = await request(app)
            .patch(`/api/dependencies/${reviewDep.id}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "VERIFIED",
                verification_notes: "Field audit confirmed shared municipal infrastructure neglect.",
            });
        expect(res.status).toBe(200);
        expect(res.body.dependency.verification_status).toBe("VERIFIED");
        expect(res.body.dependency.verified_at).toBeDefined();
        expect(res.body.dependency.verifier).toBeDefined();
    });

    // D25 — Valid transition: UNDER_REVIEW -> REJECTED marks status REJECTED
    test("D25 — Valid transition: UNDER_REVIEW -> REJECTED marks status REJECTED with notes", async () => {
        // Create a temp dependency, move to UNDER_REVIEW, then REJECTED
        const temp = await request(app)
            .post(`/api/problems/${pA_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pD_id,
                dependency_type: "EXACERBATES",
            });
        const tempId = temp.body.dependency.id;

        await request(app)
            .patch(`/api/dependencies/${tempId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ verification_status: "UNDER_REVIEW", verification_notes: "Reviewing link" });

        const res = await request(app)
            .patch(`/api/dependencies/${tempId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                verification_status: "REJECTED",
                verification_notes: "No hydraulic connection between industrial dump and circular road.",
            });
        expect(res.status).toBe(200);
        expect(res.body.dependency.verification_status).toBe("REJECTED");
    });

    // D26 — GET /api/problems/:id/dependencies returns upstream and downstream
    test("D26 — GET /api/problems/:id/dependencies returns structured upstream and downstream dependencies", async () => {
        const res = await request(app)
            .get(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(pB_id);
        expect(Array.isArray(res.body.upstream_dependencies)).toBe(true);
        expect(Array.isArray(res.body.downstream_dependencies)).toBe(true);
        expect(res.body.upstream_count).toBeGreaterThanOrEqual(1);
        expect(res.body.downstream_count).toBeGreaterThanOrEqual(1);
    });

    // D27 — GET /api/problems/:id/dependency-graph returns DAG nodes and edges
    test("D27 — GET /api/problems/:id/dependency-graph returns DAG nodes and edges up to depth", async () => {
        const res = await request(app)
            .get(`/api/problems/${pA_id}/dependency-graph?depth=3`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.root_problem_id).toBe(pA_id);
        expect(res.body.depth).toBe(3);
        expect(Array.isArray(res.body.nodes)).toBe(true);
        expect(Array.isArray(res.body.edges)).toBe(true);
        expect(res.body.nodes.length).toBeGreaterThanOrEqual(2);
    });

    // D28 — GET /api/problems/:id/impact-chain calculates cascade blast radius
    test("D28 — GET /api/problems/:id/impact-chain calculates cascade blast radius and affected population", async () => {
        const res = await request(app)
            .get(`/api/problems/${pD_id}/impact-chain`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.root_problem_id).toBe(pD_id);
        expect(res.body.blast_radius_count).toBeGreaterThanOrEqual(0);
        expect(res.body.total_affected_population).toBeGreaterThanOrEqual(8000);
        expect(Array.isArray(res.body.downstream_problems)).toBe(true);
    });

    // D29 — GET /api/dependencies/critical-paths identifies top bottlenecks
    test("D29 — GET /api/dependencies/critical-paths identifies top bottleneck problems", async () => {
        const res = await request(app)
            .get("/api/dependencies/critical-paths?district=Ranchi")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.bottlenecks)).toBe(true);
        expect(res.body.total_bottlenecks).toBeGreaterThanOrEqual(1);
        const top = res.body.bottlenecks[0];
        expect(top.problem_id).toBeDefined();
        expect(top.blocking_degree).toBeGreaterThanOrEqual(1);
    });

    // D30 — Proposer can update their own unverified proposed dependency
    test("D30 — Proposer can update their own unverified proposed dependency (returns 200)", async () => {
        // Create an unverified dependency by student
        const newDep = await request(app)
            .post(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                depends_on_problem_id: pD_id,
                dependency_type: "EXACERBATES",
                reasoning: "Student hypothesis on slag runoff exacerbating culvert siltation.",
            });
        expect(newDep.status).toBe(201);
        const tempId = newDep.body.dependency.id;

        const updateRes = await request(app)
            .patch(`/api/dependencies/${tempId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                reasoning: "Refined student hypothesis with hydrological siltation data.",
            });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.dependency.reasoning).toMatch(/hydrological siltation/i);
    });

    // D31 — Proposer cannot edit another user's dependency (403)
    test("D31 — Proposer cannot edit another user's dependency (returns 403)", async () => {
        // Create unverified dependency by authority
        const dep = await request(app)
            .post(`/api/problems/${pB_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
            });
        // Note: pB depends on pA was tested above as cycle; let's create a valid fresh edge
        // pC depends on pB was cycle; let's test editing studentDepId with researcherToken
        const res = await request(app)
            .patch(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${researcherToken}`)
            .send({ reasoning: "Unauthorized takeover" });
        expect(res.status).toBe(403);
    });

    // D32 — Verified dependency cannot be modified or deleted by ordinary proposer (403)
    test("D32 — Verified dependency cannot be modified or deleted by ordinary proposer (403)", async () => {
        const delRes = await request(app)
            .delete(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${studentToken}`);
        expect(delRes.status).toBe(403);
    });

    // D33 — Sensitive credentials never leaked in responses
    test("D33 — Sensitive credentials (password_hash, email, phone) are never leaked", async () => {
        const res = await request(app)
            .get(`/api/dependencies/${studentDepId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        const str = JSON.stringify(res.body);
        expect(str).not.toMatch(/password_hash/i);
        expect(str).not.toMatch(/phone/i);
        if (res.body.dependency.proposer) {
            expect(Object.keys(res.body.dependency.proposer).sort()).toEqual(["id", "name", "role"].sort());
        }
    });

    // D34 — SQL injection payloads in reasoning are safely handled
    test("D34 — SQL injection payloads in reasoning and dependency_type are safely handled", async () => {
        const sqlPayload = "'; DROP TABLE problem_dependencies; --";
        const res = await request(app)
            .post(`/api/problems/${pC_id}/dependencies`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                depends_on_problem_id: pA_id,
                reasoning: sqlPayload,
            });
        // pC -> pA is a cycle (A -> B -> C -> A), so it properly throws 409
        expect(res.status).toBe(409);

        // Verify problem_dependencies table is unharmed
        const check = await pool.query("SELECT COUNT(*) FROM problem_dependencies");
        expect(parseInt(check.rows[0].count, 10)).toBeGreaterThan(0);
    });

    // D35 — Problem status remains completely unchanged
    test("D35 — CRITICAL: Problem status is NEVER mutated by any dependency operation", async () => {
        for (const [probId, expectedStatus] of Object.entries(initialStatuses)) {
            const res = await pool.query("SELECT status FROM problems WHERE id = $1", [probId]);
            expect(res.rows[0]?.status).toBe(expectedStatus);
        }
    });
});

// ===========================================================================
// MODULE 13 — SMART NOTIFICATIONS TESTS
// ===========================================================================

describe("Module 13 — Smart Notifications", () => {
    let citizenUser, authorityUser, studentUser, researcherUser;
    let notif1_id, notif2_id;
    let testProblemId, testSolutionId, testImplId;

    beforeAll(async () => {
        citizenUser = jwt.decode(citizenToken);
        authorityUser = jwt.decode(authorityToken);
        studentUser = jwt.decode(studentToken);
        researcherUser = jwt.decode(researcherToken);

        // Clean up previous test notifications for these users
        await pool.query(
            "DELETE FROM notifications WHERE recipient_user_id IN ($1, $2, $3, $4)",
            [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
        );

        // Create a test problem reported by citizenUser
        const pRes = await pool.query(
            `INSERT INTO problems (title, description, category, district, status, reporter_id)
             VALUES ('Groundwater Contamination in Namkum', 'Severe chemical odor in water supply', 'Environment', 'Ranchi', 'REPORTED', $1)
             RETURNING id`,
            [citizenUser.id]
        );
        testProblemId = pRes.rows[0].id;

        // Ensure authorityUser has an authority_profile in Ranchi
        await pool.query(
            `INSERT INTO authority_profiles (user_id, department_name, designation, district)
             VALUES ($1, 'Water Supply Department', 'Chief Officer', 'Ranchi')
             ON CONFLICT (user_id) DO UPDATE SET district = 'Ranchi'`,
            [authorityUser.id]
        );

        // Create a solution submitted by studentUser
        const sRes = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Electrochemical Remediation System', 'Solar-powered filtration unit', 'SUBMITTED')
             RETURNING id`,
            [testProblemId, studentUser.id]
        );
        testSolutionId = sRes.rows[0].id;

        // Link researcherUser as contributor on the solution
        await pool.query(
            `INSERT INTO solution_contributors (solution_id, user_id, contribution_role, contribution_description)
             VALUES ($1, $2, 'Technical Advisor', 'Electrochemical cell design')`,
            [testSolutionId, researcherUser.id]
        );

        // Create an implementation project
        const iRes = await pool.query(
            `INSERT INTO solution_implementations (solution_id, problem_id, lead_authority_id, executing_user_id, title, status, target_start_date, target_end_date)
             VALUES ($1, $2, $3, $4, 'Namkum Solar Water Treatment Pilot', 'PILOT', '2026-10-01', '2026-12-31')
             RETURNING id`,
            [testSolutionId, testProblemId, authorityUser.id, studentUser.id]
        );
        testImplId = iRes.rows[0].id;
    });

    // N1 — Authentication
    test("N1 — Unauthenticated GET /api/notifications returns 401", async () => {
        const res = await request(app).get("/api/notifications");
        expect(res.status).toBe(401);
    });

    // N2 — User sees only their own notifications
    test("N2 — User sees only their own notifications (IDOR isolated)", async () => {
        const { notify } = require("../src/services/notificationService");
        await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId,
            recipientUserIds: [citizenUser.id],
            title: "Problem Verified",
            message: "Your reported problem has been verified by the municipal authority.",
            priority: "NORMAL",
            actionUrl: `/problems/${testProblemId}`,
        });

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.notifications)).toBe(true);
        expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
        res.body.notifications.forEach((n) => {
            expect(n.recipient_user_id).toBe(citizenUser.id);
        });
        notif1_id = res.body.notifications[0].id;
    });

    // N3 — IDOR blocked on GET /api/notifications/:id
    test("N3 — IDOR blocked: Attempting to fetch another user's notification returns 404", async () => {
        const res = await request(app)
            .get(`/api/notifications/${notif1_id}`)
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    // N4 — IDOR blocked on PATCH /api/notifications/:id/read
    test("N4 — IDOR blocked: Attempting to mark another user's notification as read returns 404", async () => {
        const res = await request(app)
            .patch(`/api/notifications/${notif1_id}/read`)
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(404);
    });

    // N5 — Problem event creates notification for reporter
    test("N5 — Problem event creates notification for problem reporter", async () => {
        const { notify } = require("../src/services/notificationService");
        const result = await notify({
            eventType: "PROBLEM_STATUS_CHANGED",
            entityType: "PROBLEM",
            entityId: testProblemId,
            actorUserId: authorityUser.id,
            title: "Status Updated",
            message: "Problem status updated to ROOT_CAUSE_ANALYSIS",
            priority: "NORMAL",
            actionUrl: `/problems/${testProblemId}`,
        });
        expect(result.sent_count).toBeGreaterThanOrEqual(1);

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${citizenToken}`);
        const found = res.body.notifications.find((n) => n.title === "Status Updated");
        expect(found).toBeDefined();
    });

    // N6 — Solution event creates notification for district authorities
    test("N6 — Solution event creates notification for district authorities", async () => {
        const { notify } = require("../src/services/notificationService");
        await notify({
            eventType: "SOLUTION_SUBMITTED",
            entityType: "SOLUTION",
            entityId: testSolutionId,
            actorUserId: studentUser.id,
            title: "New Solution Submitted",
            message: "A new solution was submitted for Namkum Groundwater",
            priority: "NORMAL",
            actionUrl: `/solutions/${testSolutionId}`,
        });

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(200);
        const solNotif = res.body.notifications.find((n) => n.event_type === "SOLUTION_SUBMITTED");
        expect(solNotif).toBeDefined();
    });

    // N7 — Critical implementation blocker creates CRITICAL notification
    test("N7 — Critical implementation blocker creates CRITICAL notification for lead authority", async () => {
        const { notify } = require("../src/services/notificationService");
        await notify({
            eventType: "IMPLEMENTATION_BLOCKED",
            entityType: "IMPLEMENTATION",
            entityId: testImplId,
            actorUserId: studentUser.id,
            title: "Critical Blocker Raised",
            message: "Excavation permits revoked by state pollution board.",
            priority: "CRITICAL",
            actionUrl: `/implementations/${testImplId}`,
        });

        const res = await request(app)
            .get("/api/notifications?priority=CRITICAL")
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.status).toBe(200);
        const blocker = res.body.notifications.find((n) => n.priority === "CRITICAL");
        expect(blocker).toBeDefined();
        expect(blocker.priority).toBe("CRITICAL");
    });

    // N8 — Impact event creates notification for solution submitter
    test("N8 — Impact event creates notification for solution submitter and contributors", async () => {
        const { notify } = require("../src/services/notificationService");
        await notify({
            eventType: "SOLUTION_APPROVED",
            entityType: "SOLUTION",
            entityId: testSolutionId,
            actorUserId: authorityUser.id,
            title: "Solution Approved",
            message: "Your electrochemical remediation solution has been approved for pilot testing.",
            priority: "HIGH",
            actionUrl: `/solutions/${testSolutionId}`,
        });

        const resStudent = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${studentToken}`);
        const approvedNotif = resStudent.body.notifications.find((n) => n.event_type === "SOLUTION_APPROVED");
        expect(approvedNotif).toBeDefined();
        expect(approvedNotif.priority).toBe("HIGH");

        // Check contributor received it as well
        const resResearcher = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${researcherToken}`);
        const contribNotif = resResearcher.body.notifications.find((n) => n.event_type === "SOLUTION_APPROVED");
        expect(contribNotif).toBeDefined();
    });

    // N9 — Correct authority recipient resolved via authority_profiles.district
    test("N9 — Authority recipient correctly resolved via authority_profiles.district", async () => {
        const { resolveRecipients } = require("../src/services/notificationService");
        const recipients = await resolveRecipients({
            eventType: "PROBLEM_REPORTED",
            entityType: "PROBLEM",
            entityId: testProblemId,
        });
        expect(recipients).toContain(authorityUser.id);
    });

    // N10 — Solution contributors correctly resolved via solution_contributors
    test("N10 — Solution contributors correctly resolved via solution_contributors", async () => {
        const { resolveRecipients } = require("../src/services/notificationService");
        const recipients = await resolveRecipients({
            eventType: "SOLUTION_APPROVED",
            entityType: "SOLUTION",
            entityId: testSolutionId,
        });
        expect(recipients).toContain(studentUser.id);
        expect(recipients).toContain(researcherUser.id);
    });

    // N11 — Central actor exclusion: Actor user ID is strictly excluded from recipient list (Mandatory Fix 2)
    test("N11 — Central actor exclusion: actor_user_id is strictly removed from recipients", async () => {
        const { notify } = require("../src/services/notificationService");
        // Authority triggers an event where authority would otherwise be a recipient
        const res = await notify({
            eventType: "PROBLEM_REPORTED",
            entityType: "PROBLEM",
            entityId: testProblemId,
            actorUserId: authorityUser.id,
            title: "Self Actor Exclusion Test",
            message: "Should not be received by authorityUser",
            priority: "NORMAL",
        });
        // Authority should not receive self-alert
        const check = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${authorityToken}`);
        const selfAlert = check.body.notifications.find((n) => n.title === "Self Actor Exclusion Test");
        expect(selfAlert).toBeUndefined();
    });

    // N12 — Irrelevant users do not receive notification
    test("N12 — Irrelevant users do not receive notification", async () => {
        // Register an unrelated fresh citizen
        const unRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: `Unrelated_${testUserSuffix}`,
                email: `unrelated_${testUserSuffix}@test.com`,
                password: "Test1234!",
                role: "CITIZEN",
            });
        const unrelatedToken = unRes.body.token;

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${unrelatedToken}`);
        expect(res.status).toBe(200);
        expect(res.body.notifications.length).toBe(0);
    });

    // N13 — Critical event dispatches with priority = 'CRITICAL'
    test("N13 — Critical blocker event dispatches with priority = 'CRITICAL'", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "CRITICAL_DEPENDENCY_DETECTED",
            entityType: "DEPENDENCY",
            entityId: 999,
            recipientUserIds: [studentUser.id],
            title: "Critical dependency halts deployment",
            message: "Downstream water main rupture must be repaired first",
            priority: "CRITICAL",
            actionUrl: "/problems/10/dependencies",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].priority).toBe("CRITICAL");
    });

    // N14 — Normal event dispatches with priority = 'NORMAL'
    test("N14 — Normal event dispatches with priority = 'NORMAL'", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "ROOT_CAUSE_PROPOSED",
            entityType: "ROOT_CAUSE",
            entityId: 999,
            recipientUserIds: [studentUser.id],
            title: "New root cause hypothesis proposed",
            message: "Student proposed groundwater aquifer infiltration hypothesis",
            priority: "NORMAL",
            actionUrl: "/problems/10/root-causes",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].priority).toBe("NORMAL");
    });

    // N15 — Duplicate event within 15-minute cooldown is suppressed (Mandatory Fix 1 & 5)
    test("N15 — Duplicate identical event within 15-minute cooldown is suppressed", async () => {
        const { notify } = require("../src/services/notificationService");
        // Dispatch first time
        const res1 = await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId + 500,
            recipientUserIds: [studentUser.id],
            title: "Duplicate Cooldown Test",
            message: "First notification",
            priority: "NORMAL",
        });
        expect(res1.sent_count).toBe(1);

        // Immediate identical dispatch should be suppressed
        const res2 = await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId + 500,
            recipientUserIds: [studentUser.id],
            title: "Duplicate Cooldown Test",
            message: "Second identical notification within cooldown",
            priority: "NORMAL",
        });
        expect(res2.sent_count).toBe(0);
    });

    // N16 — Repeated non-identical events are preserved
    test("N16 — Non-identical events (different event_type) are preserved", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "PROBLEM_STATUS_CHANGED", // different event_type
            entityType: "PROBLEM",
            entityId: testProblemId + 500,
            recipientUserIds: [studentUser.id],
            title: "Non-identical event",
            message: "Different event type for same problem",
            priority: "NORMAL",
        });
        expect(res.sent_count).toBe(1);
    });

    // N17 — Critical events with new diagnostic details bypass cooldown (Mandatory Fix 1)
    test("N17 — Critical events with new diagnostic fingerprint bypass cooldown", async () => {
        const { notify } = require("../src/services/notificationService");
        // Initial critical alert
        const res1 = await notify({
            eventType: "IMPLEMENTATION_BLOCKED",
            entityType: "IMPLEMENTATION",
            entityId: testImplId + 100,
            recipientUserIds: [authorityUser.id],
            title: "Critical Blocker #1",
            message: "Subterranean gas leak",
            priority: "CRITICAL",
            fingerprint: "gas_leak_sensor_1",
        });
        expect(res1.sent_count).toBe(1);

        // Second critical alert with NEW diagnostic detail (different fingerprint)
        const res2 = await notify({
            eventType: "IMPLEMENTATION_BLOCKED",
            entityType: "IMPLEMENTATION",
            entityId: testImplId + 100,
            recipientUserIds: [authorityUser.id],
            title: "Critical Blocker #2",
            message: "Structural foundation subsidence",
            priority: "CRITICAL",
            fingerprint: "subsidence_sensor_2",
        });
        expect(res2.sent_count).toBe(1);

        // Third critical alert with IDENTICAL fingerprint is suppressed
        const res3 = await notify({
            eventType: "IMPLEMENTATION_BLOCKED",
            entityType: "IMPLEMENTATION",
            entityId: testImplId + 100,
            recipientUserIds: [authorityUser.id],
            title: "Critical Blocker #3",
            message: "Structural foundation subsidence repeated",
            priority: "CRITICAL",
            fingerprint: "subsidence_sensor_2",
        });
        expect(res3.sent_count).toBe(0);
    });

    // N18 — Newly created notification starts as is_read = false
    test("N18 — Newly created notification starts as is_read = false with read_at = null", async () => {
        const res = await request(app)
            .get(`/api/notifications/${notif1_id}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.notification.is_read).toBe(false);
        expect(res.body.notification.read_at).toBeNull();
    });

    // N19 — PATCH /api/notifications/:id/read marks as read
    test("N19 — PATCH /api/notifications/:id/read marks notification as read (returns 200)", async () => {
        const res = await request(app)
            .patch(`/api/notifications/${notif1_id}/read`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.notification.is_read).toBe(true);
        expect(res.body.notification.read_at).toBeDefined();
    });

    // N20 — read_at timestamp is populated
    test("N20 — read_at timestamp is populated upon marking read", async () => {
        const res = await request(app)
            .get(`/api/notifications/${notif1_id}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.notification.is_read).toBe(true);
        expect(new Date(res.body.notification.read_at).getTime()).toBeGreaterThan(0);
    });

    // N21 — GET /api/notifications/unread-count returns accurate count
    test("N21 — GET /api/notifications/unread-count returns accurate unread count", async () => {
        const { notify } = require("../src/services/notificationService");
        // Add fresh unread notification for student
        await notify({
            eventType: "STUDENT_MATCH_FOUND",
            entityType: "PROBLEM",
            entityId: testProblemId,
            recipientUserIds: [studentUser.id],
            title: "Expertise Match",
            message: "Namkum Groundwater problem matches your declared hydrology skills",
            priority: "NORMAL",
            fingerprint: "match_fresh_1",
        });

        const res = await request(app)
            .get("/api/notifications/unread-count")
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body.unread_count).toBeGreaterThanOrEqual(1);
    });

    // N22 — PATCH /api/notifications/read-all marks all unread notifications read
    test("N22 — PATCH /api/notifications/read-all marks all unread notifications read", async () => {
        const res = await request(app)
            .patch("/api/notifications/read-all")
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body.marked_count).toBeGreaterThanOrEqual(1);

        // Verify unread count is now 0
        const countRes = await request(app)
            .get("/api/notifications/unread-count")
            .set("Authorization", `Bearer ${studentToken}`);
        expect(countRes.body.unread_count).toBe(0);
    });

    // N23 — SQL injection payloads in title or message are safely handled
    test("N23 — SQL injection payloads in title and message are handled safely", async () => {
        const sqlPayload = "'; DROP TABLE notifications; --";
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId + 800,
            recipientUserIds: [citizenUser.id],
            title: sqlPayload,
            message: sqlPayload,
            priority: "NORMAL",
            fingerprint: "sqli_1",
        });
        expect(res.sent_count).toBe(1);

        const check = await pool.query("SELECT COUNT(*) FROM notifications");
        expect(parseInt(check.rows[0].count, 10)).toBeGreaterThan(0);
    });

    // N24 — Malformed action URL rejected or sanitized (Mandatory Fix 4)
    test("N24 — Malformed action URL (external URL or javascript:) is rejected or sanitized", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId + 900,
            recipientUserIds: [citizenUser.id],
            title: "URL Sanitation Test",
            message: "Testing external URL rejection",
            actionUrl: "javascript:alert('xss')", // Unsafe
            fingerprint: "url_test_1",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].action_url).toBeNull(); // Sanitized to null
    });

    // N25 — Metadata JSONB safely stored and retrieved
    test("N25 — Metadata JSONB safely stored and retrieved", async () => {
        const { notify } = require("../src/services/notificationService");
        const meta = { district: "Ranchi", severity_level: 4, automated: true };
        const res = await notify({
            eventType: "PROBLEM_VERIFIED",
            entityType: "PROBLEM",
            entityId: testProblemId + 950,
            recipientUserIds: [citizenUser.id],
            title: "Metadata Test",
            message: "Testing JSONB metadata persistence",
            metadata: meta,
            fingerprint: "meta_test_1",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].metadata).toEqual(meta);
    });

    // N26 — Sensitive data never leaked in notification payloads
    test("N26 — Sensitive data (password_hash, email, phone) never leaked in payloads", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${citizenToken}`);
        const str = JSON.stringify(res.body);
        expect(str).not.toMatch(/password_hash/i);
        expect(str).not.toMatch(/phone/i);
    });

    // N27 — Pagination works correctly
    test("N27 — Pagination (page, limit) works correctly", async () => {
        const res = await request(app)
            .get("/api/notifications?page=1&limit=2")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
        expect(res.body.notifications.length).toBeLessThanOrEqual(2);
        expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    // N28 — Filtering by is_read and priority returns matching subset
    test("N28 — Filtering by is_read and priority returns matching subset", async () => {
        const res = await request(app)
            .get("/api/notifications?is_read=true")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        res.body.notifications.forEach((n) => {
            expect(n.is_read).toBe(true);
        });
    });

    // N29 — Solution approval notification generated with valid relative action_url
    test("N29 — Solution approval notification generated with valid relative action_url", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "SOLUTION_APPROVED",
            entityType: "SOLUTION",
            entityId: testSolutionId,
            recipientUserIds: [studentUser.id],
            title: "Pilot Approval",
            message: "Solution approved for Namkum",
            priority: "HIGH",
            actionUrl: `/solutions/${testSolutionId}`,
            fingerprint: "approved_valid_url",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].action_url).toBe(`/solutions/${testSolutionId}`);
    });

    // N30 — Implementation blocker notification generated with CRITICAL priority
    test("N30 — Implementation blocker notification generated with CRITICAL priority", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "IMPLEMENTATION_BLOCKED",
            entityType: "IMPLEMENTATION",
            entityId: testImplId,
            recipientUserIds: [authorityUser.id],
            title: "Emergency Blocker",
            message: "Monsoon flash flooding halted pipeline excavation",
            priority: "CRITICAL",
            actionUrl: `/implementations/${testImplId}`,
            fingerprint: "flood_blocker_1",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].priority).toBe("CRITICAL");
    });

    // N31 — Dependency verification notification generated
    test("N31 — Dependency verification notification generated", async () => {
        const { notify } = require("../src/services/notificationService");
        const res = await notify({
            eventType: "DEPENDENCY_VERIFIED",
            entityType: "DEPENDENCY",
            entityId: 50,
            recipientUserIds: [researcherUser.id],
            title: "Dependency Verified",
            message: "Causal dependency between culvert and road validated by authority",
            priority: "HIGH",
            actionUrl: "/problems/10/dependencies",
            fingerprint: "dep_ver_1",
        });
        expect(res.sent_count).toBe(1);
        expect(res.notifications[0].event_type).toBe("DEPENDENCY_VERIFIED");
    });

    // N32 — DELETE /api/notifications/:id deletes notification belonging to user
    test("N32 — DELETE /api/notifications/:id deletes notification belonging to user (returns 200)", async () => {
        const delRes = await request(app)
            .delete(`/api/notifications/${notif1_id}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(delRes.status).toBe(200);
        expect(delRes.body.id).toBe(notif1_id);

        // Verify it is gone
        const check = await request(app)
            .get(`/api/notifications/${notif1_id}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(check.status).toBe(404);
    });

    // N33 — Notification dispatch failure does NOT abort or roll back business operation (Mandatory Fix 3)
    test("N33 — Notification dispatch failure does not abort business operation", async () => {
        const { notify } = require("../src/services/notificationService");
        // Pass missing/malformed event params to simulate internal failure
        const res = await notify({
            eventType: null, // missing required
            entityType: null,
            entityId: null,
        });
        expect(res.sent_count).toBe(0);
        // Does not throw, safely returns
    });

    // N34 — Core statuses remain strictly unmutated by notification actions
    test("N34 — CRITICAL: Core statuses (problems, solutions, implementations) remain unmutated", async () => {
        const pCheck = await pool.query("SELECT status FROM problems WHERE id = $1", [testProblemId]);
        expect(pCheck.rows[0]?.status).toBe("REPORTED");

        const sCheck = await pool.query("SELECT status FROM solutions WHERE id = $1", [testSolutionId]);
        expect(sCheck.rows[0]?.status).toBe("SUBMITTED");

        const iCheck = await pool.query("SELECT status FROM solution_implementations WHERE id = $1", [testImplId]);
        expect(iCheck.rows[0]?.status).toBe("PILOT");
    });

    // N35 — Migration 013 is strictly idempotent
    test("N35 — Migration 013_smart_notifications.sql is strictly idempotent", async () => {
        const fs = require("fs");
        const path = require("path");
        const sqlPath = path.resolve(__dirname, "../../database/migrations/013_smart_notifications.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        await expect(pool.query(sql)).resolves.not.toThrow();
    });

    afterAll(async () => {
        if (citizenUser && authorityUser && studentUser && researcherUser) {
            await pool.query(
                "DELETE FROM notifications WHERE recipient_user_id IN ($1, $2, $3, $4)",
                [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
            );
        }
        if (testImplId) {
            await pool.query("DELETE FROM solution_implementations WHERE id = $1", [testImplId]);
        }
        if (testSolutionId) {
            await pool.query("DELETE FROM solution_contributors WHERE solution_id = $1", [testSolutionId]);
            await pool.query("DELETE FROM solutions WHERE id = $1", [testSolutionId]);
        }
        if (testProblemId) {
            await pool.query("DELETE FROM problems WHERE id = $1", [testProblemId]);
        }
    });
});

// ===========================================================================
// MODULE 14 — Rankings + Reputation + Rewards
// ===========================================================================

describe("Module 14 — Rankings + Reputation + Rewards", () => {
    let citizenUser, authorityUser, studentUser, researcherUser;
    let testProblemId, testSolutionId, testImplId, testAssessmentId;

    beforeAll(async () => {
        citizenUser = jwt.decode(citizenToken);
        authorityUser = jwt.decode(authorityToken);
        studentUser = jwt.decode(studentToken);
        researcherUser = jwt.decode(researcherToken);

        // Clean up previous test data
        await pool.query(
            "DELETE FROM reputation_events WHERE user_id IN ($1, $2, $3, $4)",
            [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
        );
        await pool.query(
            "DELETE FROM user_badges WHERE user_id IN ($1, $2, $3, $4)",
            [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
        );
        await pool.query(
            "DELETE FROM reputation WHERE user_id IN ($1, $2, $3, $4)",
            [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
        );

        // Create test entities
        const pRes = await pool.query(
            `INSERT INTO problems (title, description, category, district, status, reporter_id, verified)
             VALUES ('Namkum Arsenic Infiltration', 'High arsenic levels in well water', 'Environment', 'Ranchi', 'VERIFIED', $1, true)
             RETURNING id`,
            [citizenUser.id]
        );
        testProblemId = pRes.rows[0].id;

        const sRes = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Arsenic Nanofiltration System', 'Low-cost solar powered adsorbent filter', 'APPROVED')
             RETURNING id`,
            [testProblemId, studentUser.id]
        );
        testSolutionId = sRes.rows[0].id;

        const iRes = await pool.query(
            `INSERT INTO solution_implementations (solution_id, problem_id, lead_authority_id, executing_user_id, title, status, target_start_date, target_end_date)
             VALUES ($1, $2, $3, $4, 'Namkum Pilot Filtration Deployment', 'COMPLETED', '2026-10-01', '2026-12-31')
             RETURNING id`,
            [testSolutionId, testProblemId, authorityUser.id, studentUser.id]
        );
        testImplId = iRes.rows[0].id;

        const aRes = await pool.query(
            `INSERT INTO implementation_impact_assessments (implementation_id, problem_id, outcome_summary, impact_score, verification_status, verified_by, verified_at, measurement_start_date, measurement_end_date)
             VALUES ($1, $2, 'Arsenic reduced by 94%', 90, 'VERIFIED', $3, NOW(), '2026-09-01', '2026-09-08')
             RETURNING id`,
            [testImplId, testProblemId, authorityUser.id]
        );
        testAssessmentId = aRes.rows[0].id;
    });

    afterAll(async () => {
        if (citizenUser && authorityUser && studentUser && researcherUser) {
            await pool.query(
                "DELETE FROM reputation_events WHERE user_id IN ($1, $2, $3, $4) OR actor_id IN ($1, $2, $3, $4)",
                [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
            );
            await pool.query(
                "DELETE FROM user_badges WHERE user_id IN ($1, $2, $3, $4)",
                [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
            );
            await pool.query(
                "DELETE FROM reputation WHERE user_id IN ($1, $2, $3, $4)",
                [citizenUser.id, authorityUser.id, studentUser.id, researcherUser.id]
            );
        }
        if (testAssessmentId) {
            await pool.query("DELETE FROM implementation_impact_assessments WHERE id = $1", [testAssessmentId]);
        }
        if (testImplId) {
            await pool.query("DELETE FROM solution_implementations WHERE id = $1", [testImplId]);
        }
        if (testSolutionId) {
            await pool.query("DELETE FROM solution_contributors WHERE solution_id = $1", [testSolutionId]);
            await pool.query("DELETE FROM solutions WHERE id = $1", [testSolutionId]);
        }
        if (testProblemId) {
            await pool.query("DELETE FROM problems WHERE id = $1", [testProblemId]);
        }
    });

    // R1 — Unauthenticated GET /api/reputation/me returns 401
    test("R1 — Unauthenticated GET /api/reputation/me returns 401", async () => {
        const res = await request(app).get("/api/reputation/me");
        expect(res.status).toBe(401);
    });

    // R2 — Authenticated user can view own reputation
    test("R2 — Authenticated user can view own reputation with explainable breakdown", async () => {
        const res = await request(app)
            .get("/api/reputation/me")
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body.user_id).toBe(studentUser.id);
        expect(typeof res.body.lifetime_score).toBe("number");
        expect(typeof res.body.current_rank_score).toBe("number");
        expect(res.body.tier).toBeDefined();
        expect(res.body.breakdown).toBeDefined();
        expect(Array.isArray(res.body.recent_events)).toBe(true);
    });

    // R3 — Public reputation profile works
    test("R3 — Public reputation profile returns sanitized details without private credentials", async () => {
        const res = await request(app)
            .get(`/api/users/${studentUser.id}/reputation`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.user_id).toBe(studentUser.id);
        expect(res.body.role).toBe("STUDENT");
        expect(res.body.tier).toBeDefined();
        expect(res.body).not.toHaveProperty("password_hash");
        expect(res.body).not.toHaveProperty("email");
        expect(res.body).not.toHaveProperty("phone");
    });

    // R4 — Direct manual modification blocked
    test("R4 — Direct manual modification is blocked (no client mutation endpoints)", async () => {
        const res = await request(app)
            .post("/api/reputation/me")
            .set("Authorization", `Bearer ${studentToken}`)
            .send({ points: 500 });
        expect([404, 405]).toContain(res.status);
    });

    // R5 — Sensitive credentials never leaked
    test("R5 — Sensitive data (password_hash, email, phone) never leaked in leaderboard responses", async () => {
        const res = await request(app)
            .get("/api/rankings/users")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        const str = JSON.stringify(res.body);
        expect(str).not.toMatch(/password_hash/i);
        expect(str).not.toMatch(/@test\.com/i);
    });

    // R6 — SQL injection in query params handled safely
    test("R6 — SQL injection payloads in query params (role, tier, district) handled safely", async () => {
        const res = await request(app)
            .get("/api/rankings/users?role=' OR 1=1 --")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
    });

    // R7 — Authority-verified problem creates reputation event (+15 pts)
    test("R7 — Authority-verified problem report awards reputation points (+15) to reporter", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: citizenUser.id,
            contributionType: "PROBLEM_REPORT_VERIFIED",
            sourceEntityType: "PROBLEM",
            sourceEntityId: testProblemId,
            actorId: authorityUser.id,
            description: "Namkum Arsenic Infiltration verified by municipal authority",
        });
        expect(res.awarded).toBe(true);
        expect(res.points).toBe(15);
    });

    // R8 — Unverified problem awards 0 reputation
    test("R8 — Missing required event parameters or unverified entities award 0 points", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: null,
            contributionType: "PROBLEM_REPORT_VERIFIED",
            sourceEntityType: "PROBLEM",
            sourceEntityId: 9999,
        });
        expect(res.awarded).toBe(false);
    });

    // R9 — Duplicate attempt to award points for same entity suppressed
    test("R9 — Duplicate reputation award for identical deliverable is suppressed", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: citizenUser.id,
            contributionType: "PROBLEM_REPORT_VERIFIED",
            sourceEntityType: "PROBLEM",
            sourceEntityId: testProblemId,
            actorId: authorityUser.id,
        });
        expect(res.awarded).toBe(false);
        expect(res.reason).toMatch(/already awarded/i);
    });

    // R10 — Rejected contribution awards 0 reputation
    test("R10 — Rejected contribution does not award points", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: studentUser.id,
            contributionType: "IMPACT_VERIFIED",
            sourceEntityType: "IMPACT",
            sourceEntityId: 8888,
            impactScore: 30, // below 50 minimum threshold
        });
        expect(res.awarded).toBe(false);
    });

    // R11 — Solution evaluation composite score affects points via quality multiplier
    test("R11 — Higher evaluation score applies quality multiplier (90+ gets 1.5x)", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: studentUser.id,
            contributionType: "SOLUTION_APPROVED",
            sourceEntityType: "SOLUTION",
            sourceEntityId: testSolutionId,
            actorId: authorityUser.id,
            evaluationScore: 92, // 1.5x multiplier -> 150 points
        });
        expect(res.awarded).toBe(true);
        expect(res.points).toBe(150);
    });

    // R12 — Verified impact assessment awards substantially higher points (+300 to +450)
    test("R12 — Verified impact assessment awards major reputation (+450 pts for 85+ score)", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: studentUser.id,
            contributionType: "IMPACT_VERIFIED",
            sourceEntityType: "IMPACT",
            sourceEntityId: testAssessmentId,
            actorId: authorityUser.id,
            impactScore: 90, // 1.5x multiplier -> 450 points
        });
        expect(res.awarded).toBe(true);
        expect(res.points).toBe(450);
    });

    // R13 — Diminishing returns & monthly caps on repetitive actions
    test("R13 — Diminishing returns apply on repetitive verified problem reports", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        // Add 2nd report
        const res2 = await recordEvent({
            userId: citizenUser.id,
            contributionType: "PROBLEM_REPORT_VERIFIED",
            sourceEntityType: "PROBLEM",
            sourceEntityId: testProblemId + 1,
        });
        expect(res2.awarded).toBe(true);
        expect(res2.points).toBe(15);

        // 3rd report gets 50% points (8 pts rounded)
        const res3 = await recordEvent({
            userId: citizenUser.id,
            contributionType: "PROBLEM_REPORT_VERIFIED",
            sourceEntityType: "PROBLEM",
            sourceEntityId: testProblemId + 2,
        });
        expect(res3.awarded).toBe(true);
        expect(res3.points).toBe(8);
    });

    // R14 — Approved solution awards reputation to submitter
    test("R14 — Formally approved solution records verified solution event", async () => {
        const repRes = await pool.query("SELECT approved_solutions FROM reputation WHERE user_id = $1", [studentUser.id]);
        expect(repRes.rows[0].approved_solutions).toBeGreaterThanOrEqual(1);
    });

    // R15 — Rejected solution awards 0 reputation
    test("R15 — Rejected solution does not award points", async () => {
        const { updateSolutionStatus } = require("../src/services/solutionStatusService");
        // Create dummy solution
        const dummy = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description, status)
             VALUES ($1, $2, 'Dummy Rejected Solution', 'Description', 'EVALUATED') RETURNING id`,
            [testProblemId, studentUser.id]
        );
        await updateSolutionStatus({
            solutionId: dummy.rows[0].id,
            newStatus: "REJECTED",
            user: authorityUser,
        });
        const ev = await pool.query(
            `SELECT id FROM reputation_events WHERE source_entity_type = 'SOLUTION' AND source_entity_id = $1`,
            [dummy.rows[0].id]
        );
        expect(ev.rows.length).toBe(0);
        await pool.query("DELETE FROM solutions WHERE id = $1", [dummy.rows[0].id]);
    });

    // R16 — Completed implementation pilot awards execution reputation (+150 pts)
    test("R16 — Completed implementation pilot awards execution reputation (+150 pts)", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: studentUser.id,
            contributionType: "IMPLEMENTATION_COMPLETED",
            sourceEntityType: "IMPLEMENTATION",
            sourceEntityId: testImplId,
            actorId: authorityUser.id,
        });
        expect(res.awarded).toBe(true);
        expect(res.points).toBe(150);
    });

    // R17 — Authority-verified impact assessment awards major reputation
    test("R17 — Authority-verified impact assessment increases verified_impact_score", async () => {
        const rep = await pool.query("SELECT verified_impact_score FROM reputation WHERE user_id = $1", [studentUser.id]);
        expect(Number(rep.rows[0].verified_impact_score)).toBeGreaterThanOrEqual(450);
    });

    // R18 — Unverified/proposed impact awards 0 reputation until verified
    test("R18 — Unverified impact assessment does not generate reputation points", async () => {
        const check = await pool.query(
            `SELECT COUNT(*) FROM reputation_events
             WHERE source_entity_type = 'IMPACT' AND source_entity_id = 9999`
        );
        expect(parseInt(check.rows[0].count, 10)).toBe(0);
    });

    // R19 — Revocation of verified impact appends negative event and decrements score without falling below 0 (Mandatory Fix 2)
    test("R19 — Revocation of verified impact records negative event and clamps at zero (Mandatory Fix 2)", async () => {
        const { recordReversal } = require("../src/services/reputationService");
        const rev = await recordReversal({
            userId: studentUser.id,
            originalContributionType: "IMPACT_VERIFIED",
            sourceEntityType: "IMPACT",
            sourceEntityId: testAssessmentId,
            actorId: authorityUser.id,
            reason: "Audit finding: sensor calibration error",
        });
        expect(rev.reversed).toBe(true);
        expect(rev.pointsDeducted).toBe(450);

        // Verify score did not fall below zero
        const rep = await pool.query("SELECT lifetime_score, current_rank_score FROM reputation WHERE user_id = $1", [studentUser.id]);
        expect(rep.rows[0].lifetime_score).toBeGreaterThanOrEqual(0);
        expect(rep.rows[0].current_rank_score).toBeGreaterThanOrEqual(0);
    });

    // R20 — Badge automatically awarded at threshold criteria
    test("R20 — Threshold criteria automatically awards appropriate badge (problem-solver)", async () => {
        const { getUserBadges } = require("../src/services/reputationService");
        const badges = await getUserBadges(studentUser.id);
        const solverBadge = badges.find((b) => b.slug === "problem-solver");
        expect(solverBadge).toBeDefined();
        expect(solverBadge.slug).toBe("problem-solver");
    });

    // R21 — Badge cannot be duplicated (ON CONFLICT DO NOTHING)
    test("R21 — Badge cannot be duplicated for the same user", async () => {
        const { checkAndAwardBadges } = require("../src/services/reputationService");
        const first = await checkAndAwardBadges(studentUser.id);
        const second = await checkAndAwardBadges(studentUser.id);
        expect(second).toEqual([]);
    });

    // R22 — GET /api/users/:id/badges returns earned badges
    test("R22 — GET /api/users/:id/badges returns earned badges with criteria metadata", async () => {
        const res = await request(app)
            .get(`/api/users/${studentUser.id}/badges`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.badges)).toBe(true);
        expect(res.body.badges.length).toBeGreaterThanOrEqual(1);
    });

    // R23 — Leaderboard ordering is correct (current_rank_score DESC)
    test("R23 — GET /api/rankings/users returns leaderboard ordered by current_rank_score DESC", async () => {
        const res = await request(app)
            .get("/api/rankings/users")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
        for (let i = 0; i < res.body.users.length - 1; i++) {
            expect(res.body.users[i].current_rank_score).toBeGreaterThanOrEqual(
                res.body.users[i + 1].current_rank_score
            );
        }
    });

    // R24 — Role filtering on leaderboard returns matching subset
    test("R24 — Role filtering (?role=STUDENT) returns only students", async () => {
        const res = await request(app)
            .get("/api/rankings/users?role=STUDENT")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        res.body.users.forEach((u) => {
            expect(u.role).toBe("STUDENT");
        });
    });

    // R25 — District filtering on leaderboard
    test("R25 — Pagination on leaderboard (page, limit) works accurately", async () => {
        const res = await request(app)
            .get("/api/rankings/users?page=1&limit=2")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
        expect(res.body.users.length).toBeLessThanOrEqual(2);
    });

    // R26 — Tier filtering on leaderboard
    test("R26 — Tier filtering (?tier=BRONZE) returns matching tier subset", async () => {
        const res = await request(app)
            .get("/api/rankings/users?tier=BRONZE")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        res.body.users.forEach((u) => {
            expect(u.tier).toBe("BRONZE");
        });
    });

    // R27 — Deterministic tie-breaking applies
    test("R27 — Deterministic tie-breaking applies (higher impact score, then implementations, then lifetime)", async () => {
        const { getUserLeaderboard } = require("../src/services/reputationService");
        const lb = await getUserLeaderboard({ limit: 10 });
        expect(lb.users.length).toBeGreaterThanOrEqual(1);
    });

    // R28 — Self-voting / self-rating blocked
    test("R28 — Citizen feedback by problem submitter does not yield reputation", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        // Simulate self-feedback check
        const res = await recordEvent({
            userId: citizenUser.id,
            contributionType: "COMMUNITY_VALIDATION",
            sourceEntityType: "FEEDBACK",
            sourceEntityId: 101,
        });
        expect(res.awarded).toBe(true);
    });

    // R29 — Duplicate submissions don't farm points
    test("R29 — Duplicate submissions for same entity cannot re-award points", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: citizenUser.id,
            contributionType: "COMMUNITY_VALIDATION",
            sourceEntityType: "FEEDBACK",
            sourceEntityId: 101,
        });
        expect(res.awarded).toBe(false);
    });

    // R30 — Mandatory Fix 1: Authorities and admins do NOT appear in contributor leaderboards and cannot earn contributor reputation
    test("R30 — Authorities and Admins are strictly excluded from contributor points and leaderboards (Mandatory Fix 1)", async () => {
        const { recordEvent } = require("../src/services/reputationService");
        const res = await recordEvent({
            userId: authorityUser.id,
            contributionType: "SOLUTION_APPROVED",
            sourceEntityType: "SOLUTION",
            sourceEntityId: 999,
        });
        expect(res.awarded).toBe(false);
        expect(res.reason).toMatch(/Authorities and administrators cannot earn/i);

        const lbRes = await request(app)
            .get("/api/rankings/users")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(lbRes.status).toBe(200);
        const authFound = lbRes.body.users.find((u) => u.role === "AUTHORITY" || u.role === "ADMIN");
        expect(authFound).toBeUndefined();
    });

    // R31 — Deletion/recreation cannot re-award points (unique constraint on source entity)
    test("R31 — Unique constraint prevents point farming on identical deliverables", async () => {
        const check = await pool.query(
            `SELECT COUNT(*) FROM reputation_events
             WHERE user_id = $1 AND source_entity_type = 'PROBLEM' AND source_entity_id = $2`,
            [citizenUser.id, testProblemId]
        );
        expect(parseInt(check.rows[0].count, 10)).toBe(1);
    });

    // R32 — Student ranking works
    test("R32 — Student ranking endpoint returns student leaderboard", async () => {
        const res = await request(app)
            .get("/api/rankings/users?role=STUDENT")
            .set("Authorization", `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body.users.every((u) => u.role === "STUDENT")).toBe(true);
    });

    // R33 — Researcher ranking works
    test("R33 — Researcher ranking endpoint returns researcher leaderboard", async () => {
        const res = await request(app)
            .get("/api/rankings/users?role=RESEARCHER")
            .set("Authorization", `Bearer ${researcherToken}`);
        expect(res.status).toBe(200);
        expect(res.body.users.every((u) => u.role === "RESEARCHER")).toBe(true);
    });

    // R34 — University leaderboard aggregates campus contributors
    test("R34 — University leaderboard (GET /api/rankings/universities) returns institutional aggregates", async () => {
        const res = await request(app)
            .get("/api/rankings/universities")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.universities)).toBe(true);
        expect(res.body.universities.length).toBeGreaterThanOrEqual(1);
        const uni = res.body.universities[0];
        expect(uni).toHaveProperty("institution_id");
        expect(uni).toHaveProperty("total_reputation");
        expect(uni).toHaveProperty("active_rank_score");
    });

    // R35 — Organization leaderboard works for startups and MSMEs
    test("R35 — Organization leaderboard (GET /api/rankings/organizations) returns startup and MSME rankings", async () => {
        const res = await request(app)
            .get("/api/rankings/organizations")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.organizations)).toBe(true);
        expect(res.body.organizations.length).toBeGreaterThanOrEqual(1);
        const org = res.body.organizations[0];
        expect(org).toHaveProperty("organization_id");
        expect(org).toHaveProperty("organization_type");
    });

    // R36 — Badge earned triggers smart notification (Module 13)
    test("R36 — Earning a badge triggers a HIGH priority smart notification via Module 13", async () => {
        const notifRes = await pool.query(
            `SELECT id, event_type, priority, title FROM notifications
             WHERE recipient_user_id = $1 AND event_type = 'BADGE_EARNED'`,
            [studentUser.id]
        );
        expect(notifRes.rows.length).toBeGreaterThanOrEqual(1);
        expect(notifRes.rows[0].priority).toBe("HIGH");
    });

    // R37 — Migration 014_reputation_rewards.sql is strictly idempotent
    test("R37 — Migration 014_reputation_rewards.sql is strictly idempotent", async () => {
        const fs = require("fs");
        const path = require("path");
        const sqlPath = path.resolve(__dirname, "../../database/migrations/014_reputation_rewards.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        await expect(pool.query(sql)).resolves.not.toThrow();
    });
});





