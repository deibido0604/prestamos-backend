require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let pool;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  usePostgres = true;
} else {
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, 'prestamos.db'));
  
  pool = {
    query: (sql, params = []) => {
      try {
        let sqlite_sql = sql
          .replace(/\$(\d+)/g, '?')
          .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
          .replace(/UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/g, 'TEXT PRIMARY KEY')
          .replace(/TEXT UNIQUE NOT NULL/g, 'TEXT UNIQUE NOT NULL')
          .replace(/TIMESTAMP DEFAULT now\(\)/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
          .replace(/BOOLEAN DEFAULT true/g, 'BOOLEAN DEFAULT 1')
          .replace(/DEFAULT '?\[\]'?/g, "DEFAULT '[]'")
          .replace(/JSONB/g, 'TEXT')
          .replace(/ON DELETE CASCADE/g, 'ON DELETE CASCADE');

        const isSelect = /^\s*SELECT/i.test(sqlite_sql);
        const stmt = db.prepare(sqlite_sql);
        
        let result;
        if (isSelect) {
          result = stmt.all(...params);
        } else {
          const info = stmt.run(...params);
          result = [{ lastID: info.lastInsertRowid }];
        }
        
        return Promise.resolve({ rows: result, rowCount: result.length });
      } catch (err) {
        console.error('SQLite error:', err.message, 'SQL:', sql);
        return Promise.reject(err);
      }
    },
    end: () => {
      db.close();
      return Promise.resolve();
    }
  };
}

function generateUUID() {
  return crypto.randomUUID();
}

async function run() {
  try {
    console.log('🌱 Starting seed...');

    if (usePostgres) {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_users (
        id ${usePostgres ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'},
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        last_name TEXT,
        phone TEXT,
        department TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT ${usePostgres ? 'now()' : 'CURRENT_TIMESTAMP'}
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT,
        created_at TIMESTAMP DEFAULT ${usePostgres ? 'now()' : 'CURRENT_TIMESTAMP'}
      );
    `);

    if (usePostgres) {
      await pool.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';`);
    } else {
      try {
        await pool.query(`ALTER TABLE roles ADD COLUMN permissions TEXT DEFAULT '[]';`);
      } catch (e) {
        // Column might already exist
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id ${usePostgres ? 'UUID' : 'TEXT'} REFERENCES system_users(id) ON DELETE CASCADE,
        role_id INT REFERENCES roles(id) ON DELETE CASCADE
      );
    `);

    const perms = JSON.stringify([
      { action: 'read', subject: 'main' },
      { action: 'read', subject: 'dashboard' },
      { action: 'read', subject: 'clientes' },
      { action: 'create', subject: 'clientes' },
      { action: 'update', subject: 'clientes' },
      { action: 'delete', subject: 'clientes' },
      { action: 'read', subject: 'prestamos' },
      { action: 'create', subject: 'prestamos' },
      { action: 'update', subject: 'prestamos' },
      { action: 'delete', subject: 'prestamos' },
      { action: 'read', subject: 'administracion' },
      { action: 'create', subject: 'administracion' },
      { action: 'update', subject: 'administracion' },
      { action: 'delete', subject: 'administracion' },
      { action: 'read', subject: 'reports' },
      { action: 'create', subject: 'reports' },
      { action: 'delete', subject: 'reports' },
      { action: 'read', subject: 'alertas' },
      { action: 'create', subject: 'alertas' },
      { action: 'update', subject: 'alertas' },
      { action: 'delete', subject: 'alertas' }
    ]);

    const roleRes = await pool.query(`SELECT id FROM roles WHERE type = ?`, ['admin']);
    let roleId;
    
    if (roleRes.rows.length === 0) {
      const insertRole = await pool.query(
        `INSERT INTO roles (name, type, permissions) VALUES (?, ?, ?)`,
        ['Admin', 'admin', perms]
      );
      roleId = insertRole.rows[0]?.id || 1;
    } else {
      roleId = roleRes.rows[0].id;
      await pool.query(`UPDATE roles SET permissions = ? WHERE id = ?`, [perms, roleId]);
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@prestamos.com';
    const adminUser = await pool.query(`SELECT id FROM system_users WHERE email = ?`, [adminEmail]);

    let userId;
    if (adminUser.rows.length === 0) {
      const plain = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(plain, 10);
      const newUserId = generateUUID();
      
      const createUser = await pool.query(
        usePostgres 
          ? `INSERT INTO system_users (username,email,password,name,active) VALUES ($1,$2,$3,$4,true) RETURNING id`
          : `INSERT INTO system_users (id, username,email,password,name,active) VALUES (?, ?, ?, ?, ?, 1)`,
        usePostgres 
          ? ['admin', adminEmail, hash, 'Administrador']
          : [newUserId, 'admin', adminEmail, hash, 'Administrador']
      );
      userId = usePostgres ? createUser.rows[0].id : newUserId;
      
      console.log('✅ Seed completed!');
      console.log('   Admin email:', adminEmail);
      console.log('   Admin password:', plain);
      console.log('   Database:', usePostgres ? 'PostgreSQL' : 'SQLite');
    } else {
      userId = adminUser.rows[0].id;
      console.log('✅ Seed completed!');
      console.log('   Admin email:', adminEmail);
      console.log('   Database:', usePostgres ? 'PostgreSQL' : 'SQLite');
    }

    const link = await pool.query(
      `SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1`,
      [userId, roleId]
    );
    
    if (link.rows.length === 0) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, roleId]
      );
    }

    await pool.end?.();
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed error:', e.message);
    process.exit(1);
  }
}

run();
