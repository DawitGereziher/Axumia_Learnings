const { Pool } = require('pg');

// Create a connection pool using environment variables.
// Ensure you have PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT set in your .env
// Alternatively, provide a DATABASE_URL.
const poolConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL } 
    : {};

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle pg client', err);
    process.exit(-1);
});

module.exports = pool;
