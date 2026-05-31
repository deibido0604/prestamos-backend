require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('Attempting connection...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

pool.connect(async (err, client, done) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected!');
    client.query('SELECT NOW()', (err, result) => {
      done();
      if (err) {
        console.error('Query error:', err);
      } else {
        console.log('✅ Query successful:', result.rows[0]);
      }
      pool.end(() => process.exit(0));
    });
  }
});
