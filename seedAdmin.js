require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    // Create extension and tables if not exists
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        last_name TEXT,
        phone TEXT,
        department TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Ensure permissions column exists (for older schemas)
    await pool.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES system_users(id) ON DELETE CASCADE,
        role_id INT REFERENCES roles(id) ON DELETE CASCADE
      );
    `);

    // Seed admin role
    const roleRes = await pool.query(`SELECT id FROM roles WHERE type = $1 LIMIT 1`, ['admin']);
    let roleId;
    
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
    
    if (roleRes.rows.length === 0) {
      const insertRole = await pool.query(`INSERT INTO roles (name, type, permissions) VALUES ($1,$2,$3) RETURNING id`, ['Admin','admin',perms]);
      roleId = insertRole.rows[0].id;
    } else {
      roleId = roleRes.rows[0].id;
      // Update existing role with new permissions
      await pool.query(`UPDATE roles SET permissions = $1 WHERE id = $2`, [perms, roleId]);
    }

    // Seed admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@prestamos.com';
    const adminUser = await pool.query(`SELECT id FROM system_users WHERE email = $1 LIMIT 1`, [adminEmail]);

    let userId;
    if (adminUser.rows.length === 0) {
      const plain = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(plain, 10);
      const createUser = await pool.query(
        `INSERT INTO system_users (username,email,password,name,active) VALUES ($1,$2,$3,$4,true) RETURNING id`,
        ['admin', adminEmail, hash, 'Administrador']
      );
      userId = createUser.rows[0].id;
    } else {
      userId = adminUser.rows[0].id;
    }

    // Link user to role
    const link = await pool.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2 LIMIT 1`, [userId, roleId]);
    if (link.rows.length === 0) {
      await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)`, [userId, roleId]);
    }

    console.log('✅ Seed completed. Admin user:', adminEmail, '(use ADMIN_PASSWORD env to change)');
    process.exit(0);
  } catch (e) {
    console.error('Seed error', e);
    process.exit(1);
  }
}

run();
