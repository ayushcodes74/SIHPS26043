const express = require("express");

const {
    createProblem,
    getProblems,
    getProblemById,
    getMyProblems,
    updateProblemStatus,
    getProblemStatusHistory,
    getDuplicates,
    uploadEvidence
} = require("../controllers/problemController");

const {
    getProblemImplementations
} = require("../controllers/implementationController");

const {
    getProblemCluster,
    triggerClustering
} = require("../controllers/clusteringController");

const {
    getFacultyMatches
} = require("../controllers/facultyMatchingController");

const {
    getStudentMatches,
    getStudentMatchedProblemsHandler
} = require("../controllers/studentMatchingController");

const {
    getResearcherMatches
} = require("../controllers/researcherMatchingController");

const {
    getStartupMatches,
    getMsmMatches
} = require("../controllers/innovationMatchingController");

const {
    createSolution,
    getSolutions
} = require("../controllers/solutionController");

const {
    getRankedSolutions
} = require("../controllers/solutionEvaluationController");


const {
    getProblemImpactSummaryHandler
} = require("../controllers/impactController");

const {
    analyzeRootCausesHandler,
    createRootCauseHandler,
    getProblemRootCausesHandler,
    getProblemRootCausesSummaryHandler,
} = require("../controllers/rootCauseController");

const {
    detectDependenciesHandler,
    createDependencyHandler,
    getProblemDependenciesHandler,
    getDependencyGraphHandler,
    getImpactChainHandler,
} = require("../controllers/dependencyController");

const {
    getImpactPassportHandler
} = require("../controllers/impactPassportController");

const {
    authenticate,
    optionalAuthenticate
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const {
    supportProblem,
    removeSupport,
    getSupports,
    addComment,
    getComments,
    moderateComment
} = require("../controllers/communityController");

const {
    listTeamsForProblemHandler
} = require("../controllers/collaborationController");

const router = express.Router();



router.post(
    "/",
    authenticate,
    createProblem
);

router.get(
    "/",
    optionalAuthenticate,
    getProblems
);

router.post(
    "/upload",
    authenticate,
    uploadEvidence
);

router.get(
    "/mine",
    authenticate,
    authorizeRoles("CITIZEN", "STUDENT", "FACULTY", "RESEARCHER", "STARTUP", "MSME", "AUTHORITY", "ADMIN"),
    getMyProblems
);

// GET /api/problems/matching/student
router.get(
    "/matching/student",
    authenticate,
    getStudentMatchedProblemsHandler
);

// GET /api/problems/:id/duplicates
// Must be registered BEFORE /:id to avoid Express matching 'duplicates'
// as the :id param.
router.get(
    "/:id/duplicates",
    authenticate,
    getDuplicates
);

// GET /api/problems/:id/cluster
router.get(
    "/:id/cluster",
    authenticate,
    getProblemCluster
);

// POST /api/problems/:id/cluster — manually trigger / re-run clustering.
// Restricted to AUTHORITY and ADMIN so citizens cannot spam re-clustering.
router.post(
    "/:id/cluster",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    triggerClustering
);

// GET /api/problems/:id/faculty-matches
router.get(
    "/:id/faculty-matches",
    authenticate,
    getFacultyMatches
);

// GET /api/problems/:id/student-matches
router.get(
    "/:id/student-matches",
    authenticate,
    getStudentMatches
);

// GET /api/problems/:id/researcher-matches
router.get(
    "/:id/researcher-matches",
    authenticate,
    getResearcherMatches
);

// GET /api/problems/:id/startup-matches
router.get(
    "/:id/startup-matches",
    authenticate,
    getStartupMatches
);

// GET /api/problems/:id/msme-matches
router.get(
    "/:id/msme-matches",
    authenticate,
    getMsmMatches
);

// GET /api/problems/:id/solutions
router.get(
    "/:id/solutions",
    authenticate,
    getSolutions
);

// POST /api/problems/:id/solutions
router.post(
    "/:id/solutions",
    authenticate,
    createSolution
);

// GET /api/problems/:id/solutions/ranked
router.get(
    "/:id/solutions/ranked",
    authenticate,
    getRankedSolutions
);

// GET /api/problems/:id/implementations
router.get(
    "/:id/implementations",
    authenticate,
    getProblemImplementations
);

// GET /api/problems/:id/impact-summary
router.get(
    "/:id/impact-summary",
    authenticate,
    getProblemImpactSummaryHandler
);

// GET /api/problems/:id/impact-passport
router.get(
    "/:id/impact-passport",
    authenticate,
    getImpactPassportHandler
);

// POST /api/problems/:id/root-causes/analyze
router.post(
    "/:id/root-causes/analyze",
    authenticate,
    analyzeRootCausesHandler
);

// POST /api/problems/:id/root-causes
router.post(
    "/:id/root-causes",
    authenticate,
    createRootCauseHandler
);

// GET /api/problems/:id/root-causes
router.get(
    "/:id/root-causes",
    authenticate,
    getProblemRootCausesHandler
);

// GET /api/problems/:id/root-causes/summary
router.get(
    "/:id/root-causes/summary",
    authenticate,
    getProblemRootCausesSummaryHandler
);

// POST /api/problems/:id/dependencies/detect
router.post(
    "/:id/dependencies/detect",
    authenticate,
    detectDependenciesHandler
);

// POST /api/problems/:id/dependencies
router.post(
    "/:id/dependencies",
    authenticate,
    createDependencyHandler
);

// GET /api/problems/:id/dependencies
router.get(
    "/:id/dependencies",
    authenticate,
    getProblemDependenciesHandler
);

// GET /api/problems/:id/dependency-graph
router.get(
    "/:id/dependency-graph",
    authenticate,
    getDependencyGraphHandler
);

// GET /api/problems/:id/impact-chain
router.get(
    "/:id/impact-chain",
    authenticate,
    getImpactChainHandler
);

// POST /api/problems/:id/support
router.post(
    "/:id/support",
    authenticate,
    supportProblem
);

// DELETE /api/problems/:id/support
router.delete(
    "/:id/support",
    authenticate,
    removeSupport
);

// GET /api/problems/:id/supports
router.get(
    "/:id/supports",
    authenticate,
    getSupports
);

// GET /api/problems/:id/teams
router.get(
    "/:id/teams",
    authenticate,
    listTeamsForProblemHandler
);

// POST /api/problems/:id/comments
router.post(
    "/:id/comments",
    authenticate,
    addComment
);

// GET /api/problems/:id/comments
router.get(
    "/:id/comments",
    authenticate,
    getComments
);

// PATCH /api/problems/:id/comments/:commentId/status
router.patch(
    "/:id/comments/:commentId/status",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    moderateComment
);

router.get(
    "/:id",
    authenticate,
    getProblemById
);

router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    updateProblemStatus
);

router.get(
    "/:id/status-history",
    authenticate,
    getProblemStatusHistory
);

router.get(
    "/:id/implementations",
    authenticate,
    getProblemImplementations
);

module.exports = router;