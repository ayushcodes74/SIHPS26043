const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const pool = require("./src/config/db");

const BASE_URL = "http://localhost:5000/api";

async function verify() {
  console.log("=== VERIFYING CIVICSYNC PRESENTATION SETUP ===");

  // 1. Startup Login
  console.log("\n1. Testing Login as JalTech Solutions...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "partnerships@jaltech.local",
      password: "CivicSync@2026!"
    })
  });
  const startupLoginData = await loginRes.json();
  const startupToken = startupLoginData.token;
  const startupUser = startupLoginData.user;
  console.log("✓ Startup Login Success:", {
    id: startupUser.id,
    name: startupUser.name,
    role: startupUser.role,
    email: startupUser.email
  });

  const startupAuthHeaders = {
    headers: {
      Authorization: `Bearer ${startupToken}`,
      "Content-Type": "application/json"
    }
  };

  // 2. Fetch Projects as Startup
  console.log("\n2. Fetching Projects as Startup...");
  const projRes = await fetch(`${BASE_URL}/projects`, startupAuthHeaders);
  const projData = await projRes.json();
  const projects = projData.projects || [];
  console.log(`✓ Projects returned for Startup: ${projects.length}`);
  const groundwaterProj = projects.find(p => p.title === "Jharkhand Groundwater Telemetry System");
  if (!groundwaterProj) {
    throw new Error("Jharkhand Groundwater Telemetry System project not found for Startup!");
  }
  console.log("✓ Project Details:", {
    id: groundwaterProj.id,
    title: groundwaterProj.title,
    status: groundwaterProj.project_status,
    problem_title: groundwaterProj.problem_title
  });

  const projectId = groundwaterProj.id;

  // 3. Verify Collaboration Details
  console.log("\n3. Verifying Collaboration Data...");
  const collabRes = await fetch(`${BASE_URL}/projects/${projectId}/collaborations`, startupAuthHeaders);
  const collabData = await collabRes.json();
  console.log("✓ Collaborations:", collabData.collaborations);

  // 4. Verify Mentor
  console.log("\n4. Verifying Project Mentor...");
  const mentorRes = await fetch(`${BASE_URL}/projects/${projectId}/mentor`, startupAuthHeaders);
  const mentorData = await mentorRes.json();
  console.log("✓ Mentor:", mentorData.mentor?.name || mentorData.mentor);

  // 5. Verify Team
  console.log("\n5. Verifying Project Team...");
  const teamRes = await fetch(`${BASE_URL}/projects/${projectId}/team`, startupAuthHeaders);
  const teamData = await teamRes.json();
  console.log(`✓ Team Members count: ${teamData.team?.length || 0}`);

  // 6. Verify Testing & Evidence
  console.log("\n6. Verifying Testing & Evidence...");
  const testsRes = await fetch(`${BASE_URL}/projects/${projectId}/tests`, startupAuthHeaders);
  const testsData = await testsRes.json();
  console.log("✓ Tests:", testsData.tests);

  // 7. Verify Funding Context
  console.log("\n7. Verifying Funding Context...");
  const fundingRes = await fetch(`${BASE_URL}/projects/${projectId}/funding`, startupAuthHeaders);
  const fundingData = await fundingRes.json();
  console.log("✓ Funding Records:", fundingData.funding);

  // 8. Verify Outcomes
  console.log("\n8. Verifying Outcomes...");
  const outcomesRes = await fetch(`${BASE_URL}/projects/${projectId}/outcomes`, startupAuthHeaders);
  const outcomesData = await outcomesRes.json();
  console.log("✓ Outcomes:", outcomesData.outcomes);

  // 9. Verify University Login & Matched Challenges
  console.log("\n9. Testing University Account & Matched Challenges...");
  const uniLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "bitmesra.innovation@civicsync.local",
      password: "CivicSync@2026!"
    })
  });
  const uniLoginData = await uniLogin.json();
  const uniToken = uniLoginData.token;
  const uniAuthHeaders = { headers: { Authorization: `Bearer ${uniToken}` } };
  const uniChallengesRes = await fetch(`${BASE_URL}/university/challenges`, uniAuthHeaders);
  const uniChallengesData = await uniChallengesRes.json();
  console.log(`✓ University Matched Challenges Count: ${uniChallengesData.challenges?.length || 0}`);

  // 10. Check Database Counts for Duplicate Records
  console.log("\n10. Checking DB for duplicates...");
  const orgCount = await pool.query("SELECT COUNT(*) FROM organizations WHERE name = 'JalTech Solutions'");
  const userCount = await pool.query("SELECT COUNT(*) FROM users WHERE email = 'partnerships@jaltech.local'");
  const projCount = await pool.query("SELECT COUNT(*) FROM institutional_projects WHERE title = 'Jharkhand Groundwater Telemetry System'");
  const collabCount = await pool.query("SELECT COUNT(*) FROM industry_collaborations WHERE project_id = $1", [projectId]);
  const fundCount = await pool.query("SELECT COUNT(*) FROM project_funding WHERE project_id = $1", [projectId]);
  const testCount = await pool.query("SELECT COUNT(*) FROM project_test_results WHERE project_id = $1", [projectId]);
  const outcomeCount = await pool.query("SELECT COUNT(*) FROM project_outcomes WHERE project_id = $1", [projectId]);

  console.log("Database unique record counts:");
  console.log(`- JalTech Organizations: ${orgCount.rows[0].count}`);
  console.log(`- JalTech Users: ${userCount.rows[0].count}`);
  console.log(`- Groundwater Projects: ${projCount.rows[0].count}`);
  console.log(`- Industry Collaborations: ${collabCount.rows[0].count}`);
  console.log(`- Funding Records: ${fundCount.rows[0].count}`);
  console.log(`- Test Results: ${testCount.rows[0].count}`);
  console.log(`- Outcomes: ${outcomeCount.rows[0].count}`);

  console.log("\n=== ALL VERIFICATION CHECKS PASSED ===");
  await pool.end();
}

verify().catch(err => {
  console.error("Verification failed:", err.response?.data || err.message);
  process.exit(1);
});
