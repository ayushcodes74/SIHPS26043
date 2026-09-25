const pool = require('./src/config/db');

async function test() {
    try {
        const PRIORITY_HIGH = 60;
        const PRIORITY_CRITICAL = 80;
        const IN_PROGRESS_STATUSES = [
            'ASSIGNED',
            'ROOT_CAUSE_ANALYSIS',
            'SOLUTION_SEARCH',
            'SOLUTION_EVALUATION',
            'APPROVED',
            'PILOT',
            'IMPLEMENTING'
        ];
        
        console.log("Querying 1...");
        const result = await pool.query(
            `SELECT
                COUNT(*)                                             AS total_problems,
                COUNT(*) FILTER (WHERE status = 'REPORTED')         AS reported,
                COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')     AS under_review,
                COUNT(*) FILTER (WHERE status = 'VERIFIED')         AS verified,
                COUNT(*) FILTER (WHERE status = 'ASSIGNED')         AS assigned,
                COUNT(*) FILTER (
                    WHERE status = ANY($1::text[])
                )                                                    AS in_progress,
                COUNT(*) FILTER (WHERE status = 'RESOLVED')         AS resolved,
                COUNT(*) FILTER (
                    WHERE priority_score >= $2
                )                                                    AS high_priority,
                COUNT(*) FILTER (
                    WHERE priority_score >= $3
                )                                                    AS critical_priority,
                COUNT(DISTINCT cluster_id) FILTER (
                    WHERE cluster_id IS NOT NULL
                )                                                    AS clustered_problems
             FROM problems`,
            [IN_PROGRESS_STATUSES, PRIORITY_HIGH, PRIORITY_CRITICAL]
        );
        console.log("Result 1:", result.rows);
        
        console.log("Querying 2...");
        const clusterResult = await pool.query(
            `SELECT COUNT(*) AS clusters FROM problem_clusters`
        );
        console.log("Result 2:", clusterResult.rows);
        
        console.log("Querying 3...");
        const catResult = await pool.query(
            `SELECT
                 COALESCE(category, 'Unknown') AS category,
                 COUNT(*)::int                  AS count
             FROM problems
             GROUP BY category
             ORDER BY count DESC`
        );
        console.log("Result 3:", catResult.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit(0);
    }
}
test();
