require('dotenv').config();
const pool = require('./config/dbConnection');

async function migrate() {
  console.log('Ejecutando migraciones...');

  // system_users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(200) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(30),
      department VARCHAR(100),
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ system_users');

  // roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'custom',
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ roles');

  // user_roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    )
  `);
  console.log('✅ user_roles');

  // permissions (catálogo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      resource VARCHAR(100) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      actions JSONB DEFAULT '["read","create","update","delete"]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ permissions');

  // Seed de permisos si está vacío
  const { rows } = await pool.query('SELECT COUNT(*) as total FROM permissions');
  if (parseInt(rows[0].total) === 0) {
    const defaults = [
      ['dashboard',      'Dashboard'],
      ['clientes',       'Clientes'],
      ['prestamos',      'Préstamos'],
      ['reports',        'Reportes'],
      ['alertas',        'Alertas'],
      ['administracion', 'Administración'],
    ];
    for (const [resource, label] of defaults) {
      await pool.query(
        'INSERT INTO permissions (resource, label) VALUES ($1, $2) ON CONFLICT (resource) DO NOTHING',
        [resource, label]
      );
    }
    console.log('✅ permissions seed');
  }

  // password_reset_tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE
    )
  `);
  console.log('✅ password_reset_tokens');

  // clients
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      nombrecompleto TEXT NOT NULL,
      cedula TEXT,
      correo TEXT,
      telefono TEXT,
      telefonosecundario TEXT,
      direccion TEXT,
      profesion TEXT,
      lugartrabajo TEXT,
      antiguedad TEXT,
      referencias TEXT,
      estado TEXT DEFAULT 'activo',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ clients');

  // alertas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alertas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      evento TEXT,
      destinatarios TEXT,
      activo BOOLEAN DEFAULT TRUE,
      plantilla TEXT,
      frecuencia TEXT DEFAULT 'diaria',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ alertas');

  console.log('\n✅ Migración completada');
  await pool.end();
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Error en migración:', e.message);
  process.exit(1);
});
