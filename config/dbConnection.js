const isDev = process.env.NODE_ENV !== 'production';

let pool;

if (isDev && !process.env.DATABASE_URL) {
  // Use SQLite for local development without DATABASE_URL
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, '../prestamos.db'));
  
  pool = {
    query: (sql, params = []) => {
      try {
        // Convert PostgreSQL parameter syntax to SQLite  
        const originalSql = sql;
        
        // Count how many ? placeholders we'll have after conversion
        const dollarMatches = sql.match(/\$(\d+)/g) || [];
        
        // Create a params array that matches the number of ? placeholders
        // If $1 appears twice and we have params=[val1], we need [val1, val1]
        const expandedParams = [];
        dollarMatches.forEach(match => {
          const paramNum = parseInt(match.substring(1));
          expandedParams.push(params[paramNum - 1]);
        });
        
        // Convert $N to ?
        let sqlite_sql = sql.replace(/\$(\d+)/g, '?');

        // Remove PostgreSQL-specific syntax
        sqlite_sql = sqlite_sql
          .replace(/'?\[\]'?::jsonb/g, "'[]'")
          .replace(/::jsonb/g, '')
          .replace(/COALESCE\(\s*(\w+)\s*,\s*'?\[\]'?\)\s+as\s+(\w+)/g, "COALESCE($1, '[]') as $2")
          .replace(/COALESCE\(\s*(\w+)\s*,\s*'?\[\]'?\)/g, "COALESCE($1, '[]')")
          .replace(/CREATE EXTENSION IF NOT EXISTS[^;]*;?/i, 'SELECT 1')
          .replace(/ALTER TABLE[^;]*ADD COLUMN IF NOT EXISTS[^;]*;?/i, 'SELECT 1');

        const isSelect = /^\s*SELECT/i.test(sqlite_sql);
        
        // Log for debugging
        if (originalSql.includes('SELECT') && originalSql.includes('system_users')) {
          console.log('[SQLite] Original:', originalSql.substring(0, 80) + '...');
          console.log('[SQLite] Converted:', sqlite_sql.substring(0, 80) + '...');
          console.log('[SQLite] Original Params:', params);
          console.log('[SQLite] Expanded Params:', expandedParams);
        }
        
        const stmt = db.prepare(sqlite_sql);
        
        let result = [];
        if (isSelect) {
          result = stmt.all(...expandedParams);
        } else {
          const info = stmt.run(...expandedParams);
          result = [];
        }
        
        return Promise.resolve({ rows: result || [], rowCount: (result || []).length });
      } catch (err) {
        console.error('[SQLite Error]', err.message);
        console.error('[SQLite SQL]', sql.substring(0, 150));
        console.error('[SQLite Original Params]', params);
        return Promise.reject(err);
      }
    },
    end: () => {
      try {
        db.close();
      } catch (e) {
        // Already closed
      }
      return Promise.resolve();
    }
  };
  
  console.log('✅ Using SQLite (local dev)');
} else {
  // Use PostgreSQL
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  console.log('✅ Using PostgreSQL');
}

module.exports = pool;
