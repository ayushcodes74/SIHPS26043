const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeProjectAccess } = require("../middleware/projectAuthMiddleware");
const {
    getProjects,
    createProject,
    updateProjectStatus,
    getProjectTests,
    recordTestResult,
    getProjectCollaborations,
    getEligiblePartners,
    addIndustryCollaboration,
    getProjectTeam,
    setProjectTeam,
    addProjectTeamMember,
    removeProjectTeamMember,
    getProjectMentor,
    assignFacultyMentor,
    removeFacultyMentor,
    getEligibleMentors,
    updateCollaborationStatus,
    getProjectFunding,
    requestFunding,
    updateFundingStatus,
    getProjectOutcomes,
    addOutcome,
    getProjectActivity
} = require("../controllers/projectController");

// Use standard authentication
router.use(authenticate);

router.get("/", getProjects);
router.post("/", authorizeRoles("UNIVERSITY", "ADMIN"), createProject);

// Apply project-level authorization to all /:id/* routes
router.use("/:id", authorizeProjectAccess);
router.patch("/:id/status", authorizeRoles("UNIVERSITY", "AUTHORITY", "ADMIN"), updateProjectStatus);
router.get("/:id/tests", getProjectTests);
router.post("/:id/tests", authorizeRoles("UNIVERSITY", "STUDENT", "FACULTY", "RESEARCHER", "ADMIN"), recordTestResult);

// Industry Collaboration
router.get("/:id/collaborations", getProjectCollaborations);
router.get("/:id/eligible-partners", authorizeRoles("UNIVERSITY", "ADMIN"), getEligiblePartners);
router.post("/:id/collaborations", authorizeRoles("UNIVERSITY", "AUTHORITY", "ADMIN"), addIndustryCollaboration);
router.patch("/:id/collaborations/:collabId", authorizeRoles("UNIVERSITY", "STARTUP", "MSME", "ADMIN"), updateCollaborationStatus);

// Teams
router.get("/:id/team", getProjectTeam);
router.post("/:id/team", authorizeRoles("UNIVERSITY"), setProjectTeam);
router.post("/:id/team/members", authorizeRoles("UNIVERSITY", "ADMIN"), addProjectTeamMember);
router.delete("/:id/team/members/:userId", authorizeRoles("UNIVERSITY", "ADMIN"), removeProjectTeamMember);

// Mentor
router.get("/:id/mentor", getProjectMentor);
router.get("/:id/eligible-mentors", authorizeRoles("UNIVERSITY", "ADMIN"), getEligibleMentors);
router.post("/:id/mentor", authorizeRoles("UNIVERSITY", "ADMIN"), assignFacultyMentor);
router.delete("/:id/mentor", authorizeRoles("UNIVERSITY", "ADMIN"), removeFacultyMentor);

// Funding
router.get("/:id/funding", getProjectFunding);
router.post("/:id/funding", authorizeRoles("UNIVERSITY", "ADMIN"), requestFunding);
router.patch("/:id/funding/:fundingId", authorizeRoles("AUTHORITY", "ADMIN", "UNIVERSITY"), updateFundingStatus);

// Outcomes
router.get("/:id/outcomes", getProjectOutcomes);
router.post("/:id/outcomes", authorizeRoles("UNIVERSITY", "FACULTY", "RESEARCHER", "STUDENT", "STARTUP", "MSME", "ADMIN"), addOutcome);

// Activity
router.get("/:id/activity", getProjectActivity);

module.exports = router;
