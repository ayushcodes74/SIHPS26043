const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const bcrypt = require("bcryptjs");
const pool = require("./src/config/db");

async function seedPresentationData() {
  try {
    const defaultPassword = "CivicSync@2026!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // =========================================================================
    // 1. INSTITUTION RECORD: BIT Mesra (Ranchi, Jharkhand)
    // =========================================================================
    let institutionId = 2; // Standard seed ID for BIT Mesra
    const instCheck = await pool.query(
      "SELECT id FROM institutions WHERE id = 2 OR name ILIKE '%BIT Mesra%' OR name ILIKE '%Birla Institute of Technology%' LIMIT 1"
    );

    if (instCheck.rows.length > 0) {
      institutionId = instCheck.rows[0].id;
      await pool.query(
        `UPDATE institutions 
         SET name = 'Birla Institute of Technology, Mesra',
             district = 'Ranchi',
             city = 'Ranchi',
             state = 'Jharkhand',
             type = 'UNIVERSITY'
         WHERE id = $1`,
        [institutionId]
      );
    } else {
      const newInst = await pool.query(
        `INSERT INTO institutions (id, name, district, city, state, type)
         VALUES (2, 'Birla Institute of Technology, Mesra', 'Ranchi', 'Ranchi', 'Jharkhand', 'UNIVERSITY')
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           district = EXCLUDED.district,
           city = EXCLUDED.city,
           state = EXCLUDED.state
         RETURNING id`
      );
      institutionId = newInst.rows[0].id;
    }

    // =========================================================================
    // 2. UNIVERSITY USER ACCOUNT: Birla Institute of Technology, Mesra, Ranchi
    // =========================================================================
    const uniEmail = "bitmesra.innovation@civicsync.local";
    const uniName = "Birla Institute of Technology, Mesra, Ranchi";

    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [uniEmail]);
    let uniUserId;
    if (userCheck.rows.length > 0) {
      uniUserId = userCheck.rows[0].id;
      await pool.query(
        `UPDATE users
         SET name = $1,
             password_hash = $2,
             role = 'UNIVERSITY',
             is_active = TRUE
         WHERE id = $3`,
        [uniName, passwordHash, uniUserId]
      );
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'UNIVERSITY', TRUE)
         RETURNING id`,
        [uniName, uniEmail, passwordHash]
      );
      uniUserId = newUser.rows[0].id;
    }

    // Link user to university profile
    await pool.query(
      `INSERT INTO university_profiles (user_id, institution_id, designation)
       VALUES ($1, $2, 'Innovation & Project Cell')
       ON CONFLICT (user_id) DO UPDATE SET
         institution_id = EXCLUDED.institution_id,
         designation = EXCLUDED.designation`,
      [uniUserId, institutionId]
    );

    // =========================================================================
    // 3. INSTITUTIONAL EXPERTISE TAXONOMY
    // =========================================================================
    const expertiseList = [
      { name: "Environmental Engineering", category: "Environment" },
      { name: "Water Resources & Water Quality", category: "Water" },
      { name: "Civil & Infrastructure Engineering", category: "Infrastructure" },
      { name: "IoT & Smart Sensors", category: "Technology" },
      { name: "Data Analytics", category: "Technology" },
      { name: "Geographic Information Systems (GIS)", category: "Technology" },
      { name: "Renewable Energy", category: "Energy" },
      { name: "Waste Management", category: "Environment" },
      { name: "Urban Planning", category: "Infrastructure" },
    ];

    const expertiseMap = {};
    for (const item of expertiseList) {
      const expRes = await pool.query("SELECT id FROM expertise WHERE name = $1", [item.name]);
      let expId;
      if (expRes.rows.length > 0) {
        expId = expRes.rows[0].id;
      } else {
        const ins = await pool.query(
          "INSERT INTO expertise (name, category, description) VALUES ($1, $2, $3) RETURNING id",
          [item.name, item.category, `${item.name} institutional capability`]
        );
        expId = ins.rows[0].id;
      }
      expertiseMap[item.name] = expId;

      // Link to institution_expertise
      const ieRes = await pool.query(
        "SELECT id FROM institution_expertise WHERE institution_id = $1 AND expertise_id = $2",
        [institutionId, expId]
      );
      if (ieRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO institution_expertise (institution_id, expertise_id, strength_score, evidence)
           VALUES ($1, $2, 92.0, 'Birla Institute of Technology, Mesra Center of Excellence')`,
          [institutionId, expId]
        );
      }
    }

    // =========================================================================
    // 4. DEPARTMENTS
    // =========================================================================
    const deptList = [
      { name: "Civil & Environmental Engineering", desc: "Environmental monitoring, hydrology, and municipal infrastructure." },
      { name: "Computer Science & Engineering", desc: "IoT systems, sensor telemetry, GIS, and data analytics." },
    ];

    const deptMap = {};
    for (const d of deptList) {
      const dCheck = await pool.query(
        "SELECT id FROM departments WHERE institution_id = $1 AND name = $2",
        [institutionId, d.name]
      );
      if (dCheck.rows.length > 0) {
        deptMap[d.name] = dCheck.rows[0].id;
      } else {
        const insD = await pool.query(
          "INSERT INTO departments (institution_id, name, description) VALUES ($1, $2, $3) RETURNING id",
          [institutionId, d.name, d.desc]
        );
        deptMap[d.name] = insD.rows[0].id;
      }
    }

    // =========================================================================
    // 5. INTERNAL FACULTY PARTICIPANTS
    // =========================================================================
    const facultyMembers = [
      {
        name: "Dr. Ananya Sharma",
        email: "ananya.sharma@civicsync.local",
        dept: "Civil & Environmental Engineering",
        designation: "Professor",
        skills: ["Environmental Engineering", "Water Resources & Water Quality"],
      },
      {
        name: "Dr. Rohan Mehta",
        email: "rohan.mehta@civicsync.local",
        dept: "Computer Science & Engineering",
        designation: "Associate Professor",
        skills: ["IoT & Smart Sensors", "Data Analytics"],
      },
    ];

    let primaryMentorUserId;
    for (const fac of facultyMembers) {
      let fUserId;
      const fCheck = await pool.query("SELECT id FROM users WHERE email = $1", [fac.email]);
      if (fCheck.rows.length > 0) {
        fUserId = fCheck.rows[0].id;
        await pool.query(
          "UPDATE users SET name = $1, password_hash = $2, role = 'FACULTY', is_active = TRUE WHERE id = $3",
          [fac.name, passwordHash, fUserId]
        );
      } else {
        const fIns = await pool.query(
          "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'FACULTY', TRUE) RETURNING id",
          [fac.name, fac.email, passwordHash]
        );
        fUserId = fIns.rows[0].id;
      }

      if (fac.name === "Dr. Ananya Sharma") {
        primaryMentorUserId = fUserId;
      }

      // University profile link
      await pool.query(
        `INSERT INTO university_profiles (user_id, institution_id, designation)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET institution_id = EXCLUDED.institution_id, designation = EXCLUDED.designation`,
        [fUserId, institutionId, fac.designation]
      );

      // Faculty table record
      const deptId = deptMap[fac.dept];
      let fTableId;
      const fTableCheck = await pool.query(
        "SELECT id FROM faculty WHERE name = $1 AND department_id = $2",
        [fac.name, deptId]
      );
      if (fTableCheck.rows.length > 0) {
        fTableId = fTableCheck.rows[0].id;
      } else {
        const insFac = await pool.query(
          "INSERT INTO faculty (department_id, name, designation) VALUES ($1, $2, $3) RETURNING id",
          [deptId, fac.name, fac.designation]
        );
        fTableId = insFac.rows[0].id;
      }

      // Faculty expertise links
      for (const sk of fac.skills) {
        const expId = expertiseMap[sk];
        if (expId) {
          const feCheck = await pool.query(
            "SELECT 1 FROM faculty_expertise WHERE faculty_id = $1 AND expertise_id = $2",
            [fTableId, expId]
          );
          if (feCheck.rows.length === 0) {
            await pool.query(
              "INSERT INTO faculty_expertise (faculty_id, expertise_id) VALUES ($1, $2)",
              [fTableId, expId]
            );
          }
        }
      }
    }

    // =========================================================================
    // 6. INTERNAL STUDENT PARTICIPANTS
    // =========================================================================
    const studentMembers = [
      {
        name: "Arjun Verma",
        email: "arjun.verma@civicsync.local",
        dept: "Computer Science & Engineering",
        course: "B.Tech Computer Science & Engineering",
        skills: ["Data Analytics", "Geographic Information Systems (GIS)"],
      },
      {
        name: "Priya Singh",
        email: "priya.singh@civicsync.local",
        dept: "Civil & Environmental Engineering",
        course: "B.Tech Environmental Engineering",
        skills: ["Environmental Engineering", "Waste Management"],
      },
    ];

    const studentUserIds = [];
    for (const stud of studentMembers) {
      let sUserId;
      const sCheck = await pool.query("SELECT id FROM users WHERE email = $1", [stud.email]);
      if (sCheck.rows.length > 0) {
        sUserId = sCheck.rows[0].id;
        await pool.query(
          "UPDATE users SET name = $1, password_hash = $2, role = 'STUDENT', is_active = TRUE WHERE id = $3",
          [stud.name, passwordHash, sUserId]
        );
      } else {
        const sIns = await pool.query(
          "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'STUDENT', TRUE) RETURNING id",
          [stud.name, stud.email, passwordHash]
        );
        sUserId = sIns.rows[0].id;
      }
      studentUserIds.push(sUserId);

      // Student profile
      const deptId = deptMap[stud.dept];
      const spCheck = await pool.query("SELECT id FROM student_profiles WHERE user_id = $1", [sUserId]);
      if (spCheck.rows.length > 0) {
        await pool.query(
          `UPDATE student_profiles 
           SET institution_id = $1, department_id = $2, course = $3, graduation_year = 2026, skills = $4
           WHERE user_id = $5`,
          [institutionId, deptId, stud.course, stud.skills, sUserId]
        );
      } else {
        await pool.query(
          `INSERT INTO student_profiles (user_id, institution_id, department_id, course, graduation_year, skills)
           VALUES ($1, $2, $3, $4, 2026, $5)`,
          [sUserId, institutionId, deptId, stud.course, stud.skills]
        );
      }
    }

    // =========================================================================
    // 7. STARTUP / MSME PARTNER: JalTech Solutions
    // =========================================================================
    const partnerEmail = "partnerships@jaltech.local";
    const partnerName = "JalTech Solutions";

    let partnerUserId;
    const pCheck = await pool.query("SELECT id FROM users WHERE email = $1", [partnerEmail]);
    if (pCheck.rows.length > 0) {
      partnerUserId = pCheck.rows[0].id;
      await pool.query(
        "UPDATE users SET name = $1, password_hash = $2, role = 'STARTUP', is_active = TRUE WHERE id = $3",
        [partnerName, passwordHash, partnerUserId]
      );
    } else {
      const pIns = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'STARTUP', TRUE) RETURNING id",
        [partnerName, partnerEmail, passwordHash]
      );
      partnerUserId = pIns.rows[0].id;
    }

    // Organizations table record
    let orgId;
    const orgCheck = await pool.query("SELECT id FROM organizations WHERE name = $1", [partnerName]);
    if (orgCheck.rows.length > 0) {
      orgId = orgCheck.rows[0].id;
      await pool.query(
        `UPDATE organizations
         SET organization_type = 'STARTUP',
             description = 'Jharkhand-based environmental technology partner providing IoT water quality sensors, real-time monitoring, and field deployment.',
             district = 'Ranchi',
             city = 'Ranchi',
             website = 'https://jaltech.civicsync.local'
         WHERE id = $1`,
        [orgId]
      );
    } else {
      const orgIns = await pool.query(
        `INSERT INTO organizations (name, organization_type, description, district, city, website)
         VALUES ($1, 'STARTUP', 'Jharkhand-based environmental technology partner providing IoT water quality sensors, real-time monitoring, and field deployment.', 'Ranchi', 'Ranchi', 'https://jaltech.civicsync.local')
         RETURNING id`,
        [partnerName]
      );
      orgId = orgIns.rows[0].id;
    }

    // Innovation profile for JalTech Solutions
    const startupCapabilities = [
      "Water Quality Sensors",
      "IoT Monitoring",
      "Environmental Data Platforms",
      "Field Deployment",
      "Sensor Calibration",
      "Rural Technology Deployment",
      "Water Technology",
      "IoT",
      "Environmental Technology",
      "Smart Infrastructure",
      "Data Analytics"
    ];
    const ipCheck = await pool.query("SELECT id FROM innovation_profiles WHERE user_id = $1", [partnerUserId]);
    if (ipCheck.rows.length > 0) {
      await pool.query(
        `UPDATE innovation_profiles
         SET organization_id = $1,
             innovation_areas = $2,
             description = 'Jharkhand-based environmental technology partner providing IoT water quality sensors, real-time telemetry, calibration, and rural technology deployment.'
         WHERE user_id = $3`,
        [orgId, startupCapabilities, partnerUserId]
      );
    } else {
      await pool.query(
        `INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
         VALUES ($1, $2, $3, 'Jharkhand-based environmental technology partner providing IoT water quality sensors, real-time telemetry, calibration, and rural technology deployment.')`,
        [partnerUserId, orgId, startupCapabilities]
      );
    }

    // =========================================================================
    // 7B. AUTHORITY GOVERNANCE ACCOUNT: Jharkhand Urban Development & Municipal Governance
    // =========================================================================
    const authEmail = "authority.governance@civicsync.local";
    const authName = "Jharkhand Urban Development & Municipal Governance Authority";
    const authCheck = await pool.query("SELECT id FROM users WHERE email = $1", [authEmail]);
    if (authCheck.rows.length > 0) {
      await pool.query(
        "UPDATE users SET name = $1, password_hash = $2, role = 'AUTHORITY', is_active = TRUE WHERE id = $3",
        [authName, passwordHash, authCheck.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'AUTHORITY', TRUE)",
        [authName, authEmail, passwordHash]
      );
    }

    // =========================================================================
    // 8. CITIZEN REPORTER FOR CHALLENGES
    // =========================================================================
    const reporterEmail = "reporter.jharkhand@civicsync.local";
    let reporterId = 1;
    const rCheck = await pool.query("SELECT id FROM users WHERE email = $1", [reporterEmail]);
    if (rCheck.rows.length > 0) {
      reporterId = rCheck.rows[0].id;
    } else {
      const rIns = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Panchayat Resident', $1, $2, 'CITIZEN', TRUE) RETURNING id",
        [reporterEmail, passwordHash]
      );
      reporterId = rIns.rows[0].id;
    }

    // =========================================================================
    // 9. JHARKHAND SOCIETAL CHALLENGES (3 Scenarios)
    // =========================================================================
    const challengesData = [
      {
        title: "Groundwater Quality Monitoring in Rural Jharkhand",
        description:
          "Several rural communities in Jharkhand depend on groundwater and community handpumps for drinking water. Local monitoring is periodic and does not provide continuous visibility into changing water quality or potentially affected locations. A practical low-cost monitoring and early-warning approach is needed to identify priority locations and support timely intervention.",
        district: "Ranchi",
        city: "Ranchi",
        address: "Namkum & Bero Blocks, Ranchi District, Jharkhand",
        category: "Water Resources & Water Quality",
        subcategory: "Groundwater Quality",
        required_expertise: [
          "Environmental Engineering",
          "Water Resources & Water Quality",
          "IoT & Smart Sensors",
          "Data Analytics",
          "Geographic Information Systems (GIS)",
        ],
        priority_score: 92.0,
        severity: 9,
        urgency: 9,
        affected_people: 3400,
        ai_summary:
          "High-priority groundwater monitoring need across rural blocks in Ranchi requiring low-cost telemetry and GIS mapping.",
        ai_keywords: ["groundwater", "water quality", "IoT", "sensors", "monitoring", "rural", "Jharkhand"],
        isPrimary: true,
      },
      {
        title: "Smart Monitoring of Rural Drinking Water Systems",
        description:
          "Communities in rural areas face difficulties in tracking drinking-water availability, handpump functionality, and recurring service issues. A technology-enabled monitoring system could help identify frequently affected locations and support faster maintenance prioritization.",
        district: "Khunti",
        city: "Khunti",
        address: "Torpa & Karra Blocks, Khunti District, Jharkhand",
        category: "Civil & Infrastructure Engineering",
        subcategory: "Rural Drinking Water",
        required_expertise: [
          "Civil & Infrastructure Engineering",
          "IoT & Smart Sensors",
          "Data Analytics",
          "Water Resources & Water Quality",
        ],
        priority_score: 85.0,
        severity: 8,
        urgency: 8,
        affected_people: 2600,
        ai_summary:
          "Drinking-water asset and functional reliability tracking across rural habitations in Khunti district.",
        ai_keywords: ["drinking water", "handpump", "monitoring", "infrastructure", "Khunti"],
        isPrimary: false,
      },
      {
        title: "Community Waste Management Monitoring",
        description:
          "Several growing settlements face irregular waste collection and overflowing community disposal points. Local authorities need better visibility into collection gaps, high-priority locations, and recurring sanitation issues to improve service planning.",
        district: "Ranchi",
        city: "Ranchi",
        address: "Kanke & Ratu Road Periphery, Ranchi District, Jharkhand",
        category: "Waste Management",
        subcategory: "Sanitation & Collection",
        required_expertise: [
          "Waste Management",
          "IoT & Smart Sensors",
          "Data Analytics",
          "Urban Planning",
        ],
        priority_score: 80.0,
        severity: 7,
        urgency: 8,
        affected_people: 4100,
        ai_summary:
          "Overflow detection and collection frequency tracking in peri-urban residential zones around Ranchi.",
        ai_keywords: ["waste management", "sanitation", "collection", "urban planning", "Ranchi"],
        isPrimary: false,
      },
    ];

    const seededProblemIds = [];
    let primaryProblemId;
    for (const prob of challengesData) {
      const pCheck = await pool.query("SELECT id FROM problems WHERE title = $1", [prob.title]);
      let pId;
      if (pCheck.rows.length > 0) {
        pId = pCheck.rows[0].id;
        await pool.query(
          `UPDATE problems
           SET description = $1,
               district = $2,
               city = $3,
               address = $4,
               category = $5,
               subcategory = $6,
               required_expertise = $7,
               priority_score = $8,
               severity = $9,
               urgency = $10,
               affected_people = $11,
               ai_summary = $12,
               ai_keywords = $13,
               status = 'REPORTED'
           WHERE id = $14`,
          [
            prob.description,
            prob.district,
            prob.city,
            prob.address,
            prob.category,
            prob.subcategory,
            prob.required_expertise,
            prob.priority_score,
            prob.severity,
            prob.urgency,
            prob.affected_people,
            prob.ai_summary,
            prob.ai_keywords,
            pId,
          ]
        );
      } else {
        const pIns = await pool.query(
          `INSERT INTO problems (
             title, description, district, city, address,
             category, subcategory, required_expertise, priority_score,
             severity, urgency, affected_people, ai_summary, ai_keywords,
             status, reporter_id, verified
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'REPORTED', $15, TRUE)
           RETURNING id`,
          [
            prob.title,
            prob.description,
            prob.district,
            prob.city,
            prob.address,
            prob.category,
            prob.subcategory,
            prob.required_expertise,
            prob.priority_score,
            prob.severity,
            prob.urgency,
            prob.affected_people,
            prob.ai_summary,
            prob.ai_keywords,
            reporterId,
          ]
        );
        pId = pIns.rows[0].id;
      }
      seededProblemIds.push(pId);
      if (prob.isPrimary) {
        primaryProblemId = pId;
      }
    }

    // =========================================================================
    // 10. PRIMARY CHALLENGE EVALUATION: IN_PROJECT
    // =========================================================================
    // Challenge 1 is evaluated and in IN_PROJECT status to support the live institutional project
    await pool.query(
      `INSERT INTO institutional_challenge_evaluations (problem_id, university_id, evaluation_status, review_note, reviewer_id)
       VALUES ($1, $2, 'IN_PROJECT', 'Challenge evaluated and accepted for institutional telemetry project in collaboration with industry partner JalTech Solutions.', $2)
       ON CONFLICT (problem_id, university_id) DO UPDATE SET
         evaluation_status = 'IN_PROJECT',
         review_note = EXCLUDED.review_note,
         updated_at = CURRENT_TIMESTAMP`,
      [primaryProblemId, uniUserId]
    );

    // =========================================================================
    // 11. COLLABORATION TEAM FOR GROUNDWATER PROJECT
    // =========================================================================
    const teamCheck = await pool.query(
      "SELECT id FROM collaboration_teams WHERE problem_id = $1 AND name = $2 LIMIT 1",
      [primaryProblemId, "Jharkhand Groundwater Project Team"]
    );
    let teamId;
    if (teamCheck.rows.length > 0) {
      teamId = teamCheck.rows[0].id;
    } else {
      const teamIns = await pool.query(
        `INSERT INTO collaboration_teams (problem_id, name, created_by, status)
         VALUES ($1, 'Jharkhand Groundwater Project Team', $2, 'ACTIVE')
         RETURNING id`,
        [primaryProblemId, uniUserId]
      );
      teamId = teamIns.rows[0].id;
    }

    // Add students and faculty to team
    for (const sid of studentUserIds) {
      await pool.query(
        `INSERT INTO collaboration_team_members (team_id, user_id, role, membership_status)
         VALUES ($1, $2, 'STUDENT', 'ACTIVE')
         ON CONFLICT (team_id, user_id) DO UPDATE SET membership_status = 'ACTIVE'`,
        [teamId, sid]
      );
    }

    // =========================================================================
    // 12. PRIMARY INSTITUTIONAL PROJECT: Jharkhand Groundwater Telemetry System
    // =========================================================================
    const projectTitle = "Jharkhand Groundwater Telemetry System";
    const projectDesc =
      "Low-cost multi-parameter IoT sensing network for rural drinking-water monitoring and early identification of groundwater quality concerns.";

    const projCheck = await pool.query(
      "SELECT id FROM institutional_projects WHERE problem_id = $1 AND university_id = $2 LIMIT 1",
      [primaryProblemId, uniUserId]
    );
    let projectId;
    if (projCheck.rows.length > 0) {
      projectId = projCheck.rows[0].id;
      await pool.query(
        `UPDATE institutional_projects
         SET title = $1,
             description = $2,
             faculty_mentor_id = $3,
             team_id = $4,
             project_status = 'PILOT',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [projectTitle, projectDesc, primaryMentorUserId, teamId, projectId]
      );
    } else {
      const projIns = await pool.query(
        `INSERT INTO institutional_projects (title, description, problem_id, university_id, faculty_mentor_id, team_id, project_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PILOT')
         RETURNING id`,
        [projectTitle, projectDesc, primaryProblemId, uniUserId, primaryMentorUserId, teamId]
      );
      projectId = projIns.rows[0].id;
    }

    // =========================================================================
    // 13. FACULTY MENTOR RECORD
    // =========================================================================
    if (primaryMentorUserId) {
      await pool.query(
        `INSERT INTO project_mentors (project_id, mentor_id, organization, mentorship_status, notes)
         VALUES ($1, $2, 'Birla Institute of Technology, Mesra', 'ACTIVE', 'Lead guidance on environmental instrumentation and telemetry calibration.')
         ON CONFLICT (project_id, mentor_id) DO UPDATE SET
           mentorship_status = 'ACTIVE',
           organization = EXCLUDED.organization,
           notes = EXCLUDED.notes`,
        [projectId, primaryMentorUserId]
      );
    }

    // =========================================================================
    // 14. INDUSTRY COLLABORATION: JalTech Solutions (ACTIVE)
    // =========================================================================
    await pool.query(
      `INSERT INTO industry_collaborations (project_id, partner_id, collaboration_status, invited_by)
       VALUES ($1, $2, 'ACTIVE', $3)
       ON CONFLICT (project_id, partner_id) DO UPDATE SET
         collaboration_status = 'ACTIVE',
         updated_at = CURRENT_TIMESTAMP`,
      [projectId, partnerUserId, uniUserId]
    );

    // Activity log entry for collaboration
    await pool.query(
      `INSERT INTO project_activity_log (project_id, actor_id, role, action, message)
       VALUES ($1, $2, 'STARTUP', 'COLLABORATION_ACTIVE', 'Industry collaboration active with JalTech Solutions: Technical Mentoring, Prototype Development, Sensor Integration, Field Testing, Pilot Deployment')
       ON CONFLICT DO NOTHING`,
      [projectId, partnerUserId]
    );

    // =========================================================================
    // 15. PROJECT FUNDING RECORD (DST / State S&T Council ₹2,50,000)
    // =========================================================================
    const fundCheck = await pool.query(
      "SELECT id FROM project_funding WHERE project_id = $1 LIMIT 1",
      [projectId]
    );
    if (fundCheck.rows.length > 0) {
      await pool.query(
        `UPDATE project_funding
         SET requested_amount = 250000,
             funding_source = 'DST / State S&T Council',
             funding_requirement = 'Hardware prototypes, telemetry modules, sensor calibration, and field testing for rural drinking-water monitoring.',
             funding_status = 'REQUESTED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [fundCheck.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO project_funding (project_id, requested_amount, funding_source, funding_requirement, funding_status)
         VALUES ($1, 250000, 'DST / State S&T Council', 'Hardware prototypes, telemetry modules, sensor calibration, and field testing for rural drinking-water monitoring.', 'REQUESTED')`,
        [projectId]
      );
    }

    // =========================================================================
    // 16. PROJECT TESTING & EVIDENCE (FIELD_PILOT, PASS)
    // =========================================================================
    const testCheck = await pool.query(
      "SELECT id FROM project_test_results WHERE project_id = $1 LIMIT 1",
      [projectId]
    );
    if (testCheck.rows.length > 0) {
      await pool.query(
        `UPDATE project_test_results
         SET test_description = 'Field calibration test of 5 low-cost sensor nodes at community handpumps.',
             test_result = 'Calibrated 98.4% correlation with lab standards',
             outcome = 'PASS',
             remarks = 'Parameters tested: pH, Turbidity, TDS, Iron concentration'
         WHERE id = $1`,
        [testCheck.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO project_test_results (project_id, test_description, test_result, outcome, remarks)
         VALUES ($1, 'Field calibration test of 5 low-cost sensor nodes at community handpumps.', 'Calibrated 98.4% correlation with lab standards', 'PASS', 'Parameters tested: pH, Turbidity, TDS, Iron concentration')`,
        [projectId]
      );
    }

    // =========================================================================
    // 17. PROJECT OUTCOME (TECHNICAL_REPORT)
    // =========================================================================
    const outcomeCheck = await pool.query(
      "SELECT id FROM project_outcomes WHERE project_id = $1 LIMIT 1",
      [projectId]
    );
    if (outcomeCheck.rows.length > 0) {
      await pool.query(
        `UPDATE project_outcomes
         SET outcome_type = 'TECHNICAL_REPORT',
             title = 'Jharkhand Rural Groundwater Quality Telemetry Architecture',
             status = 'PUBLISHED',
             reference_document_url = 'https://civicsync.local/docs/groundwater-telemetry-architecture.pdf'
         WHERE id = $1`,
        [outcomeCheck.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO project_outcomes (project_id, outcome_type, title, status, reference_document_url)
         VALUES ($1, 'TECHNICAL_REPORT', 'Jharkhand Rural Groundwater Quality Telemetry Architecture', 'PUBLISHED', 'https://civicsync.local/docs/groundwater-telemetry-architecture.pdf')`,
        [projectId]
      );
    }

    // =========================================================================
    // 18. VERIFY MATCHING VIA REAL QUERY
    // =========================================================================
    const matchCheck = await pool.query(
      `SELECT p.id, p.title
       FROM problems p
       WHERE EXISTS (
           SELECT 1 
           FROM institution_expertise ie
           JOIN expertise e ON e.id = ie.expertise_id
           WHERE ie.institution_id = $1 
           AND e.name = ANY(p.required_expertise)
       )
       AND p.id = ANY($2)`,
      [institutionId, seededProblemIds]
    );

    const matchedCount = matchCheck.rows.length;

    // Check Startup collaboration retrieval
    const collabCheck = await pool.query(
      `SELECT p.id, p.title, p.project_status, ic.collaboration_status
       FROM institutional_projects p
       JOIN industry_collaborations ic ON ic.project_id = p.id
       WHERE ic.partner_id = $1`,
      [partnerUserId]
    );

    // Output formatted strictly according to presentation requirements
    console.log("CivicSync presentation data seeded successfully.");
    console.log("");
    console.log("Institution:");
    console.log("Birla Institute of Technology, Mesra, Ranchi");
    console.log("");
    console.log("Login (University):");
    console.log("bitmesra.innovation@civicsync.local");
    console.log("Password:");
    console.log("CivicSync@2026!");
    console.log("");
    console.log("Login (Startup / MSME):");
    console.log("partnerships@jaltech.local");
    console.log("Password:");
    console.log("CivicSync@2026!");
    console.log("");
    console.log("Login (Authority / Governance):");
    console.log("authority.governance@civicsync.local");
    console.log("Password:");
    console.log("CivicSync@2026!");
    console.log("");
    console.log("Challenges:");
    console.log("3");
    console.log("");
    console.log("Expected matched challenges:");
    console.log(String(matchedCount));
    console.log("");
    console.log("Active Startup Collaboration:");
    console.log(
      collabCheck.rows.length > 0
        ? `${collabCheck.rows[0].title} [Stage: ${collabCheck.rows[0].project_status}, Collab: ${collabCheck.rows[0].collaboration_status}]`
        : "None"
    );
  } catch (error) {
    console.error("Seed presentation error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedPresentationData();
