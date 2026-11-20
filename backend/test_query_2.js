const pool = require('./src/config/db');

async function test() {
    try {
        const result = await pool.query(`SELECT COUNT(*) FILTER (WHERE priority_score >= 60) AS high_with_nan, COUNT(*) FILTER (WHERE priority_score != 'NaN'::numeric AND priority_score >= 60) AS high_without_nan FROM problems`);
        console.log(result.rows);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
test();
