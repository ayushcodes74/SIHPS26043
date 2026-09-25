const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    try {
        const sqlPath018 = path.join(__dirname, '../database/migrations/018_problem_evidence.sql');
        await pool.query(fs.readFileSync(sqlPath018, 'utf8'));
        console.log('Migration 018 successfully applied.');

        const sqlPath020 = path.join(__dirname, '../database/migrations/020_institutional_projects.sql');
        await pool.query(fs.readFileSync(sqlPath020, 'utf8'));
        console.log('Migration 020 successfully applied.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
