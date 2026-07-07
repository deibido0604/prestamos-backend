require('dotenv').config();
const pool = require('./config/dbConnection');

async function migrate() {

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      resource VARCHAR(100) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      actions JSONB DEFAULT '["read","create","update","delete"]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

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
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE
    )
  `);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      monto NUMERIC(12,2) NOT NULL,
      tasa_interes NUMERIC(5,2) NOT NULL,
      plazo_meses INTEGER NOT NULL DEFAULT 3,
      interes_total NUMERIC(12,2) NOT NULL,
      total_pagar NUMERIC(12,2) NOT NULL,
      cuota_mensual NUMERIC(12,2) NOT NULL,
      concepto TEXT,
      estado VARCHAR(20) DEFAULT 'activo',
      fecha_inicio DATE NOT NULL,
      fecha_vencimiento DATE NOT NULL,
      renovacion_de INTEGER REFERENCES prestamos(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alertas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      evento TEXT,
      destinatarios TEXT[] DEFAULT ARRAY[]::TEXT[],
      activo BOOLEAN DEFAULT TRUE,
      plantilla TEXT,
      frecuencia TEXT DEFAULT 'diaria',
      prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE,
      fecha DATE,
      cuota INTEGER,
      total_cuotas INTEGER,
      leido BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE alertas ADD COLUMN IF NOT EXISTS prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE alertas ADD COLUMN IF NOT EXISTS fecha DATE`);
  await pool.query(`ALTER TABLE alertas ADD COLUMN IF NOT EXISTS cuota INTEGER`);
  await pool.query(`ALTER TABLE alertas ADD COLUMN IF NOT EXISTS total_cuotas INTEGER`);
  await pool.query(`ALTER TABLE alertas ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT FALSE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS abonos (
      id SERIAL PRIMARY KEY,
      prestamo_id INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
      monto NUMERIC(12,2) NOT NULL,
      nota TEXT,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.end();
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Error en migración:', e.message);
  process.exit(1);
});
