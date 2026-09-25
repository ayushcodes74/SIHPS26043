const express = require("express");
const pool = require("./config/db");
const cors = require("cors");

const {
    findMatchingInstitutions
} = require("./services/matchingService");

const challengeRoutes = require("./routes/challengeRoutes");
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const clusterRoutes = require("./routes/clusterRoutes");
const authorityDashboardRoutes = require("./routes/authorityDashboardRoutes");
const solutionRoutes = require("./routes/solutionRoutes");
const implementationRoutes = require("./routes/implementationRoutes");
const impactRoutes = require("./routes/impactRoutes");
const rootCauseRoutes = require("./routes/rootCauseRoutes");
const dependencyRoutes = require("./routes/dependencyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const teamRoutes = require("./routes/teamRoutes");
const {
    reputationRouter,
    rankingsRouter,
    usersRouter,
} = require("./routes/reputationRoutes");
const trustRoutes = require("./routes/trustRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const studentRoutes = require("./routes/studentRoutes");
const universityRoutes = require("./routes/universityRoutes");
const projectRoutes = require("./routes/projectRoutes");

const path = require("path");
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/clusters", clusterRoutes);
app.use("/api/authority/dashboard", authorityDashboardRoutes);
app.use("/api/solutions", solutionRoutes);
app.use("/api/implementations", implementationRoutes);
app.use("/api/impact-assessments", impactRoutes);
app.use("/api/root-causes", rootCauseRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/reputation", reputationRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/trust", trustRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/projects", projectRoutes);


app.get("/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "ok",
            database: "connected",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            status: "error",
            database: "not connected"
        });
    }
});

app.get("/test-matching", async (req, res) => {
    try {
        const requiredExpertise = [
            "Groundwater",
            "Water Quality",
            "Water Treatment",
            "Environmental Engineering"
        ];

        const matches =
            await findMatchingInstitutions(requiredExpertise);

        res.json({
            success: true,
            required_expertise: requiredExpertise,
            matches: matches
        });

    } catch (error) {
        console.error("Matching error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = app;
