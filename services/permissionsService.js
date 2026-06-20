const pool = require('../config/dbConnection');

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;

const initTable = async () => {
  if (!isDev) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      actions TEXT DEFAULT '["read","create","update","delete"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default permissions if empty
  const count = await pool.query('SELECT COUNT(*) as total FROM permissions');
  const total = parseInt(count.rows[0]?.total || count.rows[0]?.['COUNT(*)'] || 0);

  if (total === 0) {
    const defaults = [
      { resource: 'dashboard',      label: 'Dashboard' },
      { resource: 'clientes',       label: 'Clientes' },
      { resource: 'prestamos',      label: 'Préstamos' },
      { resource: 'reports',        label: 'Reportes' },
      { resource: 'alertas',        label: 'Alertas' },
      { resource: 'administracion', label: 'Administración' },
    ];
    for (const p of defaults) {
      await pool.query(
        `INSERT INTO permissions (resource, label) VALUES ($1, $2)`,
        [p.resource, p.label]
      );
    }
  }
};

initTable().catch(console.error);

const permissionsService = {
  async getAll() {
    const result = await pool.query('SELECT * FROM permissions ORDER BY id');
    return result.rows.map(r => ({
      ...r,
      actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : (r.actions || []),
    }));
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM permissions WHERE id = $1', [id]);
    if (!result.rows.length) return null;
    const r = result.rows[0];
    return { ...r, actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : (r.actions || []) };
  },

  async create({ resource, label, actions }) {
    const existing = await pool.query('SELECT id FROM permissions WHERE resource = $1', [resource]);
    if (existing.rows.length) return { code: 400, message: 'El recurso ya existe' };
    const actStr = JSON.stringify(actions || ['read', 'create', 'update', 'delete']);
    const result = await pool.query(
      `INSERT INTO permissions (resource, label, actions) VALUES ($1, $2, $3) RETURNING *`,
      [resource, label, actStr]
    );
    const r = result.rows[0];
    return { ...r, actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions };
  },

  async update(id, { resource, label, actions }) {
    const actStr = actions !== undefined ? JSON.stringify(actions) : undefined;
    const result = await pool.query(
      `UPDATE permissions SET
        resource = COALESCE($1, resource),
        label    = COALESCE($2, label),
        actions  = COALESCE($3, actions)
       WHERE id = $4 RETURNING *`,
      [resource ?? null, label ?? null, actStr ?? null, id]
    );
    if (!result.rows.length) return { code: 404, message: 'Permiso no encontrado' };
    const r = result.rows[0];
    return { ...r, actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions };
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM permissions WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return { code: 404, message: 'Permiso no encontrado' };
    return { success: true };
  },
};

module.exports = permissionsService;
