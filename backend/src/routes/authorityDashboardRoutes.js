/**
 * authorityDashboardRoutes.js
 *
 * MODULE 3 — AUTHORITY DASHBOARD
 *
 * Mounted at: /api/authority/dashboard
 *
 * All routes require:
 *   authenticate            — valid JWT
 *   authorizeRoles(...)     — AUTHORITY or ADMIN role only
 */

"use strict";

const express = require("express");

const {
    summary,
    priority,
    problems,
    districts,
    statusAnalytics,
    clusters,
    recent,
    institutionalParticipation,
    industryEcosystem,
    funding,
    testing,
    outcomes
} = require("../controllers/authorityDashboardController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// Apply auth + role guard to every route in this router
router.use(authenticate);
router.use(authorizeRoles("AUTHORITY", "ADMIN"));

// GET /api/authority/dashboard/summary
router.get("/summary", summary);

// GET /api/authority/dashboard/priority[?limit=N]
router.get("/priority", priority);

// GET /api/authority/dashboard/problems[?district=&category=&status=&...]
router.get("/problems", problems);

// GET /api/authority/dashboard/districts
router.get("/districts", districts);

// GET /api/authority/dashboard/status
router.get("/status", statusAnalytics);

// GET /api/authority/dashboard/clusters
router.get("/clusters", clusters);

// GET /api/authority/dashboard/recent[?limit=N]
router.get("/recent", recent);

// GET /api/authority/dashboard/institutional-participation (Section 5)
router.get("/institutional-participation", institutionalParticipation);

// GET /api/authority/dashboard/industry-ecosystem (Section 6)
router.get("/industry-ecosystem", industryEcosystem);

// GET /api/authority/dashboard/funding (Section 7)
router.get("/funding", funding);

// GET /api/authority/dashboard/testing (Section 8)
router.get("/testing", testing);

// GET /api/authority/dashboard/outcomes (Section 9)
router.get("/outcomes", outcomes);

module.exports = router;
