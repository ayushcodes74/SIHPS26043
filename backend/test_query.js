const pool = require('./src/config/db');

async function test() {
    try {
        const result = await pool.query(`SELECT ROUND(AVG(NULLIF(priority_score, 'NaN'::numeric)))::int AS average_priority FROM problems`);
        console.log(result.rows);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
test();
