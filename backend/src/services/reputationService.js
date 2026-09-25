/**
 * reputationService.js
 *
 * MODULE 14 — RANKINGS + REPUTATION + REWARDS
 *
 * Core engine for:
 *   - Verifiable contribution reputation tracking
 *   - Quality multipliers & diminishing returns
 *   - Append-only reputation ledger (reputation_events)
 *   - Rolling/time-weighted rank scores (0-365d: 100%, 366-730d: 50%, >730d: 25%)
 *   - Non-negative scores (clamped via GREATEST(0, ...))
 *   - Authority & Admin exclusion from contributor points and leaderboards
 *   - Automated badge threshold evaluation & digital credentials
 *   - Institutional & organizational aggregation
 *   - Smart notification integration (Module 13)
 *   - Non-blocking error boundaries for primary operations
 */

"use strict";

const pool = require("../config/db");
const crypto = require("crypto");
const { notify } = require("./notificationService");
const trustService = require("./trustService");

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const EXCLUDED_LEADERBOARD_ROLES = ["AUTHORITY", "ADMIN"];

const TIERS = [
    { name: "DIAMOND", min: 2500 },
    { name: "PLATINUM", min: 1000 },
    { name: "GOLD", min: 500 },
    { name: "SILVER", min: 200 },
    { name: "BRONZE", min: 0 },
];

function deriveTier(score) {
    const s = Math.max(0, Number(score) || 0);
    for (const t of TIERS) {
        if (s >= t.min) return t.name;
    }
    return "BRONZE";
}

// ---------------------------------------------------------------------------
// 1. Record Reputation Event (Central Dispatcher)
// ---------------------------------------------------------------------------

/**
 * Records an immutable reputation event and updates aggregate scores.
 * Enforces:
 *   - Mandatory Fix 1: Authority & Admin Exclusion (Central)
 *   - Mandatory Fix 2: Non-negative clamping (GREATEST(0, ...))
 *   - Mandatory Fix 3: Non-blocking try-catch isolation
 *   - Mandatory Fix 5: Rolling rank score update
 */
async function recordEvent({
    userId,
    contributionType,
    sourceEntityType,
    sourceEntityId,
    actorId = null,
    description = "",
    metadata = {},
    customPoints = null,
    evaluationScore = null,
    impactScore = null,
    confidence = null,
}) {
    try {
        if (!userId || !contributionType || !sourceEntityType || !sourceEntityId) {
            return { awarded: false, reason: "Missing required event identity parameters" };
        }

        const uid = parseInt(userId, 10);
        if (isNaN(uid)) {
            return { awarded: false, reason: "Invalid userId" };
        }

        // 1. Mandatory Fix 1 — Central Authority & Admin Exclusion
        const userRes = await pool.query(
            "SELECT id, role, name FROM users WHERE id = $1",
            [uid]
        );
        if (userRes.rows.length === 0) {
            return { awarded: false, reason: "User not found" };
        }

        const user = userRes.rows[0];
        if (EXCLUDED_LEADERBOARD_ROLES.includes(user.role)) {
            return {
                awarded: false,
                reason: "Authorities and administrators cannot earn contributor reputation points",
            };
        }

        // 2. Anti-Gaming: Check for existing event (Unique constraint check)
        const dupCheck = await pool.query(
            `SELECT id FROM reputation_events
             WHERE user_id = $1 AND source_entity_type = $2 AND source_entity_id = $3 AND contribution_type = $4`,
            [uid, sourceEntityType, sourceEntityId, contributionType]
        );
        if (dupCheck.rows.length > 0) {
            // Log trust event for repeated point farming attempt
            await trustService.logTrustEvent(uid, 'DUPLICATE_REWARD_ATTEMPT', sourceEntityType, sourceEntityId, 'LOW', `Attempted to farm duplicate points for ${contributionType}`);
            return { awarded: false, reason: "Reputation already awarded for this deliverable" };
        }

        // 3. Compute base points and quality multipliers
        let basePoints = 0;
        let multiplier = 1.0;

        switch (contributionType) {
            case "PROBLEM_REPORT_VERIFIED": {
                basePoints = 15;
                // Diminishing returns: count verified reports in last 30 days
                const countRes = await pool.query(
                    `SELECT COUNT(*) FROM reputation_events
                     WHERE user_id = $1 AND contribution_type = 'PROBLEM_REPORT_VERIFIED'
                       AND created_at >= NOW() - INTERVAL '30 days'`,
                    [uid]
                );
                const count = parseInt(countRes.rows[0].count, 10);
                if (count >= 5) {
                    multiplier = 0.0; // monthly cap reached
                } else if (count >= 2) {
                    multiplier = 0.5; // 50% points after 2nd verified
                }
                break;
            }

            case "ROOT_CAUSE_VERIFIED": {
                basePoints = 35;
                if (confidence && Number(confidence) >= 80) {
                    multiplier = 1.2;
                }
                break;
            }

            case "DEPENDENCY_VERIFIED": {
                basePoints = 25;
                if (confidence && Number(confidence) >= 80) {
                    multiplier = 1.2;
                }
                break;
            }

            case "SOLUTION_APPROVED": {
                basePoints = 100;
                if (evaluationScore !== null && evaluationScore !== undefined) {
                    const score = Number(evaluationScore);
                    if (score >= 90) multiplier = 1.5;
                    else if (score >= 80) multiplier = 1.25;
                    else multiplier = 1.0;
                }
                break;
            }

            case "SOLUTION_CONTRIBUTION_APPROVED": {
                basePoints = 50;
                if (evaluationScore !== null && evaluationScore !== undefined) {
                    const score = Number(evaluationScore);
                    if (score >= 90) multiplier = 1.5;
                    else if (score >= 80) multiplier = 1.25;
                    else multiplier = 1.0;
                }
                break;
            }

            case "MILESTONE_COMPLETED": {
                basePoints = 25;
                break;
            }

            case "IMPLEMENTATION_COMPLETED": {
                basePoints = 150;
                break;
            }

            case "IMPACT_VERIFIED": {
                basePoints = 300;
                if (impactScore !== null && impactScore !== undefined) {
                    const sc = Number(impactScore);
                    if (sc < 50) {
                        return { awarded: false, reason: "Impact score below minimum threshold (50)" };
                    }
                    if (sc >= 85) multiplier = 1.5;
                    else if (sc >= 70) multiplier = 1.25;
                    else multiplier = 1.0;
                }
                break;
            }

            case "IMPACT_SUSTAINED_VERIFIED": {
                basePoints = 100;
                break;
            }

            case "COMMUNITY_VALIDATION": {
                basePoints = 10;
                // Cap total feedback points at 50
                const fbRes = await pool.query(
                    `SELECT COALESCE(SUM(points), 0) as total FROM reputation_events
                     WHERE user_id = $1 AND contribution_type = 'COMMUNITY_VALIDATION'`,
                    [uid]
                );
                if (parseInt(fbRes.rows[0].total, 10) >= 50) {
                    multiplier = 0.0;
                }
                break;
            }

            default: {
                basePoints = customPoints !== null ? Number(customPoints) : 10;
                break;
            }
        }

        const calculatedFinalPoints = Math.round(basePoints * multiplier);
        if (calculatedFinalPoints <= 0 && multiplier === 0.0) {
            return { awarded: false, reason: "Monthly cap or threshold reached; 0 points" };
        }

        // 4. Insert into append-only ledger
        const eventRes = await pool.query(
            `INSERT INTO reputation_events
                (user_id, contribution_type, points, multiplier, source_entity_type, source_entity_id, actor_id, description, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, created_at`,
            [
                uid,
                contributionType,
                basePoints,
                multiplier,
                sourceEntityType,
                sourceEntityId,
                actorId,
                description || `${contributionType} verified`,
                metadata,
            ]
        );

        // 5. Update user aggregate row in reputation (UPSERT)
        // Mandatory Fix 2 & 5: Non-negative clamping and metric accumulators
        const isImpact = contributionType === "IMPACT_VERIFIED";
        const isImpl = contributionType === "IMPLEMENTATION_COMPLETED";
        const isSol = contributionType === "SOLUTION_APPROVED";

        const impactDelta = isImpact ? calculatedFinalPoints : 0;
        const implDelta = isImpl ? 1 : 0;
        const solDelta = isSol ? 1 : 0;

        await pool.query(
            `INSERT INTO reputation (
                user_id, score, lifetime_score, current_rank_score,
                verified_impact_score, completed_implementations, approved_solutions,
                verified_contributions_count, tier, first_contribution_at, last_calculated_at
             ) VALUES (
                $1, $2, $2, $2, $3, $4, $5, 1, 'BRONZE', NOW(), NOW()
             )
             ON CONFLICT (user_id) DO UPDATE SET
                score = GREATEST(0, reputation.lifetime_score + $2),
                lifetime_score = GREATEST(0, reputation.lifetime_score + $2),
                current_rank_score = GREATEST(0, reputation.current_rank_score + $2),
                verified_impact_score = GREATEST(0, reputation.verified_impact_score + $3),
                completed_implementations = reputation.completed_implementations + $4,
                approved_solutions = reputation.approved_solutions + $5,
                verified_contributions_count = reputation.verified_contributions_count + 1,
                first_contribution_at = COALESCE(reputation.first_contribution_at, NOW()),
                last_calculated_at = NOW()`,
            [uid, calculatedFinalPoints, impactDelta, implDelta, solDelta]
        );

        // 6. Refresh rolling rank score and tier
        await refreshUserRankScore(uid);

        // 7. Check and award badges
        const awardedBadges = await checkAndAwardBadges(uid);

        // 8. Update institutional reputation if user is student or researcher
        await refreshInstitutionReputation(uid);

        // 9. Send smart notifications for major milestones
        if (contributionType === "IMPACT_VERIFIED" || contributionType === "IMPLEMENTATION_COMPLETED") {
            await notify({
                eventType: "MAJOR_REPUTATION_AWARDED",
                entityType: "REPUTATION",
                entityId: eventRes.rows[0].id,
                recipientUserIds: [uid],
                title: "Major Reputation Awarded",
                message: `Congratulations! You received +${calculatedFinalPoints} points for verified ${contributionType.toLowerCase().replace(/_/g, " ")}.`,
                priority: "NORMAL",
                actionUrl: "/reputation/me",
            });
        }

        return {
            awarded: true,
            eventId: eventRes.rows[0].id,
            points: calculatedFinalPoints,
            badgesAwarded: awardedBadges,
        };
    } catch (err) {
        console.error("reputationService.recordEvent safe boundary caught error:", err);
        return { awarded: false, error: err.message };
    }
}

// ---------------------------------------------------------------------------
// 2. Reversal Engine (Audit-Safe Negative Offset)
// ---------------------------------------------------------------------------

/**
 * Safely reverses a prior reputation event (e.g. revoked impact assessment).
 * Appends a negative reputation_event and safely decrements aggregates with GREATEST(0, ...).
 */
async function recordReversal({
    userId,
    originalContributionType,
    sourceEntityType,
    sourceEntityId,
    actorId = null,
    reason = "",
}) {
    try {
        const uid = parseInt(userId, 10);
        const reversalType = `${originalContributionType}_REVERSED`;

        // Check if already reversed
        const dupCheck = await pool.query(
            `SELECT id FROM reputation_events
             WHERE user_id = $1 AND source_entity_type = $2 AND source_entity_id = $3 AND contribution_type = $4`,
            [uid, sourceEntityType, sourceEntityId, reversalType]
        );
        if (dupCheck.rows.length > 0) {
            return { reversed: false, reason: "Already reversed" };
        }

        // Find original event
        const origRes = await pool.query(
            `SELECT id, points, multiplier FROM reputation_events
             WHERE user_id = $1 AND source_entity_type = $2 AND source_entity_id = $3 AND contribution_type = $4`,
            [uid, sourceEntityType, sourceEntityId, originalContributionType]
        );
        if (origRes.rows.length === 0) {
            return { reversed: false, reason: "Original event not found" };
        }

        const origPoints = Math.round(Number(origRes.rows[0].points) * Number(origRes.rows[0].multiplier));
        const negativePoints = -Math.abs(origPoints);

        // Record negative event in append-only ledger
        const eventRes = await pool.query(
            `INSERT INTO reputation_events
                (user_id, contribution_type, points, multiplier, source_entity_type, source_entity_id, actor_id, description, metadata)
             VALUES ($1, $2, $3, 1.0, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                uid,
                reversalType,
                negativePoints,
                sourceEntityType,
                sourceEntityId,
                actorId,
                reason || `Reversal of ${originalContributionType}`,
                { original_event_id: origRes.rows[0].id },
            ]
        );

        // Safely decrement aggregate scores (Mandatory Fix 2: Non-negative clamping)
        const isImpact = originalContributionType === "IMPACT_VERIFIED";
        await pool.query(
            `UPDATE reputation
             SET score = GREATEST(0, lifetime_score + $1),
                 lifetime_score = GREATEST(0, lifetime_score + $1),
                 current_rank_score = GREATEST(0, current_rank_score + $1),
                 verified_impact_score = GREATEST(0, verified_impact_score - $2),
                 last_calculated_at = NOW()
             WHERE user_id = $3`,
            [negativePoints, isImpact ? origPoints : 0, uid]
        );

        await refreshUserRankScore(uid);
        await refreshInstitutionReputation(uid);

        return {
            reversed: true,
            reversalEventId: eventRes.rows[0].id,
            pointsDeducted: Math.abs(negativePoints),
        };
    } catch (err) {
        console.error("reputationService.recordReversal error:", err);
        return { reversed: false, error: err.message };
    }
}

// ---------------------------------------------------------------------------
// 3. Rolling / Time-Weighted Rank Calculation (Mandatory Fix 5)
// ---------------------------------------------------------------------------

/**
 * Deterministically computes rolling time-weighted score:
 *   0–365 days   = 100% (1.0)
 *   366–730 days = 50%  (0.5)
 *   >730 days    = 25%  (0.25)
 */
async function refreshUserRankScore(userId) {
    const res = await pool.query(
        `SELECT COALESCE(SUM(
            CASE
                WHEN created_at >= NOW() - INTERVAL '365 days' THEN points * multiplier * 1.0
                WHEN created_at >= NOW() - INTERVAL '730 days' THEN points * multiplier * 0.5
                ELSE points * multiplier * 0.25
            END
         ), 0) as rolling_score,
         COALESCE(SUM(points * multiplier), 0) as total_lifetime
         FROM reputation_events
         WHERE user_id = $1`,
        [userId]
    );

    const rollingScore = Math.max(0, Math.round(Number(res.rows[0].rolling_score) || 0));
    const lifetimeScore = Math.max(0, Math.round(Number(res.rows[0].total_lifetime) || 0));
    const newTier = deriveTier(lifetimeScore);

    // Check if tier upgrade occurred
    const curTierRes = await pool.query(
        "SELECT tier FROM reputation WHERE user_id = $1",
        [userId]
    );
    const oldTier = curTierRes.rows[0]?.tier || "BRONZE";

    await pool.query(
        `UPDATE reputation
         SET current_rank_score = $1,
             lifetime_score = $2,
             score = $2,
             tier = $3,
             last_calculated_at = NOW()
         WHERE user_id = $4`,
        [rollingScore, lifetimeScore, newTier, userId]
    );

    if (oldTier !== newTier && newTier !== "BRONZE") {
        await notify({
            eventType: "TIER_PROMOTED",
            entityType: "REPUTATION",
            entityId: userId,
            recipientUserIds: [userId],
            title: "Tier Upgrade",
            message: `Congratulations! You have reached ${newTier} Contributor status with ${lifetimeScore} points.`,
            priority: "HIGH",
            actionUrl: "/reputation/me",
        });
    }

    return { rollingScore, lifetimeScore, tier: newTier };
}

// ---------------------------------------------------------------------------
// 4. Badge Evaluation Engine
// ---------------------------------------------------------------------------

/**
 * Checks all 15 badge criteria for a user and automatically awards unlocked badges.
 * Mandatory Fix 1: Authorities & Admins are blocked.
 */
async function checkAndAwardBadges(userId) {
    const userRes = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) return [];
    const role = userRes.rows[0].role;
    if (EXCLUDED_LEADERBOARD_ROLES.includes(role)) return [];

    const repRes = await pool.query(
        `SELECT lifetime_score, verified_impact_score, completed_implementations, approved_solutions, verified_contributions_count
         FROM reputation WHERE user_id = $1`,
        [userId]
    );
    const rep = repRes.rows[0] || {};

    const awarded = [];

    // Query stats
    const statsRes = await pool.query(
        `SELECT
            COUNT(CASE WHEN contribution_type = 'PROBLEM_REPORT_VERIFIED' THEN 1 END) as verified_problems,
            COUNT(CASE WHEN contribution_type = 'ROOT_CAUSE_VERIFIED' THEN 1 END) as verified_root_causes,
            COUNT(CASE WHEN contribution_type = 'MILESTONE_COMPLETED' THEN 1 END) as completed_milestones,
            COUNT(CASE WHEN contribution_type = 'SOLUTION_CONTRIBUTION_APPROVED' THEN 1 END) as solution_advisories,
            COUNT(CASE WHEN contribution_type = 'COMMUNITY_VALIDATION' THEN 1 END) as feedback_count
         FROM reputation_events
         WHERE user_id = $1`,
        [userId]
    );
    const stats = statsRes.rows[0];

    const badgesToTest = [];

    // Citizen Badges
    if (role === "CITIZEN") {
        if (Number(stats.verified_problems) >= 1) badgesToTest.push("civic-scout");
        if (Number(stats.verified_problems) >= 5 && Number(stats.feedback_count) >= 2) badgesToTest.push("civic-guardian");
        if (Number(stats.verified_problems) >= 10) badgesToTest.push("community-champion");
    }

    // Student Badges
    if (role === "STUDENT") {
        if (Number(rep.approved_solutions) >= 1) badgesToTest.push("problem-solver");
        if (Number(stats.completed_milestones) >= 3) badgesToTest.push("field-builder");
        if (Number(rep.completed_implementations) >= 1 && Number(rep.verified_impact_score) >= 75) badgesToTest.push("civic-innovator");
    }

    // Researcher Badges
    if (role === "RESEARCHER") {
        if (Number(stats.verified_root_causes) >= 2) badgesToTest.push("root-cause-analyst");
        if (Number(stats.solution_advisories) >= 2) badgesToTest.push("scientific-advisor");
        if (Number(rep.verified_impact_score) >= 85) badgesToTest.push("impact-scholar");
    }

    // Startup / MSME Badges
    if (role === "STARTUP" || role === "MSME") {
        if (Number(rep.approved_solutions) >= 1) badgesToTest.push("societal-innovator");
        if (Number(rep.completed_implementations) >= 1) badgesToTest.push("pilot-deployer");
        if (Number(rep.completed_implementations) >= 2 && Number(rep.verified_impact_score) >= 80) badgesToTest.push("sustainable-impact-partner");
    }

    for (const slug of badgesToTest) {
        const badgeRes = await pool.query("SELECT id, name, description FROM badges WHERE slug = $1", [slug]);
        if (badgeRes.rows.length === 0) continue;
        const b = badgeRes.rows[0];

        const insRes = await pool.query(
            `INSERT INTO user_badges (user_id, badge_id, awarded_at, evidence)
             VALUES ($1, $2, NOW(), $3)
             ON CONFLICT (user_id, badge_id) DO NOTHING
             RETURNING badge_id`,
            [userId, b.id, { automated: true, verified_at: new Date().toISOString() }]
        );

        if (insRes.rows.length > 0) {
            awarded.push(b.slug);
            await notify({
                eventType: "BADGE_EARNED",
                entityType: "BADGE",
                entityId: b.id,
                recipientUserIds: [userId],
                title: "New Badge Earned",
                message: `🏆 Congratulations! You have unlocked the "${b.name}" badge for verified societal impact.`,
                priority: "HIGH",
                actionUrl: "/reputation/me",
            });
        }
    }

    return awarded;
}

// ---------------------------------------------------------------------------
// 5. University & Institutional Aggregation
// ---------------------------------------------------------------------------

async function refreshInstitutionReputation(userId) {
    try {
        // Find institution linked to student or researcher
        const pRes = await pool.query(
            `SELECT institution_id FROM student_profiles WHERE user_id = $1
             UNION
             SELECT institution_id FROM researcher_profiles WHERE user_id = $1`,
            [userId]
        );

        if (pRes.rows.length === 0 || !pRes.rows[0].institution_id) return;
        const institutionId = pRes.rows[0].institution_id;

        // Aggregate statistics across all affiliated students and researchers
        const aggRes = await pool.query(
            `SELECT
                COALESCE(SUM(r.lifetime_score), 0) as total_rep,
                COALESCE(SUM(r.current_rank_score), 0) as active_score,
                COALESCE(SUM(r.approved_solutions), 0) as total_solutions,
                COALESCE(SUM(r.completed_implementations), 0) as total_pilots,
                COALESCE(SUM(r.verified_impact_score), 0) as total_impact,
                COUNT(DISTINCT sp.user_id) as student_count,
                COUNT(DISTINCT rp.user_id) as researcher_count
             FROM institutions inst
             LEFT JOIN student_profiles sp ON sp.institution_id = inst.id
             LEFT JOIN researcher_profiles rp ON rp.institution_id = inst.id
             LEFT JOIN reputation r ON r.user_id = sp.user_id OR r.user_id = rp.user_id
             WHERE inst.id = $1`,
            [institutionId]
        );

        const agg = aggRes.rows[0];
        const totalRep = parseInt(agg.total_rep, 10);
        const activeScore = parseInt(agg.active_score, 10);
        const tier = deriveTier(totalRep);

        await pool.query(
            `INSERT INTO institution_reputation (
                institution_id, total_reputation, active_rank_score,
                active_students_count, active_researchers_count,
                approved_solutions_count, completed_pilots_count,
                verified_impact_score, tier, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (institution_id) DO UPDATE SET
                total_reputation = $2,
                active_rank_score = $3,
                active_students_count = $4,
                active_researchers_count = $5,
                approved_solutions_count = $6,
                completed_pilots_count = $7,
                verified_impact_score = $8,
                tier = $9,
                updated_at = NOW()`,
            [
                institutionId,
                totalRep,
                activeScore,
                parseInt(agg.student_count, 10),
                parseInt(agg.researcher_count, 10),
                parseInt(agg.total_solutions, 10),
                parseInt(agg.total_pilots, 10),
                Number(agg.total_impact),
                tier,
            ]
        );
    } catch (err) {
        console.error("refreshInstitutionReputation error:", err);
    }
}

// ---------------------------------------------------------------------------
// 6. Read APIs & Leaderboard Engine
// ---------------------------------------------------------------------------

/**
 * Returns explainable reputation profile for authenticated user.
 */
async function getUserReputation(userId) {
    const uid = parseInt(userId, 10);

    const userRes = await pool.query(
        "SELECT id, name, role FROM users WHERE id = $1",
        [uid]
    );
    if (userRes.rows.length === 0) return null;
    const user = userRes.rows[0];

    const repRes = await pool.query(
        `SELECT lifetime_score, current_rank_score, verified_impact_score,
                completed_implementations, approved_solutions, verified_contributions_count,
                tier, first_contribution_at, last_calculated_at
         FROM reputation WHERE user_id = $1`,
        [uid]
    );
    const rep = repRes.rows[0] || {
        lifetime_score: 0,
        current_rank_score: 0,
        verified_impact_score: 0,
        completed_implementations: 0,
        approved_solutions: 0,
        verified_contributions_count: 0,
        tier: "BRONZE",
    };

    // Calculate rank among peer roles
    let rank = null;
    if (!EXCLUDED_LEADERBOARD_ROLES.includes(user.role)) {
        const rankRes = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             FROM reputation r
             JOIN users u ON u.id = r.user_id
             WHERE u.role = $1
               AND (r.current_rank_score > $2
                    OR (r.current_rank_score = $2 AND r.verified_impact_score > $3)
                    OR (r.current_rank_score = $2 AND r.verified_impact_score = $3 AND r.completed_implementations > $4)
                    OR (r.current_rank_score = $2 AND r.verified_impact_score = $3 AND r.completed_implementations = $4 AND r.lifetime_score > $5))`,
            [user.role, rep.current_rank_score, rep.verified_impact_score, rep.completed_implementations, rep.lifetime_score]
        );
        rank = parseInt(rankRes?.rows?.[0]?.rank || 1, 10);
    }

    // Breakdown
    const bRes = await pool.query(
        `SELECT contribution_type, COUNT(*) as count, SUM(points * multiplier) as total_points
         FROM reputation_events
         WHERE user_id = $1
         GROUP BY contribution_type`,
        [uid]
    );
    const breakdown = {};
    bRes.rows.forEach((r) => {
        breakdown[r.contribution_type] = {
            count: parseInt(r.count, 10),
            points: Math.round(Number(r.total_points)),
        };
    });

    // Recent 10 events
    const evRes = await pool.query(
        `SELECT id, contribution_type, points, multiplier, description, created_at
         FROM reputation_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [uid]
    );

    // Earned badges
    const badges = await getUserBadges(uid);

    return {
        user_id: user.id,
        name: user.name,
        role: user.role,
        score: rep.current_rank_score ?? rep.lifetime_score ?? 0,
        lifetime_score: rep.lifetime_score,
        current_rank_score: rep.current_rank_score,
        verified_impact_score: Number(rep.verified_impact_score),
        completed_implementations: rep.completed_implementations,
        approved_solutions: rep.approved_solutions,
        tier: rep.tier,
        rank,
        badges,
        breakdown,
        recent_events: evRes.rows.map((e) => ({
            id: e.id,
            contribution_type: e.contribution_type,
            points: Math.round(e.points * e.multiplier),
            description: e.description,
            created_at: e.created_at,
        })),
    };
}

/**
 * Returns public user reputation profile (sanitized, zero credentials).
 */
async function getPublicUserReputation(userId) {
    const full = await getUserReputation(userId);
    if (!full) return null;
    return {
        user_id: full.user_id,
        name: full.name,
        role: full.role,
        lifetime_score: full.lifetime_score,
        current_rank_score: full.current_rank_score,
        tier: full.tier,
        rank: full.rank,
        badges: full.badges,
        breakdown: full.breakdown,
    };
}

/**
 * Returns earned badges for user with metadata and timestamps.
 */
async function getUserBadges(userId) {
    const res = await pool.query(
        `SELECT b.id, b.name, b.slug, b.description, b.category, b.tier, b.icon_url, ub.awarded_at, ub.evidence
         FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
         WHERE ub.user_id = $1
         ORDER BY ub.awarded_at DESC`,
        [userId]
    );
    return res.rows;
}

/**
 * Paginated User Leaderboard.
 * Mandatory Fix 1: Authorities and Admins are strictly excluded.
 * Deterministic Tie-Breaking:
 *   1. verified_impact_score DESC
 *   2. completed_implementations DESC
 *   3. approved_solutions DESC
 *   4. lifetime_score DESC
 *   5. first_contribution_at ASC NULLS LAST
 *   6. user_id ASC
 */
async function getUserLeaderboard({
    role = null,
    district = null,
    tier = null,
    sort = "active", // "active" (current_rank_score) or "lifetime"
    page = 1,
    limit = 20,
}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * l;

    const conditions = ["u.role NOT IN ('AUTHORITY', 'ADMIN')"];
    const params = [];

    if (role) {
        params.push(role.toUpperCase());
        conditions.push(`u.role = $${params.length}`);
    }

    if (tier) {
        params.push(tier.toUpperCase());
        conditions.push(`r.tier = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const scoreCol = sort === "lifetime" ? "r.lifetime_score" : "r.current_rank_score";

    const countRes = await pool.query(
        `SELECT COUNT(*) FROM reputation r
         JOIN users u ON u.id = r.user_id
         ${whereClause}`,
        params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
        SELECT u.id as user_id, u.name, u.role,
               r.lifetime_score, r.current_rank_score, r.tier,
               r.verified_impact_score, r.completed_implementations, r.approved_solutions,
               r.first_contribution_at
        FROM reputation r
        JOIN users u ON u.id = r.user_id
        ${whereClause}
        ORDER BY
            ${scoreCol} DESC,
            r.verified_impact_score DESC,
            r.completed_implementations DESC,
            r.approved_solutions DESC,
            r.lifetime_score DESC,
            r.first_contribution_at ASC NULLS LAST,
            u.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const res = await pool.query(query, [...params, l, offset]);

    return {
        total,
        page: p,
        limit: l,
        users: res.rows.map((r, idx) => ({
            rank: offset + idx + 1,
            user_id: r.user_id,
            name: r.name,
            role: r.role,
            lifetime_score: r.lifetime_score,
            current_rank_score: r.current_rank_score,
            tier: r.tier,
            verified_impact_score: Number(r.verified_impact_score),
            completed_implementations: r.completed_implementations,
            approved_solutions: r.approved_solutions,
        })),
    };
}

/**
 * Paginated University Leaderboard.
 */
async function getUniversityLeaderboard({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * l;

    const countRes = await pool.query("SELECT COUNT(*) FROM institutions");
    const total = parseInt(countRes?.rows?.[0]?.count || (countRes?.rows?.length || 1), 10);

    const res = await pool.query(
        `SELECT inst.id as institution_id, inst.name, inst.type, inst.district, inst.city,
                COALESCE(ir.total_reputation, 0) as total_reputation,
                COALESCE(ir.active_rank_score, 0) as active_rank_score,
                COALESCE(ir.active_students_count, 0) as active_students_count,
                COALESCE(ir.active_researchers_count, 0) as active_researchers_count,
                COALESCE(ir.approved_solutions_count, 0) as approved_solutions_count,
                COALESCE(ir.completed_pilots_count, 0) as completed_pilots_count,
                COALESCE(ir.verified_impact_score, 0) as verified_impact_score,
                COALESCE(ir.tier, 'BRONZE') as tier
         FROM institutions inst
         LEFT JOIN institution_reputation ir ON ir.institution_id = inst.id
         ORDER BY ir.active_rank_score DESC NULLS LAST, ir.verified_impact_score DESC NULLS LAST, inst.id ASC
         LIMIT $1 OFFSET $2`,
        [l, offset]
    );

    return {
        total,
        page: p,
        limit: l,
        universities: res.rows.map((r, idx) => ({
            rank: offset + idx + 1,
            ...r,
            verified_impact_score: Number(r.verified_impact_score),
        })),
    };
}

/**
 * Paginated Organization (Startup/MSME) Leaderboard.
 */
async function getOrganizationLeaderboard({ type = null, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * l;

    const conditions = [];
    const params = [];

    if (type) {
        params.push(type.toUpperCase());
        conditions.push(`org.organization_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await pool.query(
        `SELECT COUNT(*) FROM organizations org ${whereClause}`,
        params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
        SELECT org.id as organization_id, org.name, org.organization_type, org.district, org.city,
               COALESCE(SUM(r.current_rank_score), 0) as active_rank_score,
               COALESCE(SUM(r.lifetime_score), 0) as total_reputation,
               COALESCE(SUM(r.completed_implementations), 0) as completed_pilots_count,
               COALESCE(SUM(r.verified_impact_score), 0) as verified_impact_score
        FROM organizations org
        LEFT JOIN innovation_profiles ip ON ip.organization_id = org.id
        LEFT JOIN reputation r ON r.user_id = ip.user_id
        ${whereClause}
        GROUP BY org.id, org.name, org.organization_type, org.district, org.city
        ORDER BY active_rank_score DESC, verified_impact_score DESC, org.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const res = await pool.query(query, [...params, l, offset]);

    return {
        total,
        page: p,
        limit: l,
        organizations: res.rows.map((r, idx) => ({
            rank: offset + idx + 1,
            ...r,
            active_rank_score: parseInt(r.active_rank_score, 10),
            total_reputation: parseInt(r.total_reputation, 10),
            completed_pilots_count: parseInt(r.completed_pilots_count, 10),
            verified_impact_score: Number(r.verified_impact_score),
        })),
    };
}

module.exports = {
    recordEvent,
    recordReversal,
    refreshUserRankScore,
    checkAndAwardBadges,
    refreshInstitutionReputation,
    getUserReputation,
    getPublicUserReputation,
    getUserBadges,
    getUserLeaderboard,
    getUniversityLeaderboard,
    getOrganizationLeaderboard,
    deriveTier,
    EXCLUDED_LEADERBOARD_ROLES,
};
