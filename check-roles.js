require('dotenv').config();
const pool = require('./config/dbConnection');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='roles' ORDER BY ordinal_position")
  .then(r => { console.log('roles:', r.rows.map(x => x.column_name).join(', ')); pool.end(); });
