const pool = require('../config/dbConnection');

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;

// Solo en SQLite local — PostgreSQL en producción debe tener las tablas creadas por migración
const initTables = async () => {
  if (!isDev) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'custom',
      permissions TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, role_id)
    )
  `);
};

initTables().catch(console.error);

const rolesService = {
  async getAll() {
    const result = await pool.query('SELECT * FROM roles ORDER BY id DESC');
    return result.rows.map(r => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    }));
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (!result.rows.length) return null;
    const r = result.rows[0];
    return { ...r, permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []) };
  },

  async create({ name, type = 'custom', permissions = [] }) {
    const existing = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existing.rows.length) return { code: 400, message: 'El rol ya existe' };

    const permStr = JSON.stringify(permissions);
    const result = await pool.query(
      `INSERT INTO roles (name, type, permissions) VALUES ($1, $2, $3) RETURNING *`,
      [name, type, permStr]
    );
    const r = result.rows[0];
    return { ...r, permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []) };
  },

  async update(id, { name, type, permissions }) {
    const permStr = permissions !== undefined ? JSON.stringify(permissions) : undefined;
    const result = await pool.query(
      `UPDATE roles SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        permissions = COALESCE($3, permissions)
       WHERE id = $4 RETURNING *`,
      [name ?? null, type ?? null, permStr ?? null, id]
    );
    if (!result.rows.length) return { code: 404, message: 'Rol no encontrado' };
    const r = result.rows[0];
    return { ...r, permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []) };
  },

  async delete(id) {
    await pool.query('DELETE FROM user_roles WHERE role_id = $1', [id]);
    const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return { code: 404, message: 'Rol no encontrado' };
    return { success: true };
  },

  // Assign/replace roles for a user
  async assignToUser(userId, roleIds = []) {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const roleId of roleIds) {
      // Compatible con SQLite y PostgreSQL (ya borramos todos antes, así que no hay duplicados)
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );
    }
    return { success: true };
  },

  async getUserRoles(userId) {
    const result = await pool.query(
      `SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(r => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    }));
  },
};

module.exports = rolesService;
